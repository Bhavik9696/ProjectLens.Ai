import React from 'react';
import { RequirementAnalysisResult } from '../types';
import {
  Cpu,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Percent,
  Check,
  X,
  Sparkles,
  Layers,
  Zap,
} from 'lucide-react';

interface CoverageAnalyzerProps {
  analysisResults: RequirementAnalysisResult[];
}

export const CoverageAnalyzer: React.FC<CoverageAnalyzerProps> = ({
  analysisResults = [],
}) => {
  const safeResults = analysisResults || [];
  const totalExpected = safeResults.reduce((acc, curr) => acc + (curr.expectedComponents?.length || 0), 0);
  const totalFound = safeResults.reduce((acc, curr) => acc + (curr.foundComponents?.length || 0), 0);
  const overallCoverage = totalExpected > 0 ? Math.round((totalFound / totalExpected) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header Banner & Math Formula Card */}
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30">
                COVERAGE ENGINE
              </span>
              <h2 className="text-xl font-extrabold text-[var(--text-1)]">Implementation Coverage Analyzer</h2>
            </div>
            <p className="text-xs text-[var(--text-4)]">
              Deterministic mathematical calculation comparing expected SRS components against repository code evidence.
            </p>
          </div>

          <div className="bg-[var(--bg)] border border-[var(--border)] px-5 py-3 rounded-2xl flex items-center gap-4 shrink-0">
            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-[var(--text-4)] block">Total Coverage</span>
              <span className="text-2xl font-extrabold text-[var(--accent)] font-mono">{overallCoverage}%</span>
            </div>
            <div className="h-8 w-px bg-[var(--border)]" />
            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-[var(--text-4)] block">Implemented Ratio</span>
              <span className="text-sm font-bold text-[var(--text-2)] font-mono">
                {totalFound} / {totalExpected}
              </span>
            </div>
          </div>
        </div>

        {/* Mathematical Formula Card */}
        <div className="p-4 rounded-xl bg-[var(--bg)] border border-[var(--accent)]/20 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--accent)]">
            <Calculator className="w-4 h-4" />
            <span>Deterministic Mathematical Coverage Formula</span>
          </div>
          <div className="bg-[var(--panel)]/90 p-3 rounded-lg border border-[var(--border)] font-mono text-xs text-[var(--text-2)] flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-center">
            <span className="text-[var(--accent)] font-bold">Coverage %</span>
            <span className="text-[var(--text-5)]">=</span>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                Implemented Components ({totalFound})
              </span>
              <span className="text-[var(--text-5)]">÷</span>
              <span className="px-2 py-1 rounded bg-[var(--panel)] text-[var(--text-3)] border border-[var(--border-2)]">
                Expected Components ({totalExpected})
              </span>
            </div>
            <span className="text-[var(--text-5)]">×</span>
            <span className="text-amber-400 font-bold">100</span>
          </div>
        </div>
      </div>

      {/* Module Breakdown Cards Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-[var(--text-2)] uppercase tracking-wider flex items-center gap-2 font-mono">
          <Layers className="w-4 h-4 text-[var(--accent)]" />
          Component Coverage Analysis by Requirement Module
        </h3>

        {safeResults.length === 0 ? (
          <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-8 text-center space-y-2">
            <p className="font-bold text-[var(--text-2)]">No Requirement Components to Analyze</p>
            <p className="text-xs text-[var(--text-4)]">
              Upload SRS documents in the SRS & Documents tab or connect a GitHub repository to run component coverage math.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {safeResults.map((result) => {
            const isCompleted = result.status === 'Implemented' || result.status === 'Completed';
            const isPartial = result.status === 'Partially Implemented' || result.status === 'Partial';

            return (
              <div
                key={result.requirementId}
                className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between hover:border-[var(--accent)]/25 transition-all"
              >
                <div className="space-y-3">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded border border-[var(--accent)]/20">
                          {result.requirementId}
                        </span>
                        <span className="text-xs font-semibold text-[var(--text-4)]">{result.module}</span>
                      </div>
                      <h4 className="text-sm font-bold text-[var(--text-1)] mt-1">{result.requirementTitle}</h4>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-lg font-extrabold font-mono block ${
                          isCompleted ? 'text-emerald-400' : isPartial ? 'text-amber-400' : 'text-rose-400'
                        }`}
                      >
                        {result.coveragePercent}%
                      </span>
                      <span className="text-[10px] font-mono text-[var(--text-4)]">
                        Confidence: {result.confidencePercent}%
                      </span>
                    </div>
                  </div>

                  {/* Component Lists */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-4)] block">
                      Component Verification Status ({result.foundComponents.length}/{result.expectedComponents.length}):
                    </span>

                    <div className="space-y-1.5">
                      {/* Found Components */}
                      {result.foundComponents.map((comp) => (
                        <div
                          key={comp}
                          className="p-2 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-xs font-medium text-emerald-200 flex items-center justify-between"
                        >
                          <span className="flex items-center gap-2 font-mono">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            {comp}
                          </span>
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-300 px-1.5 py-0.5 rounded font-mono border border-emerald-500/20">
                            VERIFIED
                          </span>
                        </div>
                      ))}

                      {/* Missing Components */}
                      {result.missingComponents.map((comp) => (
                        <div
                          key={comp}
                          className="p-2 rounded-lg bg-rose-950/30 border border-rose-500/30 text-xs font-medium text-rose-200 flex items-center justify-between"
                        >
                          <span className="flex items-center gap-2">
                            <X className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            {comp}
                          </span>
                          <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded font-mono">
                            MISSING
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Recommendation */}
                <div className="pt-3 border-t border-[var(--border)] text-xs text-[var(--text-3)] flex items-start gap-2">
                  <Zap className="w-3.5 h-3.5 text-[var(--accent)] shrink-0 mt-0.5" />
                  <span className="leading-snug text-[11px]">{result.recommendation}</span>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
};
