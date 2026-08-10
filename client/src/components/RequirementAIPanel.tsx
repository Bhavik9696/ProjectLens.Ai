import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Bot,
  Send,
  Sparkles,
  FileCode,
  HelpCircle,
  Lock,
  AlertCircle,
  Zap,
  ChevronRight,
  Shield,
  FlaskConical,
  Wrench,
} from 'lucide-react';
import { askRequirementApi } from '../services/api';
import { RequirementAnalysisResult } from '../types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: Array<{ type: string; ref: string; label: string }>;
}

interface RequirementAIPanelProps {
  requirement: RequirementAnalysisResult;
  projectId?: string;
  onClose: () => void;
}

const QUICK_QUESTIONS = [
  { label: 'Why is this partial?',            q: 'Why is this requirement partial or incomplete?' },
  { label: 'What is missing?',                q: 'What is missing from this requirement implementation?' },
  { label: 'Show evidence',                   q: 'Show the implementation evidence and relevant files for this requirement.' },
  { label: 'Which files implement this?',     q: 'Which files implement this requirement?' },
  { label: 'What should the developer fix?',  q: 'What should the developer fix or implement to complete this requirement?' },
  { label: 'Any contradictions?',             q: 'Are there any contradictions detected for this requirement?' },
  { label: 'Are there tests?',                q: 'Are there automated tests for this requirement?' },
  { label: 'How to fully implement?',         q: 'How can this requirement be made fully implemented? Give me a step-by-step plan.' },
];

