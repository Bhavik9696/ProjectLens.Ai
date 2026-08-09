import React from 'react';
import { ChatMessage, ProjectIntelligenceData } from '../types';
import { sendCopilotMessageApi } from '../services/api';
import {
  Bot,
  Send,
  User,
  Sparkles,
  FileCode,
  HelpCircle,
  Lock,
  ShieldAlert,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface AICopilotChatProps {
  data: ProjectIntelligenceData;
  onMessagesUpdate?: (messages: ChatMessage[]) => void;
  onToggleExternalAI?: (allow: boolean) => void;
}

export const AICopilotChat: React.FC<AICopilotChatProps> = ({ data, onMessagesUpdate, onToggleExternalAI }) => {
  const reqCount = data?.requirements?.length || 0;
  const projectName = data?.project?.name || 'Software Project';
  const allowExternalAI = Boolean(data?.project?.allowExternalAI);
  const [expandedRagId, setExpandedRagId] = useState<string | null>(null);

  const initialMessages = React.useMemo<ChatMessage[]>(() => {
    if (data?.chatMessages && data.chatMessages.length > 0) {
      return data.chatMessages;
    }
    return [
      {
        id: 'msg-init-1',
        role: 'assistant',
        content: `Hello! I am **ProjectLens AI Copilot**. I analyze software specifications against code implementations for **${projectName}**.\n\n${
          allowExternalAI
            ? 'AI-assisted mode is ON for this project — I retrieve only the small set of data relevant to your question and send it to Gemini. You can see exactly what was sent under every answer, and turn this off anytime.'
            : 'This project is in **local-only mode** — I answer using deterministic analysis already computed on the server. No project data is sent to any external AI provider unless you explicitly turn on AI-assisted mode below.'
        }`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: data?.analysisResults?.length ? [
          { type: 'Requirement', ref: data.analysisResults[0].requirementId, label: `${data.analysisResults[0].requirementTitle} (${data.analysisResults[0].coveragePercent}%)` },
        ] : [],
        suggestedQuestions: reqCount > 0 ? [
          'Is the project following the SRS specifications?',
          'Which requirements are missing or incomplete?',
          'Generate a Sprint Action Plan for missing features',
          'Summarize the current software implementation status',
        ] : [
          'How do I upload an SRS document to begin analysis?',
          'How does ProjectLens AI detect missing code components?',
          'How do I connect a GitHub repository?',
        ],
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.project?.id]);

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);

  useEffect(() => {
    setMessages(initialMessages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.project?.id]);

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (queryText?: string) => {
    const prompt = queryText || inputQuery;
    if (!prompt.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const afterUserMsg = [...messages, userMsg];
    setMessages(afterUserMsg);
    setInputQuery('');
    setIsLoading(true);

    try {
      const res = await sendCopilotMessageApi(prompt, data, data?.project?.id, userMsg);

      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: res.content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: res.citations || [],
        suggestedQuestions: res.suggestedQuestions || [
          'What is the PR status for Stripe refunds?',
          'How can we increase requirement coverage to 90%?',
        ],
        ragMeta: res.ragMeta,
      };

      const afterAssistantMsg = [...afterUserMsg, assistantMsg];
      setMessages(afterAssistantMsg);
      onMessagesUpdate?.(afterAssistantMsg);
    } catch (err) {
      console.error('Copilot response error', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30">
                RAG ENGINE
              </span>
              <h2 className="text-xl font-extrabold text-[var(--text-1)]">AI Project Intelligence Copilot</h2>
            </div>
            <p className="text-xs text-[var(--text-4)]">
              Answers are grounded in deterministic analysis. In AI-assisted mode, only a small,
              query-relevant, redacted subset of that data is retrieved and sent — never the full project.
            </p>
          </div>

          <div
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono border ${
              allowExternalAI ? 'bg-amber-500/10 border-amber-500/30' : 'bg-emerald-500/10 border-emerald-500/30'
            }`}
          >
            {allowExternalAI ? (
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span className={allowExternalAI ? 'text-amber-300 font-medium' : 'text-emerald-300 font-medium'}>
              {allowExternalAI ? 'AI-assisted (external calls allowed)' : 'Local-only (nothing leaves the server)'}
            </span>
          </div>
        </div>

        {/* Consent toggle */}
        <div className="flex items-center justify-between gap-4 pt-4 border-t border-[var(--border-1)]">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--text-2)]">Send retrieved data to external AI (Gemini)</p>
            <p className="text-[11px] text-[var(--text-5)] mt-0.5">
              Off by default for every project. When on, only the top few requirement/module summaries
              relevant to each question are sent — commit authors, raw commit/PR/issue text, and the full
              file tree are never included.
            </p>
          </div>
          <button
            role="switch"
            aria-checked={allowExternalAI}
            onClick={() => onToggleExternalAI?.(!allowExternalAI)}
            className={`relative shrink-0 w-11 h-6 rounded-full transition-colors cursor-pointer ${
              allowExternalAI ? 'bg-amber-500' : 'bg-[var(--surface-3)]'
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                allowExternalAI ? 'translate-x-[22px]' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Main Chat Box Container */}
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xl flex flex-col h-[600px]">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {messages.map((msg) => {
            const isAssistant = msg.role === 'assistant';

            return (
              <div
                key={msg.id}
                className={`flex gap-3.5 max-w-3xl ${
                  isAssistant ? 'mr-auto' : 'ml-auto flex-row-reverse'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-sm ${
                    isAssistant
                      ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30 shadow-[0_0_12px_rgba(214,255,63,0.15)]'
                      : 'bg-[var(--surface-3)] text-[var(--text-2)] border border-[var(--border-2)]'
                  }`}
                >
                  {isAssistant ? <Bot className="w-5 h-5 text-[var(--accent)]" /> : <User className="w-5 h-5" />}
                </div>

                {/* Message Bubble */}
                <div className="space-y-3 min-w-0">
                  <div
                    className={`p-4 rounded-2xl text-xs leading-relaxed ${
                      isAssistant
                        ? 'bg-[var(--bg)] border border-[var(--border)] text-[var(--text-2)] shadow-sm'
                        : 'bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--text-1)] font-medium shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1 text-[10px] text-[var(--text-4)] font-mono">
                      <span className={`font-bold ${isAssistant ? 'text-[var(--accent)]' : 'text-[var(--text-3)]'}`}>
                        {isAssistant ? 'ProjectLens AI' : 'Project Manager'}
                      </span>
                      <span>{msg.timestamp}</span>
                    </div>

                    <div className="whitespace-pre-wrap font-sans">{msg.content}</div>

                    {/* Citations List */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-[var(--border)] space-y-1.5">
                        <span className="text-[10px] uppercase font-mono font-bold text-[var(--accent)] block">
                          Citing Backend Code Evidence:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.citations.map((c, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30 flex items-center gap-1"
                            >
                              <FileCode className="w-3 h-3" />
                              {c.label || c.ref}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Transparency: RAG metadata */}
                    {isAssistant && msg.ragMeta && (
                      <div className="mt-3 pt-2.5 border-t border-[var(--border)]">
                        {msg.ragMeta.sentExternally ? (
                          <button
                            onClick={() => setExpandedRagId(expandedRagId === msg.id ? null : msg.id)}
                            className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-amber-300 hover:text-amber-200 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            {expandedRagId === msg.id ? 'Hide' : 'View'} data sent to AI ({msg.ragMeta.chunksSent.length} of{' '}
                            {msg.ragMeta.totalChunksAvailable ?? '?'} chunks)
                            {expandedRagId === msg.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        ) : (
                          <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-400">
                            <Lock className="w-3 h-3" />
                            Answered locally — nothing sent externally
                          </span>
                        )}

                        {expandedRagId === msg.id && msg.ragMeta.sentExternally && (
                          <div className="mt-2 space-y-1.5">
                            {msg.ragMeta.chunksSent.map((chunk) => (
                              <div
                                key={chunk.id}
                                className="text-[10px] font-mono bg-amber-500/5 border border-amber-500/20 rounded-lg p-2 text-[var(--text-4)]"
                              >
                                <span className="text-amber-300 font-bold">[{chunk.id}]</span> {chunk.text}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Suggested Question Chips */}
                    {msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && isAssistant && (
                      <div className="flex flex-wrap gap-1.5 pt-3 mt-2 border-t border-[var(--border)]">
                        {msg.suggestedQuestions.map((q, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSendMessage(q)}
                            className="px-2.5 py-1 rounded-lg bg-[var(--bg)] hover:bg-[var(--panel)] border border-[var(--border)] hover:border-[var(--accent)]/30 text-[var(--text-3)] hover:text-[var(--text-1)] text-[11px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <HelpCircle className="w-3 h-3 text-[var(--accent)]" />
                            <span>{q}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-center gap-3 bg-[var(--bg)] p-4 rounded-2xl border border-[var(--border)] max-w-sm text-xs text-[var(--text-3)] font-mono">
              <Sparkles className="w-4 h-4 text-[var(--accent)] animate-spin" />
              <span>{allowExternalAI ? 'Retrieving relevant context and querying Gemini…' : 'Computing local deterministic summary…'}</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--bg)]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-3"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask Copilot about SRS compliance, missing code, or PR status..."
              className="flex-1 bg-[var(--panel)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-1)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50 placeholder:text-[var(--text-5)] font-sans transition-colors"
            />
            <button
              type="submit"
              disabled={isLoading || !inputQuery.trim()}
              className="px-4 py-2.5 rounded-xl bg-[var(--accent)] hover:brightness-110 text-black text-xs font-bold shadow-[0_0_15px_-4px_var(--accent)] transition-all flex items-center gap-1.5 disabled:opacity-50 shrink-0 cursor-pointer"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
