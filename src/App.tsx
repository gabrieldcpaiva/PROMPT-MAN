/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, Check, Copy, RotateCcw, AlertCircle, Loader2 } from 'lucide-react';

type RequestStatus = 'idle' | 'loading' | 'success' | 'error';
type CompilerMode = 'argon' | 'riff' | 'system' | 'deliverable';

interface ModeOption {
  id: CompilerMode;
  label: string;
  sublabel: string;
  placeholder: string;
  ctaLabel: string;
}

const COMPILER_MODES: ModeOption[] = [
  {
    id: 'argon',
    label: 'Goal-First Argon',
    sublabel: 'Clear outcome, essential constraints, open method & creativity',
    placeholder:
      'Describe the result you want in your own words—for example: "I need to explain our database migration delay to non-technical executives without sounding defensive, while making sure they approve an extra two weeks for testing."',
    ctaLabel: 'Optimize prompt',
  },
  {
    id: 'riff',
    label: 'Pure Riff / Deep Think',
    sublabel: '3-Block Compiler (#SUBSTRATE · #VETOES · #DESTINATION) — exploration & physics',
    placeholder:
      'Drop 3 words of vague intuition or 50 lines of raw theoretical tension—e.g., "why do distributed consensus protocols mirror thermodynamic phase transitions, and what happens if we design state sync around entropy dissipation?"',
    ctaLabel: 'Compile Signal',
  },
  {
    id: 'system',
    label: 'System / Code Build',
    sublabel: '3-Block Compiler — direct execution & technical precision',
    placeholder:
      'Describe the system, mechanics, or architecture you want built—e.g., "local-first canvas where nodes act like coupled oscillators, zero React re-render lag on 60fps drag, strict keyboard-first command grammar."',
    ctaLabel: 'Compile Signal',
  },
  {
    id: 'deliverable',
    label: 'High-Stakes Deliverable',
    sublabel: '3-Block Compiler — sharp, persuasive, immediate impact',
    placeholder:
      'State the high-stakes outcome and tension—e.g., "board memo killing our legacy multi-region rewrite without losing engineering credibility; shift focus to deterministic edge caching in 4 weeks."',
    ctaLabel: 'Compile Signal',
  },
];

interface OptimizeResponse {
  optimizedPrompt?: string;
  error?: string;
  code?: string;
  model?: string;
}

