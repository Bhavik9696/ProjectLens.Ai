import React, { useState } from 'react';
import { RequirementAnalysisResult, ImplementationStatus } from '../types';
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCode,
  GitCommit,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface TraceabilityMatrixProps {
  analysisResults: RequirementAnalysisResult[];
  onSelectRequirement?: (reqId: string) => void;
}

export const TraceabilityMatrix: React.FC<TraceabilityMatrixProps> = ({
  analysisResults = [],
}) => {
  const safeResults = analysisResults || [];
  const [searchQuery, setSearchQuery]       = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [activeEvidenceResult, setActiveEvidenceResult] = useState<RequirementAnalysisResult | null>(
    safeResults[0] || null
  );
  const [expandedMobileRow, setExpandedMobileRow] = useState<string | null>(null);

  const modulesList = Array.from(new Set(safeResults.map((r) => r.module)));

  const filteredResults = safeResults.filter((r) => {
    const matchesSearch =
      r.requirementId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.requirementTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.module.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.evidence?.detectedFiles?.some((f) => f.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesModule   = selectedModule   === 'ALL' || r.module    === selectedModule;
    const matchesStatus   = selectedStatus   === 'ALL' || r.status    === selectedStatus;
    const matchesPriority = selectedPriority === 'ALL' || r.priority  === selectedPriority;
    return matchesSearch && matchesModule && matchesStatus && matchesPriority;
  });

  const getStatusBadge = (status: ImplementationStatus) => {
    if (status === 'Implemented' || status === 'Completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          Implemented
        </span>
      );
    }
    if (status === 'Partially Implemented' || status === 'Partial') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
          <Clock className="w-3 h-3 text-amber-400" />
          Partial
        </span>
      );
    }
    if (status === 'Unable to Determine') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--surface-3)] text-[var(--text-3)] border border-[var(--border-2)]">
          <Info className="w-3 h-3" />
          Unknown
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30">
        <AlertCircle className="w-3 h-3 text-rose-400" />
        Missing
      </span>
    );
  };

  const getCoverageColor = (pct: number) =>
    pct === 100 ? 'text-emerald-400' : pct > 0 ? 'text-amber-400' : 'text-rose-400';

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* ── Header Banner ── */}
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30">
                STEP 8 RTM ENGINE
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-[var(--text-1)]">
                Requirement Traceability Matrix
              </h2>
            </div>
            <p className="text-xs text-[var(--text-4)]">
              End-to-end mapping from{' '}
              <strong className="text-[var(--text-2)]">SRS Requirements</strong>
              {' '}to{' '}
              <strong className="text-[var(--text-2)]">GitHub Files, Commits & PRs</strong>.
            </p>
          </div>

          {/* Quick summary counters — 2×2 grid on mobile, row on sm+ */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
            <div className="px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-center">
              <span className="text-[9px] text-[var(--text-4)] block font-mono font-bold uppercase">Total</span>
              <span className="text-base font-bold font-mono text-[var(--text-1)]">{analysisResults.length}</span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-center">
              <span className="text-[9px] text-emerald-400 block font-mono font-bold uppercase">Done</span>
              <span className="text-base font-bold font-mono text-emerald-300">
                {analysisResults.filter((r) => r.status === 'Implemented' || r.status === 'Completed').length}
              </span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-amber-950/30 border border-amber-500/30 text-center">
              <span className="text-[9px] text-amber-400 block font-mono font-bold uppercase">Partial</span>
              <span className="text-base font-bold font-mono text-amber-300">
                {analysisResults.filter((r) => r.status === 'Partially Implemented' || r.status === 'Partial').length}
              </span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-rose-950/30 border border-rose-500/30 text-center">
              <span className="text-[9px] text-rose-400 block font-mono font-bold uppercase">Missing</span>
              <span className="text-base font-bold font-mono text-rose-300">
                {analysisResults.filter((r) => r.status === 'Missing').length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter Controls ── */}
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--text-5)] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search REQ ID, Module, File…"
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg pl-9 pr-3 py-2 text-xs text-[var(--text-2)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50 font-mono"
          />
        </div>

        {/* Dropdowns — 3-col grid on mobile */}
        <div className="grid grid-cols-3 gap-2">
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="bg-[var(--bg)] border border-[var(--border)] text-[11px] font-mono text-[var(--text-2)] rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Modules</option>
            {modulesList.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[var(--bg)] border border-[var(--border)] text-[11px] font-mono text-[var(--text-2)] rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="Implemented">Implemented</option>
            <option value="Partially Implemented">Partial</option>
            <option value="Missing">Missing</option>
            <option value="Unable to Determine">Unknown</option>
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="bg-[var(--bg)] border border-[var(--border)] text-[11px] font-mono text-[var(--text-2)] rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-4)]">
          <Filter className="w-3 h-3 text-[var(--accent)]" />
          {filteredResults.length} of {safeResults.length} requirements shown
        </div>
      </div>

      {/* ── Main content: Cards on mobile / Table+Drawer on md+ ── */}
      <div>

        {/* ── MOBILE CARD VIEW (< md) ── */}
        <div className="md:hidden space-y-2">
          {filteredResults.length === 0 ? (
            <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-10 text-center space-y-2">
              <p className="font-bold text-[var(--text-3)] text-sm">No Requirements Tracked</p>
              <p className="text-xs text-[var(--text-4)]">Upload SRS documents or paste specs to generate the traceability matrix.</p>
            </div>
          ) : (
            filteredResults.map((r) => {
              const isExpanded = expandedMobileRow === r.requirementId;
              return (
                <div
                  key={r.requirementId}
                  className="bg-[var(--panel)] border border-[var(--border)] rounded-xl overflow-hidden"
                >
                  {/* Card Header — always visible */}
                  <button
                    onClick={() => setExpandedMobileRow(isExpanded ? null : r.requirementId)}
                    className="w-full flex items-start gap-3 p-3.5 text-left cursor-pointer hover:bg-[var(--bg)]/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-[var(--accent)] bg-[var(--accent)]/10 px-1.5 py-0.5 rounded border border-[var(--accent)]/30 text-[11px] flex-shrink-0">
                          {r.requirementId}
                        </span>
                        {getStatusBadge(r.status)}
                        <span className={`font-mono font-bold text-xs ml-auto ${getCoverageColor(r.coveragePercent)}`}>
                          {r.coveragePercent}%
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-[var(--text-1)] line-clamp-1">{r.requirementTitle}</p>
                      <div className="flex items-center gap-3 text-[11px] text-[var(--text-4)]">
                        <span className="truncate">{r.module}</span>
                        <span className="text-[var(--text-5)]">·</span>
                        <span className={r.priority === 'High' ? 'text-rose-400' : 'text-amber-400'}>{r.priority}</span>
                      </div>
                    </div>
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-[var(--text-5)] flex-shrink-0 mt-1" />
                      : <ChevronDown className="w-4 h-4 text-[var(--text-5)] flex-shrink-0 mt-1" />
                    }
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-[var(--border)] px-3.5 pb-3.5 pt-3 space-y-3 bg-[var(--bg)]/30">
                      {/* Coverage bar */}
                      <div>
                        <div className="flex justify-between text-[10px] font-mono mb-1">
                          <span className="text-[var(--text-4)]">Coverage</span>
                          <span className={getCoverageColor(r.coveragePercent)}>{r.coveragePercent}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${r.coveragePercent}%`,
                              background: r.coveragePercent === 100 ? '#34d399' : r.coveragePercent > 0 ? '#fbbf24' : '#f87171',
                            }}
                          />
                        </div>
                      </div>

                      {/* Detected files */}
                      {r.evidence?.detectedFiles?.length ? (
                        <div>
                          <p className="text-[10px] font-mono font-bold uppercase text-[var(--text-4)] mb-1.5 flex items-center gap-1">
                            <FileCode className="w-3 h-3 text-[var(--accent)]" /> Code Files
                          </p>
                          <div className="space-y-1">
                            {r.evidence.detectedFiles.slice(0, 3).map((f) => (
                              <div key={f} className="text-[11px] font-mono text-[var(--accent)] bg-[var(--accent)]/5 px-2 py-1 rounded border border-[var(--accent)]/15 truncate">
                                {f}
                              </div>
                            ))}
                            {r.evidence.detectedFiles.length > 3 && (
                              <span className="text-[10px] text-[var(--text-5)]">+{r.evidence.detectedFiles.length - 3} more files</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-[var(--text-5)] italic">No matching files found in GitHub repo.</p>
                      )}

                      {/* Recommendation */}
                      <div className="p-2.5 rounded-lg bg-[var(--accent)]/8 border border-[var(--accent)]/20 text-[11px] text-[var(--text-3)] leading-relaxed">
                        <span className="flex items-center gap-1 font-bold text-[var(--accent)] text-[10px] mb-1">
                          <Sparkles className="w-3 h-3" /> Recommendation
                        </span>
                        {r.recommendation}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ── DESKTOP TABLE VIEW (md+) ── */}
        <div className="hidden md:grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Table */}
          <div className="lg:col-span-2 bg-[var(--panel)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--bg)] border-b border-[var(--border)] text-[var(--text-4)] uppercase font-mono font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">REQ ID & Title</th>
                    <th className="py-3 px-4">Module</th>
                    <th className="py-3 px-4">Code Files</th>
                    <th className="py-3 px-4">Commit / PR</th>
                    <th className="py-3 px-4 text-center">Cov.</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredResults.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[var(--text-4)] font-sans">
                        <p className="font-bold text-[var(--text-3)] text-sm">No Requirements Tracked</p>
                        <p className="text-xs text-[var(--text-4)] mt-1">Upload SRS documents or paste specs to generate the traceability matrix.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredResults.map((r) => {
                      const isSelected = activeEvidenceResult?.requirementId === r.requirementId;
                      return (
                        <tr
                          key={r.requirementId}
                          onClick={() => setActiveEvidenceResult(r)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[var(--accent)]/10 border-l-4 border-l-[var(--accent)]'
                              : 'hover:bg-[var(--panel)]/60'
                          }`}
                        >
                          <td className="py-3.5 px-4 font-medium">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-[var(--accent)] bg-[var(--accent)]/10 px-1.5 py-0.5 rounded border border-[var(--accent)]/30 text-[11px]">
                                {r.requirementId}
                              </span>
                              <span className="text-[var(--text-1)] font-semibold line-clamp-1">{r.requirementTitle}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-[var(--text-3)] font-medium whitespace-nowrap">{r.module}</td>
                          <td className="py-3.5 px-4 text-[var(--text-3)]">
                            {r.evidence?.detectedFiles?.length ? (
                              <div className="flex items-center gap-1 font-mono text-[11px] text-[var(--accent)]">
                                <FileCode className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate max-w-[140px]">{r.evidence.detectedFiles[0]}</span>
                                {r.evidence.detectedFiles.length > 1 && (
                                  <span className="text-[10px] bg-[var(--bg)] text-[var(--text-4)] px-1 rounded border border-[var(--border-1)]">
                                    +{r.evidence.detectedFiles.length - 1}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[var(--text-5)] italic text-[11px]">None</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-[var(--text-3)] font-mono text-[11px]">
                            {r.evidence?.relatedCommits?.[0] ? (
                              <span className="text-[var(--accent)] bg-[var(--accent)]/10 px-1.5 py-0.5 rounded border border-[var(--accent)]/30">
                                {r.evidence.relatedCommits[0].hash}
                              </span>
                            ) : r.evidence?.relatedPRs?.[0] ? (
                              <span className="text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/30">
                                PR #{r.evidence.relatedPRs[0].id}
                              </span>
                            ) : (
                              <span className="text-[var(--text-5)] italic">None</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`font-bold font-mono text-xs ${getCoverageColor(r.coveragePercent)}`}>
                              {r.coveragePercent}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">{getStatusBadge(r.status)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Evidence Drawer */}
          <div className="lg:col-span-1 bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4">
            {activeEvidenceResult ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between border-b border-[var(--border)] pb-3 gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono font-bold text-[var(--accent)] uppercase tracking-widest block">
                      Evidence Inspection
                    </span>
                    <h3 className="text-sm font-bold text-[var(--text-1)] mt-0.5 truncate">
                      {activeEvidenceResult.requirementId}: {activeEvidenceResult.requirementTitle}
                    </h3>
                  </div>
                  {getStatusBadge(activeEvidenceResult.status)}
                </div>

                <div className="bg-[var(--bg)] p-3 rounded-xl border border-[var(--border)] space-y-2">
                  {[
                    ['Module Area', activeEvidenceResult.module],
                    ['Priority', activeEvidenceResult.priority],
                    ['Component Coverage', `${activeEvidenceResult.foundComponents.length} / ${activeEvidenceResult.expectedComponents.length} (${activeEvidenceResult.coveragePercent}%)`],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-4)]">{label}:</span>
                      <span className="font-semibold text-[var(--text-2)] text-right ml-2">{value}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-4)] flex items-center gap-1">
                    <FileCode className="w-3.5 h-3.5 text-[var(--accent)]" />
                    Code Files ({activeEvidenceResult.evidence?.detectedFiles?.length || 0})
                  </span>
                  {activeEvidenceResult.evidence?.detectedFiles?.length ? (
                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                      {activeEvidenceResult.evidence.detectedFiles.map((f) => (
                        <div key={f} className="p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-xs font-mono text-[var(--accent)] flex items-center justify-between">
                          <span className="truncate">{f}</span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 rounded bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text-5)] italic">
                      No matching file paths detected.
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-4)] flex items-center gap-1">
                    <GitCommit className="w-3.5 h-3.5 text-[var(--accent)]" />
                    Related Commits & PRs
                  </span>
                  {activeEvidenceResult.evidence?.relatedCommits?.length ? (
                    <div className="space-y-1.5">
                      {activeEvidenceResult.evidence.relatedCommits.map((c) => (
                        <div key={c.hash} className="p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-xs space-y-1">
                          <div className="flex items-center justify-between font-mono text-[11px]">
                            <span className="text-[var(--accent)] font-bold">{c.hash}</span>
                            <span className="text-[var(--text-5)]">{c.date}</span>
                          </div>
                          <p className="text-[var(--text-3)] text-[11px] leading-snug">{c.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-5)] italic p-2 bg-[var(--bg)] rounded border border-[var(--border)]">
                      No explicit commit tags associated with this REQ ID.
                    </p>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/30 space-y-1 text-xs">
                  <span className="font-bold text-[var(--accent)] flex items-center gap-1 text-[11px]">
                    <Sparkles className="w-3.5 h-3.5" />
                    Deterministic Engine Recommendation
                  </span>
                  <p className="text-[var(--text-3)] leading-relaxed text-[11px]">
                    {activeEvidenceResult.recommendation}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-[var(--text-5)] text-xs">
                Click any requirement row in the matrix to view evidence trace details.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
