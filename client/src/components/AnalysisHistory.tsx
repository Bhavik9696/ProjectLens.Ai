import React, { useState, useMemo } from 'react';
import {
  AnalysisSnapshot,
  RequirementAnalysisResult,
  ImplementationStatus,
  ProjectHealthStatus,
} from '../types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  History,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Info,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  Shield,
  Calendar,
} from 'lucide-react';

interface AnalysisHistoryProps {
  analysisHistory: AnalysisSnapshot[];
  currentResults: RequirementAnalysisResult[];
}

const HEALTH_COLORS: Record<ProjectHealthStatus, string> = {
  Healthy: '#10b981',
  'Medium Risk': '#f59e0b',
  'High Risk': '#f43f5e',
};

type DiffKind = 'improved' | 'regressed' | 'unchanged';

interface ReqDiff {
  reqId: string;
  prevStatus: ImplementationStatus | null;
  currStatus: ImplementationStatus;
  prevCoverage: number | null;
  currCoverage: number;
  kind: DiffKind;
}

function classifyDiff(
  prevStatus: ImplementationStatus | null,
  currStatus: ImplementationStatus,
  prevCov: number | null,
  currCov: number
): DiffKind {
  const rank = (s: ImplementationStatus | null): number => {
    if (!s) return -1;
    if (s === 'Implemented' || s === 'Completed') return 3;
    if (s === 'Partially Implemented' || s === 'Partial') return 2;
    if (s === 'Missing') return 1;
    return 0;
  };
  const prev = rank(prevStatus);
  const curr = rank(currStatus);
  if (curr > prev) return 'improved';
  if (curr < prev) return 'regressed';
  // same status — compare coverage
  if (prevCov !== null && currCov > prevCov + 4) return 'improved';
  if (prevCov !== null && currCov < prevCov - 4) return 'regressed';
  return 'unchanged';
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export const AnalysisHistory: React.FC<AnalysisHistoryProps> = ({
  analysisHistory = [],
  currentResults = [],
}) => {
  const [compareRunId, setCompareRunId] = useState<string | null>(null);
  const [showAllRuns, setShowAllRuns] = useState(false);

  const history = analysisHistory || [];

  // Build chart data (newest last for the chart timeline)
  const chartData = useMemo(() => {
    return [...history]
      .reverse()
      .map((run, i) => ({
        name: `Run ${i + 1}`,
        score: run.overallScore,
        label: formatDate(run.timestamp),
        runId: run.runId,
      }));
  }, [history]);

  // Build diff against selected run
  const diffs: ReqDiff[] = useMemo(() => {
    if (!compareRunId) return [];
    const compareRun = history.find((r) => r.runId === compareRunId);
    if (!compareRun) return [];

    const prevMap = new Map(compareRun.statusSnapshot.map((s) => [s.reqId, s]));

    return currentResults.map((r) => {
      const prev = prevMap.get(r.requirementId);
      const prevStatus = (prev?.status as ImplementationStatus) || null;
      const prevCov = prev?.coveragePercent ?? null;
      const kind = classifyDiff(prevStatus, r.status, prevCov, r.coveragePercent);
      return {
        reqId: r.requirementId,
        prevStatus,
        currStatus: r.status,
        prevCoverage: prevCov,
        currCoverage: r.coveragePercent,
        kind,
      };
    });
  }, [compareRunId, history, currentResults]);

  const improved  = diffs.filter((d) => d.kind === 'improved').length;
  const regressed = diffs.filter((d) => d.kind === 'regressed').length;
  const unchanged = diffs.filter((d) => d.kind === 'unchanged').length;

  const visibleHistory = showAllRuns ? history : history.slice(0, 5);

  if (history.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30">
              SPRINT HISTORY
            </span>
            <h2 className="text-lg font-bold text-[var(--text-1)]">Analysis History & Diff</h2>
          </div>
          <p className="text-xs text-[var(--text-4)]">
            Tracks your health score across analysis runs and shows what changed between sprints.
          </p>
        </div>
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-16 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center">
            <History className="w-7 h-7 text-[var(--accent)]" />
          </div>
          <div>
            <p className="font-bold text-[var(--text-2)] text-sm">No History Yet</p>
            <p className="text-xs text-[var(--text-5)] mt-1 max-w-sm">
              Run analysis at least once to start tracking. After your second run, the diff view will show you exactly which requirements improved or regressed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const latestScore = history[0]?.overallScore ?? 0;
  const prevScore   = history[1]?.overallScore ?? null;
  const scoreDelta  = prevScore !== null ? latestScore - prevScore : null;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Header ── */}
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30">
                SPRINT HISTORY
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-[var(--text-1)]">Analysis History & Diff</h2>
            </div>
            <p className="text-xs text-[var(--text-4)]">
              {history.length} analysis run{history.length !== 1 ? 's' : ''} recorded. Select any past run to compare with the current state.
            </p>
          </div>

          {/* Current score + delta */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-center">
              <p className="text-[9px] font-mono uppercase text-[var(--text-4)]">Current Score</p>
              <p className="text-2xl font-extrabold font-mono" style={{ color: HEALTH_COLORS[history[0]?.healthRating] || '#f5f5f1' }}>
                {latestScore}%
              </p>
            </div>
            {scoreDelta !== null && (
              <div className={`flex items-center gap-1 text-sm font-bold ${scoreDelta > 0 ? 'text-emerald-400' : scoreDelta < 0 ? 'text-rose-400' : 'text-[var(--text-4)]'}`}>
                {scoreDelta > 0 ? <TrendingUp className="w-4 h-4" /> : scoreDelta < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                {scoreDelta > 0 ? '+' : ''}{scoreDelta}%
                <span className="text-[10px] font-mono text-[var(--text-5)] hidden sm:inline">vs prev run</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Health Score Trend Chart ── */}
      {chartData.length >= 2 && (
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-[var(--text-1)] flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[var(--accent)]" />
            Health Score Trend
          </h3>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#6a6a62" fontSize={10} tickLine={false} />
                <YAxis stroke="#6a6a62" fontSize={10} domain={[0, 100]} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-[#131313] border border-[var(--accent)]/20 rounded-xl px-3 py-2 text-xs shadow-lg">
                        <p className="font-bold text-[var(--text-1)]">{d.label}</p>
                        <p className="text-[var(--accent)] font-mono font-bold">{d.score}% health</p>
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="var(--accent)"
                  strokeWidth={2.5}
                  dot={{ fill: 'var(--accent)', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: 'var(--accent)', strokeWidth: 2, stroke: '#0a0a0a' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Main content grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Run timeline */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-xs font-mono font-bold uppercase text-[var(--text-4)] flex items-center gap-1.5 px-1">
            <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
            Run Timeline
          </h3>

          <div className="space-y-2">
            {visibleHistory.map((run, idx) => {
              const isSelected = compareRunId === run.runId;
              const isLatest = idx === 0;
              const hColor = HEALTH_COLORS[run.healthRating] || '#9a9a92';

              return (
                <button
                  key={run.runId}
                  onClick={() => setCompareRunId(isSelected ? null : run.runId)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--accent)]/10 border-[var(--accent)]/40'
                      : 'bg-[var(--panel)] border-[var(--border)] hover:border-[var(--accent)]/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-[var(--text-4)]">
                        Run #{history.length - idx}
                      </span>
                      {isLatest && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/25">
                          LATEST
                        </span>
                      )}
                      {isSelected && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                          COMPARING
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-bold font-mono" style={{ color: hColor }}>
                      {run.overallScore}%
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--text-5)] flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {formatDate(run.timestamp)}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded-full border"
                      style={{ color: hColor, borderColor: `${hColor}40`, background: `${hColor}15` }}
                    >
                      {run.healthRating}
                    </span>
                    <span className="text-[10px] text-[var(--text-5)]">
                      {run.statusSnapshot.length} req{run.statusSnapshot.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </button>
              );
            })}

            {history.length > 5 && (
              <button
                onClick={() => setShowAllRuns((p) => !p)}
                className="w-full text-[11px] font-mono text-[var(--accent)] hover:text-[var(--accent-dim)] flex items-center justify-center gap-1 py-2 cursor-pointer"
              >
                {showAllRuns ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showAllRuns ? 'Show fewer' : `Show ${history.length - 5} more runs`}
              </button>
            )}
          </div>

          {!compareRunId && (
            <p className="text-[10px] text-[var(--text-5)] text-center px-2 pt-1">
              Click any run above to compare it with the current analysis state
            </p>
          )}
        </div>

        {/* Right: Diff view */}
        <div className="lg:col-span-2">
          {!compareRunId ? (
            <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-10 flex flex-col items-center gap-4 text-center h-full justify-center min-h-[300px]">
              <Shield className="w-10 h-10 text-[var(--text-5)]" />
              <div>
                <p className="font-bold text-[var(--text-3)] text-sm">Select a Run to Compare</p>
                <p className="text-xs text-[var(--text-5)] mt-1">
                  Click any past run in the timeline to see a diff of what changed vs. the current analysis.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Diff summary */}
              <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-[var(--text-1)] flex items-center gap-2">
                    <History className="w-4 h-4 text-purple-400" />
                    Change Summary
                  </h3>
                  <span className="text-[10px] font-mono text-[var(--text-5)]">
                    Run #{history.length - history.findIndex((r) => r.runId === compareRunId)} → Current
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/25 text-center">
                    <p className="text-[9px] text-emerald-400 font-mono font-bold uppercase">Improved</p>
                    <p className="text-xl font-extrabold font-mono text-emerald-300">{improved}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/25 text-center">
                    <p className="text-[9px] text-rose-400 font-mono font-bold uppercase">Regressed</p>
                    <p className="text-xl font-extrabold font-mono text-rose-300">{regressed}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-center">
                    <p className="text-[9px] text-[var(--text-4)] font-mono font-bold uppercase">Unchanged</p>
                    <p className="text-xl font-extrabold font-mono text-[var(--text-2)]">{unchanged}</p>
                  </div>
                </div>
              </div>

              {/* Diff items */}
              <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
                {/* Regressions first */}
                {diffs.filter(d => d.kind === 'regressed').map((d) => (
                  <DiffRow key={d.reqId} diff={d} currentResults={currentResults} />
                ))}
                {/* Then improvements */}
                {diffs.filter(d => d.kind === 'improved').map((d) => (
                  <DiffRow key={d.reqId} diff={d} currentResults={currentResults} />
                ))}
                {/* Then unchanged */}
                {diffs.filter(d => d.kind === 'unchanged').map((d) => (
                  <DiffRow key={d.reqId} diff={d} currentResults={currentResults} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Individual diff row ──────────────────────────────────────────────────────

interface DiffRowProps {
  diff: ReqDiff;
  currentResults: RequirementAnalysisResult[];
}

const STATUS_SHORT: Partial<Record<ImplementationStatus, string>> = {
  'Implemented': 'Done',
  'Completed': 'Done',
  'Partially Implemented': 'Partial',
  'Partial': 'Partial',
  'Missing': 'Missing',
  'Unable to Determine': 'Unknown',
};

function DiffRow({ diff, currentResults }: DiffRowProps) {
  const result = currentResults.find((r) => r.requirementId === diff.reqId);
  const { kind } = diff;

  const rowStyles = {
    improved:  { bg: 'bg-emerald-950/15', border: 'border-emerald-500/20' },
    regressed: { bg: 'bg-rose-950/15',    border: 'border-rose-500/20' },
    unchanged: { bg: 'bg-[var(--panel)]', border: 'border-[var(--border)]' },
  }[kind];

  const kindIcon = {
    improved:  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />,
    regressed: <ArrowDownRight className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />,
    unchanged: <Minus className="w-3.5 h-3.5 text-[var(--text-5)] flex-shrink-0" />,
  }[kind];

  return (
    <div className={`rounded-xl border px-3.5 py-3 flex items-start gap-3 ${rowStyles.bg} ${rowStyles.border}`}>
      <div className="mt-0.5">{kindIcon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="font-mono font-bold text-[var(--accent)] text-[11px]">{diff.reqId}</span>
          <span className="text-[10px] text-[var(--text-4)] truncate">{result?.requirementTitle}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono flex-wrap">
          {diff.prevStatus ? (
            <>
              <span className={`px-1.5 py-0.5 rounded border ${getStatusStyle(diff.prevStatus)}`}>
                {STATUS_SHORT[diff.prevStatus] ?? diff.prevStatus}
                {diff.prevCoverage !== null && ` · ${diff.prevCoverage}%`}
              </span>
              <span className="text-[var(--text-5)]">→</span>
              <span className={`px-1.5 py-0.5 rounded border ${getStatusStyle(diff.currStatus)}`}>
                {STATUS_SHORT[diff.currStatus] ?? diff.currStatus}
                {` · ${diff.currCoverage}%`}
              </span>
            </>
          ) : (
            <span className="text-[var(--text-5)] italic">New requirement (not in selected run)</span>
          )}
        </div>
      </div>
      {kind !== 'unchanged' && (
        <div className={`text-[10px] font-mono font-bold flex-shrink-0 ${kind === 'improved' ? 'text-emerald-400' : 'text-rose-400'}`}>
          {kind === 'improved' ? '+' : ''}{diff.currCoverage - (diff.prevCoverage ?? diff.currCoverage)}%
        </div>
      )}
    </div>
  );
}

function getStatusStyle(status: ImplementationStatus | null): string {
  if (!status) return 'bg-[var(--bg)] text-[var(--text-5)] border-[var(--border)]';
  if (status === 'Implemented' || status === 'Completed')
    return 'bg-emerald-950/30 text-emerald-300 border-emerald-500/30';
  if (status === 'Partially Implemented' || status === 'Partial')
    return 'bg-amber-950/20 text-amber-300 border-amber-500/25';
  if (status === 'Missing')
    return 'bg-rose-950/30 text-rose-300 border-rose-500/30';
  return 'bg-[var(--bg)] text-[var(--text-5)] border-[var(--border)]';
}
