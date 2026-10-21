# Argon Prompt Optimizer

Argon Prompt Optimizer is a focused, single-purpose web application that transforms rough user goals, ideas, or draft requests into the clear, outcome-driven prompt that Gemini 4 Argon most prefers to receive. It preserves user intent and essential constraints while keeping creative and methodological freedom open, returning a ready-to-copy prompt with zero commentary or bloat.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following product and design choices have been confirmed from your preferences and the specification:

- **Confirmed Visual Aesthetic**: **Warm editorial light mode** with a warm alabaster/paper canvas (`#FAF8F5`), crisp ivory work surfaces (`#FFFFFF`), high-contrast deep ink typography (`#141413`), and a focused burnt-terracotta/vermilion primary action accent (`#C84B31`).
- **Confirmed Desktop Layout**: **Side-by-side split workbench** on desktop screens (`1440px` baseline) pairing the user's rough request on the left with the editable optimized prompt on the right, stacking cleanly into a vertical flow on mobile and tablet viewports.
- **Confirmed Input Simplicity**: **Strictly minimal input** using inviting placeholder text that encourages users to describe their desired result in their own words, without starter chip clutter or extra settings panels.
- **Strict Model Fidelity**: Server-side requests target `gemini-4-argon` (configurable via environment variable `GEMINI_MODEL` defaulting to `gemini-4-argon`) and never silently fall back to another model—surfacing clear, actionable errors if the model or credentials are unavailable.

---

### 1. Overview & Core Concept

- **What It Does**: Takes any rough idea, goal, or draft prompt from the user and distills it into a direct, destination-focused prompt tailored specifically for Gemini 4 Argon's deep reasoning and creative agency.
- **Target Audience / Persona**: Creators, engineers, researchers, and everyday users who want to get the highest-caliber output from Gemini 4 Argon without spending time hand-crafting prompt structure or over-constraining the model.
- **Key Value**: Bridges the gap between human intent ("what I want to achieve") and frontier model ergonomics ("goal-first clarity without rigid step-by-step micromanagement"), producing an immediately editable and copyable prompt in one click.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Zero State (Arrival)**: The user lands on a calm, distraction-free editorial workbench. The left pane features an accessible, prominent textarea with helpful placeholder text inviting them to describe the result they want in their own words. The right pane displays a quiet, structured empty state awaiting optimization.
  2. **Validation & Submission**: Clicking **Optimize prompt** (or pressing `Cmd/Ctrl + Enter` inside the input) validates that the input is non-empty. If blank, a clear inline message asks the user to enter a goal. For any non-empty input, the button enters a disabled loading state to prevent duplicate submissions while the server-side optimization runs.
  3. **Review, Edit & Copy**: Once complete, the optimized prompt populates an editable textarea in the right pane so the user can fine-tune wording if desired. A primary **Copy prompt** button copies the text to the clipboard with immediate visual and screen-reader confirmation (`Copied to clipboard`).
  4. **Start Over**: A clearly labeled **Start over** action resets both panes, clears any error state, and returns keyboard focus directly to the input textarea for the next request.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Warm Editorial Monograph & Writer's Workbench—calm, tactile, high-contrast, and free of pseudo-technical AI chrome or telemetry clutter.
  - *Color Palette & Mood (60-30-10 Allocation)*:
    - **60% Dominant Neutral Canvas**: Warm paper background (`#FAF8F5`) with deep charcoal-ink primary text (`#141413`).
    - **30% Structural Surfaces**: Crisp white editor panes (`#FFFFFF`), subtle stone hairline borders (`#E6E2DC`), and muted slate-stone secondary copy (`#65625D`).
    - **10% Accent Budget**: High-intent burnt vermilion (`#C84B31`, hover `#B03E26`) reserved strictly for the primary action button and active focus rings, paired with semantic forest green (`#15803D`) for copy confirmation and crimson (`#B91C1C`) for actionable error alerts.
  - *Typography & Hierarchy (2+1 Font Rule)*:
    - **Display / Brand Headings**: `Fraunces` (optical-size editorial serif, SemiBold 600, tight tracking, `text-wrap: balance`).
    - **Body & UI Controls**: `Plus Jakarta Sans` (Regular 400 and SemiBold 600, clean geometric legibility at `15px–16px` with generous `1.6` line height in textareas).
    - **Character Counts & Shortcuts**: `JetBrains Mono` with `tabular-nums` for quiet, non-intrusive character/word counts and keyboard shortcut hints.
  - *Component Styling & Layout*:
    - **Top Bar Contract**: Single-row header with the brand wordmark (`Argon Prompt Optimizer`) on the left, concise single-line guidance anchor links in the center, and the primary `Start over` reset action on the right.
    - **Split Workbench Grid**: 12-column responsive container (`max-w-[1280px]` centered on `1440px` desktop viewports) with two equal-height (`items-stretch`) 6-column panes separated by `24px` (`gap-6`), single-level card elevation (`border border-[#E6E2DC] bg-white rounded-xl p-6`), and zero nested cards.
