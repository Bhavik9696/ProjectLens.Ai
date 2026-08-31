import React, { useEffect, useRef, useState } from 'react';
import { RequirementAnalysisResult } from '../types';
import {
  X,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  AlertCircle,
  Info,
  FileCode,
  GitCommit,
  GitPullRequest,
  CircleDot,
  Bot,
  Shield,
  ShieldOff,
  AlertTriangle,
} from 'lucide-react';

interface RequirementDrawerProps {
  result: RequirementAnalysisResult | null;
  onClose: () => void;
  onAskCopilot?: (query: string) => void;
}

type DrawerTab = 'evidence' | 'criteria' | 'contradictions' | 'recommendation';

const getPriorityColor = (priority: string) => {
  if (priority === 'High')   return { text: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' };
  if (priority === 'Medium') return { text: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' };
  return { text: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)' };
};

const getStatusBadge = (status: string) => {
  if (status === 'Implemented' || status === 'Completed') return { icon: CheckCircle2, color: '#10b981', label: 'Implemented' };
  if (status === 'Partially Implemented' || status === 'Partial') return { icon: Clock, color: '#f59e0b', label: 'Partial' };
  if (status === 'Unable to Determine') return { icon: Info, color: '#9a9a92', label: 'Unknown' };
  return { icon: AlertCircle, color: '#ef4444', label: 'Missing' };
};

const CoverageRing: React.FC<{ pct: number }> = ({ pct }) => {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = (pct / 100) * circumference;
  const color = pct === 100 ? '#10b981' : pct > 50 ? '#f59e0b' : pct > 0 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative inline-flex items-center justify-center w-16 h-16 flex-shrink-0">
      <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="var(--surface-5)" strokeWidth="5" />
        <circle
          cx="32" cy="32" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeDasharray={`${strokeDash} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <span className="absolute text-sm font-extrabold font-mono" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
};

export const RequirementDrawer: React.FC<RequirementDrawerProps> = ({ result, onClose, onAskCopilot }) => {
  const [activeTab, setActiveTab] = useState<DrawerTab>('evidence');
  const [copied, setCopied] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result) setActiveTab('evidence');
  }, [result?.requirementId]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const copyId = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.requirementId).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs: { id: DrawerTab; label: string; count?: number }[] = [
    { id: 'evidence', label: 'Evidence' },
    { id: 'criteria', label: 'Criteria', count: result?.criteria?.length },
    { id: 'contradictions', label: 'Issues', count: result?.contradictions?.length },
    { id: 'recommendation', label: 'Fix' },
  ];

  // Overlay + drawer
  const isVisible = !!result;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 z-[80] transition-opacity duration-300"
        style={{
          background: 'rgba(0,0,0,0.4)',
          opacity: isVisible ? 1 : 0,
          pointerEvents: isVisible ? 'auto' : 'none',
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Requirement details"
        className="fixed top-0 right-0 h-full z-[81] flex flex-col transition-transform duration-300 ease-out"
        style={{
          width: 'min(440px, 95vw)',
          background: 'var(--panel)',
          borderLeft: '1px solid var(--border-2)',
          boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
          transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {!result ? null : (
          <>
            {/* Header */}
            <div
              className="flex items-start gap-3 p-5 border-b flex-shrink-0"
              style={{ borderColor: 'var(--border)' }}
            >
              <CoverageRing pct={result.coveragePercent} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <button
                    onClick={copyId}
                    className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded border transition-all cursor-pointer"
                    style={{
                      background: 'rgba(214,255,63,0.08)',
                      borderColor: 'rgba(214,255,63,0.25)',
                      color: 'var(--accent)',
                    }}
                    title="Copy requirement ID"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {result.requirementId}
                  </button>

                  {(() => {
                    const s = getStatusBadge(result.status);
                    const Icon = s.icon;
                    return (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border"
                        style={{ color: s.color, background: `${s.color}15`, borderColor: `${s.color}30` }}
                      >
                        <Icon className="w-3 h-3" />
                        {s.label}
                      </span>
                    );
                  })()}

                  {(() => {
                    const p = getPriorityColor(result.priority);
                    return (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded border"
                        style={{ color: p.text, background: p.bg, borderColor: p.border }}
                      >
                        {result.priority}
                      </span>
                    );
                  })()}
                </div>

                <h2 className="text-sm font-bold leading-tight" style={{ color: 'var(--text-1)' }}>
                  {result.requirementTitle}
                </h2>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-5)' }}>
                  {result.module}
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors"
                style={{ color: 'var(--text-5)' }}
                aria-label="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-all cursor-pointer"
                  style={{
                    color: activeTab === t.id ? 'var(--accent)' : 'var(--text-5)',
                    borderBottom: activeTab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
                    background: activeTab === t.id ? 'rgba(214,255,63,0.04)' : 'transparent',
                  }}
                >
                  {t.label}
                  {t.count !== undefined && t.count > 0 && (
                    <span
                      className="text-[9px] font-mono px-1 rounded-full"
                      style={{ background: 'var(--accent)', color: '#000' }}
                    >
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Evidence Tab */}
              {activeTab === 'evidence' && (
                <div className="space-y-4">
                  {/* Files */}
                  <Section title="Detected Files" icon={FileCode} count={result.evidence?.detectedFiles?.length}>
                    {result.evidence?.detectedFiles?.length ? (
                      <div className="space-y-1">
                        {result.evidence.detectedFiles.map((f) => (
                          <div
                            key={f}
                            className="text-[11px] font-mono px-3 py-1.5 rounded-lg border"
                            style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--accent)' }}
                          >
                            {f}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptySection text="No files detected" />
                    )}
                  </Section>

                  {/* Commits */}
                  <Section title="Related Commits" icon={GitCommit} count={result.evidence?.relatedCommits?.length}>
                    {result.evidence?.relatedCommits?.length ? (
                      <div className="space-y-2">
                        {result.evidence.relatedCommits.slice(0, 5).map((c) => (
                          <div
                            key={c.hash}
                            className="px-3 py-2 rounded-lg border text-xs space-y-0.5"
                            style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold" style={{ color: 'var(--accent)' }}>{c.hash}</span>
                              <span style={{ color: 'var(--text-5)' }}>• {c.author}</span>
                            </div>
                            <p className="truncate" style={{ color: 'var(--text-3)' }}>{c.message}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptySection text="No commits linked" />
                    )}
                  </Section>

                  {/* PRs */}
                  <Section title="Related PRs" icon={GitPullRequest} count={result.evidence?.relatedPRs?.length}>
                    {result.evidence?.relatedPRs?.length ? (
                      <div className="space-y-2">
                        {result.evidence.relatedPRs.map((pr) => (
                          <div
                            key={pr.id}
                            className="px-3 py-2 rounded-lg border text-xs flex items-center gap-2"
                            style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
                          >
                            <span className="font-mono font-bold" style={{ color: 'var(--accent)' }}>#{pr.id}</span>
                            <span className="flex-1 truncate" style={{ color: 'var(--text-3)' }}>{pr.title}</span>
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                              style={{
                                background: pr.state === 'merged' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                                color: pr.state === 'merged' ? '#10b981' : '#f59e0b',
                              }}
                            >
                              {pr.state}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptySection text="No PRs linked" />
                    )}
                  </Section>

                  {/* Issues */}
                  <Section title="Related Issues" icon={CircleDot} count={result.evidence?.relatedIssues?.length}>
                    {result.evidence?.relatedIssues?.length ? (
                      <div className="space-y-2">
                        {result.evidence.relatedIssues.map((issue) => (
                          <div
                            key={issue.id}
                            className="px-3 py-2 rounded-lg border text-xs flex items-center gap-2"
                            style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
                          >
                            <span className="font-mono font-bold" style={{ color: 'var(--accent)' }}>#{issue.id}</span>
                            <span className="flex-1 truncate" style={{ color: 'var(--text-3)' }}>{issue.title}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptySection text="No issues linked" />
                    )}
                  </Section>
                </div>
              )}

              {/* Criteria Tab */}
              {activeTab === 'criteria' && (
                <div className="space-y-3">
                  {result.criteria?.length ? (
                    result.criteria.map((c, i) => (
                      <div
                        key={i}
                        className="rounded-xl border p-3 space-y-2"
                        style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
                      >
                        <div className="flex items-start gap-2">
                          {c.status === 'IMPLEMENTED' ? (
                            <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#10b981' }} />
                          ) : c.status === 'PARTIAL' ? (
                            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
                          ) : (
                            <ShieldOff className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                          )}
                          <p className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>{c.description}</p>
                        </div>
                        <p className="text-[11px] pl-6" style={{ color: 'var(--text-5)' }}>{c.reason}</p>
                        <div className="pl-6">
                          <div
                            className="h-1.5 rounded-full overflow-hidden"
                            style={{ background: 'var(--surface-5)' }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${c.confidence * 100}%`,
                                background: c.status === 'IMPLEMENTED' ? '#10b981' : c.status === 'PARTIAL' ? '#f59e0b' : '#ef4444',
                              }}
                            />
                          </div>
                          <span className="text-[10px] font-mono mt-1 block" style={{ color: 'var(--text-5)' }}>
                            {Math.round(c.confidence * 100)}% confidence
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptySection text="No acceptance criteria available. Re-run analysis to generate detailed criteria." />
                  )}
                </div>
              )}

              {/* Contradictions Tab */}
              {activeTab === 'contradictions' && (
                <div className="space-y-3">
                  {result.contradictions?.length ? (
                    result.contradictions.map((c, i) => {
                      const severityColor = c.severity === 'CRITICAL' ? '#ef4444' : c.severity === 'HIGH' ? '#f97316' : c.severity === 'MEDIUM' ? '#f59e0b' : '#10b981';
                      return (
                        <div
                          key={i}
                          className="rounded-xl border p-3 space-y-2"
                          style={{ background: 'var(--bg)', borderColor: `${severityColor}30` }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold" style={{ color: 'var(--text-1)' }}>{c.title}</span>
                            <span
                              className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border"
                              style={{ color: severityColor, background: `${severityColor}15`, borderColor: `${severityColor}30` }}
                            >
                              {c.severity}
                            </span>
                          </div>
                          <p className="text-[11px]" style={{ color: 'var(--text-5)' }}>{c.recommendation}</p>
                        </div>
                      );
                    })
                  ) : (
                    <EmptySection text="No contradictions detected for this requirement." />
                  )}
                </div>
              )}

              {/* Recommendation Tab */}
              {activeTab === 'recommendation' && (
                <div className="space-y-4">
                  <div
                    className="rounded-xl border p-4 text-sm leading-relaxed"
                    style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-3)' }}
                  >
                    {result.recommendation || 'No specific recommendation available.'}
                  </div>

                  {/* Missing components */}
                  {result.missingComponents?.length > 0 && (
                    <Section title="Missing Components" icon={AlertCircle}>
                      <div className="space-y-1">
                        {result.missingComponents.map((c) => (
                          <div
                            key={c}
                            className="text-[11px] font-mono px-3 py-1.5 rounded-lg border flex items-center gap-2"
                            style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)', color: '#f87171' }}
                          >
                            <X className="w-3 h-3 flex-shrink-0" />
                            {c}
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}
                </div>
              )}
            </div>

            {/* Footer — Ask Copilot */}
            <div
              className="p-4 border-t flex-shrink-0"
              style={{ borderColor: 'var(--border)' }}
            >
              <button
                onClick={() => {
                  if (onAskCopilot) {
                    onAskCopilot(`Tell me about ${result.requirementId}: ${result.requirementTitle} — current status: ${result.status}, coverage: ${result.coveragePercent}%`);
                  }
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer"
                style={{
                  background: 'var(--accent)',
                  color: '#000',
                  boxShadow: '0 0 16px rgba(214,255,63,0.2)',
                }}
              >
                <Bot className="w-4 h-4" />
                Ask AI Copilot about this Requirement
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
};

// Helper sub-components
const Section: React.FC<{
  title: string;
  icon: React.ElementType;
  count?: number;
  children: React.ReactNode;
}> = ({ title, icon: Icon, count, children }) => (
  <div>
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-4)' }}>
        {title}
      </span>
      {count !== undefined && (
        <span className="text-[10px] font-mono" style={{ color: 'var(--text-5)' }}>({count})</span>
      )}
    </div>
    {children}
  </div>
);

const EmptySection: React.FC<{ text: string }> = ({ text }) => (
  <p className="text-xs italic" style={{ color: 'var(--text-6)' }}>{text}</p>
);
