import React, { useState } from 'react';
import { ProjectIntelligenceData } from '../types';
import { ProjectSearch } from './ProjectSearch';
import { useTheme } from '../contexts/ThemeContext';
import {
  Plus,
  FileText,
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
  LogOut,
  Zap,
  Gift,
  Menu,
  X,
  Layers2,
  FlaskConical,
  History,
  Settings2,
} from 'lucide-react';
import { AuthUser } from '../services/authApi';

interface NavbarProps {
  projects: ProjectIntelligenceData[];
  currentProject: ProjectIntelligenceData | null;
  onSelectProject: (id: string) => void;
  onOpenNewProject: () => void;
  onOpenReportModal: () => void;
  onDeleteProject?: (id: string) => void;
  onOpenSettings?: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSignOut?: () => void;
  onBuyCredits?: () => void;
  user?: AuthUser | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  projects,
  currentProject,
  onSelectProject,
  onOpenNewProject,
  onOpenReportModal,
  onDeleteProject,
  onOpenSettings,
  activeTab,
  setActiveTab,
  onSignOut,
  onBuyCredits,
  user,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const healthRating = currentProject?.healthMetrics?.healthRating || 'Healthy';
  const overallScore = currentProject?.healthMetrics?.overallScore ?? 0;

  const freeRemaining = user?.freeProjectsRemaining ?? 0;
  const paidCredits   = user?.paidCredits ?? 0;
  const hasCredits    = freeRemaining > 0 || paidCredits > 0;

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
    { id: 'dashboard', label: 'Dashboard',   shortLabel: 'Dash',     icon: BarChart3 },
    { id: 'rtm',       label: 'RTM',         shortLabel: 'RTM',      icon: Table     },
    { id: 'coverage',  label: 'Coverage',    shortLabel: 'Coverage', icon: Cpu       },
    { id: 'documents', label: 'Documents',   shortLabel: 'Docs',     icon: FileText  },
    { id: 'github',    label: 'GitHub',      shortLabel: 'GitHub',   icon: GitBranch },
    { id: 'copilot',   label: 'AI Copilot',  shortLabel: 'Copilot',  icon: Bot       },
    { id: 'scope',     label: 'Scope Creep', shortLabel: 'Scope',    icon: Layers2   },
    { id: 'tests',     label: 'Test Gaps',   shortLabel: 'Tests',    icon: FlaskConical },
    { id: 'history',   label: 'History',     shortLabel: 'History',  icon: History   },
  ];

  return (
    <header className="bg-[var(--panel)]/95 backdrop-blur-md border-b border-[var(--border)] text-[var(--text-1)] sticky top-0 z-30 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
      {/* ── Top Header Row ── */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">

          {/* Brand */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/15 border border-[var(--accent)]/30 flex items-center justify-center shadow-[0_0_12px_rgba(214,255,63,0.2)]">
              <Radar className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-[var(--text-1)]">
                  ProjectLens<span className="text-[var(--accent)]"> AI</span>
                </span>
                <span className="text-[9px] font-mono uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 hidden xs:inline">
                  SYNCED
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2 flex-1 justify-end">
            {/* Health Badge */}
            <div className="hidden lg:block">{getHealthBadge()}</div>

            {/* Project Search */}
            <ProjectSearch projects={projects} currentProject={currentProject} onSelectProject={onSelectProject} />

            {/* Buy Credits */}
            {user && (
              <button
                id="navbar-buy-credits-btn"
                onClick={onBuyCredits}
                title="Buy Project Credits"
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer"
                style={{
                  background:  hasCredits ? 'rgba(214,255,63,0.06)' : 'rgba(244,63,94,0.08)',
                  borderColor: hasCredits ? 'rgba(214,255,63,0.3)'  : 'rgba(244,63,94,0.4)',
                  color:       hasCredits ? 'var(--accent)'         : '#f87171',
                }}
              >
                <Zap className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Buy Credits</span>
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-full ml-0.5 hidden lg:inline-flex"
                  style={{ background: 'rgba(0,0,0,0.25)', color: hasCredits ? 'var(--accent)' : '#f87171' }}
                >
                  <Gift className="w-2.5 h-2.5" />{freeRemaining}
                  <span style={{ opacity: 0.5 }}>·</span>
                  {paidCredits}
                </span>
              </button>
            )}

            {/* Theme Toggle */}
            <button
              id="theme-toggle-btn"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Light' : 'Dark'}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--panel)] hover:bg-[var(--surface-3)] text-[var(--text-4)] hover:text-[var(--accent)] border border-[var(--border-2)] cursor-pointer flex-shrink-0"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            {/* Delete */}
            {currentProject && onDeleteProject && (
              <button
                onClick={() => {
                  if (window.confirm(`Delete project "${currentProject.project.name}"?`)) {
                    onDeleteProject(currentProject.project.id);
                  }
                }}
                title="Delete Project"
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--panel)] hover:bg-rose-950/60 text-[var(--text-4)] hover:text-rose-400 border border-[var(--border-2)] cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* New Project */}
            <button
              onClick={onOpenNewProject}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-[var(--accent)] hover:brightness-110 text-black transition-all shadow-[0_0_20px_-4px_var(--accent)] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              New Project
            </button>

            {/* Export Report */}
            <button
              onClick={onOpenReportModal}
              disabled={!currentProject}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--panel)] hover:bg-[var(--surface-3)] text-[var(--text-2)] border border-[var(--border-2)] transition-colors disabled:opacity-40 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
              Export
            </button>

            {/* Project Settings */}
            {currentProject && onOpenSettings && (
              <button
                onClick={onOpenSettings}
                title="Project Settings (Slack & API Keys)"
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--panel)] hover:bg-[var(--surface-3)] text-[var(--text-4)] hover:text-[var(--accent)] border border-[var(--border-2)] cursor-pointer transition-colors"
              >
                <Settings2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Avatar + Sign Out */}
            {user && (
              <div className="flex items-center gap-1.5">
                <div
                  title={user.name}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 select-none"
                  style={{ background: 'var(--accent)', color: '#000', boxShadow: '0 0 12px rgba(214,255,63,0.3)' }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <button
                  id="navbar-signout-btn"
                  onClick={onSignOut}
                  title="Sign Out"
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--panel)] hover:bg-rose-950/60 text-[var(--text-4)] hover:text-rose-400 border border-[var(--border-2)] cursor-pointer transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile: essential actions + hamburger */}
          <div className="flex md:hidden items-center gap-1.5 flex-shrink-0">
            {/* New Project — always visible, icon only */}
            <button
              onClick={onOpenNewProject}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--accent)] hover:brightness-110 text-black transition-all shadow-[0_0_16px_-4px_var(--accent)] cursor-pointer flex-shrink-0"
              title="New Project"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* User avatar */}
            {user && (
              <div
                title={user.name}
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 select-none"
                style={{ background: 'var(--accent)', color: '#000' }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Hamburger */}
            <button
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--panel)] border border-[var(--border-2)] text-[var(--text-3)] cursor-pointer"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile Dropdown Menu ── */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--panel)] px-4 py-3 space-y-2">
          {/* Project search */}
          <ProjectSearch projects={projects} currentProject={currentProject} onSelectProject={(id) => { onSelectProject(id); setMobileMenuOpen(false); }} />

          <div className="grid grid-cols-2 gap-2 pt-1">
            {/* Buy Credits */}
            {user && (
              <button
                onClick={() => { onBuyCredits?.(); setMobileMenuOpen(false); }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold border cursor-pointer"
                style={{
                  background:  hasCredits ? 'rgba(214,255,63,0.06)' : 'rgba(244,63,94,0.08)',
                  borderColor: hasCredits ? 'rgba(214,255,63,0.3)'  : 'rgba(244,63,94,0.4)',
                  color:       hasCredits ? 'var(--accent)'         : '#f87171',
                }}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Buy Credits</span>
                <span className="ml-auto font-mono text-[10px]">{freeRemaining}·{paidCredits}</span>
              </button>
            )}

            {/* Theme */}
            <button
              onClick={() => { toggleTheme(); setMobileMenuOpen(false); }}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold bg-[var(--bg)] border border-[var(--border-2)] text-[var(--text-3)] cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-[var(--accent)]" /> : <Moon className="w-3.5 h-3.5 text-[var(--accent)]" />}
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>

            {/* Export */}
            <button
              onClick={() => { onOpenReportModal(); setMobileMenuOpen(false); }}
              disabled={!currentProject}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold bg-[var(--bg)] border border-[var(--border-2)] text-[var(--text-3)] cursor-pointer disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
              Export Report
            </button>

            {/* Delete */}
            {currentProject && onDeleteProject && (
              <button
                onClick={() => {
                  if (window.confirm(`Delete "${currentProject.project.name}"?`)) {
                    onDeleteProject(currentProject.project.id);
                    setMobileMenuOpen(false);
                  }
                }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold bg-rose-950/30 border border-rose-500/30 text-rose-400 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Project
              </button>
            )}

            {/* Sign Out */}
            {user && (
              <button
                onClick={() => { onSignOut?.(); setMobileMenuOpen(false); }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold bg-[var(--bg)] border border-[var(--border-2)] text-rose-400 cursor-pointer col-span-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out ({user.name})
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Navigation Tabs ── */}
      <div className="bg-[var(--bg)]/80 border-t border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <nav className="flex overflow-x-auto py-1.5 sm:py-2 gap-0.5 sm:gap-1 scrollbar-none">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer flex-shrink-0 ${
                    isActive
                      ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30 font-semibold shadow-[0_0_12px_rgba(214,255,63,0.12)]'
                      : 'text-[var(--text-4)] hover:text-[var(--text-2)] hover:bg-[var(--panel)]/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 ${isActive ? 'text-[var(--accent)]' : 'text-[var(--text-5)]'}`} />
                  {/* Short label on mobile, full label on sm+ */}
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.id === 'rtm' && (
                    <span className="text-[9px] font-mono px-1 py-0.5 rounded-full bg-[var(--panel)] text-[var(--accent)] border border-[var(--accent)]/20 hidden sm:inline">
                      {currentProject?.requirements?.length || 0}
                    </span>
                  )}
                  {tab.id === 'copilot' && (
                    <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-[var(--accent)]"></span>
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
