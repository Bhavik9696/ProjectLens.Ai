import React, { useState } from 'react';
import { Lock, Cpu, Database, WifiOff, Info } from 'lucide-react';

interface PrivacyModeIndicatorProps {
  ollamaModel?:  string;
  agentOnline?:  boolean;
  ollamaOnline?: boolean;
}

export const PrivacyModeIndicator: React.FC<PrivacyModeIndicatorProps> = ({
  ollamaModel  = 'llama3.1:8b',
  agentOnline  = true,
  ollamaOnline = true,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const Dot = ({ on }: { on: boolean }) => (
    <span className={`inline-block w-1.5 h-1.5 rounded-full ${on ? 'bg-[var(--success)] shadow-[0_0_5px_var(--success)]' : 'bg-[var(--danger)]'}`} />
  );

  return (
    <div className="relative inline-flex">
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--accent)]/25 bg-[var(--accent)]/6 text-[11px] font-mono cursor-default select-none"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <Lock className="w-3 h-3 text-[var(--accent)]" />
        <span className="text-[var(--accent)] font-bold tracking-wide">Privacy Mode</span>

        {/* Divider */}
        <span className="w-px h-3 bg-[var(--border)]" />

        {/* Status pills */}
        <span className="flex items-center gap-1 text-[var(--text-3)]">
          <Dot on={ollamaOnline} />
          <span className="text-[10px]">Ollama</span>
        </span>
        <span className="flex items-center gap-1 text-[var(--text-3)]">
          <Database className="w-2.5 h-2.5" />
          <span className="text-[10px]">RAG: Local</span>
        </span>
        <span className="flex items-center gap-1 text-[var(--text-3)]">
          <WifiOff className="w-2.5 h-2.5 text-[var(--danger)]" />
          <span className="text-[10px] text-[var(--danger)]">Ext. AI: Off</span>
        </span>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-72 p-3 rounded-xl border border-[var(--border)] bg-[var(--panel)] shadow-2xl text-[11px] text-[var(--text-3)]">
          <div className="flex items-start gap-2">
            <Lock className="w-3.5 h-3.5 text-[var(--accent)] shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="font-semibold text-[var(--text-1)]">Privacy Mode Active</p>
              <p>Repository source code is processed locally and is not sent to external AI providers.</p>
              <div className="space-y-1 border-t border-[var(--border)] pt-2">
                <Row label="AI Model"   value={ollamaModel} ok />
                <Row label="RAG"        value="Local (TF-IDF)" ok />
                <Row label="Repository" value="Local"      ok />
                <Row label="External AI" value="Disabled"  bad />
              </div>
            </div>
          </div>
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 border-b border-r border-[var(--border)] bg-[var(--panel)] rotate-45 -mt-1" />
        </div>
      )}
    </div>
  );
};

const Row = ({ label, value, ok, bad }: { label: string; value: string; ok?: boolean; bad?: boolean }) => (
  <div className="flex items-center justify-between gap-4">
    <span className="text-[var(--text-4)]">{label}</span>
    <span className={`font-mono ${bad ? 'text-[var(--danger)]' : ok ? 'text-[var(--success)]' : 'text-[var(--text-2)]'}`}>{value}</span>
  </div>
);