export default function App() {
  const [rawInput, setRawInput] = useState<string>('');
  const [mode, setMode] = useState<CompilerMode>('argon');
  const [optimizedPrompt, setOptimizedPrompt] = useState<string>('');
  const [status, setStatus] = useState<RequestStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [configuredModel, setConfiguredModel] = useState<string>('gemini-4-argon');

  const inputTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const outputTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const copyTimeoutRef = useRef<number | null>(null);

  const activeModeObj = COMPILER_MODES.find((m) => m.id === mode) || COMPILER_MODES[0];

  useEffect(() => {
    let active = true;
    fetch('/api/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.model) {
          setConfiguredModel(data.model);
        }
      })
      .catch(() => {
        // Keep default model label if config fetch fails
      });
    return () => {
      active = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleOptimize = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (status === 'loading') {
      return;
    }

    const trimmed = rawInput.trim();
    if (!trimmed) {
      setStatus('error');
      setErrorMessage('Please enter a goal or rough request to optimize.');
      inputTextareaRef.current?.focus();
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setStatus('loading');
    setErrorMessage(null);
    setCopied(false);

    try {
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: trimmed, mode }),
        signal: controller.signal,
      });

      let data: OptimizeResponse = {};
      try {
        data = await response.json();
      } catch {
        throw new Error('Received an unreadable response from the server. Please try again.');
      }

      if (data.model) {
        setConfiguredModel(data.model);
      }

      if (!response.ok) {
        throw new Error(
          data.error || `Optimization failed with status ${response.status}. Please try again.`
        );
      }

      if (!data.optimizedPrompt || !data.optimizedPrompt.trim()) {
        throw new Error(
          'The model returned an empty prompt. Please clarify your goal slightly and try again.'
        );
      }

      setOptimizedPrompt(data.optimizedPrompt);
      setStatus('success');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      const message =
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while optimizing your prompt.';
      setStatus('error');
      setErrorMessage(message);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleOptimize();
    }
  };

  const handleCopy = async () => {
    const textToCopy = optimizedPrompt.trim();
    if (!textToCopy) return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else if (outputTextareaRef.current) {
        outputTextareaRef.current.select();
        document.execCommand('copy');
      }
      setCopied(true);
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = window.setTimeout(() => {
        setCopied(false);
      }, 2200);
    } catch {
      setErrorMessage('Could not copy automatically. Please select the optimized prompt text and copy manually.');
    }
  };

  const handleStartOver = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (copyTimeoutRef.current) {
      window.clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }
    setRawInput('');
    setOptimizedPrompt('');
    setStatus('idle');
    setErrorMessage(null);
    setCopied(false);
    inputTextareaRef.current?.focus();
  };

  const hasContentOrState =
    rawInput.length > 0 || optimizedPrompt.length > 0 || status !== 'idle' || errorMessage !== null;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#141413]">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="flex items-center justify-between gap-8 px-6 lg:px-12 py-4 border-b border-[#E6E2DC] bg-[#FAF8F5]">
        {/* Zone 1: Brand Wordmark */}
        <a
          href="#workbench"
          className="font-display text-lg font-semibold tracking-tight text-[#141413] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C84B31]"
        >
          Argon Prompt Optimizer
        </a>

        {/* Zone 2: Concise single-line navigation links */}
        <nav aria-label="Primary" className="hidden md:flex items-center gap-8 text-sm text-[#65625D]">
          <a
            href="#workbench"
            className="hover:text-[#141413] hover:underline underline-offset-4 transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C84B31]"
          >
            Workbench
          </a>
          <a
            href="#principles"
            className="hover:text-[#141413] hover:underline underline-offset-4 transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C84B31]"
          >
            Prompting Principles
          </a>
          <a
            href="#setup"
            className="hover:text-[#141413] hover:underline underline-offset-4 transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C84B31]"
          >
            Local Setup
          </a>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={handleStartOver}
            disabled={!hasContentOrState}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border border-[#E6E2DC] bg-white text-[#141413] hover:bg-[#F3EFEA] disabled:opacity-45 disabled:pointer-events-none transition-opacity duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C84B31]"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>Start over</span>
          </button>
        </div>
      </header>

      {/* Main Content Container (1440px baseline -> max-w-[1280px] centered) */}
      <main id="workbench" className="flex-1 w-full max-w-[1280px] mx-auto px-6 lg:px-12 py-10 lg:py-12">
        {/* Editorial Intro Header */}
        <div className="max-w-3xl mb-8">
          <h1
            className="font-display text-3xl sm:text-4xl lg:text-[2.65rem] font-semibold tracking-tight text-[#141413] leading-[1.12] mb-3"
            style={{ textWrap: 'balance' }}
          >
            Speak to Gemini 4 Argon the way it thinks best.
          </h1>
          <p className="text-base sm:text-[17px] text-[#65625D] leading-relaxed max-w-[68ch]">
            Describe what you want to achieve in your own words. This workbench turns your rough request into the prompt <span className="text-[#141413] font-medium">Gemini 4 Argon</span> most wants to receive—preserving your intent while leaving reasoning and creative execution wide open.
          </p>
        </div>

        {/* Mode Selector Segmented Control */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
            <span
              id="compiler-mode-label"
              className="text-xs font-mono text-[#65625D] tracking-tight"
            >
              Optimization lens <span aria-hidden="true">·</span>{' '}
              <span className="text-[#141413]">{activeModeObj.sublabel}</span>
            </span>
          </div>

          <div
            role="radiogroup"
            aria-labelledby="compiler-mode-label"
            className="inline-flex flex-wrap sm:flex-nowrap w-full sm:w-auto p-1 rounded-xl bg-[#EFECE6] border border-[#E6E2DC] gap-1"
          >
            {COMPILER_MODES.map((option) => {
              const isSelected = mode === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={status === 'loading'}
                  onClick={() => setMode(option.id)}
                  className={`flex-1 sm:flex-initial px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C84B31] ${
                    isSelected
                      ? 'bg-white text-[#141413] shadow-xs border border-[#E6E2DC]'
                      : 'text-[#65625D] hover:text-[#141413] border border-transparent'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Side-by-Side Split Workbench on Desktop, Stacked on Mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Column: User Input Pane */}
          <section
            aria-labelledby="input-heading"
            className="lg:col-span-6 flex flex-col justify-between bg-white border border-[#E6E2DC] rounded-xl p-6 sm:p-7"
          >
            <form onSubmit={handleOptimize} className="flex flex-col flex-1" noValidate>
              <div className="flex items-baseline justify-between gap-4 mb-2">
                <label
                  id="input-heading"
                  htmlFor="rough-request-input"
                  className="font-display text-lg font-semibold text-[#141413]"
                >
                  Your goal or rough request
                </label>
                <span className="text-xs font-mono text-[#65625D] tabular-nums">
                  {rawInput.length.toLocaleString()} chars
                </span>
              </div>

              <p id="input-description" className="text-sm text-[#65625D] mb-4">
                Share the outcome you want, who it is for, and any real constraints that matter.
              </p>

              <textarea
                ref={inputTextareaRef}
                id="rough-request-input"
                name="roughRequest"
                rows={12}
                value={rawInput}
                onChange={(e) => {
                  setRawInput(e.target.value);
                  if (status === 'error' && errorMessage) {
                    setErrorMessage(null);
                    setStatus(optimizedPrompt ? 'success' : 'idle');
                  }
                }}
                onKeyDown={handleInputKeyDown}
                disabled={status === 'loading'}
                aria-describedby="input-description input-shortcut-hint"
                aria-invalid={status === 'error' && !rawInput.trim() ? 'true' : 'false'}
                placeholder={activeModeObj.placeholder}
                className="w-full flex-1 min-h-[280px] resize-y rounded-lg border border-[#D8D3CA] bg-[#FCFBF9] px-4 py-3.5 text-[15px] sm:text-base text-[#141413] placeholder:text-[#8A857E] leading-relaxed focus:bg-white focus:border-[#C84B31] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C84B31]/25 disabled:opacity-60 transition-opacity duration-150"
              />

              {/* Validation & API Error Alert */}
              <div aria-live="polite" className="mt-4">
                {errorMessage && (
                  <div
                    role="alert"
                    className="flex items-start gap-3 rounded-lg border border-[#B91C1C]/30 bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B] mb-4"
                  >
                    <AlertCircle className="w-4 h-4 text-[#B91C1C] shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="flex-1 leading-relaxed">{errorMessage}</div>
                  </div>
                )}
              </div>

              {/* Action Bar */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
                <span id="input-shortcut-hint" className="text-xs font-mono text-[#65625D] tabular-nums">
                  Press Cmd/Ctrl + Enter to optimize
                </span>

                <div className="flex items-center gap-3 ml-auto">
                  {rawInput.length > 0 && status !== 'loading' && (
                    <button
                      type="button"
                      onClick={handleStartOver}
                      className="px-3.5 py-2.5 text-sm font-semibold text-[#65625D] hover:text-[#141413] rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C84B31]"
                    >
                      Clear
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="inline-flex items-center justify-center gap-2.5 px-5 py-2.5 text-sm font-semibold text-white bg-[#C84B31] hover:bg-[#B03E26] disabled:opacity-60 disabled:pointer-events-none rounded-lg transition-opacity duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C84B31]"
                  >
                    {status === 'loading' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        <span>Optimizing with Argon...</span>
                      </>
                    ) : (
                      <>
                        <span>{activeModeObj.ctaLabel}</span>
                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </section>

          {/* Right Column: Optimized Prompt Output Pane */}
          <section
            aria-labelledby="output-heading"
            aria-live="polite"
            className="lg:col-span-6 flex flex-col justify-between bg-white border border-[#E6E2DC] rounded-xl p-6 sm:p-7"
          >
            <div className="flex flex-col flex-1">
              <div className="flex items-baseline justify-between gap-4 mb-2">
                <label
                  id="output-heading"
                  htmlFor="optimized-prompt-output"
                  className="font-display text-lg font-semibold text-[#141413]"
                >
                  Prompt for Gemini 4 Argon
                </label>
                <span className="text-xs text-[#65625D]">
                  Target model <span aria-hidden="true">·</span>{' '}
                  <span className="font-mono text-[#141413]">{configuredModel}</span>
                </span>
              </div>

              <p id="output-description" className="text-sm text-[#65625D] mb-4">
                Ready to copy directly into Gemini 4 Argon. You can edit any detail below before copying.
              </p>

              {/* State-driven Output Body */}
              {status === 'loading' ? (
                <div
                  role="status"
                  aria-label="Optimizing your prompt for Gemini 4 Argon"
                  className="flex-1 min-h-[280px] rounded-lg border border-[#E6E2DC] bg-[#FCFBF9] p-5 flex flex-col justify-between"
                >
                  <div className="space-y-3.5 animate-pulse">
                    <div className="h-4 bg-[#E6E2DC] rounded w-3/4" />
                    <div className="h-4 bg-[#E6E2DC] rounded w-full" />
                    <div className="h-4 bg-[#E6E2DC] rounded w-11/12" />
                    <div className="h-4 bg-[#E6E2DC] rounded w-4/5" />
                    <div className="pt-3 space-y-3">
                      <div className="h-4 bg-[#E6E2DC] rounded w-full" />
                      <div className="h-4 bg-[#E6E2DC] rounded w-2/3" />
                    </div>
                  </div>
                  <p className="text-xs font-mono text-[#65625D] pt-6">
                    Distilling goal, essential context, and outcome criteria with {configuredModel}...
                  </p>
                </div>
              ) : optimizedPrompt ? (
                <textarea
                  ref={outputTextareaRef}
                  id="optimized-prompt-output"
                  name="optimizedPrompt"
                  rows={12}
                  value={optimizedPrompt}
                  onChange={(e) => {
                    setOptimizedPrompt(e.target.value);
                    if (copied) setCopied(false);
                  }}
                  aria-describedby="output-description"
                  className="w-full flex-1 min-h-[280px] resize-y rounded-lg border border-[#D8D3CA] bg-[#FCFBF9] px-4 py-3.5 text-[15px] sm:text-base text-[#141413] leading-relaxed focus:bg-white focus:border-[#C84B31] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C84B31]/25 transition-opacity duration-150"
                />
              ) : (
                <div className="flex-1 min-h-[280px] rounded-lg border border-dashed border-[#D8D3CA] bg-[#FAF8F5]/60 px-6 py-8 flex flex-col items-center justify-center text-center">
                  <p className="font-display text-base font-semibold text-[#141413] mb-1.5">
                    Awaiting your request
                  </p>
                  <p className="text-sm text-[#65625D] max-w-sm leading-relaxed">
                    Enter your goal on the left and select <span className="font-semibold text-[#141413]">{activeModeObj.ctaLabel}</span>. Your ready-to-copy prompt will appear here in an editable field.
                  </p>
                </div>
              )}
            </div>

            {/* Output Action Footer */}
            <div className="pt-6 mt-auto flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs font-mono text-[#65625D] tabular-nums">
                {optimizedPrompt ? (
                  <span>
                    {optimizedPrompt.length.toLocaleString()} chars <span aria-hidden="true">·</span> Editable before copying
                  </span>
                ) : (
                  <span>Returns pure prompt text without commentary</span>
                )}
              </div>

              <div className="flex items-center gap-3 ml-auto">
                {optimizedPrompt && (
                  <button
                    type="button"
                    onClick={handleStartOver}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold text-[#65625D] hover:text-[#141413] rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C84B31]"
                  >
                    <RotateCcw className="w-4 h-4" aria-hidden="true" />
                    <span>Start over</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!optimizedPrompt.trim() || status === 'loading'}
                  className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-opacity duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C84B31] ${
                    copied
                      ? 'bg-[#15803D] text-white'
                      : 'bg-[#141413] text-white hover:bg-[#2B2A28] disabled:opacity-40 disabled:pointer-events-none'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" aria-hidden="true" />
                      <span>Copied to clipboard</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" aria-hidden="true" />
                      <span>Copy prompt</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Editorial Reference Section: Goal-First Prompting Principles */}
        <section
          id="principles"
          aria-labelledby="principles-heading"
          className="mt-16 pt-12 border-t border-[#E6E2DC]"
        >
          <div className="max-w-2xl mb-8">
            <h2
              id="principles-heading"
              className="font-display text-2xl font-semibold tracking-tight text-[#141413] mb-2"
              style={{ textWrap: 'balance' }}
            >
              How Gemini 4 Argon prefers to be prompted
            </h2>
            <p className="text-sm sm:text-base text-[#65625D] leading-relaxed">
              Frontier reasoning models work best when given a clear destination rather than a rigid script. Every optimization follows three editorial rules:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-display text-base font-semibold text-[#141413] mb-2">
                01. Outcome over procedure
              </h3>
              <p className="text-sm text-[#65625D] leading-relaxed">
                Defines what a successful result must accomplish, who it serves, and why it matters—without micromanaging the reasoning steps or forcing boilerplate checklists.
              </p>
            </div>

            <div>
              <h3 className="font-display text-base font-semibold text-[#141413] mb-2">
                02. Essential constraints only
              </h3>
              <p className="text-sm text-[#65625D] leading-relaxed">
                Preserves your stated tone, domain, and hard requirements while leaving creative direction and structural execution open where you did not restrict them.
              </p>
            </div>

            <div>
              <h3 className="font-display text-base font-semibold text-[#141413] mb-2">
                03. Proportional &amp; assumption-smart
              </h3>
              <p className="text-sm text-[#65625D] leading-relaxed">
                Keeps simple requests concise and resolves minor ambiguities with sensible assumptions, returning a ready-to-copy prompt with zero preamble or commentary.
              </p>
            </div>
          </div>
        </section>

        {/* Concise Local Setup & Configuration Reference */}
        <section
          id="setup"
          aria-labelledby="setup-heading"
          className="mt-12 pt-10 border-t border-[#E6E2DC] flex flex-col md:flex-row md:items-center justify-between gap-6 text-sm text-[#65625D]"
        >
          <div className="max-w-xl">
            <h2 id="setup-heading" className="font-display text-base font-semibold text-[#141413] mb-1">
              Server-side configuration &amp; local execution
            </h2>
            <p className="leading-relaxed">
              All model requests execute on the server via <code className="font-mono text-xs text-[#141413]">POST /api/optimize</code> using credentials from environment variables (<code className="font-mono text-xs text-[#141413]">GEMINI_API_KEY</code> and <code className="font-mono text-xs text-[#141413]">GEMINI_MODEL</code>, defaulting to <code className="font-mono text-xs text-[#141413]">gemini-4-argon</code>).
            </p>
          </div>

          <div className="text-xs font-mono text-[#65625D] shrink-0">
            <span>Active model identifier</span>
            <span aria-hidden="true"> · </span>
            <span className="text-[#141413] font-medium">{configuredModel}</span>
          </div>
        </section>
      </main>
    </div>
  );
}