function formatContent(text: string): React.ReactNode {
  // Simple markdown-like rendering for bold (**text**), code (`text`), and line breaks
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return (
      <React.Fragment key={i}>
        {parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j} className="text-[var(--text-1)] font-bold">{part.slice(2, -2)}</strong>;
          }
          if (part.startsWith('`') && part.endsWith('`')) {
            return (
              <code key={j} className="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 font-mono text-[var(--accent)] text-[10px]">
                {part.slice(1, -1)}
              </code>
            );
          }
          return <span key={j}>{part}</span>;
        })}
        {i < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

export const RequirementAIPanel: React.FC<RequirementAIPanelProps> = ({
  requirement,
  projectId,
  onClose,
}) => {
  const isPartial    = requirement.status === 'Partially Implemented' || requirement.status === 'Partial';
  const isCompleted  = requirement.status === 'Implemented' || requirement.status === 'Completed';
  const statusColor  = isCompleted ? 'text-emerald-400' : isPartial ? 'text-amber-400' : 'text-rose-400';
  const confidencePct = requirement.confidencePercent || Math.round((requirement.confidence || 0) * 100);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      role: 'assistant',
      content: `I'm analyzing **${requirement.requirementId} — ${requirement.requirementTitle}**.

Current status: **${requirement.status}** | Coverage: **${requirement.coveragePercent}%** | Confidence: **${confidencePct}%**
${requirement.criteria ? `\nAcceptance criteria: ${requirement.criteria.filter(c => c.status === 'IMPLEMENTED').length}/${requirement.criteria.length} satisfied.` : ''}
${requirement.evidenceFiles?.length ? `\nEvidence found in ${requirement.evidenceFiles.length} file(s).` : '\nNo evidence files found.'}

Ask me anything about this specific requirement.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      citations: [],
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Build the scoped requirement context to send to the backend
  const buildContext = () => ({
    requirementId:     requirement.requirementId,
    requirementTitle:  requirement.requirementTitle,
    module:            requirement.module,
    status:            requirement.status,
    coveragePercent:   requirement.coveragePercent,
    confidencePercent: confidencePct,
    confidence:        requirement.confidence,
    description:       (requirement as any).description,
    actor:             (requirement as any).actor,
    action:            (requirement as any).action,
    criteria:          requirement.criteria || [],
    evidenceFiles:     requirement.evidenceFiles || [],
    testEvidence:      requirement.testEvidence,
    negativeEvidence:  requirement.negativeEvidence || [],
    contradictions:    requirement.contradictions || [],
    recommendation:    requirement.recommendation,
  });

  const handleSend = async (question?: string) => {
    const prompt = question || input.trim();
    if (!prompt || isLoading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await askRequirementApi(prompt, buildContext(), projectId);
      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: res.content || 'No response generated.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: res.citations || [],
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'I encountered an error. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHowToFix = () => handleSend('How can this requirement be made fully implemented? Give me a step-by-step plan.');

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Slide-in Panel */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col w-full max-w-[520px] shadow-2xl"
        style={{ background: 'var(--panel)', borderLeft: '1px solid var(--border)' }}
      >
        {/* Panel Header */}
        <div
          className="flex items-start justify-between p-5 border-b shrink-0"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border"
                style={{
                  color: 'var(--accent)',
                  background: 'rgba(var(--accent-rgb,214,255,63),0.08)',
                  borderColor: 'rgba(var(--accent-rgb,214,255,63),0.25)',
                }}
              >
                {requirement.requirementId}
              </span>
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-4)' }}>
                {requirement.module}
              </span>
            </div>
            <h3 className="text-sm font-bold truncate" style={{ color: 'var(--text-1)' }}>
              {requirement.requirementTitle}
            </h3>
            <div className="flex items-center gap-3 mt-1.5 text-[11px] font-mono">
              <span className={`font-bold ${statusColor}`}>{requirement.status}</span>
              <span style={{ color: 'var(--text-5)' }}>·</span>
              <span style={{ color: 'var(--text-4)' }}>{requirement.coveragePercent}% coverage</span>
              <span style={{ color: 'var(--text-5)' }}>·</span>
              <span style={{ color: 'var(--text-4)' }}>{confidencePct}% confidence</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg)] transition-colors cursor-pointer ml-3 shrink-0"
            style={{ color: 'var(--text-4)', border: '1px solid var(--border)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Evidence Summary Strip */}
        <div
          className="flex items-center gap-4 px-5 py-2.5 border-b shrink-0 text-[11px] font-mono"
          style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-1.5" style={{ color: 'var(--text-4)' }}>
            <FileCode className="w-3 h-3" style={{ color: 'var(--accent)' }} />
            {requirement.evidenceFiles?.length
              ? <span>{requirement.evidenceFiles.length} evidence file{requirement.evidenceFiles.length !== 1 ? 's' : ''}</span>
              : <span>No evidence files</span>}
          </div>
          <div className="h-3 w-px" style={{ background: 'var(--border)' }} />
          <div className="flex items-center gap-1.5" style={{ color: 'var(--text-4)' }}>
            <FlaskConical className="w-3 h-3 text-purple-400" />
            {requirement.testEvidence?.hasTests
              ? <span className="text-emerald-400">Tests found</span>
              : <span>No tests</span>}
          </div>
          {requirement.contradictions && requirement.contradictions.length > 0 && (
            <>
              <div className="h-3 w-px" style={{ background: 'var(--border)' }} />
              <div className="flex items-center gap-1.5 text-amber-400">
                <AlertCircle className="w-3 h-3" />
                <span>{requirement.contradictions.length} contradiction{requirement.contradictions.length !== 1 ? 's' : ''}</span>
              </div>
            </>
          )}
          <div className="ml-auto flex items-center gap-1 text-emerald-400">
            <Lock className="w-2.5 h-2.5" />
            <span>Scoped</span>
          </div>
        </div>

        {/* Quick Questions */}
        <div
          className="px-4 py-3 border-b shrink-0"
          style={{ borderColor: 'var(--border)' }}
        >
          <p className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: 'var(--text-5)' }}>
            Quick questions
          </p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_QUESTIONS.map(({ label, q }) => (
              <button
                key={label}
                onClick={() => handleSend(q)}
                disabled={isLoading}
                className="text-[11px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1"
                style={{
                  background: 'var(--bg)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-3)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(214,255,63,0.35)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-1)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-3)';
                }}
              >
                <HelpCircle className="w-2.5 h-2.5" style={{ color: 'var(--accent)' }} />
                {label}
              </button>
            ))}

            {/* How to Fix CTA */}
            {!isCompleted && (
              <button
                onClick={handleHowToFix}
                disabled={isLoading}
                className="text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1 font-semibold"
                style={{
                  background: 'rgba(214,255,63,0.08)',
                  borderColor: 'rgba(214,255,63,0.35)',
                  color: 'var(--accent)',
                }}
              >
                <Wrench className="w-2.5 h-2.5" />
                How to Fix
                <ChevronRight className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(msg => {
            const isAssistant = msg.role === 'assistant';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isAssistant ? '' : 'flex-row-reverse'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isAssistant
                      ? 'border'
                      : 'border'
                  }`}
                  style={{
                    background: isAssistant ? 'rgba(214,255,63,0.08)' : 'var(--surface-3,#1c1c1c)',
                    borderColor: isAssistant ? 'rgba(214,255,63,0.25)' : 'var(--border)',
                  }}
                >
                  {isAssistant
                    ? <Bot className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                    : <Shield className="w-4 h-4" style={{ color: 'var(--text-3)' }} />}
                </div>

                {/* Bubble */}
                <div className={`flex-1 min-w-0 ${isAssistant ? '' : 'items-end flex flex-col'}`}>
                  <div
                    className="rounded-2xl px-3.5 py-3 text-[12px] leading-relaxed border max-w-full"
                    style={{
                      background: isAssistant ? 'var(--bg)' : 'rgba(214,255,63,0.08)',
                      borderColor: isAssistant ? 'var(--border)' : 'rgba(214,255,63,0.25)',
                      color: 'var(--text-2)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-1.5 text-[10px] font-mono" style={{ color: 'var(--text-5)' }}>
                      <span style={{ color: isAssistant ? 'var(--accent)' : 'var(--text-4)', fontWeight: 600 }}>
                        {isAssistant ? 'ProjectLens AI' : 'You'}
                      </span>
                      <span>{msg.timestamp}</span>
                    </div>
                    <div className="whitespace-pre-wrap font-sans text-[12px]">
                      {formatContent(msg.content)}
                    </div>

                    {/* Citations */}
                    {isAssistant && msg.citations && msg.citations.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                        <span className="text-[10px] font-mono uppercase font-bold block mb-1.5" style={{ color: 'var(--accent)' }}>
                          Evidence Files:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.citations.map((c, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 border"
                              style={{
                                background: 'rgba(214,255,63,0.06)',
                                color: 'var(--accent)',
                                borderColor: 'rgba(214,255,63,0.2)',
                              }}
                            >
                              <FileCode className="w-2.5 h-2.5" />
                              {c.label || c.ref}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center gap-3 rounded-2xl p-3 border text-[11px] font-mono" style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-4)' }}>
              <Sparkles className="w-4 h-4 animate-spin" style={{ color: 'var(--accent)' }} />
              <span>Analyzing {requirement.requirementId} evidence…</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t shrink-0" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
          <form
            onSubmit={e => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={`Ask about ${requirement.requirementId}…`}
              disabled={isLoading}
              className="flex-1 rounded-xl px-3.5 py-2.5 text-[12px] border focus:outline-none transition-colors"
              style={{
                background: 'var(--panel)',
                borderColor: 'var(--border)',
                color: 'var(--text-1)',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(214,255,63,0.4)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-3.5 py-2.5 rounded-xl text-black text-[12px] font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
              style={{
                background: 'var(--accent)',
                boxShadow: '0 0 14px -4px var(--accent)',
              }}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
          <p className="text-[10px] font-mono mt-2 flex items-center gap-1" style={{ color: 'var(--text-5)' }}>
            <Lock className="w-2.5 h-2.5" />
            Answers scoped to {requirement.requirementId} evidence only · No guessing
          </p>
        </div>

        {/* Copilot Powered By */}
        <div className="px-5 py-2 border-t shrink-0 flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
          <Zap className="w-3 h-3" style={{ color: 'var(--accent)' }} />
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-5)' }}>
            Powered by ProjectLens AI Copilot · Evidence-based · Privacy-first RAG
          </span>
        </div>
      </div>
    </>
  );
};
