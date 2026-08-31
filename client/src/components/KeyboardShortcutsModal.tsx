import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutRowProps {
  keys: string[];
  description: string;
}

const ShortcutRow: React.FC<ShortcutRowProps> = ({ keys, description }) => (
  <div className="flex items-center justify-between py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
    <span className="text-sm" style={{ color: 'var(--text-3)' }}>{description}</span>
    <div className="flex items-center gap-1">
      {keys.map((k, i) => (
        <React.Fragment key={k}>
          {i > 0 && <span className="text-xs" style={{ color: 'var(--text-6)' }}>+</span>}
          <kbd
            className="inline-flex items-center justify-center px-2 py-1 rounded text-[11px] font-mono font-bold border"
            style={{
              background: 'var(--bg)',
              borderColor: 'var(--border-2)',
              color: 'var(--accent)',
              boxShadow: '0 2px 0 var(--border-2)',
              minWidth: '28px',
            }}
          >
            {k}
          </kbd>
        </React.Fragment>
      ))}
    </div>
  </div>
);

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUT_GROUPS = [
  {
    title: 'App Navigation',
    shortcuts: [
      { keys: ['⌘', 'K'], description: 'Open Command Palette' },
      { keys: ['?'], description: 'Show this keyboard shortcuts panel' },
      { keys: ['Escape'], description: 'Close any modal or panel' },
    ],
  },
  {
    title: 'Tab Switching',
    shortcuts: [
      { keys: ['Alt', '1'], description: 'Go to Dashboard' },
      { keys: ['Alt', '2'], description: 'Go to RTM (Traceability Matrix)' },
      { keys: ['Alt', '3'], description: 'Go to Coverage Analyzer' },
      { keys: ['Alt', '4'], description: 'Go to Documents' },
      { keys: ['Alt', '5'], description: 'Go to GitHub Connector' },
      { keys: ['Alt', '6'], description: 'Go to AI Copilot' },
      { keys: ['Alt', '7'], description: 'Go to Scope Creep' },
      { keys: ['Alt', '8'], description: 'Go to Test Gaps' },
      { keys: ['Alt', '9'], description: 'Go to Analysis History' },
    ],
  },
  {
    title: 'Quick Actions',
    shortcuts: [
      { keys: ['Alt', 'N'], description: 'Create New Project' },
      { keys: ['Alt', 'R'], description: 'Generate & Export Report' },
      { keys: ['Alt', 'C'], description: 'Open AI Copilot' },
    ],
  },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  // Close on Escape
  React.useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[160] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[161] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden"
          style={{
            background: 'var(--panel)',
            borderColor: 'rgba(214,255,63,0.2)',
            boxShadow: '0 0 60px rgba(214,255,63,0.06), 0 32px 64px rgba(0,0,0,0.6)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4 border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center border"
                style={{ background: 'rgba(214,255,63,0.1)', borderColor: 'rgba(214,255,63,0.3)' }}
              >
                <Keyboard className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <h2 className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>
                  Keyboard Shortcuts
                </h2>
                <p className="text-[11px]" style={{ color: 'var(--text-5)' }}>
                  All available shortcuts in ProjectLens AI
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
              style={{ color: 'var(--text-5)' }}
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Shortcut groups */}
          <div className="overflow-y-auto max-h-[60vh] px-6 py-4 space-y-6">
            {SHORTCUT_GROUPS.map((group) => (
              <div key={group.title}>
                <h3
                  className="text-[10px] font-mono font-bold uppercase tracking-wider mb-2"
                  style={{ color: 'var(--accent)' }}
                >
                  {group.title}
                </h3>
                <div>
                  {group.shortcuts.map((s) => (
                    <ShortcutRow key={s.keys.join('+')} keys={s.keys} description={s.description} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div
            className="px-6 py-3 border-t text-center"
            style={{ borderColor: 'var(--border)' }}
          >
            <p className="text-[11px]" style={{ color: 'var(--text-5)' }}>
              Press <kbd className="font-mono px-1 py-0.5 rounded border text-[10px]"
                style={{ borderColor: 'var(--border-2)', color: 'var(--accent)', background: 'var(--bg)' }}>?</kbd> anytime to open this panel
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
