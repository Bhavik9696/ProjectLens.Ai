import React from 'react';
import { ProjectHealthMetrics } from '../types';
import {
  ShieldAlert,
  ShieldCheck,
  Flame,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';

interface ProjectHealthCardProps {
  metrics: ProjectHealthMetrics;
}

export const ProjectHealthCard: React.FC<ProjectHealthCardProps> = ({ metrics }) => {
  const {
    requirementCoverage,
    implementationCoverage,
    sprintProgress,
    githubActivity,
    overallScore,
    healthRating,
    highRiskModules,
    keyRiskFactors,
  } = metrics;

  const getHealthTheme = () => {
    if (healthRating === 'Healthy') {
      return {
        bg: 'bg-[var(--panel)] border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.08)]',
        text: 'text-emerald-400',
        badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
        icon: ShieldCheck,
      };
    }
    if (healthRating === 'Medium Risk') {
      return {
        bg: 'bg-[var(--panel)] border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.08)]',
        text: 'text-amber-400',
        badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
        icon: ShieldAlert,
      };
    }
    return {
      bg: 'bg-[var(--panel)] border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.08)]',
      text: 'text-rose-400',
      badgeBg: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
      icon: Flame,
    };
  };

  const theme = getHealthTheme();
  const Icon = theme.icon;

  return (
    <div className={`border rounded-2xl p-6 ${theme.bg} space-y-6 transition-all relative overflow-hidden`}>
      {/* Background Accent Grid Subtle */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(214,255,63,0.04)_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      {/* Top Title & Overall Gauge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${theme.badgeBg}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono font-bold text-[var(--accent)] tracking-wider">
                HEALTH ANALYSIS ENGINE
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-extrabold border ${theme.badgeBg}`}>
                {healthRating}
              </span>
            </div>
            <h3 className="text-lg font-bold text-[var(--text-1)] mt-0.5">Overall Project Health Score</h3>
          </div>
        </div>

        {/* Big Score Meter */}
        <div className="flex items-baseline gap-1 text-right bg-[var(--bg)]/80 px-4 py-2 rounded-xl border border-[var(--border)]">
          <span className={`text-4xl font-black font-mono tracking-tight ${theme.text}`}>
            {overallScore}
          </span>
          <span className="text-sm font-mono font-bold text-[var(--text-4)]">/100</span>
        </div>
      </div>

      {/* Weighted Health Parameters Breakdown */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs relative z-10">
        {/* Requirement Coverage 40% */}
        <div className="bg-[var(--bg)]/90 p-3.5 rounded-xl border border-[var(--border)] space-y-1.5">
          <div className="flex items-center justify-between text-[var(--text-4)] text-[11px]">
            <span>Req Coverage</span>
            <span className="font-mono font-bold text-[var(--accent)]">40% Weight</span>
          </div>
          <p className="text-lg font-bold text-[var(--text-1)] font-mono">{requirementCoverage}%</p>
          <div className="w-full bg-[var(--panel)] h-1.5 rounded-full overflow-hidden border border-[var(--border-1)]">
            <div className="bg-[var(--accent)] h-full rounded-full" style={{ width: `${requirementCoverage}%` }} />
          </div>
        </div>

        {/* Implementation Coverage 30% */}
        <div className="bg-[var(--bg)]/90 p-3.5 rounded-xl border border-[var(--border)] space-y-1.5">
          <div className="flex items-center justify-between text-[var(--text-4)] text-[11px]">
            <span>Impl Coverage</span>
            <span className="font-mono font-bold text-[var(--accent-dim)]">30% Weight</span>
          </div>
          <p className="text-lg font-bold text-[var(--text-1)] font-mono">{implementationCoverage}%</p>
          <div className="w-full bg-[var(--panel)] h-1.5 rounded-full overflow-hidden border border-[var(--border-1)]">
            <div className="bg-[var(--accent-dim)] h-full rounded-full" style={{ width: `${implementationCoverage}%` }} />
          </div>
        </div>

        {/* Sprint Progress 20% */}
        <div className="bg-[var(--bg)]/90 p-3.5 rounded-xl border border-[var(--border)] space-y-1.5">
          <div className="flex items-center justify-between text-[var(--text-4)] text-[11px]">
            <span>Sprint Velocity</span>
            <span className="font-mono font-bold text-emerald-400">20% Weight</span>
          </div>
          <p className="text-lg font-bold text-[var(--text-1)] font-mono">{sprintProgress}%</p>
          <div className="w-full bg-[var(--panel)] h-1.5 rounded-full overflow-hidden border border-[var(--border-1)]">
            <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${sprintProgress}%` }} />
          </div>
        </div>

        {/* GitHub Activity 10% */}
        <div className="bg-[var(--bg)]/90 p-3.5 rounded-xl border border-[var(--border)] space-y-1.5">
          <div className="flex items-center justify-between text-[var(--text-4)] text-[11px]">
            <span>GitHub Activity</span>
            <span className="font-mono font-bold text-amber-400">10% Weight</span>
          </div>
          <p className="text-lg font-bold text-[var(--text-1)] font-mono">{githubActivity}%</p>
          <div className="w-full bg-[var(--panel)] h-1.5 rounded-full overflow-hidden border border-[var(--border-1)]">
            <div className="bg-amber-400 h-full rounded-full" style={{ width: `${githubActivity}%` }} />
          </div>
        </div>
      </div>

      {/* High Risk Factors & Modules Alert Box */}
      {keyRiskFactors.length > 0 && (
        <div className="bg-[var(--bg)]/90 p-4 rounded-xl border border-rose-500/30 space-y-2 text-xs relative z-10">
          <span className="font-mono font-bold text-rose-300 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            Identified Risk Factors ({keyRiskFactors.length})
          </span>
          <ul className="space-y-1 text-[var(--text-3)] pl-5 list-disc font-sans">
            {keyRiskFactors.map((factor, idx) => (
              <li key={idx} className="leading-snug">
                {factor}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
