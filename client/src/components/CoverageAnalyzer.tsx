import React, { useState } from 'react';
import { RequirementAnalysisResult, CriterionResult, Contradiction } from '../types';
import { RequirementAIPanel } from './RequirementAIPanel';
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
  FlaskConical,
  Shield,
  ShieldOff,
  ChevronDown,
  ChevronUp,
  Info,
  AlertCircle,
  Bot,
} from 'lucide-react';

interface CoverageAnalyzerProps {
  analysisResults: RequirementAnalysisResult[];
  projectId?: string;
}

const CRITERION_STATUS_CONFIG = {
  IMPLEMENTED:    { icon: Check,         color: 'text-emerald-400', bg: 'bg-emerald-950/20 border-emerald-500/30', label: 'Satisfied' },
  PARTIAL:        { icon: AlertTriangle,  color: 'text-amber-400',   bg: 'bg-amber-950/20   border-amber-500/30',   label: 'Partial'   },
  MISSING:        { icon: X,             color: 'text-rose-400',    bg: 'bg-rose-950/30    border-rose-500/30',    label: 'Missing'   },
  NOT_VERIFIABLE: { icon: Info,          color: 'text-slate-400',   bg: 'bg-slate-900/30   border-slate-600/30',  label: 'Unknown'   },
} as const;

const SEVERITY_COLORS = {
  LOW:      'text-sky-300    bg-sky-900/30    border-sky-500/30',
  MEDIUM:   'text-amber-300  bg-amber-900/30  border-amber-500/30',
  HIGH:     'text-rose-300   bg-rose-900/30   border-rose-500/30',
  CRITICAL: 'text-red-200    bg-red-950/50    border-red-500/50',
} as const;

