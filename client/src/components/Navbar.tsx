import React from 'react';
import { ProjectIntelligenceData } from '../types';
import { ProjectSearch } from './ProjectSearch';
import { useTheme } from '../contexts/ThemeContext';
import {
  Plus,
  FileText,
  ShieldCheck,
  GitBranch,
  Table,
  Cpu,
  Bot,
  BarChart3,
  Download,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Trash2,
  Radar,
  Sun,
  Moon,
} from 'lucide-react';

interface NavbarProps {
  projects: ProjectIntelligenceData[];
  currentProject: ProjectIntelligenceData | null;
  onSelectProject: (id: string) => void;
  onOpenNewProject: () => void;
  onOpenReportModal: () => void;
  onDeleteProject?: (id: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  projects,
  currentProject,
  onSelectProject,
  onOpenNewProject,
  onOpenReportModal,
  onDeleteProject,
  activeTab,
  setActiveTab,
}) => {
  const { theme, toggleTheme } = useTheme();
  const healthRating = currentProject?.healthMetrics?.healthRating || 'Healthy';
  const overallScore = currentProject?.healthMetrics?.overallScore ?? 0;

  const getHealthBadge = () => {
    if (!currentProject) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30 font-mono">
          Ready
        </span>
      );
    }
    if (healthRating === 'Healthy') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          Healthy ({overallScore}%)
        </span>
      );
    }
    if (healthRating === 'Medium Risk') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          Medium Risk ({overallScore}%)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
        <Flame className="w-3.5 h-3.5 text-rose-400" />
        High Risk ({overallScore}%)
      </span>
    );
  };

  const navTabs = [
    { id: 'dashboard', label: 'Dashboard',              icon: BarChart3 },
    { id: 'rtm',       label: 'Traceability Matrix (RTM)', icon: Table     },
    { id: 'coverage',  label: 'Coverage Engine',        icon: Cpu       },
    { id: 'documents', label: 'SRS & Documents',        icon: FileText  },
    { id: 'github',    label: 'GitHub Repository',      icon: GitBranch },
    { id: 'copilot',   label: 'AI Copilot',             icon: Bot       },
  ];

  return (
    <header className="bg-[var(--panel)]/90 backdrop-blur-md border-b border-[var(--border)] text-[var(--text-1)] sticky top-0 z-30 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
      {/* Top Header Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/15 border border-[var(--accent)]/30 flex items-center justify-center shadow-[0_0_12px_rgba(214,255,63,0.2)]">
              <Radar className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-[var(--text-1)]">
                  ProjectLens<span className="text-[var(--accent)]"> AI</span>
                </span>
                <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                  SYNCED
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-4)] hidden sm:block">
                Software Specification vs GitHub Traceability Engine
              </p>
            </div>
          </div>

          {/* Project Selector & Actions */}
          <div className="flex items-center gap-3">
            {/* Health Badge */}
            <div className="hidden lg:block">{getHealthBadge()}</div>

            {/* Search / Jump to Project */}
            <ProjectSearch projects={projects} currentProject={currentProject} onSelectProject={onSelectProject} />

            {/* Theme Toggle */}
            <button
              id="theme-toggle-btn"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              aria-label={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--panel)] hover:bg-[var(--surface-3)] text-[var(--text-4)] hover:text-[var(--accent)] border border-[var(--border-2)] hover:border-[var(--accent)]/40 hover:shadow-[0_0_12px_rgba(214,255,63,0.15)] cursor-pointer flex-shrink-0"
            >
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5" />
              ) : (
                <Moon className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Delete Current Project */}
            {currentProject && onDeleteProject && (
              <button
                onClick={() => {
                  if (window.confirm(`Delete project "${currentProject.project.name}"? This cannot be undone.`)) {
                    onDeleteProject(currentProject.project.id);
                  }
                }}
                title="Delete Project"
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--panel)] hover:bg-rose-950/60 text-[var(--text-4)] hover:text-rose-400 border border-[var(--border-2)] hover:border-rose-500/40 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* New Project Button */}
            <button
              onClick={onOpenNewProject}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-[var(--accent)] hover:brightness-110 text-black transition-all shadow-[0_0_20px_-4px_var(--accent)] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Project</span>
            </button>

            {/* Export Report Button */}
            <button
              onClick={onOpenReportModal}
              disabled={!currentProject}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--panel)] hover:bg-[var(--surface-3)] text-[var(--text-2)] border border-[var(--border-2)] transition-colors disabled:opacity-40 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span className="hidden sm:inline">Export Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="bg-[var(--bg)]/80 border-t border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 sm:space-x-3 overflow-x-auto py-2 scrollbar-none">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30 font-semibold shadow-[0_0_12px_rgba(214,255,63,0.12)]'
                      : 'text-[var(--text-4)] hover:text-[var(--text-2)] hover:bg-[var(--panel)]/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[var(--accent)]' : 'text-[var(--text-5)]'}`} />
                  {tab.label}
                  {tab.id === 'rtm' && (
                    <span className="ml-1 text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[var(--panel)] text-[var(--accent)] border border-[var(--accent)]/20">
                      {currentProject?.requirements?.length || 0}
                    </span>
                  )}
                  {tab.id === 'copilot' && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]"></span>
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
