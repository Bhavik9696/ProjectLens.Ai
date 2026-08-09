import React, { useState } from 'react';
import { RequirementAnalysisResult, ImplementationStatus, RequirementPriority } from '../types';
import {
  Table,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCode,
  GitCommit,
  GitPullRequest,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Info,
} from 'lucide-react';

interface TraceabilityMatrixProps {
  analysisResults: RequirementAnalysisResult[];
  onSelectRequirement?: (reqId: string) => void;
}

export const TraceabilityMatrix: React.FC<TraceabilityMatrixProps> = ({
  analysisResults = [],
}) => {
  const safeResults = analysisResults || [];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [activeEvidenceResult, setActiveEvidenceResult] = useState<RequirementAnalysisResult | null>(
    safeResults[0] || null
  );

  const modulesList = Array.from(new Set(safeResults.map((r) => r.module)));

  const filteredResults = safeResults.filter((r) => {
    const matchesSearch =
      r.requirementId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.requirementTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.module.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.evidence?.detectedFiles?.some((f) => f.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesModule = selectedModule === 'ALL' || r.module === selectedModule;
    const matchesStatus = selectedStatus === 'ALL' || r.status === selectedStatus;
    const matchesPriority = selectedPriority === 'ALL' || r.priority === selectedPriority;

    return matchesSearch && matchesModule && matchesStatus && matchesPriority;
  });

  const getStatusBadge = (status: ImplementationStatus) => {
    if (status === 'Implemented' || status === 'Completed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          Implemented
        </span>
      );
    }
    if (status === 'Partially Implemented' || status === 'Partial') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          Partially Implemented
        </span>
      );
    }
    if (status === 'Unable to Determine') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--surface-3)] text-[var(--text-3)] border border-[var(--border-2)]">
          <Info className="w-3.5 h-3.5 text-[var(--text-4)]" />
          Unable to Determine
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30">
        <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
        Missing
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30">
              STEP 8 RTM ENGINE
            </span>
            <h2 className="text-xl font-bold text-[var(--text-1)]">Requirement Traceability Matrix (RTM)</h2>
          </div>
          <p className="text-xs text-[var(--text-4)]">
            End-to-end mapping from <strong className="text-[var(--text-2)]">SRS Document Requirements</strong> to <strong className="text-[var(--text-2)]">GitHub Files, Commits & PRs</strong>.
          </p>
        </div>

        {/* Quick summary counters */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-center">
            <span className="text-[10px] text-[var(--text-4)] block font-mono font-bold uppercase">Total REQs</span>
            <span className="text-base font-bold font-mono text-[var(--text-1)]">{analysisResults.length}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-center">
            <span className="text-[10px] text-emerald-400 block font-mono font-bold uppercase">Implemented</span>
            <span className="text-base font-bold font-mono text-emerald-300">
              {analysisResults.filter((r) => r.status === 'Implemented' || r.status === 'Completed').length}
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-center">
            <span className="text-[10px] text-amber-400 block font-mono font-bold uppercase">Partially Implemented</span>
            <span className="text-base font-bold font-mono text-amber-300">
              {analysisResults.filter((r) => r.status === 'Partially Implemented' || r.status === 'Partial').length}
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-center">
            <span className="text-[10px] text-rose-400 block font-mono font-bold uppercase">Missing</span>
            <span className="text-base font-bold font-mono text-rose-300">
              {analysisResults.filter((r) => r.status === 'Missing').length}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[var(--text-5)] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search REQ ID, Module, File..."
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[var(--text-2)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50 font-mono"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-4)]">
            <Filter className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Filter:</span>
          </div>

          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="bg-[var(--bg)] border border-[var(--border)] text-xs font-mono text-[var(--text-2)] rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Modules</option>
            {modulesList.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[var(--bg)] border border-[var(--border)] text-xs font-mono text-[var(--text-2)] rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="Implemented">Implemented</option>
            <option value="Partially Implemented">Partially Implemented</option>
            <option value="Missing">Missing</option>
            <option value="Unable to Determine">Unable to Determine</option>
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="bg-[var(--bg)] border border-[var(--border)] text-xs font-mono text-[var(--text-2)] rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Main RTM Table & Evidence Inspector Drawer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* RTM Table Column */}
        <div className="lg:col-span-2 bg-[var(--panel)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg)] border-b border-[var(--border)] text-[var(--text-4)] uppercase font-mono font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">REQ ID & Title</th>
                  <th className="py-3 px-4">Module</th>
                  <th className="py-3 px-4">Evidence Code Files</th>
                  <th className="py-3 px-4">Commit / PR</th>
                  <th className="py-3 px-4 text-center">Coverage</th>
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
                        {/* REQ ID & Title */}
                        <td className="py-3.5 px-4 font-medium">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[var(--accent)] bg-[var(--accent)]/10 px-1.5 py-0.5 rounded border border-[var(--accent)]/30 text-[11px]">
                              {r.requirementId}
                            </span>
                            <span className="text-[var(--text-1)] font-semibold line-clamp-1">{r.requirementTitle}</span>
                          </div>
                        </td>

                        {/* Module */}
                        <td className="py-3.5 px-4 text-[var(--text-3)] font-medium whitespace-nowrap">
                          {r.module}
                        </td>

                        {/* Detected Files */}
                        <td className="py-3.5 px-4 text-[var(--text-3)]">
                          {r.evidence?.detectedFiles?.length ? (
                            <div className="flex items-center gap-1 font-mono text-[11px] text-[var(--accent)]">
                              <FileCode className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                              <span className="truncate max-w-[140px]">
                                {r.evidence.detectedFiles[0]}
                              </span>
                              {r.evidence.detectedFiles.length > 1 && (
                                <span className="text-[10px] bg-[var(--bg)] text-[var(--text-4)] px-1 rounded border border-[var(--border-1)]">
                                  +{r.evidence.detectedFiles.length - 1}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[var(--text-5)] italic text-[11px]">No files found</span>
                          )}
                        </td>

                        {/* Commit / PR */}
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
                            <span className="text-[var(--text-5)] italic text-[11px]">None</span>
                          )}
                        </td>

                        {/* Coverage % */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <span
                              className={`font-bold font-mono text-xs ${
                                r.coveragePercent === 100
                                  ? 'text-emerald-400'
                                  : r.coveragePercent > 0
                                  ? 'text-amber-400'
                                  : 'text-rose-400'
                              }`}
                            >
                              {r.coveragePercent}%
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getStatusBadge(r.status)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Evidence Drawer Inspector Column */}
        <div className="lg:col-span-1 bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4">
          {activeEvidenceResult ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[var(--accent)] uppercase tracking-widest block">
                    Evidence Inspection Drawer
                  </span>
                  <h3 className="text-sm font-bold text-[var(--text-1)] mt-0.5">
                    {activeEvidenceResult.requirementId}: {activeEvidenceResult.requirementTitle}
                  </h3>
                </div>
                {getStatusBadge(activeEvidenceResult.status)}
              </div>

              {/* Requirement Summary */}
              <div className="bg-[var(--bg)] p-3 rounded-xl border border-[var(--border)] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-4)]">Module Area:</span>
                  <span className="font-semibold text-[var(--text-2)]">{activeEvidenceResult.module}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-4)]">Priority Level:</span>
                  <span
                    className={`font-semibold ${
                      activeEvidenceResult.priority === 'High' ? 'text-rose-400' : 'text-amber-400'
                    }`}
                  >
                    {activeEvidenceResult.priority}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-4)]">Component Coverage:</span>
                  <span className="font-mono font-bold text-[var(--accent)]">
                    {activeEvidenceResult.foundComponents.length} / {activeEvidenceResult.expectedComponents.length} ({activeEvidenceResult.coveragePercent}%)
                  </span>
                </div>
              </div>

              {/* Detected Files */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-4)] flex items-center gap-1">
                  <FileCode className="w-3.5 h-3.5 text-[var(--accent)]" />
                  Detected Code Files ({activeEvidenceResult.evidence?.detectedFiles?.length || 0})
                </span>
                {activeEvidenceResult.evidence?.detectedFiles?.length ? (
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {activeEvidenceResult.evidence.detectedFiles.map((f) => (
                      <div
                        key={f}
                        className="p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-xs font-mono text-[var(--accent)] flex items-center justify-between"
                      >
                        <span className="truncate">{f}</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text-5)] italic">
                    No matching file paths detected in GitHub repo.
                  </div>
                )}
              </div>

              {/* Related Commits & PRs */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-4)] flex items-center gap-1">
                  <GitCommit className="w-3.5 h-3.5 text-[var(--accent)]" />
                  Related Commits & PRs
                </span>
                {activeEvidenceResult.evidence?.relatedCommits?.length ? (
                  <div className="space-y-1.5">
                    {activeEvidenceResult.evidence.relatedCommits.map((c) => (
                      <div
                        key={c.hash}
                        className="p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-xs space-y-1"
                      >
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

              {/* Recommendation Box */}
              <div className="p-3 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/30 space-y-1 text-xs">
                <span className="font-bold text-[var(--accent)] flex items-center gap-1 text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
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
  );
};
