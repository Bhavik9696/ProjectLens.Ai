import React, { useState } from 'react';
import { Bot } from 'lucide-react';

interface FloatingCopilotProps {
  activeTab: string;
  onNavigateCopilot: () => void;
}

export const FloatingCopilot: React.FC<FloatingCopilotProps> = ({ activeTab, onNavigateCopilot }) => {
  const [hovered, setHovered] = useState(false);

  // Don't show on the copilot tab itself
  if (activeTab === 'copilot') return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-[70] flex items-center gap-3"
      style={{ pointerEvents: 'none' }}
    >
      {/* Tooltip label — appears on hover */}
      <div
        className="transition-all duration-200 pointer-events-none"
        style={{
          opacity: hovered ? 1 : 0,
          transform: hovered ? 'translateX(0)' : 'translateX(8px)',
        }}
      >
        <div
          className="px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border shadow-lg"
          style={{
            background: 'var(--panel)',
            borderColor: 'rgba(214,255,63,0.25)',
            color: 'var(--text-2)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          Ask AI Copilot
          <span
            className="ml-1.5 font-mono text-[10px] px-1 py-0.5 rounded border"
            style={{ borderColor: 'var(--border-2)', color: 'var(--text-5)', background: 'var(--bg)' }}
          >
            Alt+C
          </span>
        </div>
      </div>

      {/* Floating button */}
      <button
        id="floating-copilot-btn"
        onClick={onNavigateCopilot}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer"
        style={{
          background: 'var(--accent)',
          color: '#000',
          boxShadow: hovered
            ? '0 0 40px rgba(214,255,63,0.5), 0 8px 32px rgba(0,0,0,0.4)'
            : '0 0 24px rgba(214,255,63,0.3), 0 4px 16px rgba(0,0,0,0.3)',
          transform: hovered ? 'scale(1.08) translateY(-2px)' : 'scale(1)',
          pointerEvents: 'auto',
        }}
        title="Ask AI Copilot (Alt+C)"
        aria-label="Open AI Copilot"
      >
        {/* Pulse ring */}
        <span
          className="absolute inset-0 rounded-2xl animate-ping"
          style={{ background: 'rgba(214,255,63,0.3)', animationDuration: '2s' }}
        />
        <Bot className="w-6 h-6 relative z-10" />
      </button>
    </div>
  );
};
