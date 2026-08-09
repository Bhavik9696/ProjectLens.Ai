import React, { useRef, useEffect } from 'react';
import {
  ArrowRight,
  Play,
  GitBranch,
  FileText,
  Radar,
  Bot,
  Database,
  Component,
  Server,
  Github,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface LandingPageProps {
  onGetStarted: () => void;
}

// Scoped design tokens for the landing page — computed based on active theme
// so both dark and light modes work correctly.
function getTokens(isDark: boolean): React.CSSProperties {
  return isDark
    ? {
        ['--lens-bg' as any]:          '#0a0a0a',
        ['--lens-panel' as any]:       '#131313',
        ['--lens-panel-2' as any]:     '#17170e',
        ['--lens-border' as any]:      'rgba(255,255,255,0.09)',
        ['--lens-accent' as any]:      '#d6ff3f',
        ['--lens-accent-dim' as any]:  '#9cb82e',
        ['--lens-text' as any]:        '#f5f5f1',
        ['--lens-text-dim' as any]:    '#9a9a92',
      }
    : {
        ['--lens-bg' as any]:          '#f5f5f0',
        ['--lens-panel' as any]:       '#ffffff',
        ['--lens-panel-2' as any]:     '#fffef5',
        ['--lens-border' as any]:      'rgba(0,0,0,0.10)',
        ['--lens-accent' as any]:      '#8aaa00',
        ['--lens-accent-dim' as any]:  '#6a8800',
        ['--lens-text' as any]:        '#111110',
        ['--lens-text-dim' as any]:    '#666660',
      };
}

const NAV_LINKS = ['Product', 'Features', 'How it Works', 'Docs'];

const INTEGRATIONS = [
  { icon: Github, label: 'GitHub' },
  { icon: Database, label: 'MongoDB' },
  { icon: Server, label: 'Express' },
  { icon: Component, label: 'React' },
  { icon: Sparkles, label: 'Gemini AI' },
];

const FEATURES = [
  {
    icon: FileText,
    title: 'Requirement Extraction',
    desc: 'Paste or upload an SRS and ProjectLens parses it into structured, trackable requirements automatically.',
  },
  {
    icon: Radar,
    title: 'Code-Level Verification',
    desc: 'Every requirement is checked against real files, routes, and commits in your GitHub repository — not a guess.',
  },
  {
    icon: ShieldCheck,
    title: 'Project Health Scoring',
    desc: 'A single weighted score blends requirement coverage, code coverage, and repo activity into one risk rating.',
  },
  {
    icon: Bot,
    title: 'AI Copilot',
    desc: 'Ask what shipped, what is missing, or what to prioritize next — every answer cites the exact evidence behind it.',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Upload your spec',
    desc: 'Drop in an SRS, proposal, or sprint doc. ProjectLens extracts every requirement and expected component.',
  },
  {
    n: '02',
    title: 'Connect the repo',
    desc: 'Point it at a GitHub repository. It reads the file tree, commits, pull requests, and open issues.',
  },
  {
    n: '03',
    title: 'Get real coverage',
    desc: 'See exactly what is implemented, what is partial, and what was never built — with file-level evidence.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const tokens = getTokens(isDark);

  return (
    <div style={tokens} className="min-h-screen bg-[var(--lens-bg)] text-[var(--lens-text)] font-sans antialiased selection:bg-[var(--lens-accent)]/30 selection:text-[var(--lens-accent)]">
      {/* ---------------------------------------------------------------- */}
      {/* Nav                                                               */}
      {/* ---------------------------------------------------------------- */}
      <div className="px-4 sm:px-6 pt-5">
        <nav className="max-w-6xl mx-auto flex items-center justify-between rounded-2xl border border-[var(--lens-border)] bg-[var(--lens-panel)]/80 backdrop-blur-md px-5 py-3 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--lens-accent)]/15 border border-[var(--lens-accent)]/30 flex items-center justify-center">
              <Radar className="w-4 h-4 text-[var(--lens-accent)]" />
            </div>
            <span className="font-extrabold tracking-tight text-[15px]">ProjectLens<span className="text-[var(--lens-accent)]"> AI</span></span>
          </div>

          <div className="hidden md:flex items-center gap-7 text-[13px] font-medium text-[var(--lens-text-dim)]">
            {NAV_LINKS.map((link) => (
              <a key={link} href="#" className="hover:text-[var(--lens-text)] transition-colors">
                {link}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              id="landing-theme-toggle-btn"
              onClick={toggleTheme}
              title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              aria-label={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--lens-panel)] hover:bg-[var(--lens-panel-2)] text-[var(--lens-text-dim)] hover:text-[var(--lens-accent)] border border-[var(--lens-border)] hover:border-[var(--lens-accent)]/40 transition-colors cursor-pointer flex-shrink-0"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={onGetStarted}
              className="px-4 py-2 rounded-xl bg-[var(--lens-accent)] text-black text-[13px] font-bold hover:brightness-110 transition-all shadow-[0_0_20px_-4px_var(--lens-accent)] cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </nav>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                              */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden">
        {/* Corner spotlight glows, matching the reference image's ambient lighting */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 bg-[var(--lens-accent)]/10 blur-[100px] rounded-full" />
        <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 bg-[var(--lens-accent)]/10 blur-[100px] rounded-full" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-10 relative">
          <div className="flex justify-center mb-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--lens-accent)]/30 bg-[var(--lens-accent)]/10 px-4 py-1.5 text-[12px] font-mono text-[var(--lens-accent)]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--lens-accent)] opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--lens-accent)]" />
              </span>
              Live Requirement-to-Code Sync
            </div>
          </div>

          <h1 className="text-center font-extrabold tracking-tight leading-[1.05] text-[42px] sm:text-[56px] md:text-[64px]">
            Know What's Actually
            <br />
            <span className="text-[var(--lens-accent)]">Built</span>, Not Promised
          </h1>

          <p className="max-w-xl mx-auto text-center mt-6 text-[15px] sm:text-base text-[var(--lens-text-dim)] leading-relaxed">
            ProjectLens AI compares your requirement documents against real GitHub code, so every
            status update is backed by evidence — not a guess.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-9">
            <button
              onClick={onGetStarted}
              className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--lens-accent)] text-black font-bold text-sm hover:brightness-110 transition-all shadow-[0_0_30px_-6px_var(--lens-accent)] cursor-pointer"
            >
              Launch ProjectLens
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button className="inline-flex items-center gap-2.5 text-sm font-semibold text-[var(--lens-text)] cursor-pointer">
              <span className="w-9 h-9 rounded-full bg-[var(--lens-panel-2)] border border-[var(--lens-border)] flex items-center justify-center">
                <Play className="w-3.5 h-3.5 fill-current text-[var(--lens-accent)] text-[var(--lens-accent)] ml-0.5" />
              </span>
              See How It Works
            </button>
          </div>
          <p className="text-center text-[12px] font-mono text-[var(--lens-text-dim)]/70 mt-3">
            No setup required — connect a repo in seconds
          </p>

          {/* Signature element: "Coverage Cards" — the credit-card motif from
              the reference, translated into the product's own artifact: a
              requirement's real evidence-backed coverage state. */}
          <div className="relative h-[260px] sm:h-[300px] mt-14 max-w-3xl mx-auto">
            <CoverageCard
              className="absolute left-0 sm:left-4 top-16 sm:top-20 -rotate-6 w-[210px] sm:w-[240px]"
              module="Authentication"
              percent={62}
              status="Partial"
            />
            <CoverageCard
              className="absolute right-0 sm:right-4 top-0 rotate-3 w-[240px] sm:w-[270px]"
              module="Payment Gateway"
              percent={94}
              status="Implemented"
              elevated
            />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Diagonal marquee ribbon                                          */}
      {/* ---------------------------------------------------------------- */}
      <section className="mt-4 mb-24 overflow-hidden">
        <p className="text-center text-[11px] font-mono tracking-[0.2em] text-[var(--lens-text-dim)] mb-4">
          INTEGRATES WITH YOUR STACK
        </p>
        <div className="-rotate-2 -mx-8">
          <div className="bg-gradient-to-r from-[var(--lens-accent-dim)] via-[var(--lens-accent)] to-[var(--lens-accent-dim)] py-4">
            <div className="flex items-center gap-16 animate-[marquee_22s_linear_infinite] whitespace-nowrap w-max">
              {[...INTEGRATIONS, ...INTEGRATIONS, ...INTEGRATIONS].map(({ icon: Icon, label }, i) => (
                <span key={i} className="inline-flex items-center gap-2.5 text-black/85 font-bold text-[15px]">
                  <Icon className="w-4 h-4" strokeWidth={2.5} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Features                                                         */}
      {/* ---------------------------------------------------------------- */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
        <div className="max-w-xl mb-12">
          <p className="text-[12px] font-mono tracking-[0.2em] text-[var(--lens-accent)] mb-3">WHAT IT DOES</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Evidence, not status meetings
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-[var(--lens-border)] bg-[var(--lens-panel)] p-5 hover:border-[var(--lens-accent)]/40 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--lens-accent)]/10 border border-[var(--lens-accent)]/25 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-[var(--lens-accent)]" />
              </div>
              <h3 className="font-bold text-[15px] mb-2">{title}</h3>
              <p className="text-[13px] text-[var(--lens-text-dim)] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* How it works — a real 3-step sequence, so numbering is earned    */}
      {/* ---------------------------------------------------------------- */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
        <div className="max-w-xl mb-12">
          <p className="text-[12px] font-mono tracking-[0.2em] text-[var(--lens-accent)] mb-3">THE FLOW</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Three steps to real coverage</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((step, i) => (
            <div key={step.n} className="relative">
              <span className="font-mono text-[13px] text-[var(--lens-accent)]">{step.n}</span>
              <h3 className="text-lg font-bold mt-3 mb-2">{step.title}</h3>
              <p className="text-[13px] text-[var(--lens-text-dim)] leading-relaxed">{step.desc}</p>
              {i < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-1.5 -right-4 w-8 h-px bg-[var(--lens-border)]" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Closing CTA                                                      */}
      {/* ---------------------------------------------------------------- */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-[var(--lens-accent)]/25 bg-[var(--lens-panel)] px-8 py-14 text-center">
          <div className="pointer-events-none absolute -bottom-24 left-1/2 -translate-x-1/2 w-[420px] h-80 bg-[var(--lens-accent)]/10 blur-[100px] rounded-full" />
          <div className="relative">
            <h2 className="text-3xl sm:text-[40px] font-extrabold tracking-tight leading-tight">
              Stop reporting on faith.
              <br />
              Start reporting on <span className="text-[var(--lens-accent)]">evidence</span>.
            </h2>
            <button
              onClick={onGetStarted}
              className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--lens-accent)] text-black font-bold text-sm hover:brightness-110 transition-all shadow-[0_0_30px_-6px_var(--lens-accent)] cursor-pointer"
            >
              Launch ProjectLens
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Footer                                                           */}
      {/* ---------------------------------------------------------------- */}
      <footer className="border-t border-[var(--lens-border)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[var(--lens-accent)]/15 border border-[var(--lens-accent)]/30 flex items-center justify-center">
              <Radar className="w-3 h-3 text-[var(--lens-accent)]" />
            </div>
            <span className="text-[13px] font-bold">ProjectLens AI</span>
          </div>
          <p className="text-[12px] text-[var(--lens-text-dim)]">Requirement-to-code evidence for engineering teams.</p>
        </div>
      </footer>

      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  );
};

/* -------------------------------------------------------------------- */
/* Signature hero visual: a "coverage card" — the credit-card motif from */
/* the reference image, reinterpreted as the product's own evidence     */
/* artifact (module name, coverage ring, status, evidence ticks).       */
/* -------------------------------------------------------------------- */
function CoverageCard({
  className = '',
  module,
  percent,
  status,
  elevated = false,
}: {
  className?: string;
  module: string;
  percent: number;
  status: 'Implemented' | 'Partial';
  elevated?: boolean;
}) {
  const isGood = status === 'Implemented';
  return (
    <div
      className={`${className} rounded-2xl border border-[var(--lens-border)] bg-gradient-to-br from-[#181818] to-[#0d0d0d] p-4 shadow-2xl ${
        elevated ? 'shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)]' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-6">
        <div className="w-7 h-9 rounded-md bg-[var(--lens-accent)]" />
        <span
          className={`text-[10px] font-mono font-bold px-2 py-1 rounded-full border ${
            isGood
              ? 'text-[var(--lens-accent)] border-[var(--lens-accent)]/40 bg-[var(--lens-accent)]/10'
              : 'text-amber-300 border-amber-300/30 bg-amber-300/10'
          }`}
        >
          {status}
        </span>
      </div>

      <p className="text-[11px] font-mono text-[var(--lens-text-dim)] mb-1">{module}</p>
      <p className="text-3xl font-extrabold tracking-tight text-[var(--lens-text)] mb-4">
        {percent}<span className="text-base text-[var(--lens-text-dim)]">%</span>
      </p>

      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`w-1 h-3 rounded-full ${i < Math.round((percent / 100) * 6) ? 'bg-[var(--lens-accent)]' : 'bg-white/10'}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-1 text-[var(--lens-text-dim)]">
          {isGood ? <CheckCircle2 className="w-3.5 h-3.5" /> : <GitBranch className="w-3.5 h-3.5" />}
          <span className="text-[10px] font-mono">GitHub</span>
        </div>
      </div>
    </div>
  );
}
