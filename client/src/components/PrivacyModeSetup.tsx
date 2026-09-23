import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, CheckCircle2, XCircle, Loader2, ExternalLink,
  RefreshCw, ChevronDown, Lock, Settings2,
} from 'lucide-react';
import { checkPrivacyStatusApi, fetchPrivacyModelsApi, PrivacyStatus } from '../services/api';

interface PrivacyModeSetupProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  /** Custom local agent URL (for deployed server use) */
  localAgentUrl?: string;
  onAgentUrlChange?: (url: string) => void;
  /** Compact mode — used inline in NewProjectModal */
  compact?: boolean;
  /** Legacy callbacks (optional, kept for backward compat) */
  onReady?: () => void;
  onCancel?: () => void;
  inline?: boolean;
}

const SUGGESTED_MODELS = [
  'qwen2.5-coder:7b',
  'llama3.1:8b',
  'deepseek-r1:8b',
  'mistral:7b',
  'codellama:7b',
];

type Step = 'install' | 'connect' | 'model' | 'ready';

export const PrivacyModeSetup: React.FC<PrivacyModeSetupProps> = ({
  selectedModel,
  onModelChange,
  localAgentUrl: localAgentUrlProp,
  onAgentUrlChange,
  compact = false,
  onReady,
  onCancel,
  inline = false,
}) => {
  const [agentUrl, setAgentUrl]         = useState(localAgentUrlProp || 'http://localhost:3847');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [status, setStatus]           = useState<PrivacyStatus | null>(null);
  const [checking, setChecking]       = useState(false);
  const [models, setModels]           = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>('install');

  // isInline must be declared before any useEffect that references it
  const isInline = compact || inline;

  // Stable ref so the onReady effect doesn't re-run when parent re-renders
  const onReadyRef = React.useRef(onReady);
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);

  const checkConnection = useCallback(async () => {
    setChecking(true);
    try {
      const s = await checkPrivacyStatusApi(agentUrl !== 'http://localhost:3847' ? agentUrl : undefined);
      setStatus(s);
      if (s.agent && s.ollama) {
        setCurrentStep('model');
        setModelsLoading(true);
        try {
          const { models: m } = await fetchPrivacyModelsApi(agentUrl !== 'http://localhost:3847' ? agentUrl : undefined);
          setModels(m);
          if (m.length > 0 && !m.includes(selectedModel)) onModelChange(m[0]);
        } catch {
          // Ollama models fetch failed — non-fatal, user can still proceed
        }
        setModelsLoading(false);
      } else if (s.agent && !s.ollama) {
        setCurrentStep('connect');
      } else {
        setCurrentStep('install');
      }
    } catch {
      setStatus({ agent: false, ollama: false, status: 'error' });
    } finally {
      setChecking(false);
    }
  }, [selectedModel, onModelChange, agentUrl]);

  useEffect(() => { checkConnection(); }, []);

  const isReady = !!(status?.agent && status?.ollama);

  // In inline mode the "Continue" button is hidden — auto-fire onReady
  // when both services are confirmed connected.
  useEffect(() => {
    if (isInline && isReady) onReadyRef.current?.();
  }, [isReady, isInline]);

  const statusDot = (ok: boolean | undefined, label: string) => (
    <div className="flex items-center gap-1.5 text-[11px]">
      <div className={`w-1.5 h-1.5 rounded-full ${ok === undefined ? 'bg-[var(--text-5)]' : ok ? 'bg-[var(--success)] shadow-[0_0_5px_var(--success)]' : 'bg-[var(--danger)]'}`} />
      <span className={ok === undefined ? 'text-[var(--text-5)]' : ok ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>{label}</span>
    </div>
  );

  const isDone = (step: Step) =>
    (step === 'install' && currentStep !== 'install') ||
    (step === 'connect' && (currentStep === 'model' || currentStep === 'ready')) ||
    (step === 'model' && currentStep === 'ready');

  const stepClass = (step: Step) => {
    const active = currentStep === step;
    const done   = isDone(step);
    return `flex items-start gap-3 p-3 rounded-xl border transition-all ${active ? 'border-[var(--accent)]/40 bg-[var(--accent)]/5' : done ? 'border-[var(--success)]/25 bg-[var(--success)]/4' : 'border-[var(--border)] opacity-45'}`;
  };

  const StepNum = ({ n, done }: { n: number; done: boolean }) =>
    done
      ? <CheckCircle2 className="w-4 h-4 text-[var(--success)] shrink-0 mt-0.5" />
      : <div className="w-5 h-5 rounded-full border border-[var(--accent)] text-[var(--accent)] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{n}</div>;

  // isInline already declared above

  return (
    <div className={isInline ? 'space-y-3' : 'p-5 rounded-2xl border border-[var(--border)] bg-[var(--panel)] space-y-4'}>
      {!isInline && (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)]">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-1)]">🔐 Privacy Mode Setup</h3>
            <p className="text-[11px] text-[var(--text-4)] font-mono">Local RAG + Ollama — code stays on your machine</p>
          </div>
          <div className="ml-auto flex flex-col gap-1">
            {statusDot(status?.agent,  'Agent')}
            {statusDot(status?.ollama, 'Ollama')}
          </div>
        </div>
      )}

      {/* Privacy guarantees */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        {['✓ Repository stays on your machine', '✓ AI runs locally via Ollama', '✓ RAG runs locally', '✓ Secrets are redacted before AI'].map((t) => (
          <p key={t} className="text-[11px] text-[var(--success)] font-mono">{t}</p>
        ))}
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {/* Step 1 */}
        <div className={stepClass('install')}>
          <StepNum n={1} done={isDone('install')} />
          <div className="flex-1">
            <p className="text-xs font-semibold text-[var(--text-1)]">Install Ollama</p>
            <p className="text-[11px] text-[var(--text-4)] mt-0.5">Download and run Ollama for your OS</p>
            <a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-mono text-[var(--accent)] hover:underline">
              <ExternalLink className="w-3 h-3" /> Install Ollama
            </a>
          </div>
        </div>

        {/* Step 2 */}
        <div className={stepClass('connect')}>
          <StepNum n={2} done={isDone('connect')} />
          <div className="flex-1">
            <p className="text-xs font-semibold text-[var(--text-1)]">Start Ollama &amp; Local Agent</p>
            <div className="mt-1.5 text-[11px] font-mono bg-[var(--surface-3)] rounded-lg px-3 py-2 space-y-0.5">
              <p className="text-[var(--text-4)]"># Terminal 1 — start Ollama</p>
              <p className="text-[var(--text-2)]">ollama serve</p>
              <p className="text-[var(--text-4)] mt-1"># Terminal 2 — start Local Agent</p>
              <p className="text-[var(--text-2)]">cd local-agent &amp;&amp; npm start</p>
            </div>

            {/* Advanced: custom agent URL */}
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setShowAdvanced(v => !v)}
                className="flex items-center gap-1 text-[10px] text-[var(--text-4)] hover:text-[var(--text-2)] transition-colors cursor-pointer"
              >
                <Settings2 className="w-3 h-3" />
                Advanced {showAdvanced ? '▲' : '▼'}
              </button>
              {showAdvanced && (
                <div className="mt-2 space-y-1">
                  <p className="text-[10px] text-[var(--text-4)] font-mono">
                    Agent URL — change if your server is deployed remotely and you're using a tunnel (e.g. ngrok)
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={agentUrl}
                      onChange={(e) => {
                        setAgentUrl(e.target.value);
                        onAgentUrlChange?.(e.target.value);
                      }}
                      placeholder="http://localhost:3847"
                      className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-[var(--text-1)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/40 placeholder:text-[var(--text-6)]"
                    />
                  </div>
                  {agentUrl !== 'http://localhost:3847' && (
                    <p className="text-[10px] text-[var(--warning)] font-mono">
                      ⚡ Using custom agent URL — make sure your local agent is accessible at this address
                    </p>
                  )}
                </div>
              )}
            </div>
            <button onClick={checkConnection} disabled={checking}
              className="mt-2 flex items-center gap-1.5 text-[11px] font-mono px-3 py-1.5 rounded-lg border border-[var(--accent)]/40 text-[var(--accent)] hover:bg-[var(--accent)]/8 transition-colors disabled:opacity-50 cursor-pointer">
              {checking ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Check Connection
            </button>
            {status && (
              <div className="mt-2 flex gap-4">
                {statusDot(status.agent,  'Local Agent')}
                {statusDot(status.ollama, 'Ollama')}
              </div>
            )}
            {status && !status.agent && (
              <p className="mt-1.5 text-[11px] text-[var(--danger)]">🔴 Agent offline — run <code className="font-mono">cd local-agent &amp;&amp; npm start</code></p>
            )}
            {status && status.agent && !status.ollama && (
              <p className="mt-1.5 text-[11px] text-[var(--warning)]">🟡 Ollama offline — run <code className="font-mono">ollama serve</code></p>
            )}
          </div>
        </div>

        {/* Step 3 */}
        <div className={stepClass('model')}>
          <StepNum n={3} done={isDone('model')} />
          <div className="flex-1">
            <p className="text-xs font-semibold text-[var(--text-1)]">Select Model</p>
            {modelsLoading ? (
              <div className="flex items-center gap-2 mt-2 text-[11px] text-[var(--text-4)]">
                <Loader2 className="w-3 h-3 animate-spin" /> Loading models…
              </div>
            ) : (
              <div className="relative mt-2">
                <select value={selectedModel} onChange={(e) => onModelChange(e.target.value)} disabled={!isReady}
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-1)] font-mono appearance-none focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/40 disabled:opacity-50 cursor-pointer">
                  {(models.length > 0 ? models : SUGGESTED_MODELS).map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <ChevronDown className="w-3 h-3 text-[var(--text-4)] absolute right-2.5 top-2 pointer-events-none" />
              </div>
            )}
            {models.length === 0 && isReady && (
              <p className="mt-1.5 text-[11px] text-[var(--text-4)]">
                Pull a model: <code className="font-mono text-[var(--accent)]">ollama pull {selectedModel}</code>
              </p>
            )}
          </div>
        </div>

        {/* Step 4 — Ready */}
        <div className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${isReady ? 'border-[var(--success)]/35 bg-[var(--success)]/5' : 'border-[var(--border)] opacity-40'}`}>
          <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${isReady ? 'border-[var(--success)] text-[var(--success)]' : 'border-[var(--border)] text-[var(--text-5)]'}`}>
            {isReady ? '✓' : '4'}
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--text-1)]">{isReady ? '🟢 Ready for Privacy Mode' : 'Connect Local Agent'}</p>
            <p className="text-[11px] text-[var(--text-4)] mt-0.5">
              {isReady ? 'Source code will be analysed locally. Nothing leaves your machine.' : 'Complete steps above.'}
            </p>
          </div>
        </div>
      </div>

      {/* Actions — only shown in non-compact / non-inline mode with legacy callbacks */}
      {!isInline && (onCancel || onReady) && (
        <div className="flex items-center gap-3 pt-1">
          {onCancel && (
            <button onClick={onCancel}
              className="px-4 py-2 rounded-lg text-xs font-medium text-[var(--text-4)] hover:text-[var(--text-2)] hover:bg-[var(--surface-3)] transition-colors cursor-pointer">
              ← Use Cloud AI
            </button>
          )}
          {onReady && (
            <button onClick={onReady} disabled={!isReady}
              className="ml-auto px-5 py-2 rounded-lg text-xs font-bold bg-[var(--accent)] hover:brightness-110 text-black shadow-[0_0_14px_-3px_var(--accent)] transition-all disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer">
              Continue with Privacy Mode →
            </button>
          )}
        </div>
      )}
    </div>
  );
};
