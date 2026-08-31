import React, { useState, useMemo } from 'react';
import { ProjectHealthMetrics, ScopeCreepItem } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Layers2,
  AlertTriangle,
  ShieldAlert,
  Info,
  CheckCircle2,
  Plus,
  Eye,
  EyeOff,
  Filter,
  Zap,
  PackageSearch,
} from 'lucide-react';

interface ScopeCreepPanelProps {
  healthMetrics: ProjectHealthMetrics;
}

type Severity = 'HIGH' | 'MEDIUM' | 'LOW';
type AckMap = Record<string, 'acknowledged' | 'add-to-req' | null>;

const SEVERITY_CONFIG: Record<Severity, { color: string; bg: string; border: string; icon: React.FC<{ className?: string }> }> = {
  HIGH: {
    color: 'text-rose-300',
    bg: 'bg-rose-950/30',
    border: 'border-rose-500/30',
    icon: ({ className }) => <ShieldAlert className={className} />,
  },
  MEDIUM: {
    color: 'text-amber-300',
    bg: 'bg-amber-950/20',
    border: 'border-amber-500/25',
    icon: ({ className }) => <AlertTriangle className={className} />,
  },
  LOW: {
    color: 'text-sky-300',
    bg: 'bg-sky-950/20',
    border: 'border-sky-500/20',
    icon: ({ className }) => <Info className={className} />,
  },
};

const PIE_COLORS: Record<Severity, string> = {
  HIGH: '#f43f5e',
  MEDIUM: '#f59e0b',
  LOW: '#38bdf8',
};

