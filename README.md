# Argon Prompt Optimizer

Argon Prompt Optimizer is a focused personal web application that takes a rough request, goal, or idea and returns the ready-to-copy prompt that **Gemini 4 Argon** (`gemini-4-argon`) would most want to receive.

## Guiding Philosophy: Goal-First Prompting

- **Preserve intent**: Keeps the user's goal, tone, domain, and stated constraints intact.
- **Destination over procedure**: Clarifies the desired outcome and context while leaving reasoning and creative execution open.
- **Restrained & proportional**: Resolves minor ambiguity with sensible assumptions without inflating simple requests or adding unrequested rules.
- **Pure prompt output**: Returns only the finished prompt in an editable field with one-click copy.

## Running Locally

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Copy the example environment file and add your Gemini API key:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set:
   - `GEMINI_API_KEY`: Your Google AI Studio API key with access to Gemini 4 Argon.
   - `GEMINI_MODEL` *(optional)*: Defaults to `gemini-4-argon`. The server does not silently fall back to another model if the configured identifier is unavailable.

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

4. **Type-check and build for production**:
   ```bash
   npm run lint
   npm run build
   npm start
   ```
