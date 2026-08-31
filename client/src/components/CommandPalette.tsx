import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useCommandPalette } from '../contexts/CommandPaletteContext';
import { ProjectIntelligenceData } from '../types';
import {
  Search,
  BarChart3,
  Table,
  Cpu,
  FileText,
  GitBranch,
  Bot,
  Layers2,
  FlaskConical,
  History,
  Plus,
  Download,
  Zap,
  LogOut,
  ArrowRight,
  FolderOpen,
  Keyboard,
} from 'lucide-react';

interface CommandPaletteProps {
  projects: ProjectIntelligenceData[];
  currentProjectId: string;
  onSelectProject: (id: string) => void;
  onNavigateTab: (tab: string) => void;
  onOpenNewProject: () => void;
  onOpenReport: () => void;
  onBuyCredits: () => void;
  onSignOut: () => void;
  onOpenShortcuts: () => void;
}

interface PaletteItem {
  id: string;
  label: string;
  description?: string;
  group: 'Navigate' | 'Projects' | 'Actions';
  icon: React.ElementType;
  action: () => void;
  keywords?: string;
}

const NAV_TABS = [
  { id: 'dashboard', label: 'Dashboard',   icon: BarChart3,    description: 'Project overview & health metrics' },
  { id: 'rtm',       label: 'RTM',         icon: Table,        description: 'Requirement Traceability Matrix' },
  { id: 'coverage',  label: 'Coverage',    icon: Cpu,          description: 'Implementation coverage analyzer' },
  { id: 'documents', label: 'Documents',   icon: FileText,     description: 'Upload & manage SRS documents' },
  { id: 'github',    label: 'GitHub',      icon: GitBranch,    description: 'Connect GitHub repository' },
  { id: 'copilot',   label: 'AI Copilot',  icon: Bot,          description: 'Ask AI about your project' },
  { id: 'scope',     label: 'Scope Creep', icon: Layers2,      description: 'Detect out-of-scope features' },
  { id: 'tests',     label: 'Test Gaps',   icon: FlaskConical, description: 'Test coverage gap report' },
  { id: 'history',   label: 'History',     icon: History,      description: 'Analysis history & diffs' },
];

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  projects,
  onSelectProject,
  onNavigateTab,
  onOpenNewProject,
  onOpenReport,
  onBuyCredits,
  onSignOut,
  onOpenShortcuts,
}) => {
  const { isOpen, close } = useCommandPalette();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opening
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const buildItems = useCallback((): PaletteItem[] => {
    const tabItems: PaletteItem[] = NAV_TABS.map((t) => ({
      id: `tab-${t.id}`,
      label: t.label,
      description: t.description,
      group: 'Navigate' as const,
      icon: t.icon,
      action: () => { onNavigateTab(t.id); close(); },
      keywords: t.label + ' ' + t.description,
    }));

    const projectItems: PaletteItem[] = projects.map((p) => ({
      id: `proj-${p.project.id}`,
      label: p.project.name,
      description: p.project.description?.slice(0, 60),
      group: 'Projects' as const,
      icon: FolderOpen,
      action: () => { onSelectProject(p.project.id); onNavigateTab('dashboard'); close(); },
      keywords: p.project.name + ' ' + p.project.description,
    }));

    const actionItems: PaletteItem[] = [
      { id: 'action-new', label: 'New Project', description: 'Create a new software project', group: 'Actions', icon: Plus, action: () => { onOpenNewProject(); close(); } },
      { id: 'action-report', label: 'Generate Report', description: 'Export analysis report', group: 'Actions', icon: Download, action: () => { onOpenReport(); close(); } },
      { id: 'action-credits', label: 'Buy Credits', description: 'Purchase project credits', group: 'Actions', icon: Zap, action: () => { onBuyCredits(); close(); } },
      { id: 'action-shortcuts', label: 'Keyboard Shortcuts', description: 'View all keyboard shortcuts', group: 'Actions', icon: Keyboard, action: () => { onOpenShortcuts(); close(); } },
      { id: 'action-signout', label: 'Sign Out', description: 'Sign out of your account', group: 'Actions', icon: LogOut, action: () => { onSignOut(); close(); } },
    ];

    return [...tabItems, ...projectItems, ...actionItems];
  }, [projects, onNavigateTab, onSelectProject, onOpenNewProject, onOpenReport, onBuyCredits, onSignOut, onOpenShortcuts, close]);

  const allItems = buildItems();

  const filtered = query.trim()
    ? allItems.filter((item) =>
        (item.keywords || item.label + ' ' + (item.description || ''))
          .toLowerCase()
          .includes(query.toLowerCase())
      )
    : allItems;

  // Keep activeIndex in bounds
  useEffect(() => {
    setActiveIndex((i) => Math.min(i, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      filtered[activeIndex]?.action();
    } else if (e.key === 'Escape') {
      close();
    }
  };

  if (!isOpen) return null;

  // Group items for display
  const groups: Array<{ name: string; items: (PaletteItem & { globalIdx: number })[] }> = [];
  let idx = 0;
  for (const groupName of ['Navigate', 'Projects', 'Actions'] as const) {
    const groupItems = filtered
      .filter((i) => i.group === groupName)
      .map((item) => ({ ...item, globalIdx: idx++ }));
    if (groupItems.length > 0) groups.push({ name: groupName, items: groupItems });
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm"
        onClick={close}
        aria-hidden="true"
      />

      {/* Palette */}
      <div className="fixed inset-0 z-[151] flex items-start justify-center pt-[15vh] px-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-xl rounded-2xl border overflow-hidden shadow-2xl"
          style={{
            background: 'var(--panel)',
            borderColor: 'rgba(214,255,63,0.2)',
            boxShadow: '0 0 80px rgba(214,255,63,0.07), 0 40px 80px rgba(0,0,0,0.7)',
          }}
        >
          {/* Search input */}
          <div
            className="flex items-center gap-3 px-4 py-3.5 border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent)' }} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
              onKeyDown={handleKeyDown}
              placeholder="Search tabs, projects, actions…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-5)]"
              style={{ color: 'var(--text-1)' }}
              aria-label="Command palette search"
            />
            <kbd
              className="text-[10px] font-mono px-1.5 py-0.5 rounded border hidden sm:block"
              style={{ borderColor: 'var(--border-2)', color: 'var(--text-5)', background: 'var(--bg)' }}
            >
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[380px] overflow-y-auto py-2">
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-5)' }}>
                No results for "{query}"
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.name}>
                  <div
                    className="px-4 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider"
                    style={{ color: 'var(--text-5)' }}
                  >
                    {group.name}
                  </div>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.globalIdx === activeIndex;
                    return (
                      <button
                        key={item.id}
                        data-idx={item.globalIdx}
                        onClick={item.action}
                        onMouseEnter={() => setActiveIndex(item.globalIdx)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer"
                        style={{
                          background: isActive ? 'rgba(214,255,63,0.07)' : 'transparent',
                          color: isActive ? 'var(--text-1)' : 'var(--text-3)',
                        }}
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border transition-colors"
                          style={{
                            background: isActive ? 'rgba(214,255,63,0.1)' : 'var(--bg)',
                            borderColor: isActive ? 'rgba(214,255,63,0.3)' : 'var(--border)',
                          }}
                        >
                          <Icon className="w-3.5 h-3.5" style={{ color: isActive ? 'var(--accent)' : 'var(--text-5)' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate">{item.label}</div>
                          {item.description && (
                            <div className="text-[11px] truncate" style={{ color: 'var(--text-5)' }}>
                              {item.description}
                            </div>
                          )}
                        </div>
                        {isActive && (
                          <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer hint */}
          <div
            className="flex items-center gap-4 px-4 py-2.5 border-t text-[10px] font-mono"
            style={{ borderColor: 'var(--border)', color: 'var(--text-5)' }}
          >
            <span><kbd className="font-mono">↑↓</kbd> navigate</span>
            <span><kbd className="font-mono">↵</kbd> select</span>
            <span><kbd className="font-mono">ESC</kbd> close</span>
            <span className="ml-auto">⌘K to open anytime</span>
          </div>
        </div>
      </div>
    </>
  );
};