function CriteriaChecklist({ criteria }: { criteria: CriterionResult[] }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? criteria : criteria.slice(0, 4);
  return (
    <div className="space-y-1.5">
      {shown.map((c, i) => {
        const cfg = CRITERION_STATUS_CONFIG[c.status] ?? CRITERION_STATUS_CONFIG.NOT_VERIFIABLE;
        const Icon = cfg.icon;
        return (
          <div key={i} className={`p-2 rounded-lg border text-xs flex items-start gap-2 ${cfg.bg}`}>
            <Icon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${cfg.color}`} />
            <div className="flex-1 min-w-0">
              <span className="font-medium text-[var(--text-2)] leading-snug">{c.description}</span>
              {c.reason && (
                <p className="text-[10px] text-[var(--text-5)] mt-0.5 truncate" title={c.reason}>{c.reason}</p>
              )}
            </div>
            <span className={`text-[9px] font-mono font-bold shrink-0 px-1.5 py-0.5 rounded ${cfg.color} opacity-80`}>
              {cfg.label}
            </span>
          </div>
        );
      })}
      {criteria.length > 4 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] text-[var(--accent)] hover:underline flex items-center gap-1 font-mono mt-1"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Show less' : `+${criteria.length - 4} more criteria`}
        </button>
      )}
    </div>
  );
}

function ContradictionBadges({ contradictions }: { contradictions: Contradiction[] }) {
  if (!contradictions || contradictions.length === 0) return null;
  return (
    <div className="space-y-2">
      {contradictions.map((c, i) => (
        <div key={i} className={`p-2 rounded-lg border text-xs flex items-start gap-2 ${SEVERITY_COLORS[c.severity] ?? SEVERITY_COLORS.MEDIUM}`}>
          <ShieldOff className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="font-bold">{c.title}</span>
              <span className="text-[9px] font-mono opacity-70 px-1 py-0.5 rounded border border-current/30">{c.severity}</span>
            </div>
            <p className="text-[10px] opacity-70 leading-snug">{c.recommendation}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export const CoverageAnalyzer: React.FC<CoverageAnalyzerProps> = ({
  analysisResults = [],
  projectId,
}) => {
  const safeResults = analysisResults || [];
  const [askAIReq, setAskAIReq] = useState<RequirementAnalysisResult | null>(null);

  // Use criteria-based coverage if available, otherwise fall back to components
  const totalExpected = safeResults.reduce((acc, curr) => {
    if (curr.criteria && curr.criteria.length > 0) return acc + curr.criteria.length;
    return acc + (curr.expectedComponents?.length || 0);
  }, 0);
  const totalFound = safeResults.reduce((acc, curr) => {
    if (curr.criteria && curr.criteria.length > 0) {
      return acc + curr.criteria.filter(c => c.status === 'IMPLEMENTED').length;
    }
    return acc + (curr.foundComponents?.length || 0);
  }, 0);
  const overallCoverage = totalExpected > 0 ? Math.round((totalFound / totalExpected) * 100) : 0;

  const hasEnhancedData = safeResults.some(r => r.criteria && r.criteria.length > 0);

  return (
    <div className="space-y-6">
      {/* Header Banner & Math Formula Card */}
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30">
                {hasEnhancedData ? 'EVIDENCE ENGINE v2' : 'COVERAGE ENGINE'}
              </span>
              <h2 className="text-xl font-extrabold text-[var(--text-1)]">Implementation Coverage Analyzer</h2>
            </div>
            <p className="text-xs text-[var(--text-4)]">
              {hasEnhancedData
                ? 'Multi-stage evidence-based analysis: acceptance criteria verification, deterministic checks, AI reasoning, and claim verification.'
                : 'Deterministic mathematical calculation comparing expected SRS components against repository code evidence.'}
            </p>
          </div>

          <div className="bg-[var(--bg)] border border-[var(--border)] px-5 py-3 rounded-2xl flex items-center gap-4 shrink-0">
            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-[var(--text-4)] block">
                {hasEnhancedData ? 'Criteria Coverage' : 'Total Coverage'}
              </span>
              <span className="text-2xl font-extrabold text-[var(--accent)] font-mono">{overallCoverage}%</span>
            </div>
            <div className="h-8 w-px bg-[var(--border)]" />
            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-[var(--text-4)] block">
                {hasEnhancedData ? 'Criteria Ratio' : 'Implemented Ratio'}
              </span>
              <span className="text-sm font-bold text-[var(--text-2)] font-mono">
                {totalFound} / {totalExpected}
              </span>
            </div>
          </div>
        </div>

        {/* Formula Card */}
        <div className="p-4 rounded-xl bg-[var(--bg)] border border-[var(--accent)]/20 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--accent)]">
            <Calculator className="w-4 h-4" />
            <span>{hasEnhancedData ? 'Evidence-Based Coverage Formula' : 'Deterministic Mathematical Coverage Formula'}</span>
          </div>
          <div className="bg-[var(--panel)]/90 p-3 rounded-lg border border-[var(--border)] font-mono text-xs text-[var(--text-2)] flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-center">
            <span className="text-[var(--accent)] font-bold">Coverage %</span>
            <span className="text-[var(--text-5)]">=</span>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                {hasEnhancedData ? `Satisfied Criteria (${totalFound})` : `Implemented Components (${totalFound})`}
              </span>
              <span className="text-[var(--text-5)]">÷</span>
              <span className="px-2 py-1 rounded bg-[var(--panel)] text-[var(--text-3)] border border-[var(--border-2)]">
                {hasEnhancedData ? `Total Criteria (${totalExpected})` : `Expected Components (${totalExpected})`}
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
          {hasEnhancedData ? 'Acceptance-Criteria Level Analysis by Requirement' : 'Component Coverage Analysis by Requirement Module'}
        </h3>

        {safeResults.length === 0 ? (
          <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-8 text-center space-y-2">
            <p className="font-bold text-[var(--text-2)]">No Requirement Components to Analyze</p>
            <p className="text-xs text-[var(--text-4)]">
              Upload SRS documents in the SRS &amp; Documents tab or connect a GitHub repository to run coverage analysis.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {safeResults.map((result) => {
              const isCompleted = result.status === 'Implemented' || result.status === 'Completed';
              const isPartial = result.status === 'Partially Implemented' || result.status === 'Partial';
              const hasTestEvidence = result.testEvidence;
              const hasCriteria = result.criteria && result.criteria.length > 0;
              const hasContradictions = result.contradictions && result.contradictions.length > 0;
              const hasNegativeEvidence = result.negativeEvidence && result.negativeEvidence.length > 0;
              const confidencePct = result.confidencePercent || Math.round((result.confidence || 0) * 100);

              return (
                <div
                  key={result.requirementId}
                  className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4 flex flex-col hover:border-[var(--accent)]/25 transition-all"
                >
                  {/* Top row */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] pb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded border border-[var(--accent)]/20">
                            {result.requirementId}
                          </span>
                          <span className="text-xs font-semibold text-[var(--text-4)]">{result.module}</span>
                        </div>
                        <h4 className="text-sm font-bold text-[var(--text-1)] mt-1">{result.requirementTitle}</h4>
                        {/* Actor / Action display if available */}
                        {(result as any).actor && (
                          <p className="text-[10px] text-[var(--text-5)] mt-0.5 font-mono">
                            As <span className="text-[var(--text-4)]">{(result as any).actor}</span>
                            {(result as any).action && <> → <span className="text-[var(--text-4)]">{(result as any).action}</span></>}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="text-right">
                          <span className={`text-lg font-extrabold font-mono block ${
                            isCompleted ? 'text-emerald-400' : isPartial ? 'text-amber-400' : 'text-rose-400'
                          }`}>
                            {result.coveragePercent}%
                          </span>
                          <span className="text-[10px] font-mono text-[var(--text-4)]">
                            Confidence: {confidencePct}%
                          </span>
                        </div>
                        {/* Ask AI button */}
                        <button
                          onClick={() => setAskAIReq(result)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer hover:brightness-110"
                          style={{
                            background: 'rgba(214,255,63,0.08)',
                            borderColor: 'rgba(214,255,63,0.30)',
                            color: 'var(--accent)',
                            boxShadow: '0 0 10px -4px rgba(214,255,63,0.25)',
                          }}
                        >
                          <Bot className="w-3 h-3" />
                          Ask AI
                        </button>
                      </div>
                    </div>

                    {/* Test Evidence Row */}
                    {hasTestEvidence && (
                      <div className="flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Cpu className="w-3 h-3 text-[var(--accent)]" />
                          <span className="text-[var(--text-4)] text-[10px] font-mono uppercase">Implementation:</span>
                          <span className={`font-bold text-[10px] ${result.coveragePercent > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {result.coveragePercent > 0 ? '✓' : '✗'}
                          </span>
                        </div>
                        <div className="h-3 w-px bg-[var(--border)]" />
                        <div className="flex items-center gap-1.5">
                          <FlaskConical className="w-3 h-3 text-purple-400" />
                          <span className="text-[var(--text-4)] text-[10px] font-mono uppercase">Tests:</span>
                          {result.testEvidence!.hasTests ? (
                            <span className="font-bold text-[10px] text-emerald-400">✓ ({result.testEvidence!.testFiles.length} file{result.testEvidence!.testFiles.length !== 1 ? 's' : ''})</span>
                          ) : (
                            <span className="font-bold text-[10px] text-amber-400">✗ No tests</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ACCEPTANCE CRITERIA CHECKLIST */}
                    {hasCriteria ? (
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-4)] block flex items-center gap-1">
                          <Shield className="w-3 h-3 text-[var(--accent)]" />
                          Acceptance Criteria ({result.criteria!.filter(c => c.status === 'IMPLEMENTED').length}/{result.criteria!.length} satisfied):
                        </span>
                        <CriteriaChecklist criteria={result.criteria!} />
                      </div>
                    ) : (
                      /* Legacy component lists */
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-4)] block">
                          Component Verification Status ({result.foundComponents.length}/{result.expectedComponents.length}):
                        </span>
                        <div className="space-y-1.5">
                          {result.foundComponents.map((comp) => (
                            <div key={comp} className="p-2 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-xs font-medium text-emerald-200 flex items-center justify-between">
                              <span className="flex items-center gap-2 font-mono">
                                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                {comp}
                              </span>
                              <span className="text-[10px] bg-emerald-500/10 text-emerald-300 px-1.5 py-0.5 rounded font-mono border border-emerald-500/20">VERIFIED</span>
                            </div>
                          ))}
                          {result.missingComponents.map((comp) => (
                            <div key={comp} className="p-2 rounded-lg bg-rose-950/30 border border-rose-500/30 text-xs font-medium text-rose-200 flex items-center justify-between">
                              <span className="flex items-center gap-2">
                                <X className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                {comp}
                              </span>
                              <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded font-mono">MISSING</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CONTRADICTIONS */}
                    {hasContradictions && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Contradictions Detected:
                        </span>
                        <ContradictionBadges contradictions={result.contradictions!} />
                      </div>
                    )}

                    {/* NEGATIVE EVIDENCE */}
                    {hasNegativeEvidence && (
                      <div className="p-2.5 rounded-lg border border-amber-500/20 bg-amber-950/10 space-y-1">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Missing Implementation Signals:
                        </span>
                        {result.negativeEvidence!.slice(0, 2).map((neg, i) => (
                          <p key={i} className="text-[10px] text-[var(--text-4)] leading-snug pl-4">• {neg}</p>
                        ))}
                      </div>
                    )}
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

      {/* Ask AI Panel — mounted outside the grid so it overlays correctly */}
      {askAIReq && (
        <RequirementAIPanel
          requirement={{
            ...askAIReq,
            // Flatten evidence.detectedFiles → evidenceFiles for the panel
            evidenceFiles: askAIReq.evidenceFiles ?? askAIReq.evidence?.detectedFiles ?? [],
          }}
          projectId={projectId}
          onClose={() => setAskAIReq(null)}
        />
      )}
    </div>
  );
};
