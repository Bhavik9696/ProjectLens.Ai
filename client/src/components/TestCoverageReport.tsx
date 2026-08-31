import React, { useState, useMemo } from 'react';
import { RequirementAnalysisResult } from '../types';
import {
  FlaskConical,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  FileCode,
  ShieldCheck,
  Beaker,
} from 'lucide-react';

interface TestCoverageReportProps {
  analysisResults: RequirementAnalysisResult[];
}

export const TestCoverageReport: React.FC<TestCoverageReportProps> = ({ analysisResults = [] }) => {
  const safeResults = analysisResults || [];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [filterTests, setFilterTests] = useState<'ALL' | 'HAS_TESTS' | 'NO_TESTS'>('ALL');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const modules = useMemo(() => Array.from(new Set(safeResults.map((r) => r.module))), [safeResults]);

  const stats = useMemo(() => {
    const withTests  = safeResults.filter((r) => r.testEvidence?.hasTests).length;
    const withoutTests = safeResults.filter((r) => !r.testEvidence?.hasTests).length;
    const pct = safeResults.length > 0 ? Math.round((withTests / safeResults.length) * 100) : 0;
    const totalTestFiles = safeResults.reduce((acc, r) => acc + (r.testEvidence?.testFiles?.length ?? 0), 0);
    return { withTests, withoutTests, total: safeResults.length, pct, totalTestFiles };
  }, [safeResults]);

  const filtered = useMemo(() => {
    return safeResults.filter((r) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        r.requirementId.toLowerCase().includes(q) ||
        r.requirementTitle.toLowerCase().includes(q) ||
        r.module.toLowerCase().includes(q);
      const matchesModule = selectedModule === 'ALL' || r.module === selectedModule;
      const matchesTests =
        filterTests === 'ALL'
          ? true
          : filterTests === 'HAS_TESTS'
          ? !!r.testEvidence?.hasTests
          : !r.testEvidence?.hasTests;
      return matchesSearch && matchesModule && matchesTests;
    });
  }, [safeResults, searchQuery, selectedModule, filterTests]);

  if (safeResults.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-500/10 text-purple-300 border border-purple-500/25">
              QA REPORT
            </span>
            <h2 className="text-lg font-bold text-[var(--text-1)]">Test Coverage Gap Report</h2>
          </div>
          <p className="text-xs text-[var(--text-4)]">Per-requirement test file coverage, derived from the code graph analysis.</p>
        </div>
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-16 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <FlaskConical className="w-7 h-7 text-purple-400" />
          </div>
          <div>
            <p className="font-bold text-[var(--text-2)] text-sm">No Analysis Results Yet</p>
            <p className="text-xs text-[var(--text-5)] mt-1 max-w-sm">
              Upload an SRS document and connect a GitHub repository, then run analysis to generate the test coverage report.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const coverageBarWidth = `${stats.pct}%`;
  const coverageColor = stats.pct >= 80 ? '#10b981' : stats.pct >= 50 ? '#f59e0b' : '#f43f5e';

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Header ── */}
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-500/10 text-purple-300 border border-purple-500/25">
                QA REPORT
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-[var(--text-1)]">Test Coverage Gap Report</h2>
            </div>
            <p className="text-xs text-[var(--text-4)]">
              Per-requirement test file coverage from the code graph. Missing tests are flagged as gaps requiring QA attention.
            </p>
          </div>

          {/* Stat pills */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-center">
              <span className="text-[9px] text-[var(--text-4)] block font-mono font-bold uppercase">Total</span>
              <span className="text-base font-bold font-mono text-[var(--text-1)]">{stats.total}</span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-center">
              <span className="text-[9px] text-emerald-400 block font-mono font-bold uppercase">Tested</span>
              <span className="text-base font-bold font-mono text-emerald-300">{stats.withTests}</span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-rose-950/30 border border-rose-500/30 text-center">
              <span className="text-[9px] text-rose-400 block font-mono font-bold uppercase">No Tests</span>
              <span className="text-base font-bold font-mono text-rose-300">{stats.withoutTests}</span>
            </div>
          </div>
        </div>

        {/* Overall coverage bar */}
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-[var(--text-4)]">Overall Test Coverage</span>
            <span style={{ color: coverageColor }} className="font-bold">{stats.pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: coverageBarWidth, background: coverageColor }}
            />
          </div>
          <p className="text-[10px] text-[var(--text-5)]">
            {stats.totalTestFiles} total test file{stats.totalTestFiles !== 1 ? 's' : ''} detected across all requirements
          </p>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--text-5)] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search requirements, modules…"
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg pl-9 pr-3 py-2 text-xs text-[var(--text-2)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50 font-mono"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="bg-[var(--bg)] border border-[var(--border)] text-[11px] font-mono text-[var(--text-2)] rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer flex-1"
          >
            <option value="ALL">All Modules</option>
            {modules.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>

          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[var(--accent)] flex-shrink-0" />
            {(['ALL', 'HAS_TESTS', 'NO_TESTS'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilterTests(f)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold border transition-all cursor-pointer ${
                  filterTests === f
                    ? f === 'HAS_TESTS'
                      ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                      : f === 'NO_TESTS'
                      ? 'bg-rose-950/40 text-rose-300 border-rose-500/40'
                      : 'bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/40'
                    : 'bg-[var(--bg)] text-[var(--text-4)] border-[var(--border-2)] hover:text-[var(--text-2)]'
                }`}
              >
                {f === 'ALL' ? 'All' : f === 'HAS_TESTS' ? '✓ Has Tests' : '✗ No Tests'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-4)]">
          <Filter className="w-3 h-3 text-[var(--accent)]" />
          {filtered.length} of {safeResults.length} requirements shown
        </div>
      </div>

      {/* ── Requirements List ── */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-10 text-center">
            <p className="font-bold text-[var(--text-3)] text-sm">No Requirements Match</p>
            <p className="text-xs text-[var(--text-4)] mt-1">Try adjusting your search or filter.</p>
          </div>
        ) : (
          filtered.map((r) => {
            const hasTests = !!r.testEvidence?.hasTests;
            const testFiles = r.testEvidence?.testFiles || [];
            const isExpanded = expandedRow === r.requirementId;

            return (
              <div
                key={r.requirementId}
                className={`bg-[var(--panel)] border rounded-xl overflow-hidden transition-all ${
                  hasTests ? 'border-emerald-500/20' : 'border-rose-500/20'
                }`}
              >
                <button
                  onClick={() => setExpandedRow(isExpanded ? null : r.requirementId)}
                  className="w-full flex items-start gap-3 p-3.5 text-left cursor-pointer hover:bg-[var(--bg)]/50 transition-colors"
                >
                  {/* Test status icon */}
                  <div className={`mt-0.5 flex-shrink-0 ${hasTests ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {hasTests ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-[var(--accent)] bg-[var(--accent)]/10 px-1.5 py-0.5 rounded border border-[var(--accent)]/30 text-[11px] flex-shrink-0">
                        {r.requirementId}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${
                          hasTests
                            ? 'bg-emerald-950/30 text-emerald-300 border-emerald-500/30'
                            : 'bg-rose-950/30 text-rose-300 border-rose-500/30'
                        }`}
                      >
                        {hasTests ? `✓ ${testFiles.length} Test File${testFiles.length !== 1 ? 's' : ''}` : '✗ No Test Files'}
                      </span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border flex-shrink-0 ${
                        r.priority === 'High'
                          ? 'bg-rose-950/20 text-rose-300 border-rose-500/20'
                          : r.priority === 'Medium'
                          ? 'bg-amber-950/20 text-amber-300 border-amber-500/20'
                          : 'bg-sky-950/20 text-sky-300 border-sky-500/20'
                      }`}>
                        {r.priority}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-[var(--text-1)] line-clamp-1">{r.requirementTitle}</p>
                    <p className="text-[11px] text-[var(--text-4)]">{r.module}</p>
                  </div>

                  {/* Coverage */}
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <span className={`text-xs font-bold font-mono ${r.coveragePercent === 100 ? 'text-emerald-400' : r.coveragePercent > 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {r.coveragePercent}%
                    </span>
                    <p className="text-[10px] text-[var(--text-5)]">coverage</p>
                  </div>

                  {isExpanded ? <ChevronUp className="w-4 h-4 text-[var(--text-5)] flex-shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-[var(--text-5)] flex-shrink-0 mt-1" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-[var(--border)] px-4 pb-4 pt-3 bg-[var(--bg)]/30 space-y-3">
                    {hasTests ? (
                      <div>
                        <p className="text-[10px] font-mono font-bold uppercase text-purple-400 mb-2 flex items-center gap-1">
                          <FlaskConical className="w-3 h-3" /> Test Files
                        </p>
                        <div className="space-y-1">
                          {testFiles.map((f) => (
                            <div key={f} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg)] border border-emerald-500/15 text-xs font-mono">
                              <FileCode className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                              <span className="text-emerald-300 truncate">{f}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/20 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-rose-300 font-bold">
                          <AlertCircle className="w-3.5 h-3.5" />
                          No test files found for this requirement
                        </div>
                        <p className="text-[var(--text-4)] text-[11px]">
                          No test file paths in the repository matched the keywords for <strong className="text-[var(--text-3)]">{r.requirementId}: {r.requirementTitle}</strong>.
                          {r.priority === 'High' && (
                            <span className="text-rose-300 ml-1 font-semibold">
                              This is a HIGH priority requirement — missing tests are a risk.
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    {/* Acceptance criteria mini-list */}
                    {r.criteria && r.criteria.length > 0 && (
                      <div>
                        <p className="text-[10px] font-mono font-bold uppercase text-[var(--accent)] mb-1.5 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Acceptance Criteria
                        </p>
                        <div className="space-y-0.5">
                          {r.criteria.slice(0, 4).map((c, i) => (
                            <div key={i} className="flex items-start gap-1.5 text-[10px]">
                              {c.status === 'IMPLEMENTED'
                                ? <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                                : <XCircle className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
                              }
                              <span className={c.status === 'IMPLEMENTED' ? 'text-[var(--text-3)]' : 'text-[var(--text-5)]'}>
                                {c.description}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Untested high-priority callout */}
      {safeResults.filter((r) => !r.testEvidence?.hasTests && r.priority === 'High').length > 0 && (
        <div className="bg-[var(--panel)] border border-rose-500/30 rounded-2xl p-4 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
            <Beaker className="w-4 h-4 text-rose-400" />
            Critical Risk: High-Priority Requirements with No Tests
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {safeResults
              .filter((r) => !r.testEvidence?.hasTests && r.priority === 'High')
              .map((r) => (
                <div key={r.requirementId} className="bg-rose-950/20 border border-rose-500/20 rounded-xl p-3 text-xs">
                  <span className="font-mono font-bold text-rose-300">{r.requirementId}</span>
                  <p className="text-[var(--text-3)] mt-0.5 line-clamp-1">{r.requirementTitle}</p>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
};
