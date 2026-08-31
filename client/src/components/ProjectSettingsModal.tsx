import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Bell,
  Key,
  ExternalLink,
  Check,
  Copy,
  Trash2,
  Plus,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Terminal,
  Zap,
  Shield,
} from 'lucide-react';
import { ApiKey, ProjectIntelligenceData } from '../types';
import {
  fetchApiKeysApi,
  createApiKeyApi,
  revokeApiKeyApi,
  testSlackWebhookApi,
  saveProjectApi,
} from '../services/api';

interface ProjectSettingsModalProps {
  project: ProjectIntelligenceData;
  onClose: () => void;
  onSaved: (updated: ProjectIntelligenceData) => void;
}

type Tab = 'slack' | 'apikeys';

export const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({ project, onClose, onSaved }) => {
  const [activeTab, setActiveTab] = useState<Tab>('slack');

  // ── Slack state ───────────────────────────────────────────────────────
  const [webhookUrl, setWebhookUrl]       = useState(project.project.slackWebhookUrl || '');
  const [slackSaving, setSlackSaving]     = useState(false);
  const [slackTesting, setSlackTesting]   = useState(false);
  const [slackMsg, setSlackMsg]           = useState<{ ok: boolean; text: string } | null>(null);
  const [showWebhook, setShowWebhook]     = useState(false);

  // ── API Keys state ────────────────────────────────────────────────────
  const [apiKeys, setApiKeys]             = useState<ApiKey[]>([]);
  const [keysLoading, setKeysLoading]     = useState(true);
  const [newLabel, setNewLabel]           = useState('');
  const [creating, setCreating]           = useState(false);
  const [newKeyResult, setNewKeyResult]   = useState<{ key: string; label: string } | null>(null);
  const [copied, setCopied]               = useState(false);
  const [revoking, setRevoking]           = useState<string | null>(null);
  const [apiMsg, setApiMsg]               = useState<{ ok: boolean; text: string } | null>(null);

  // ── Load API keys on mount ────────────────────────────────────────────
  const loadKeys = useCallback(async () => {
    setKeysLoading(true);
    try {
      const res = await fetchApiKeysApi();
      setApiKeys(res.keys);
    } catch {
      setApiKeys([]);
    } finally {
      setKeysLoading(false);
    }
  }, []);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  // ── Slack save ────────────────────────────────────────────────────────
  const handleSlackSave = async () => {
    setSlackSaving(true);
    setSlackMsg(null);
    try {
      const updated = await saveProjectApi(project.project.id, {
        project: { slackWebhookUrl: webhookUrl.trim() },
      });
      onSaved(updated);
      setSlackMsg({ ok: true, text: 'Slack webhook saved successfully.' });
    } catch (err: any) {
      setSlackMsg({ ok: false, text: err.message || 'Failed to save webhook.' });
    } finally {
      setSlackSaving(false);
    }
  };

  // ── Slack test ────────────────────────────────────────────────────────
  const handleSlackTest = async () => {
    if (!webhookUrl.trim()) return;
    setSlackTesting(true);
    setSlackMsg(null);
    try {
      const res = await testSlackWebhookApi(webhookUrl.trim());
      setSlackMsg({ ok: true, text: res.message });
    } catch (err: any) {
      setSlackMsg({ ok: false, text: err.message || 'Test notification failed.' });
    } finally {
      setSlackTesting(false);
    }
  };

  // ── Create API key ────────────────────────────────────────────────────
  const handleCreateKey = async () => {
    setCreating(true);
    setApiMsg(null);
    setNewKeyResult(null);
    try {
      const res = await createApiKeyApi(newLabel.trim() || 'My API Key');
      setNewKeyResult({ key: res.key, label: res.label });
      setNewLabel('');
      await loadKeys();
    } catch (err: any) {
      setApiMsg({ ok: false, text: err.message || 'Failed to create key.' });
    } finally {
      setCreating(false);
    }
  };

  // ── Revoke API key ────────────────────────────────────────────────────
  const handleRevoke = async (id: string) => {
    setRevoking(id);
    try {
      await revokeApiKeyApi(id);
      setApiKeys((prev) => prev.filter((k) => k._id !== id));
      setApiMsg({ ok: true, text: 'Key revoked successfully.' });
    } catch (err: any) {
      setApiMsg({ ok: false, text: err.message || 'Failed to revoke key.' });
    } finally {
      setRevoking(null);
    }
  };

  // ── Copy new key ──────────────────────────────────────────────────────
  const handleCopy = () => {
    if (!newKeyResult) return;
    navigator.clipboard.writeText(newKeyResult.key).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden"
        style={{ background: 'var(--panel)', borderColor: 'var(--border-2)', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h2 className="text-lg font-extrabold text-[var(--text-1)]">Project Settings</h2>
            <p className="text-xs text-[var(--text-4)] mt-0.5">{project.project.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--surface-3)] text-[var(--text-4)] hover:text-[var(--text-2)] cursor-pointer transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
          {([
            { id: 'slack',   label: 'Slack Notifications', icon: Bell },
            { id: 'apikeys', label: 'API Keys',            icon: Key  },
          ] as { id: Tab; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === id
                  ? 'border-[var(--accent)] text-[var(--accent)]'
                  : 'border-transparent text-[var(--text-4)] hover:text-[var(--text-2)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>

          {/* ── SLACK TAB ── */}
          {activeTab === 'slack' && (
            <div className="p-6 space-y-5">
              <div className="ai-copilot-panel p-4 space-y-2">
                <p className="text-xs font-bold text-[var(--accent)] uppercase font-mono tracking-wider flex items-center gap-1">
                  <Bell className="w-3.5 h-3.5" /> How Slack Notifications Work
                </p>
                <p className="text-xs text-[var(--text-3)] leading-relaxed">
                  After every analysis run on this project, ProjectLens AI will post a rich summary card to your Slack channel showing the health score, requirement breakdown, and any regressions.
                </p>
                <p className="text-xs text-[var(--text-4)]">
                  📖 Get your webhook URL from:{' '}
                  <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] underline inline-flex items-center gap-0.5">
                    Slack Incoming Webhooks <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[var(--text-3)]">
                  Slack Incoming Webhook URL
                </label>
                <div className="relative">
                  <input
                    type={showWebhook ? 'text' : 'password'}
                    value={webhookUrl}
                    onChange={(e) => { setWebhookUrl(e.target.value); setSlackMsg(null); }}
                    placeholder="https://hooks.slack.com/services/T00000/B00000/XXXX"
                    className="w-full bg-[var(--bg)] border border-[var(--border-2)] rounded-xl px-4 py-2.5 pr-10 text-sm text-[var(--text-2)] font-mono focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWebhook((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-5)] hover:text-[var(--text-2)] cursor-pointer"
                  >
                    {showWebhook ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Feedback message */}
              {slackMsg && (
                <div className={`flex items-start gap-2 rounded-xl px-4 py-3 text-xs border ${
                  slackMsg.ok
                    ? 'bg-emerald-950/20 border-emerald-500/25 text-emerald-300'
                    : 'bg-rose-950/20 border-rose-500/25 text-rose-300'
                }`}>
                  {slackMsg.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                  {slackMsg.text}
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSlackTest}
                  disabled={slackTesting || !webhookUrl.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border border-[var(--border-2)] text-[var(--text-2)] hover:text-[var(--accent)] hover:border-[var(--accent)]/40 disabled:opacity-50 cursor-pointer transition-all"
                >
                  {slackTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  Send Test
                </button>
                <button
                  onClick={handleSlackSave}
                  disabled={slackSaving}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50 transition-all"
                  style={{ background: 'var(--accent)', color: '#000', boxShadow: '0 0 20px -6px var(--accent)' }}
                >
                  {slackSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save Webhook
                </button>
                {webhookUrl && (
                  <button
                    onClick={() => { setWebhookUrl(''); setSlackMsg(null); }}
                    className="text-xs text-[var(--text-5)] hover:text-rose-400 cursor-pointer transition-colors ml-auto"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── API KEYS TAB ── */}
          {activeTab === 'apikeys' && (
            <div className="p-6 space-y-5">
              <div className="ai-copilot-panel p-4 space-y-3">
                <p className="text-xs font-bold text-[var(--accent)] uppercase font-mono tracking-wider flex items-center gap-1">
                  <Terminal className="w-3.5 h-3.5" /> REST API Access
                </p>
                <p className="text-xs text-[var(--text-3)] leading-relaxed">
                  Use API keys to access the ProjectLens REST API from CI/CD pipelines, scripts, or third-party tools without exposing your account password.
                </p>
                <div className="rounded-lg bg-[var(--bg)] border border-[var(--border)] p-3 font-mono text-[10px] text-[var(--text-4)] space-y-1">
                  <p className="text-[var(--text-3)]"># Example: Get project health in CI</p>
                  <p><span className="text-[var(--accent)]">curl</span> -H <span className="text-amber-300">"Authorization: Bearer pl_live_..."</span> \</p>
                  <p className="pl-4 break-all text-sky-300">{API_BASE}/api/v1/projects/{project.project.id}/health</p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-5)]">
                  <Shield className="w-3 h-3 text-emerald-400" />
                  Keys are hashed with SHA-256 — the full key is shown only once on creation.
                </div>
              </div>

              {/* New key result (shown once after creation) */}
              {newKeyResult && (
                <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-[var(--accent)] font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    API Key Created — Copy it now!
                  </div>
                  <p className="text-[11px] text-rose-300 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    This key will not be shown again. Store it securely.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-[var(--bg)] border border-[var(--border-2)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--accent)] break-all">
                      {newKeyResult.key}
                    </code>
                    <button
                      onClick={handleCopy}
                      className="p-2 rounded-lg border border-[var(--border-2)] hover:border-[var(--accent)]/40 text-[var(--text-4)] hover:text-[var(--accent)] cursor-pointer transition-all flex-shrink-0"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    onClick={() => setNewKeyResult(null)}
                    className="text-xs text-[var(--text-5)] hover:text-[var(--text-3)] cursor-pointer"
                  >
                    I've saved it, dismiss
                  </button>
                </div>
              )}

              {/* Create new key */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[var(--text-3)]">Create New API Key</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Label (e.g. CI Pipeline, Zapier)"
                    maxLength={80}
                    className="flex-1 bg-[var(--bg)] border border-[var(--border-2)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-2)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreateKey(); }}
                  />
                  <button
                    onClick={handleCreateKey}
                    disabled={creating}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50 transition-all flex-shrink-0"
                    style={{ background: 'var(--accent)', color: '#000', boxShadow: '0 0 20px -6px var(--accent)' }}
                  >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Generate
                  </button>
                </div>
              </div>

              {/* API feedback */}
              {apiMsg && (
                <div className={`flex items-start gap-2 rounded-xl px-4 py-3 text-xs border ${
                  apiMsg.ok
                    ? 'bg-emerald-950/20 border-emerald-500/25 text-emerald-300'
                    : 'bg-rose-950/20 border-rose-500/25 text-rose-300'
                }`}>
                  {apiMsg.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
                  {apiMsg.text}
                </div>
              )}

              {/* Key list */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-[var(--text-4)] uppercase font-mono tracking-wider">
                  Your Keys ({apiKeys.length}/10)
                </p>

                {keysLoading ? (
                  <div className="py-8 flex justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-[var(--text-5)]" />
                  </div>
                ) : apiKeys.length === 0 ? (
                  <div className="py-8 text-center text-sm text-[var(--text-5)]">
                    No API keys yet. Generate one above to get started.
                  </div>
                ) : (
                  apiKeys.map((k) => (
                    <div key={k._id} className="flex items-center gap-3 p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--border-2)] transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center flex-shrink-0">
                        <Key className="w-4 h-4 text-[var(--accent)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-2)] truncate">{k.label}</p>
                        <p className="text-[10px] font-mono text-[var(--text-5)]">{k.keyPrefix}••••••••</p>
                        <p className="text-[10px] text-[var(--text-5)]">
                          {k.lastUsedAt
                            ? `Last used ${new Date(k.lastUsedAt).toLocaleDateString()}`
                            : 'Never used'}
                          {' · '}Created {new Date(k.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRevoke(k._id)}
                        disabled={revoking === k._id}
                        className="p-1.5 rounded-lg border border-rose-500/20 text-rose-400/60 hover:text-rose-400 hover:border-rose-500/40 cursor-pointer transition-all flex-shrink-0 disabled:opacity-50"
                        title="Revoke key"
                      >
                        {revoking === k._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Quick reference */}
              <div className="rounded-xl border border-[var(--border)] p-4 space-y-2">
                <p className="text-xs font-bold text-[var(--text-3)] flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-[var(--accent)]" />
                  Available REST API Endpoints
                </p>
                <div className="space-y-1 font-mono text-[10px]">
                  {[
                    ['GET', '/api/v1/projects', 'List all projects'],
                    ['GET', '/api/v1/projects/:id', 'Full project data'],
                    ['GET', '/api/v1/projects/:id/health', 'Health metrics + score'],
                    ['GET', '/api/v1/projects/:id/requirements', 'Requirements + status'],
                    ['GET', '/api/v1/projects/:id/history', 'Analysis run history'],
                  ].map(([method, path, desc]) => (
                    <div key={path} className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold w-8 text-center flex-shrink-0 ${method === 'GET' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30' : 'bg-amber-950/40 text-amber-400'}`}>
                        {method}
                      </span>
                      <span className="text-[var(--accent)]">{path}</span>
                      <span className="text-[var(--text-5)]">— {desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
