import React, { useState, useEffect } from 'react';
import { ProjectDocument, SoftwareRequirement } from '../types';
import {
  X,
  FileText,
  ChevronRight,
  Tag,
  Calendar,
  Hash,
  CheckCircle2,
  FileCode,
  BookOpen,
} from 'lucide-react';

interface DocumentPreviewModalProps {
  document: ProjectDocument | null;
  requirements: SoftwareRequirement[];
  onClose: () => void;
}

type PreviewTab = 'content' | 'requirements';

const FILE_TYPE_COLOR: Record<string, { color: string; bg: string; border: string }> = {
  PDF:  { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.25)' },
  DOCX: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.25)' },
  TXT:  { color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)' },
  MD:   { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.25)' },
};

const DOC_TYPE_COLOR: Record<string, string> = {
  SRS: 'var(--accent)',
  Proposal: '#3b82f6',
  'Sprint Report': '#10b981',
  'Meeting Notes': '#f59e0b',
  'Design Doc': '#8b5cf6',
  Timeline: '#ec4899',
  'Feature List': '#06b6d4',
};

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  document,
  requirements,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<PreviewTab>('content');
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    if (document && document.sections?.length) {
      setActiveSection(document.sections[0].id);
    }
    setActiveTab('content');
  }, [document?.id]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!document) return null;

  const docRequirements = requirements.filter(
    (r) => r.sourceDocument === document.name
  );

  const activeSectionData = document.sections?.find((s) => s.id === activeSection);
  const ftColor = FILE_TYPE_COLOR[document.fileType] || FILE_TYPE_COLOR.TXT;
  const dtColor = DOC_TYPE_COLOR[document.type] || 'var(--accent)';
  const wordCount = countWords(document.content || '');

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[121] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full rounded-2xl border shadow-2xl overflow-hidden flex flex-col"
          style={{
            maxWidth: '900px',
            maxHeight: '90vh',
            background: 'var(--panel)',
            borderColor: 'rgba(214,255,63,0.15)',
            boxShadow: '0 0 80px rgba(214,255,63,0.05), 0 40px 80px rgba(0,0,0,0.6)',
          }}
          role="dialog"
          aria-modal="true"
          aria-label={`Preview: ${document.name}`}
        >
          {/* Header */}
          <div
            className="flex items-start justify-between p-5 border-b flex-shrink-0"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-start gap-3 min-w-0">
              {/* File icon */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border"
                style={{ background: ftColor.bg, borderColor: ftColor.border }}
              >
                <FileText className="w-5 h-5" style={{ color: ftColor.color }} />
              </div>

              <div className="min-w-0">
                <h2 className="text-base font-extrabold leading-tight truncate" style={{ color: 'var(--text-1)' }}>
                  {document.name}
                </h2>
                {/* Metadata row */}
                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                  <span
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border"
                    style={{ color: dtColor, background: `${dtColor}15`, borderColor: `${dtColor}30` }}
                  >
                    {document.type}
                  </span>
                  <span
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border"
                    style={{ color: ftColor.color, background: ftColor.bg, borderColor: ftColor.border }}
                  >
                    {document.fileType}
                  </span>
                  <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-5)' }}>
                    <Calendar className="w-3 h-3" />
                    {new Date(document.uploadDate).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-5)' }}>
                    <Hash className="w-3 h-3" />
                    {wordCount.toLocaleString()} words
                  </span>
                  <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-5)' }}>
                    <BookOpen className="w-3 h-3" />
                    {document.sections?.length || 0} sections
                  </span>
                  <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-5)' }}>
                    <CheckCircle2 className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                    {docRequirements.length} requirements extracted
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer"
              style={{ color: 'var(--text-5)' }}
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab bar */}
          <div
            className="flex border-b flex-shrink-0"
            style={{ borderColor: 'var(--border)' }}
          >
            {([
              { id: 'content' as const, label: 'Document Content', icon: BookOpen },
              { id: 'requirements' as const, label: `Requirements (${docRequirements.length})`, icon: CheckCircle2 },
            ]).map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className="flex items-center gap-2 px-5 py-3 text-xs font-semibold transition-all cursor-pointer"
                  style={{
                    color: activeTab === t.id ? 'var(--accent)' : 'var(--text-5)',
                    borderBottom: activeTab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
                    background: activeTab === t.id ? 'rgba(214,255,63,0.04)' : 'transparent',
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Body */}
          <div className="flex flex-1 overflow-hidden">
            {activeTab === 'content' && (
              <>
                {/* Sections sidebar */}
                {document.sections?.length > 0 && (
                  <div
                    className="w-52 flex-shrink-0 border-r overflow-y-auto py-2"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <p
                      className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider"
                      style={{ color: 'var(--text-5)' }}
                    >
                      Sections
                    </p>
                    {document.sections.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setActiveSection(s.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors cursor-pointer text-xs"
                        style={{
                          background: activeSection === s.id ? 'rgba(214,255,63,0.07)' : 'transparent',
                          color: activeSection === s.id ? 'var(--accent)' : 'var(--text-3)',
                          borderLeft: activeSection === s.id ? '2px solid var(--accent)' : '2px solid transparent',
                        }}
                      >
                        <ChevronRight className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{s.title}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Content area */}
                <div className="flex-1 overflow-y-auto p-5">
                  {activeSectionData ? (
                    <div>
                      <h3
                        className="text-base font-extrabold mb-4 pb-3 border-b"
                        style={{ color: 'var(--text-1)', borderColor: 'var(--border)' }}
                      >
                        {activeSectionData.title}
                      </h3>
                      <pre
                        className="text-xs leading-relaxed whitespace-pre-wrap font-sans"
                        style={{ color: 'var(--text-3)' }}
                      >
                        {activeSectionData.content}
                      </pre>
                    </div>
                  ) : (
                    <pre
                      className="text-xs leading-relaxed whitespace-pre-wrap font-sans"
                      style={{ color: 'var(--text-3)' }}
                    >
                      {document.content || 'No content available.'}
                    </pre>
                  )}
                </div>
              </>
            )}

            {activeTab === 'requirements' && (
              <div className="flex-1 overflow-y-auto p-5">
                {docRequirements.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <FileCode className="w-8 h-8 mx-auto" style={{ color: 'var(--text-5)' }} />
                    <p className="text-sm" style={{ color: 'var(--text-4)' }}>
                      No requirements extracted from this document yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {docRequirements.map((req) => (
                      <div
                        key={req.id}
                        className="rounded-xl border p-4 space-y-2"
                        style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
                      >
                        <div className="flex items-start gap-2 flex-wrap">
                          <span
                            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border"
                            style={{ color: 'var(--accent)', background: 'rgba(214,255,63,0.08)', borderColor: 'rgba(214,255,63,0.25)' }}
                          >
                            {req.id}
                          </span>
                          <span
                            className="text-[10px] px-2 py-0.5 rounded border font-semibold"
                            style={{ color: 'var(--text-4)', borderColor: 'var(--border-2)', background: 'var(--surface-3)' }}
                          >
                            {req.module}
                          </span>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                            style={{
                              color: req.priority === 'High' ? '#ef4444' : req.priority === 'Medium' ? '#f59e0b' : '#10b981',
                              background: req.priority === 'High' ? 'rgba(239,68,68,0.1)' : req.priority === 'Medium' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                            }}
                          >
                            {req.priority}
                          </span>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                            style={{ color: 'var(--text-5)', background: 'var(--surface-3)' }}
                          >
                            {req.category}
                          </span>
                        </div>
                        <p className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>
                          {req.title}
                        </p>
                        {req.description && (
                          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-4)' }}>
                            {req.description}
                          </p>
                        )}
                        {req.acceptanceCriteria && req.acceptanceCriteria.length > 0 && (
                          <div>
                            <span className="text-[10px] font-mono font-bold uppercase" style={{ color: 'var(--text-5)' }}>
                              Acceptance Criteria
                            </span>
                            <ul className="mt-1 space-y-1">
                              {req.acceptanceCriteria.map((ac, i) => (
                                <li key={i} className="flex items-start gap-1.5 text-[11px]" style={{ color: 'var(--text-4)' }}>
                                  <Tag className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
                                  {ac}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
