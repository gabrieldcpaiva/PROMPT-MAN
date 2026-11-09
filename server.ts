import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DEFAULT_MODEL = 'gemini-4-argon';

const GOAL_FIRST_SYSTEM_INSTRUCTION = `You are the prompt optimization engine for Gemini 4 Argon.
Your sole task is to take a user's rough request, goal, or draft idea and return the exact prompt that Gemini 4 Argon would most want to receive in order to deliver an extraordinary result.

Treat every submission strictly as a request to craft the optimal prompt for Gemini 4 Argon—NEVER perform or answer the user's underlying task yourself.

Internally ask: "If I were Gemini 4 Argon and wanted to show my full capability on this request, what prompt would I most want to receive?"

Follow these core principles of goal-first prompting:
1. Preserve Intent & Voice: Keep the user's core goal, tone, domain, and explicitly stated constraints intact.
2. Focus on the Destination: Clearly articulate the intended outcome, relevant audience or context, and what a successful result should accomplish.
3. Leave Method & Creativity Open: Give Gemini 4 Argon room to reason, structure, and execute at its highest level. Do NOT dictate rigid step-by-step procedures, arbitrary word counts, boilerplate roleplay preambles, or exhaustive formatting checklists unless the user's request genuinely requires them.
4. Proportional & Restrained: Do not inflate a simple request into a bloated specification. Resolve critical ambiguity using sensible, restrained assumptions rather than asking follow-up questions. Never invent arbitrary facts, requirements, or preferences the user did not imply.
5. Output ONLY the Finished Prompt: Return strictly the ready-to-copy prompt text itself. Do not include any preamble, greeting, commentary, explanation of your changes, markdown code fences wrapping the prompt, quotation marks around the prompt, or multiple alternative options.`;

const BOUNDARY_COMPILER_SYSTEM_INSTRUCTION = `You are PROMPT MAN, a cognitive signal compiler between an unorthodox physicist/architect and a frontier reasoning model (Gemini 4 Argon).

Your job is NOT to write polite corporate prompts or step-by-step procedural checklists. Reasoning models hate being micromanaged on the journey; they perform at their peak when given sharp boundary conditions and left free to find the path of least action.

When the user drops a messy thought, a 3-line intuition, or a 40-line chaotic brain dump, strip away all human self-doubt, noise, and filler. Extrapolate the hidden tension, make bold taste and architectural choices where the user left blanks, and output ONLY a compiled prompt structured in these exact three blocks:

# THE SUBSTRATE
Define the initial state, the domain physics, the core tension to resolve, and the unspoken emotional or technical subtext. Do not use generic words ("modern", "clean", "good"). Translate vague vibes into concrete, high-dimensional parameters.

# THE VETOES
List 3 to 4 sharp negative constraints (potential barriers the model must NOT cross). Explicitly forbid the specific clichés, AI slop, fake roleplay, or lazy defaults that usually ruin this type of request.

# THE DESTINATION (/goal)
State the final boundary condition: what the finished output must achieve, how it should feel when experienced, and the exact shape of the deliverable—while leaving the internal reasoning path completely open to the model.`;

const MODE_DIRECTIVES = {
  argon:
    'Mode: Goal-First Argon Prompt (Preserve intent, make the intended outcome crystal clear, include only essential context and constraints, and leave method and creative decisions open).',
  riff: 'Mode: Pure Riff / Deep Think (Exploration, first-principles physics, conceptual architecture — zero fluff, maximum intellectual depth and structural originality).',
  system:
    'Mode: System / Code Build (Direct execution, technical precision, production-grade architectural constraints, zero hand-waving or boilerplate).',
  deliverable:
    'Mode: High-Stakes Deliverable (Sharp, persuasive, immediate executive or creative impact, high-signal authority).',
};

function resolveActiveModel() {
  const envModel = process.env.GEMINI_MODEL?.trim();
  if (!envModel || envModel === 'gemini-2.5-pro' || envModel === 'gemini-3.8-flash') {
    return DEFAULT_MODEL;
  }
  return envModel;
}

function cleanModelOutput(rawText = '') {
  let cleaned = rawText.trim();

  const fencedMatch = cleaned.match(/^```(?:markdown|text|prompt)?\s*\n([\s\S]*?)\n```$/i);
  if (fencedMatch && fencedMatch[1]) {
    cleaned = fencedMatch[1].trim();
  }

  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"') && cleaned.length > 2) ||
    (cleaned.startsWith('“') && cleaned.endsWith('”') && cleaned.length > 2)
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  return cleaned;
}

