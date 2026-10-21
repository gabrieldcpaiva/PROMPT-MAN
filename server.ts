import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DEFAULT_MODEL = 'gemini-2.5-pro';

const SYSTEM_INSTRUCTION = `You are PROMPT MAN, a cognitive signal compiler between an unorthodox physicist/architect and a frontier reasoning model.

Your job is NOT to write polite corporate prompts or step-by-step procedural checklists. Reasoning models hate being micromanaged on the journey; they perform at their peak when given sharp boundary conditions and left free to find the path of least action.

When the user drops a messy thought, a 3-line intuition, or a 40-line chaotic brain dump, strip away all human self-doubt, noise, and filler. Extrapolate the hidden tension, make bold taste and architectural choices where the user left blanks, and output ONLY a compiled prompt structured in these exact three blocks:

# THE SUBSTRATE
Define the initial state, the domain physics, the core tension to resolve, and the unspoken emotional or technical subtext. Do not use generic words ("modern", "clean", "good"). Translate vague vibes into concrete, high-dimensional parameters.

# THE VETOES
List 3 to 4 sharp negative constraints (potential barriers the model must NOT cross). Explicitly forbid the specific clichés, AI slop, fake roleplay, or lazy defaults that usually ruin this type of request.

# THE DESTINATION (/goal)
State the final boundary condition: what the finished output must achieve, how it should feel when experienced, and the exact shape of the deliverable—while leaving the internal reasoning path completely open to the model.`;

const MODE_DIRECTIVES = {
  riff: 'Mode: Pure Riff / Deep Think (Exploration, first-principles physics, conceptual architecture — zero fluff, maximum intellectual depth and structural originality).',
  system: 'Mode: System / Code Build (Direct execution, technical precision, production-grade architectural constraints, zero hand-waving or boilerplate).',
  deliverable: 'Mode: High-Stakes Deliverable (Sharp, persuasive, immediate executive or creative impact, high-signal authority).',
};

function cleanModelOutput(rawText = '') {
  let cleaned = rawText.trim();

  // Strip accidental outer markdown code block if the entire prompt was wrapped in one
  const fencedMatch = cleaned.match(/^```(?:markdown|text|prompt)?\s*\n([\s\S]*?)\n```$/i);
  if (fencedMatch && fencedMatch[1]) {
    cleaned = fencedMatch[1].trim();
  }

  // Strip accidental outer quotation marks if the entire prompt is wrapped in quotes
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"') && cleaned.length > 2) ||
    (cleaned.startsWith('“') && cleaned.endsWith('”') && cleaned.length > 2)
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  return cleaned;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  app.get('/api/config', (_req, res) => {
    const configuredModel = (process.env.GEMINI_MODEL || DEFAULT_MODEL).trim();
    res.json({
      model: configuredModel,
    });
  });

  app.post('/api/optimize', async (req, res) => {
    const configuredModel = (process.env.GEMINI_MODEL || DEFAULT_MODEL).trim();
    const rawInput = typeof req.body?.input === 'string' ? req.body.input.trim() : '';
    const rawMode = typeof req.body?.mode === 'string' ? req.body.mode : 'riff';
    const modeDirective =
      rawMode === 'system'
        ? MODE_DIRECTIVES.system
        : rawMode === 'deliverable'
        ? MODE_DIRECTIVES.deliverable
        : MODE_DIRECTIVES.riff;

    if (!rawInput) {
      return res.status(400).json({
        error: 'Drop a raw thought, intuition, or brain dump to compile.',
        code: 'EMPTY_INPUT',
      });
    }

    if (rawInput.length > 20000) {
      return res.status(400).json({
        error: 'Your input exceeds the 20,000-character limit. Trim the raw dump slightly and re-compile.',
        code: 'INPUT_TOO_LONG',
      });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey === 'your_gemini_api_key_here') {
      return res.status(503).json({
        error: `Missing server-side GEMINI_API_KEY. Set a valid GEMINI_API_KEY in your environment variables to compile prompts with ${configuredModel}.`,
        code: 'MISSING_API_KEY',
        model: configuredModel,
      });
    }

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
        contents: `Compile the following raw user signal into the three-block boundary-condition architecture (# THE SUBSTRATE, # THE VETOES, # THE DESTINATION (/goal)). Do not answer or execute the underlying task; output ONLY the compiled prompt itself.\n\n<compilation_mode>\n${modeDirective}\n</compilation_mode>\n\n<raw_signal>\n${rawInput}\n</raw_signal>`,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        },
      });

      const rawOutput = response.text;
      if (!rawOutput || !rawOutput.trim()) {
        return res.status(502).json({
          error: `The compiler model (${configuredModel}) returned an empty signal. Refine your input slightly or try again.`,
          code: 'EMPTY_MODEL_RESPONSE',
          model: configuredModel,
        });
      }

      const optimizedPrompt = cleanModelOutput(rawOutput);
      if (!optimizedPrompt) {
        return res.status(502).json({
          error: `The compiler model (${configuredModel}) returned an empty prompt after formatting cleanup. Please try again.`,
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
      const statusMatch = rawMessage.match(/\b(400|401|403|404|429|500|503)\b/);
      const statusCode = statusMatch ? Number(statusMatch[1]) : 502;

      if (
        rawMessage.toLowerCase().includes('not found') ||
        rawMessage.toLowerCase().includes('not supported') ||
        statusCode === 404
      ) {
        return res.status(404).json({
          error: `Configured model "${configuredModel}" is unavailable or not accessible with the current API key. Verify that your key has access to "${configuredModel}" or update GEMINI_MODEL on the server.`,
          code: 'MODEL_UNAVAILABLE',
          model: configuredModel,
        });
      }

      if (
        rawMessage.toLowerCase().includes('api_key_invalid') ||
        rawMessage.toLowerCase().includes('api key not valid') ||
        statusCode === 401 ||
        statusCode === 403
      ) {
        return res.status(403).json({
          error: `Authentication failed for model "${configuredModel}". Check that your server-side GEMINI_API_KEY is valid.`,
          code: 'AUTH_ERROR',
          model: configuredModel,
        });
      }

      if (statusCode === 429 || rawMessage.toLowerCase().includes('quota') || rawMessage.toLowerCase().includes('rate limit')) {
        return res.status(429).json({
          error: `Rate limit or quota reached for "${configuredModel}". Please wait a moment and try again.`,
          code: 'RATE_LIMIT',
          model: configuredModel,
        });
      }

      return res.status(502).json({
        error: `Unable to compile signal with model "${configuredModel}": ${rawMessage}`,
        code: 'UPSTREAM_ERROR',
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
    console.log(`PROMPT MAN cognitive compiler running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