- **Interactive Feedback & Motion**:
  - Fast, compositor-only transitions (`opacity` and `transform` within `150ms` using `cubic-bezier(0.16, 1, 0.3, 1)`), full `prefers-reduced-motion` compliance, visible `focus-visible` rings on all controls, and `aria-live="polite"` announcements for loading, errors, and copy feedback.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Goal-First System Instruction Architecture**
  - *Chosen Approach*: Configure the server-side system prompt so Gemini 4 Argon acts strictly as a prompt architect for itself—asking *"If I were Gemini 4 Argon and wanted to show my full capability on this request, what prompt would I most want to receive?"* and returning **only** the finished prompt text.
  - *Why*: Frontier reasoning models perform best when given a clear destination, audience/context, and real constraints while retaining autonomy over reasoning steps and structure. Returning pure prompt text eliminates post-processing fragility and makes the output immediately ready to copy.
  - *Alternatives Considered*: Structured JSON output with separate "analysis" or "tips" fields—rejected because the brief explicitly forbids commentary, preambles, analysis, or multiple alternatives.
- **Decision 2: Strict Server-Side Model Configuration Without Silent Fallback**
  - *Chosen Approach*: Use an Express server route (`POST /api/optimize`) powered by `@google/genai` targeting `process.env.GEMINI_MODEL || "gemini-4-argon"`. If the API key is missing, the model identifier is unavailable, or the call fails, return a structured HTTP error with an actionable message rather than substituting a fallback model.
  - *Why*: Ensures complete transparency and honors the requirement that the app always use Gemini 4 Argon as its intended model without exposing credentials to the browser.
- **Decision 3: Stateless, Single-Purpose Workbench**
  - *Chosen Approach*: Keep all state in-memory within the active browser session with no accounts, history drawers, analytics, or unrelated configuration toggles.
  - *Why*: Preserves speed, privacy, and absolute focus on the single task of turning a rough request into an optimal prompt.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         Browser Client (React 19)                        │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ Top Bar: Brand Wordmark  ·  Guiding Principles  ·  Start Over Action│  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                    │                                     │
│            ┌───────────────────────┴───────────────────────┐             │
│            ▼                                               ▼             │
│  ┌─────────────────────────────────┐   ┌──────────────────────────────┐  │
│  │      Rough Request Pane         │   │    Optimized Prompt Pane     │  │
│  │  • Accessible Textarea          │   │  • Editable Result Textarea  │  │
│  │  • Blank-Input Validation       │   │  • Loading Skeleton / Status │  │
│  │  • "Optimize prompt" CTA        │   │  • Actionable Error Alert    │  │
│  │  • Cmd/Ctrl+Enter Shortcut      │   │  • One-Click "Copy prompt"   │  │
│  └─────────────────┬───────────────┘   └───────────────▲──────────────┘  │
└────────────────────┼───────────────────────────────────┼─────────────────┘
                     │ POST /api/optimize                │ JSON { prompt }
                     │ { input: string }                 │ or { error }
                     ▼                                   │
┌────────────────────────────────────────────────────────┴─────────────────┐
│                       Node.js / Express Server                           │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ /api/optimize Route Handler                                        │  │
│  │  • Validates non-empty string input & request size                 │  │
│  │  • Verifies GEMINI_API_KEY presence                                │  │
│  │  • Reads configurable model ID (GEMINI_MODEL || "gemini-4-argon")  │  │
│  │  • Calls @google/genai ai.models.generateContent()                 │  │
│  │  • Strips accidental wrapping quotes/fences & validates non-empty  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - `rawInput` (`string`): The user's rough request or goal in the left pane.
  - `optimizedPrompt` (`string`): The resulting prompt in the right pane (editable by the user after generation).
  - `status` (`'idle' | 'loading' | 'success' | 'error'`): Drives button lockouts, loading indicators, and results visibility.
  - `errorMessage` (`string | null`): Holds validation feedback (e.g., blank input prompt) or actionable server/API error messages.
  - `copied` (`boolean`): Transient state (`2000ms` timeout) providing clear visual confirmation when the optimized prompt is copied.

- **Interactive Component & State Mapping**:
  - **Optimize Action (`handleOptimize`)**: Triggered by form submission or `Cmd/Ctrl + Enter`. Checks `status !== 'loading'` to prevent duplicate in-flight requests. If `rawInput.trim()` is empty, sets `errorMessage` to `"Please enter a goal or rough request to optimize."` and focuses the input. Otherwise transitions `status` to `'loading'`, clears previous errors, and dispatches `POST /api/optimize`.
  - **Editable Result (`handleResultChange`)**: Allows the user to directly edit `optimizedPrompt` in the right-hand textarea before copying, ensuring full control over the final text.
  - **One-Click Copy (`handleCopy`)**: Copies the current `optimizedPrompt` value using `navigator.clipboard.writeText` (with a safe textarea fallback), sets `copied = true`, and announces success.
  - **Start Over (`handleReset`)**: Aborts any pending request, resets `rawInput`, `optimizedPrompt`, `errorMessage`, and `status` to initial values, and restores focus to the input field.