export const ScopeCreepPanel: React.FC<ScopeCreepPanelProps> = ({ healthMetrics }) => {
  const items: ScopeCreepItem[] = healthMetrics.scopeCreep || [];
  const [filterSeverity, setFilterSeverity] = useState<Severity | 'ALL'>('ALL');
  const [hideAcknowledged, setHideAcknowledged] = useState(false);
  const [ackMap, setAckMap] = useState<AckMap>({});

  const pieData = useMemo(() => {
    const counts: Record<Severity, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    items.forEach((i) => {
      const sev = (i.severity as Severity) || 'LOW';
      counts[sev] = (counts[sev] || 0) + 1;
    });
    return (['HIGH', 'MEDIUM', 'LOW'] as Severity[])
      .filter((s) => counts[s] > 0)
      .map((s) => ({ name: s, value: counts[s], color: PIE_COLORS[s] }));
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filterSeverity !== 'ALL' && item.severity !== filterSeverity) return false;
      if (hideAcknowledged && ackMap[item.feature]) return false;
      return true;
    });
  }, [items, filterSeverity, hideAcknowledged, ackMap]);

  const handleAck = (feature: string, action: 'acknowledged' | 'add-to-req') => {
    setAckMap((prev) => ({ ...prev, [feature]: prev[feature] === action ? null : action }));
  };

  const ackedCount = Object.values(ackMap).filter(Boolean).length;

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30">
              SCOPE MONITOR
            </span>
            <h2 className="text-lg font-bold text-[var(--text-1)]">Scope Creep Panel</h2>
          </div>
          <p className="text-xs text-[var(--text-4)]">
            Detects features built in the codebase that aren't mentioned in any requirement document.
          </p>
        </div>
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-16 flex flex-col items-center gap-4 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <p className="font-bold text-[var(--text-2)] text-sm">No Scope Creep Detected</p>
            <p className="text-xs text-[var(--text-5)] mt-1 max-w-sm">
              All detected features in the codebase appear to be covered by the uploaded requirement documents. Run analysis after connecting a GitHub repository to scan for scope creep.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const highCount   = items.filter((i) => i.severity === 'HIGH').length;
  const mediumCount = items.filter((i) => i.severity === 'MEDIUM').length;
  const lowCount    = items.filter((i) => i.severity === 'LOW').length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Header ── */}
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30">
                SCOPE MONITOR
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-[var(--text-1)]">Scope Creep Panel</h2>
            </div>
            <p className="text-xs text-[var(--text-4)]">
              Features detected in the codebase that are <strong className="text-[var(--text-2)]">not mentioned</strong> in any requirement document.
            </p>
          </div>

          {/* Summary counters */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="px-3 py-2 rounded-xl bg-rose-950/30 border border-rose-500/30 text-center">
              <span className="text-[9px] text-rose-400 block font-mono font-bold uppercase">High</span>
              <span className="text-base font-bold font-mono text-rose-300">{highCount}</span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-amber-950/20 border border-amber-500/25 text-center">
              <span className="text-[9px] text-amber-400 block font-mono font-bold uppercase">Med</span>
              <span className="text-base font-bold font-mono text-amber-300">{mediumCount}</span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-sky-950/20 border border-sky-500/20 text-center">
              <span className="text-[9px] text-sky-400 block font-mono font-bold uppercase">Low</span>
              <span className="text-base font-bold font-mono text-sky-300">{lowCount}</span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-center">
              <span className="text-[9px] text-[var(--text-4)] block font-mono font-bold uppercase">Total</span>
              <span className="text-base font-bold font-mono text-[var(--text-1)]">{items.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Donut + Legend */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[var(--text-4)] mb-4 flex items-center gap-1.5">
              <PackageSearch className="w-3.5 h-3.5 text-[var(--accent)]" />
              Severity Breakdown
            </h3>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={44} outerRadius={68} paddingAngle={5} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#131313', borderColor: 'rgba(214,255,63,0.2)', borderRadius: '10px', fontSize: '11px', color: '#f5f5f1' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 mt-2">
              {pieData.map((p) => (
                <div key={p.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="text-[var(--text-3)] font-mono">{p.name}</span>
                  </div>
                  <span className="font-bold text-[var(--text-2)] font-mono">{p.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* What is scope creep? */}
          <div className="ai-copilot-panel p-4 space-y-2 text-xs text-[var(--text-3)] leading-relaxed">
            <p className="font-bold text-[var(--accent)] text-[10px] uppercase font-mono tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3" /> What is Scope Creep?
            </p>
            <p>Scope creep occurs when code is written for features that were never formally specified in a requirements document.</p>
            <p>It can indicate <strong className="text-amber-300">undocumented features</strong>, <strong className="text-rose-300">technical debt</strong>, or missing requirements that should be added to the SRS.</p>
            <p>
              <strong className="text-[var(--text-2)]">HIGH:</strong> Significant product feature.<br />
              <strong className="text-[var(--text-2)]">MEDIUM:</strong> Notable functionality.<br />
              <strong className="text-[var(--text-2)]">LOW:</strong> Minor or utility-level addition.
            </p>
          </div>
        </div>

        {/* Right: Items list */}
        <div className="lg:col-span-2 space-y-3">
          {/* Filter Controls */}
          <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-[var(--accent)]" />
              {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(sev)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition-all cursor-pointer ${
                    filterSeverity === sev
                      ? 'bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/40'
                      : 'bg-[var(--bg)] text-[var(--text-4)] border-[var(--border-2)] hover:text-[var(--text-2)]'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
            <button
              onClick={() => setHideAcknowledged((p) => !p)}
              className="ml-auto flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-4)] hover:text-[var(--text-2)] transition-colors cursor-pointer"
            >
              {hideAcknowledged ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {hideAcknowledged ? 'Show' : 'Hide'} Acknowledged
              {ackedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-[10px] border border-[var(--accent)]/20">
                  {ackedCount}
                </span>
              )}
            </button>
          </div>

          {/* Items */}
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-10 text-center">
                <p className="text-sm font-bold text-[var(--text-3)]">No items match the current filter</p>
                <p className="text-xs text-[var(--text-5)] mt-1">Try changing the severity filter or showing acknowledged items.</p>
              </div>
            ) : (
              filtered.map((item, idx) => {
                const sev = (item.severity as Severity) || 'LOW';
                const cfg = SEVERITY_CONFIG[sev];
                const SevIcon = cfg.icon;
                const currentAck = ackMap[item.feature];

                return (
                  <div
                    key={`${item.feature}-${idx}`}
                    className={`rounded-xl border p-4 transition-all ${cfg.bg} ${cfg.border} ${currentAck ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <SevIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.color}`} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-xs font-bold ${cfg.color}`}>{item.feature}</span>
                            <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                              {item.severity}
                            </span>
                            {currentAck && (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border bg-emerald-950/30 text-emerald-400 border-emerald-500/30">
                                {currentAck === 'acknowledged' ? '✓ ACKNOWLEDGED' : '✓ QUEUED FOR REQ'}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[var(--text-4)]">
                            Detected keyword: <span className="font-mono text-[var(--text-3)]">{item.keyword}</span>
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleAck(item.feature, 'acknowledged')}
                          title="Mark as Acknowledged"
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono font-bold border cursor-pointer transition-all ${
                            currentAck === 'acknowledged'
                              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/40'
                              : 'bg-[var(--bg)] text-[var(--text-5)] border-[var(--border-2)] hover:text-emerald-400 hover:border-emerald-500/30'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span className="hidden sm:inline">Ack</span>
                        </button>
                        <button
                          onClick={() => handleAck(item.feature, 'add-to-req')}
                          title="Queue as a requirement to document"
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono font-bold border cursor-pointer transition-all ${
                            currentAck === 'add-to-req'
                              ? 'bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/40'
                              : 'bg-[var(--bg)] text-[var(--text-5)] border-[var(--border-2)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30'
                          }`}
                        >
                          <Plus className="w-3 h-3" />
                          <span className="hidden sm:inline">Add to Req</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <p className="text-[11px] text-[var(--text-5)] text-center">
            Showing {filtered.length} of {items.length} detected scope creep items
          </p>
        </div>
      </div>
    </div>
  );
};