function parseGeminiError(rawMessage = '', configuredModel = DEFAULT_MODEL) {
  let extractedMessage = rawMessage;
  let statusCode = 502;

  try {
    const parsed = JSON.parse(rawMessage);
    if (parsed?.error?.message) {
      extractedMessage = parsed.error.message;
    }
    if (typeof parsed?.error?.code === 'number') {
      statusCode = parsed.error.code;
    }
  } catch {
    const statusMatch = rawMessage.match(/\b(400|401|402|403|404|429|500|503)\b/);
    if (statusMatch) {
      statusCode = Number(statusMatch[1]);
    }
  }

  const lower = extractedMessage.toLowerCase();

  if (statusCode === 402 || lower.includes('prepayment credits are depleted')) {
    return {
      statusCode: 402,
      code: 'CREDITS_DEPLETED',
      error: `AI Studio is still holding a cached reference to the old key state (HTTP 402: "${extractedMessage}"). Re-select or refresh your unbanned API key in the AI Studio API Key / Secrets panel so the container loads the updated key status.`,
    };
  }

  if (statusCode === 404 || lower.includes('not found') || lower.includes('not supported')) {
    return {
      statusCode: 404,
      code: 'MODEL_UNAVAILABLE',
      error: `Configured model "${configuredModel}" is unavailable or not accessible with the current API key. No fallback model was substituted.`,
    };
  }

  if (statusCode === 401 || statusCode === 403 || lower.includes('api key not valid')) {
    return {
      statusCode: 403,
      code: 'AUTH_ERROR',
      error: `Authentication failed for model "${configuredModel}". Check that your server-side GEMINI_API_KEY is valid and authorized for Gemini 4 Argon.`,
    };
  }

  if (statusCode === 429 || lower.includes('quota') || lower.includes('rate limit')) {
    return {
      statusCode: 429,
      code: 'RATE_LIMIT',
      error: `Rate limit or quota reached for "${configuredModel}". Please wait a moment and try again.`,
    };
  }

  return {
    statusCode,
    code: 'UPSTREAM_ERROR',
    error: `Unable to optimize prompt with "${configuredModel}": ${extractedMessage}`,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  app.get('/api/config', (_req, res) => {
    res.json({
      model: resolveActiveModel(),
    });
  });

  app.post('/api/optimize', async (req, res) => {
    const configuredModel = resolveActiveModel();
    const rawInput = typeof req.body?.input === 'string' ? req.body.input.trim() : '';
    const rawMode = typeof req.body?.mode === 'string' ? req.body.mode : 'argon';

    if (!rawInput) {
      return res.status(400).json({
        error: 'Please enter a goal or rough request to optimize.',
        code: 'EMPTY_INPUT',
      });
    }

    if (rawInput.length > 20000) {
      return res.status(400).json({
        error: 'Your input exceeds the 20,000-character limit. Please shorten your request and try again.',
        code: 'INPUT_TOO_LONG',
      });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey === 'your_gemini_api_key_here') {
      return res.status(503).json({
        error: `Missing server-side GEMINI_API_KEY. Set a valid GEMINI_API_KEY in your environment variables to optimize prompts with ${configuredModel}.`,
        code: 'MISSING_API_KEY',
        model: configuredModel,
      });
    }

    const isGoalFirst = rawMode === 'argon';
    const systemInstruction = isGoalFirst
      ? GOAL_FIRST_SYSTEM_INSTRUCTION
      : BOUNDARY_COMPILER_SYSTEM_INSTRUCTION;
    const modeDirective =
      rawMode === 'system'
        ? MODE_DIRECTIVES.system
        : rawMode === 'deliverable'
        ? MODE_DIRECTIVES.deliverable
        : rawMode === 'riff'
        ? MODE_DIRECTIVES.riff
        : MODE_DIRECTIVES.argon;

    const userContents = isGoalFirst
      ? `Rewrite the following rough user request into the single optimal prompt that Gemini 4 Argon would most want to receive. Do not execute the request; return only the optimized prompt itself.\n\n<user_request>\n${rawInput}\n</user_request>`
      : `Compile the following raw user signal into the three-block boundary-condition architecture (# THE SUBSTRATE, # THE VETOES, # THE DESTINATION (/goal)). Do not answer or execute the underlying task; output ONLY the compiled prompt itself.\n\n<compilation_mode>\n${modeDirective}\n</compilation_mode>\n\n<raw_signal>\n${rawInput}\n</raw_signal>`;

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const response = await ai.models.generateContent({
        model: configuredModel,
        contents: userContents,
        config: {
          systemInstruction,
        },
      });

      const rawOutput = response.text;
      if (!rawOutput || !rawOutput.trim()) {
        return res.status(502).json({
          error: `The model (${configuredModel}) returned an empty response. Please refine your request slightly or try again.`,
          code: 'EMPTY_MODEL_RESPONSE',
          model: configuredModel,
        });
      }

      const optimizedPrompt = cleanModelOutput(rawOutput);
      if (!optimizedPrompt) {
        return res.status(502).json({
          error: `The model (${configuredModel}) returned an empty prompt after formatting cleanup. Please try again.`,
          code: 'EMPTY_MODEL_RESPONSE',
          model: configuredModel,
        });
      }

      return res.status(200).json({
        optimizedPrompt,
        model: configuredModel,
      });
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : String(err);
      const parsed = parseGeminiError(rawMessage, configuredModel);
      return res.status(parsed.statusCode).json({
        error: parsed.error,
        code: parsed.code,
        model: configuredModel,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Argon Prompt Optimizer running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
