import React from 'react';
import { ProjectIntelligenceData } from '../types';
import { ProjectHealthCard } from './ProjectHealthCard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  GitBranch,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Code,
  FileText,
  Bot,
  Tag,
  Zap,
  Gift,
  AlertTriangle,
} from 'lucide-react';

interface DashboardProps {
  data: ProjectIntelligenceData | null;
  onNavigateTab: (tab: string) => void;
  freeProjectsRemaining?: number;
  paidCredits?: number;
  onBuyCredits?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ data, onNavigateTab, freeProjectsRemaining = 2, paidCredits = 0, onBuyCredits }) => {
  const FREE_TOTAL = 2;
  const hasCredits = freeProjectsRemaining > 0 || paidCredits > 0;
  const outOfCredits = freeProjectsRemaining === 0 && paidCredits === 0;
  if (!data) {
    return (
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-12 text-center max-w-xl mx-auto space-y-5 my-12 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center mx-auto border border-[var(--accent)]/30 shadow-[0_0_20px_rgba(214,255,63,0.1)]">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-[var(--text-1)] font-sans">No Projects Available</h2>
          <p className="text-xs text-[var(--text-4)] max-w-md mx-auto leading-relaxed">
            Create your first software project to analyze SRS requirements, extract functional specs, and verify code implementation against GitHub repositories.
          </p>
        </div>
        <button
          onClick={() => onNavigateTab('documents')}
          className="px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:brightness-110 text-black text-xs font-bold transition-all inline-flex items-center gap-2 shadow-[0_0_20px_-4px_var(--accent)] cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Start First Project</span>
        </button>
      </div>
    );
  }

  const { project, requirements, analysisResults, healthMetrics, implementationProfile } = data;

  // Feature 3: Getting Started checklist steps
  const checklistSteps = [
    {
      id: 'project',
      label: 'Create a Project',
      done: true, // always done if we're on the dashboard with a project
      tab: 'dashboard',
    },
    {
      id: 'documents',
      label: 'Upload Documents',
      done: data.documents.length > 0,
      tab: 'documents',
    },
    {
      id: 'github',
      label: 'Connect GitHub Repository',
      done: !!data.implementationProfile,
      tab: 'github',
    },
    {
      id: 'analysis',
      label: 'Run Coverage Analysis',
      done: data.analysisResults.some((r) => r.coveragePercent > 0),
      tab: 'rtm',
    },
  ];
  const completedCount = checklistSteps.filter((s) => s.done).length;
  const allDone = completedCount === checklistSteps.length;

  // Prepare chart data
  const chartData = analysisResults.map((r) => ({
    name: r.module,
    Coverage: r.coveragePercent,
    Expected: r.expectedComponents.length,
    Found: r.foundComponents.length,
  }));

  const pieData = [
    { name: 'Implemented', value: analysisResults.filter((r) => r.status === 'Implemented' || r.status === 'Completed').length, color: '#10b981' },
    { name: 'Partially Implemented', value: analysisResults.filter((r) => r.status === 'Partially Implemented' || r.status === 'Partial').length, color: '#f59e0b' },
    { name: 'Missing', value: analysisResults.filter((r) => r.status === 'Missing').length, color: '#f43f5e' },
    { name: 'Unable to Determine', value: analysisResults.filter((r) => r.status === 'Unable to Determine').length, color: '#4a4a44' },
  ].filter((p) => p.value > 0);

  const missingReqs = analysisResults.filter((r) => r.status === 'Missing' || r.status === 'Partially Implemented' || r.status === 'Partial');
  const implementedModules = Array.from(
    new Set(analysisResults.filter((r) => r.status === 'Implemented' || r.status === 'Completed').map((r) => r.module))
  );

  return (
    <div className="space-y-6">
      {/* ── Feature 3: Getting Started Checklist ─────────────────────────── */}
      {!allDone && (
        <div
          className="rounded-2xl border p-5 space-y-4 relative overflow-hidden"
          style={{ background: 'var(--panel)', borderColor: 'rgba(214,255,63,0.2)' }}
        >
          {/* Glow */}
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(214,255,63,0.07) 0%, transparent 70%)', filter: 'blur(16px)' }} />

          <div className="flex items-center justify-between relative z-10">
            <div>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>
                🚀 Getting Started
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-4)' }}>
                {completedCount} of {checklistSteps.length} steps complete
              </p>
            </div>
            <span className="text-xs font-mono font-bold" style={{ color: 'var(--accent)' }}>
              {Math.round((completedCount / checklistSteps.length) * 100)}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 rounded-full relative z-10" style={{ background: 'var(--surface-5)' }}>
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${(completedCount / checklistSteps.length) * 100}%`, background: 'var(--accent)' }}
            />
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 relative z-10">
            {checklistSteps.map((step, i) => (
              <button
                key={step.id}
                onClick={() => onNavigateTab(step.tab)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer"
                style={{
                  background: step.done ? 'rgba(16,185,129,0.06)' : 'var(--bg)',
                  borderColor: step.done ? 'rgba(16,185,129,0.25)' : 'var(--border)',
                }}
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold border"
                  style={{
                    background: step.done ? '#10b981' : 'var(--surface-3)',
                    borderColor: step.done ? '#10b981' : 'var(--border-2)',
                    color: step.done ? '#000' : 'var(--text-5)',
                  }}
                >
                  {step.done ? '✓' : i + 1}
                </div>
                <span
                  className="text-xs font-semibold"
                  style={{ color: step.done ? '#10b981' : 'var(--text-3)' }}
                >
                  {step.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Credit Status Banner ─────────────────────────────────────────── */}
      <div
        className="rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden"
        style={{
          background:  outOfCredits ? 'rgba(244,63,94,0.04)' : 'var(--panel)',
          borderColor: outOfCredits ? 'rgba(244,63,94,0.3)'  : 'var(--border)',
          boxShadow:   outOfCredits ? '0 0 30px rgba(244,63,94,0.06)' : 'none',
        }}
      >
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full pointer-events-none"
          style={{ background: outOfCredits ? 'radial-gradient(circle, rgba(244,63,94,0.08) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(214,255,63,0.06) 0%, transparent 70%)', filter: 'blur(20px)' }} />

        <div className="flex items-center gap-4 relative z-10">
          {/* Free projects counter */}
          <div className="flex flex-col items-center justify-center w-16 h-16 rounded-xl border flex-shrink-0"
            style={{ background: 'var(--bg)', borderColor: 'var(--border-2)' }}>
            <Gift className="w-4 h-4 mb-1" style={{ color: 'var(--accent)' }} />
            <span className="text-lg font-extrabold font-mono leading-none" style={{ color: freeProjectsRemaining > 0 ? 'var(--accent)' : 'var(--text-4)' }}>
              {FREE_TOTAL - freeProjectsRemaining}/{FREE_TOTAL}
            </span>
            <span className="text-[9px] font-mono uppercase" style={{ color: 'var(--text-5)' }}>Free Used</span>
          </div>

          {/* Paid credits counter */}
          <div className="flex flex-col items-center justify-center w-16 h-16 rounded-xl border flex-shrink-0"
            style={{ background: 'var(--bg)', borderColor: 'var(--border-2)' }}>
            <Zap className="w-4 h-4 mb-1" style={{ color: paidCredits > 0 ? 'var(--accent)' : 'var(--text-5)' }} />
            <span className="text-lg font-extrabold font-mono leading-none" style={{ color: paidCredits > 0 ? 'var(--text-1)' : 'var(--text-5)' }}>
              {paidCredits}
            </span>
            <span className="text-[9px] font-mono uppercase" style={{ color: 'var(--text-5)' }}>Paid Credits</span>
          </div>

          <div className="space-y-0.5">
            <p className="text-sm font-bold" style={{ color: outOfCredits ? '#f87171' : 'var(--text-1)' }}>
              {outOfCredits
                ? 'No project credits remaining'
                : freeProjectsRemaining > 0
                  ? `${freeProjectsRemaining} free project${freeProjectsRemaining > 1 ? 's' : ''} remaining`
                  : `${paidCredits} paid credit${paidCredits > 1 ? 's' : ''} remaining`
              }
            </p>
            <p className="text-xs" style={{ color: 'var(--text-4)' }}>
              {outOfCredits
                ? 'Your free projects are complete. Purchase project credits to continue.'
                : 'Free projects are consumed before paid credits.'
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 relative z-10 flex-shrink-0">
          {outOfCredits && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border"
              style={{ background: 'rgba(244,63,94,0.08)', borderColor: 'rgba(244,63,94,0.3)', color: '#f87171' }}>
              <AlertTriangle className="w-3.5 h-3.5" />
              Out of credits
            </div>
          )}
          <button
            id="dashboard-buy-credits-btn"
            onClick={onBuyCredits}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer"
            style={{
              background:  outOfCredits ? '#f43f5e' : 'var(--accent)',
              color:       '#000',
              boxShadow:   outOfCredits ? '0 0 20px rgba(244,63,94,0.35)' : '0 0 20px rgba(214,255,63,0.25)',
            }}
          >
            <Zap className="w-3.5 h-3.5" />
            Buy Credits
          </button>
        </div>
      </div>
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Top Project Overview Banner */}
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-6 shadow-[0_0_30px_rgba(0,0,0,0.4)] flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
        {/* Accent glow */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-[var(--accent)]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-3 max-w-3xl relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30">
              {project.id}
            </span>
            <h1 className="text-2xl font-extrabold text-[var(--text-1)] tracking-tight font-sans">{project.name}</h1>
          </div>

          <p className="text-xs text-[var(--text-4)] leading-relaxed">{project.description}</p>

          <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-4)] pt-1">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Deadline: <strong className="text-[var(--text-2)] font-mono">{project.deadline}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span className="font-mono text-[var(--accent)] truncate max-w-[200px]">{project.githubUrl}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[var(--text-4)]" />
              <span>Tech Stack:</span>
              <div className="flex gap-1 flex-wrap">
                {project.techStack.map((tech) => (
                  <span
                    key={tech}
                    className="px-1.5 py-0.5 rounded bg-[var(--bg)] text-[var(--accent)] border border-[var(--accent)]/20 text-[10px] font-mono"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Copilot Jump Button */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 relative z-10">
          <button
            onClick={() => onNavigateTab('copilot')}
            className="px-4 py-2.5 rounded-xl bg-[var(--accent)] hover:brightness-110 text-black font-bold text-xs shadow-[0_0_20px_-4px_var(--accent)] flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Bot className="w-4 h-4" />
            <span>Ask AI Copilot</span>
          </button>
          <button
            onClick={() => onNavigateTab('rtm')}
            className="px-4 py-2.5 rounded-xl bg-[var(--bg)] hover:bg-[var(--surface-3)] text-[var(--text-2)] border border-[var(--border-2)] font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Layers className="w-4 h-4 text-[var(--text-4)]" />
            <span>View Full RTM Table</span>
          </button>
        </div>
      </div>

      {/* Step 10 Project Health Card */}
      <ProjectHealthCard metrics={healthMetrics} />

      {/* Missing Requirements Alert Banner */}
      {missingReqs.length > 0 && (
        <div className="bg-[var(--panel)] border border-amber-500/30 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>Attention Needed: {missingReqs.length} Requirements Incomplete or Missing</span>
            </div>
            <button
              onClick={() => onNavigateTab('coverage')}
              className="text-xs font-semibold text-amber-300 hover:text-amber-200 flex items-center gap-1 underline underline-offset-2"
            >
              <span>Inspect Component Gaps</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {missingReqs.map((req) => (
              <div
                key={req.requirementId}
                className="bg-[var(--bg)] p-3 rounded-xl border border-amber-500/20 flex items-start justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-400">{req.requirementId}</span>
                    <span className="font-semibold text-[var(--text-2)]">{req.module}</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-4)] mt-1">
                    Missing: {req.missingComponents.join(', ') || 'Partial Codebase Evidence'}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 shrink-0">
                  {req.coveragePercent}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visualizations & Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coverage Chart (2 cols) */}
        <div className="lg:col-span-2 bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--text-1)] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[var(--accent)]" />
              Requirement Implementation Coverage by Module (%)
            </h3>
            <span className="text-[10px] font-mono uppercase font-bold text-[var(--accent)]/80 bg-[var(--accent)]/10 px-2 py-0.5 rounded border border-[var(--accent)]/20">Deterministic Metric</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#6a6a62" fontSize={11} tickLine={false} />
                <YAxis stroke="#6a6a62" fontSize={11} domain={[0, 100]} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#131313', borderColor: 'rgba(214,255,63,0.2)', borderRadius: '12px', fontSize: '12px', color: '#f5f5f1' }}
                />
                <Bar dataKey="Coverage" fill="#d6ff3f" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution Pie */}
        <div className="lg:col-span-1 bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-[var(--text-1)] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Requirement Status Breakdown
          </h3>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#131313', borderColor: 'rgba(214,255,63,0.2)', borderRadius: '12px', fontSize: '12px', color: '#f5f5f1' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-4 text-xs font-semibold">
            {pieData.map((p) => (
              <div key={p.name} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="text-[var(--text-3)]">{p.name}: <strong className="text-[var(--text-1)] font-mono">{p.value}</strong></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Recommendations & GitHub Feed Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Executive Summary with AI ANALYSIS ENGINE badge */}
        <div className="ai-copilot-panel p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--accent)]/15 pb-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center border border-[var(--accent)]/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-1)]">AI Project Manager Insights & Guidance</h3>
              <p className="text-[11px] text-[var(--text-4)]">Server-side Gemini RAG explanation of backend analysis</p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-[var(--text-3)] leading-relaxed">
            <p className="bg-[var(--bg)]/90 p-3.5 rounded-xl border border-[var(--border)]">
              The project is currently tracking at <strong className="text-amber-400 font-mono">{healthMetrics.requirementCoverage}% Requirement Coverage</strong>.
              Core modules such as <strong className="text-emerald-400">Authentication</strong> and <strong className="text-emerald-400">Shopping Cart</strong> are 100% verified against code evidence.
            </p>

            <div className="space-y-2">
              <span className="text-[10px] uppercase font-mono font-bold text-[var(--accent)] block">Recommended PM Actions:</span>
              <ul className="space-y-1.5 list-disc pl-4 text-[var(--text-3)]">
                {missingReqs.map((r) => (
                  <li key={r.requirementId}>
                    <strong className="text-[var(--text-1)] font-mono">{r.requirementId} ({r.module}):</strong> {r.recommendation}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* GitHub Recent Activity */}
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-1)] pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center border border-[var(--accent)]/20">
                <GitBranch className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-1)]">Recent GitHub Code Evidence</h3>
                <p className="text-[11px] text-[var(--text-4)]">Commits and Pull Requests from repository</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('github')}
              className="text-xs text-[var(--accent)] hover:text-[var(--accent-dim)] font-medium transition-colors"
            >
              View Repository Inspector
            </button>
          </div>

          <div className="space-y-2">
            {implementationProfile?.commits?.slice(0, 4).map((c) => (
              <div
                key={c.hash}
                className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-start justify-between gap-2 text-xs hover:border-[var(--accent)]/20 transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-[var(--accent)] font-bold">{c.hash}</span>
                    <span className="text-[var(--text-4)]">• {c.author}</span>
                  </div>
                  <p className="text-[var(--text-2)] line-clamp-1">{c.message}</p>
                </div>
                <span className="text-[10px] font-mono text-[var(--text-5)] shrink-0">{c.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
