import React, { useState } from 'react';
import { ImplementationProfile } from '../types';
import { analyzeGithubRepoApi } from '../services/api';
import {
  GitBranch,
  GitCommit,
  GitPullRequest,
  AlertCircle,
  FolderTree,
  Code2,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Clock,
  Search,
  FileCode,
  Tag,
  Star,
} from 'lucide-react';

interface GitHubConnectorProps {
  githubUrl: string;
  implementationProfile: ImplementationProfile | null;
  expectedRequirements: any[];
  onAnalyzeRepo: (profile: ImplementationProfile) => void;
}

export const GitHubConnector: React.FC<GitHubConnectorProps> = ({
  githubUrl,
  implementationProfile,
  expectedRequirements,
  onAnalyzeRepo,
}) => {
  const [repoUrlInput, setRepoUrlInput] = useState(githubUrl || '');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'modules' | 'commits' | 'prs' | 'issues' | 'filetree'>('modules');

  const handleRunAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrlInput.trim()) return;

    setIsAnalyzing(true);
    try {
      const profile = await analyzeGithubRepoApi(repoUrlInput, expectedRequirements);
      onAnalyzeRepo(profile);
    } catch (err) {
      console.error('GitHub analysis failed', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filteredModules = implementationProfile?.detectedModules?.filter(
    (m) =>
      m.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      m.controllers.some((c) => c.toLowerCase().includes(filterQuery.toLowerCase())) ||
      m.services.some((s) => s.toLowerCase().includes(filterQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header & Repo Connector */}
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30">
                GITHUB SCANNER
              </span>
              <h2 className="text-xl font-bold text-[var(--text-1)]">GitHub Repository & Codebase Analyzer</h2>
            </div>
            <p className="text-xs text-[var(--text-4)]">
              Deterministic software analysis of controllers, services, routes, models, commits, PRs, and issues.
            </p>
          </div>

          <a
            href={repoUrlInput}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--accent)] hover:text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/30 px-3 py-1.5 rounded-lg shrink-0"
          >
            <span>Open on GitHub</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Input Bar */}
        <form onSubmit={handleRunAnalysis} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <GitBranch className="w-4 h-4 text-[var(--accent)] absolute left-3.5 top-3" />
            <input
              type="text"
              value={repoUrlInput}
              onChange={(e) => setRepoUrlInput(e.target.value)}
              placeholder="https://github.com/organization/repository"
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-2 text-xs font-mono text-[var(--text-1)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50"
            />
          </div>
          <button
            type="submit"
            disabled={isAnalyzing}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-[var(--accent)]/15 hover:bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/30 text-xs font-semibold shadow-md transition-colors flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 cursor-pointer"
          >
            {isAnalyzing ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin text-[var(--accent)]" />
                <span>Running Deterministic Scanner...</span>
              </>
            ) : (
              <>
                <Code2 className="w-4 h-4 text-[var(--accent)]" />
                <span>Re-Analyze Repository</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Repository Overview Cards */}
        {implementationProfile && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center border border-[var(--border)]">
                <FolderTree className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-[var(--text-4)] uppercase font-mono font-bold block">Detected Modules</span>
                <span className="text-base font-bold font-mono text-[var(--text-1)]">
                  {implementationProfile.detectedModules?.length || 0} Modules
                </span>
              </div>
            </div>

            <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center border border-[var(--border)]">
                <GitCommit className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-[var(--text-4)] uppercase font-mono font-bold block">Commits Analyzed</span>
                <span className="text-base font-bold font-mono text-[var(--text-1)]">
                  {implementationProfile.commits?.length || 0} Commits
                </span>
              </div>
            </div>

            <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <GitPullRequest className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-[var(--text-4)] uppercase font-bold block">Pull Requests</span>
                <span className="text-base font-bold text-[var(--text-1)]">
                  {implementationProfile.pullRequests?.length || 0} PRs
                </span>
              </div>
            </div>

            <div className="bg-[var(--surface-4)] border border-[var(--border-1)] rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-[var(--text-4)] uppercase font-bold block">Open Issues</span>
                <span className="text-base font-bold text-[var(--text-1)]">
                  {implementationProfile.openIssuesCount || 0} Issues
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Analysis Profile Tabs */}
      {implementationProfile && (
        <div className="bg-[var(--panel)] border border-[var(--border-1)] rounded-2xl p-6 shadow-sm space-y-5">
          {/* Tabs bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-1)] pb-4">
            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                onClick={() => setActiveTab('modules')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'modules'
                    ? 'bg-indigo-600 text-[var(--text-1)] shadow-sm'
                    : 'bg-[var(--surface-3)]/80 text-[var(--text-4)] hover:text-[var(--text-2)]'
                }`}
              >
                <FolderTree className="w-3.5 h-3.5" />
                Detected Modules ({implementationProfile.detectedModules?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('commits')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'commits'
                    ? 'bg-indigo-600 text-[var(--text-1)] shadow-sm'
                    : 'bg-[var(--surface-3)]/80 text-[var(--text-4)] hover:text-[var(--text-2)]'
                }`}
              >
                <GitCommit className="w-3.5 h-3.5" />
                Commits ({implementationProfile.commits?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('prs')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'prs'
                    ? 'bg-indigo-600 text-[var(--text-1)] shadow-sm'
                    : 'bg-[var(--surface-3)]/80 text-[var(--text-4)] hover:text-[var(--text-2)]'
                }`}
              >
                <GitPullRequest className="w-3.5 h-3.5" />
                Pull Requests ({implementationProfile.pullRequests?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('issues')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'issues'
                    ? 'bg-indigo-600 text-[var(--text-1)] shadow-sm'
                    : 'bg-[var(--surface-3)]/80 text-[var(--text-4)] hover:text-[var(--text-2)]'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                Issues ({implementationProfile.issues?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('filetree')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'filetree'
                    ? 'bg-indigo-600 text-[var(--text-1)] shadow-sm'
                    : 'bg-[var(--surface-3)]/80 text-[var(--text-4)] hover:text-[var(--text-2)]'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                File Tree ({implementationProfile.fileTree?.length || 0})
              </button>
            </div>

            {/* Search filter */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-[var(--text-5)] absolute left-3 top-2.5" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filter code artifacts..."
                className="w-full bg-[var(--surface-4)] border border-[var(--border-1)] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[var(--text-2)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* TAB 1: DETECTED MODULES IMPLEMENTATION PROFILE */}
          {activeTab === 'modules' && (
            <div className="space-y-4">
              {filteredModules?.map((mod) => (
                <div
                  key={mod.name}
                  className="bg-[var(--surface-4)] border border-[var(--border-1)] rounded-xl p-5 space-y-4 hover:border-[var(--border-2)] transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-1)]/80 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-500/30">
                        {mod.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[var(--text-1)]">{mod.name} Module</h4>
                        <p className="text-[11px] text-[var(--text-4)]">
                          {mod.commitsCount} Commits • {mod.prsCount} PRs • {mod.issuesCount} Issues
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shrink-0 ${
                        mod.status === 'Implemented'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : mod.status === 'Partial'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {mod.status === 'Implemented' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {mod.status === 'Partial' && <Clock className="w-3.5 h-3.5" />}
                      {mod.status === 'Missing' && <AlertCircle className="w-3.5 h-3.5" />}
                      {mod.status}
                    </span>
                  </div>

                  {/* Components details grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                    {/* Controllers & APIs */}
                    <div className="bg-[var(--panel)]/60 p-3 rounded-lg border border-[var(--border-1)]/80 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-4)] block">
                        Controllers & APIs ({mod.controllers.length + mod.apis.length})
                      </span>
                      {mod.controllers.length === 0 && mod.apis.length === 0 ? (
                        <p className="text-[var(--text-5)] italic text-[11px]">No controllers detected</p>
                      ) : (
                        <div className="space-y-1 font-mono text-[11px]">
                          {mod.controllers.map((c) => (
                            <div key={c} className="text-[var(--accent)] bg-sky-950/40 px-2 py-0.5 rounded">
                              🎮 {c}
                            </div>
                          ))}
                          {mod.apis.map((a) => (
                            <div key={a} className="text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded">
                              ⚡ {a}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Services & Logic */}
                    <div className="bg-[var(--panel)]/60 p-3 rounded-lg border border-[var(--border-1)]/80 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-4)] block">
                        Services & Middleware ({mod.services.length})
                      </span>
                      {mod.services.length === 0 ? (
                        <p className="text-[var(--text-5)] italic text-[11px]">No services detected</p>
                      ) : (
                        <div className="space-y-1 font-mono text-[11px]">
                          {mod.services.map((s) => (
                            <div key={s} className="text-indigo-300 bg-indigo-950/40 px-2 py-0.5 rounded">
                              ⚙️ {s}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* UI Pages & Components */}
                    <div className="bg-[var(--panel)]/60 p-3 rounded-lg border border-[var(--border-1)]/80 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-4)] block">
                        React Pages & Views ({mod.pages.length + mod.components.length})
                      </span>
                      {mod.pages.length === 0 && mod.components.length === 0 ? (
                        <p className="text-[var(--text-5)] italic text-[11px]">No UI components detected</p>
                      ) : (
                        <div className="space-y-1 font-mono text-[11px]">
                          {mod.pages.map((p) => (
                            <div key={p} className="text-purple-300 bg-purple-950/40 px-2 py-0.5 rounded">
                              🖥️ {p}
                            </div>
                          ))}
                          {mod.components.map((comp) => (
                            <div key={comp} className="text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded">
                              🧩 {comp}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: COMMITS */}
          {activeTab === 'commits' && (
            <div className="space-y-2">
              {implementationProfile.commits?.map((commit) => (
                <div
                  key={commit.hash}
                  className="bg-[var(--surface-4)] border border-[var(--border-1)] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-3">
                    <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20 shrink-0">
                      {commit.hash}
                    </span>
                    <div>
                      <p className="font-medium text-[var(--text-2)]">{commit.message}</p>
                      <p className="text-[11px] text-[var(--text-4)] mt-0.5">
                        By {commit.author} on {commit.date} • {commit.filesChanged?.length || 0} files modified
                      </p>
                    </div>
                  </div>

                  {commit.moduleRef && (
                    <span className="px-2.5 py-1 rounded text-[10px] font-semibold bg-[var(--surface-3)] text-[var(--text-3)] border border-[var(--border-2)] shrink-0">
                      {commit.moduleRef}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: PULL REQUESTS */}
          {activeTab === 'prs' && (
            <div className="space-y-2">
              {implementationProfile.pullRequests?.map((pr) => (
                <div
                  key={pr.id}
                  className="bg-[var(--surface-4)] border border-[var(--border-1)] rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        pr.state === 'merged'
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      <GitPullRequest className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--text-1)] truncate">{pr.title}</p>
                      <p className="text-[11px] text-[var(--text-4)]">
                        Author: {pr.author} • Module: {pr.relatedModule || 'Core'}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                      pr.state === 'merged'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {pr.state}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: ISSUES */}
          {activeTab === 'issues' && (
            <div className="space-y-2">
              {implementationProfile.issues?.map((issue) => (
                <div
                  key={issue.id}
                  className="bg-[var(--surface-4)] border border-[var(--border-1)] rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--text-1)] truncate">{issue.title}</p>
                      <div className="flex gap-1 mt-1">
                        {issue.labels?.map((lbl) => (
                          <span
                            key={lbl}
                            className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--surface-3)] text-[var(--text-3)] border border-[var(--border-2)]"
                          >
                            #{lbl}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                    {issue.state}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* TAB 5: RAW FILE TREE */}
          {activeTab === 'filetree' && (
            <div className="bg-[var(--surface-4)] border border-[var(--border-1)] rounded-xl p-4 space-y-2 font-mono text-xs">
              <span className="text-[10px] uppercase font-bold text-[var(--text-4)] block mb-2">
                Detected File Directory Structure ({implementationProfile.fileTree?.length || 0} Files)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {implementationProfile.fileTree?.map((path) => (
                  <div
                    key={path}
                    className="p-2 rounded bg-[var(--panel)] border border-[var(--border-1)]/80 text-[var(--accent)] flex items-center gap-2 truncate"
                  >
                    <FileCode className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate">{path}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
