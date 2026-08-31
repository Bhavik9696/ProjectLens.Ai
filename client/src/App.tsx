import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ProjectIntelligenceData, Project, ProjectDocument, RequirementAnalysisResult, SoftwareRequirement, ImplementationProfile, ChatMessage } from './types';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { SignInPage } from './components/SignInPage';
import { SignUpPage } from './components/SignUpPage';
import { ForgotPasswordPage } from './components/ForgotPasswordPage';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { Dashboard } from './components/Dashboard';
import { TraceabilityMatrix } from './components/TraceabilityMatrix';
import { CoverageAnalyzer } from './components/CoverageAnalyzer';
import { DocumentUploader } from './components/DocumentUploader';
import { GitHubConnector } from './components/GitHubConnector';
import { AICopilotChat } from './components/AICopilotChat';
import { NewProjectModal } from './components/NewProjectModal';
import { ReportGeneratorModal } from './components/ReportGeneratorModal';
import { BuyCreditsModal } from './components/BuyCreditsModal';
import { ScopeCreepPanel } from './components/ScopeCreepPanel';
import { TestCoverageReport } from './components/TestCoverageReport';
import { AnalysisHistory } from './components/AnalysisHistory';
import { ProjectSettingsModal } from './components/ProjectSettingsModal';
// ── New Feature Imports ──────────────────────────────────────────────
import { OnboardingTour } from './components/OnboardingTour';
import { CommandPalette } from './components/CommandPalette';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { RequirementDrawer } from './components/RequirementDrawer';
import { FloatingCopilot } from './components/FloatingCopilot';
import { useCommandPalette } from './contexts/CommandPaletteContext';
import { useNotifications } from './contexts/NotificationContext';
import {
  fetchProjectsApi,
  createProjectApi,
  saveProjectApi,
  deleteProjectApi,
  evaluateEngineApi,
} from './services/api';
import { AppShellSkeleton } from './components/ui/Skeleton';
import { useToast } from './contexts/ToastContext';
import { useAuth } from './contexts/AuthContext';
import { Loader2 } from 'lucide-react';

type AppView = 'landing' | 'signin' | 'signup' | 'forgot-password' | 'reset-password' | 'app';

const NAV_TAB_IDS = ['dashboard','rtm','coverage','documents','github','copilot','scope','tests','history'];

export default function App() {
  const { user, isLoading: authLoading, signOut, refreshCredits, loginWithToken } = useAuth();
  const [view, setView] = useState<AppView>('landing');
  const [resetToken, setResetToken] = useState<string>('');
  const [projectsData, setProjectsData] = useState<ProjectIntelligenceData[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isBuyCreditsModalOpen, setIsBuyCreditsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { showToast } = useToast();
  // ── Feature 2: Command Palette ───────────────────────────────────────
  const { open: openPalette } = useCommandPalette();
  // ── Feature 4: Notifications ─────────────────────────────────────────
  const { addNotification } = useNotifications();
  // ── Feature 5: Keyboard Shortcuts Modal ─────────────────────────────
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  // ── Feature 6: Requirement Drawer ───────────────────────────────────
  const [selectedRequirement, setSelectedRequirement] = useState<RequirementAnalysisResult | null>(null);
  // Ref used to pre-fill copilot query from the drawer's "Ask Copilot" button
  const copilotPrefilledQuery = useRef<string | null>(null);

  // ── Feature 5: Global Keyboard Shortcuts ──────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't fire shortcuts when typing in an input/textarea/select
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Ctrl+K / Cmd+K → Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        openPalette();
        return;
      }

      // ? → Keyboard Shortcuts Modal
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsShortcutsModalOpen(true);
        return;
      }

      // Alt+1-9 → Switch to nav tab by index
      if (e.altKey && /^[1-9]$/.test(e.key)) {
        e.preventDefault();
        const idx = parseInt(e.key, 10) - 1;
        if (idx < NAV_TAB_IDS.length) setActiveTab(NAV_TAB_IDS[idx]);
        return;
      }

      // Alt+N → New Project
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsNewProjectModalOpen(true);
        return;
      }

      // Alt+R → Report Modal
      if (e.altKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        setIsReportModalOpen(true);
        return;
      }

      // Alt+C → AI Copilot
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setActiveTab('copilot');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openPalette]);

  // On mount: check for URL params —
  //   ?token=      → password reset flow
  //   ?oauthToken= → Google OAuth sign-in redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Password reset token
    const token = params.get('token');
    if (token) {
      setResetToken(token);
      setView('reset-password');
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    // Google OAuth token — store & resolve user, then go to app
    const oauthToken = params.get('oauthToken');
    if (oauthToken) {
      window.history.replaceState({}, '', window.location.pathname);
      loginWithToken(oauthToken)
        .then(() => setView('app'))
        .catch((err) => {
          console.error('[OAuth] Failed to validate token:', err);
          setView('signin');
        });
    }
  }, []);

  // Sync view with auth state once AuthContext finishes restoring the session
  useEffect(() => {
    if (authLoading) return; // wait for session restore
    if (user && view !== 'app') {
      setView('app'); // already logged in — go straight to app
    }
  }, [authLoading, user]);

  // Load persisted projects from MongoDB (via the Express API) once auth has resolved.
  // We skip the fetch entirely when no user is logged in to avoid a spurious
  // "Could not reach the API" error toast on the landing / sign-in screens.
  useEffect(() => {
    // Still waiting for the session to be restored — do nothing yet.
    if (authLoading) return;

    // No authenticated user — nothing to fetch; just stop the loading spinner.
    if (!user) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await fetchProjectsApi();
        if (cancelled) return;
        setProjectsData(data);
        setCurrentProjectId(data[0]?.project.id || '');
        setLoadError(null);
      } catch (err: any) {
        if (cancelled) return;
        console.error('Failed to load projects', err);
        const msg = 'Could not reach the ProjectLens API / MongoDB. Make sure the server is running and refresh.';
        setLoadError(msg);
        showToast(msg, 'error');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  // BUG FIX: the original app assumed there was always at least one
  // project (from static sample data) and let several tabs dereference
  // `currentProjectData.field` directly. With real project creation/
  // deletion the list can now legitimately be empty, so we guard here.
  const currentProjectData =
    projectsData.find((p) => p.project.id === currentProjectId) || projectsData[0] || null;

  // Helper to update current project data locally
  const updateCurrentProjectData = (updater: (prev: ProjectIntelligenceData) => ProjectIntelligenceData) => {
    if (!currentProjectId) return;
    setProjectsData((prevList) =>
      prevList.map((p) => (p.project.id === currentProjectId ? updater(p) : p))
    );
  };

  // Persist a snapshot of the current project to MongoDB.
  const persistProject = async (projectId: string, snapshot: Partial<Omit<ProjectIntelligenceData, 'project'>> & { project?: Partial<ProjectIntelligenceData['project']> }) => {
    try {
      await saveProjectApi(projectId, snapshot);
    } catch (err) {
      console.warn('Failed to persist project changes', err);
      showToast('Changes were made locally but failed to save. Check your connection.', 'error');
    }
  };

  // Step 1: Create New Project — credit gate is enforced server-side
  const handleCreateProject = async (draftProject: Project) => {
    try {
      const created = await createProjectApi({
        name: draftProject.name,
        description: draftProject.description,
        deadline: draftProject.deadline,
        techStack: draftProject.techStack,
        githubUrl: draftProject.githubUrl,
      });
      setProjectsData((prev) => [created, ...prev]);
      setCurrentProjectId(created.project.id);
      setActiveTab('documents');
      showToast(`Project "${created.project.name}" created`, 'success');
      // Feature 4: fire notification
      addNotification({
        type: 'success',
        title: 'Project Created',
        message: `"${created.project.name}" created successfully. Upload documents to get started.`,
        tab: 'documents',
      });
      // Refresh credit state after a project is consumed
      await refreshCredits();
    } catch (err: any) {
      console.error('Failed to create project', err);
      if (err.status === 402) {
        // No credits remaining — open the Buy Credits modal
        showToast('No credits remaining. Purchase credits to create more projects.', 'error');
        setIsNewProjectModalOpen(false);
        setIsBuyCreditsModalOpen(true);
      } else {
        showToast('Could not create the project. Try again.', 'error');
      }
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    const deletedName = projectsData.find((p) => p.project.id === projectId)?.project.name || 'Project';
    try {
      await deleteProjectApi(projectId);
      setProjectsData((prev) => {
        const remaining = prev.filter((p) => p.project.id !== projectId);
        if (currentProjectId === projectId) {
          setCurrentProjectId(remaining[0]?.project.id || '');
        }
        return remaining;
      });
      showToast(`"${deletedName}" deleted`, 'success');
    } catch (err) {
      console.error('Failed to delete project', err);
      showToast('Could not delete the project. Try again.', 'error');
    }
  };

  // Step 2 & 3: Add Document & Extract Requirements
  const handleAddDocument = async (doc: ProjectDocument, extractedReqs: SoftwareRequirement[]) => {
    if (!currentProjectData) return;
    const updatedDocs = [...currentProjectData.documents, doc];
    const updatedReqs = [...currentProjectData.requirements, ...extractedReqs];

    // Re-evaluate engine metrics if implementation profile exists
    let updatedResults = currentProjectData.analysisResults;
    let updatedHealth = currentProjectData.healthMetrics;

    if (currentProjectData.implementationProfile) {
      try {
        const evalRes = await evaluateEngineApi(updatedReqs, currentProjectData.implementationProfile);
        updatedResults = evalRes.analysisResults;
        updatedHealth = evalRes.healthMetrics;
      } catch (err) {
        console.warn('Re-evaluation error', err);
      }
    } else {
      // Build initial requirement analysis results with 0% coverage until repo analyzed
      updatedResults = updatedReqs.map((r) => ({
        requirementId: r.id,
        requirementTitle: r.title,
        module: r.module,
        priority: r.priority,
        expectedComponents: r.expectedComponents,
        foundComponents: [],
        missingComponents: r.expectedComponents,
        coveragePercent: 0,
        confidencePercent: 95,
        status: 'Missing',
        evidence: {
          detectedFiles: [],
          detectedRoutes: [],
          relatedCommits: [],
          relatedPRs: [],
          relatedIssues: [],
        },
        recommendation: `Connect GitHub repository to analyze implementation code for ${r.title}.`,
      }));
      updatedHealth = {
        requirementCoverage: 0,
        implementationCoverage: 0,
        sprintProgress: 0,
        githubActivity: 0,
        overallScore: 0,
        healthRating: 'Healthy',
        highRiskModules: [],
        keyRiskFactors: ['Connect GitHub repository to evaluate code implementation.'],
      };
    }

    updateCurrentProjectData((prev) => ({
      ...prev,
      documents: updatedDocs,
      requirements: updatedReqs,
      analysisResults: updatedResults,
      healthMetrics: updatedHealth,
    }));

    await persistProject(currentProjectData.project.id, {
      documents: updatedDocs,
      requirements: updatedReqs,
      analysisResults: updatedResults,
      healthMetrics: updatedHealth,
    });

    showToast(`"${doc.name}" added — ${extractedReqs.length} requirement${extractedReqs.length === 1 ? '' : 's'} extracted`, 'success');
  };

  const handleRemoveDocument = async (docId: string) => {
    if (!currentProjectData) return;
    const removedDoc = currentProjectData.documents.find((d) => d.id === docId);
    const updatedDocs = currentProjectData.documents.filter((d) => d.id !== docId);
    const updatedReqs = currentProjectData.requirements.filter(
      (r) => !removedDoc || r.sourceDocument !== removedDoc.name
    );

    let updatedResults: any[] = [];
    let updatedHealth = currentProjectData.healthMetrics;

    if (currentProjectData.implementationProfile && updatedReqs.length > 0) {
      try {
        const evalRes = await evaluateEngineApi(updatedReqs, currentProjectData.implementationProfile);
        updatedResults = evalRes.analysisResults;
        updatedHealth = evalRes.healthMetrics;
      } catch (err) {
        console.warn('Re-evaluation error', err);
      }
    }

    updateCurrentProjectData((prev) => ({
      ...prev,
      documents: updatedDocs,
      requirements: updatedReqs,
      analysisResults: updatedResults,
      healthMetrics: updatedHealth,
    }));

    await persistProject(currentProjectData.project.id, {
      documents: updatedDocs,
      requirements: updatedReqs,
      analysisResults: updatedResults,
      healthMetrics: updatedHealth,
    });

    showToast(removedDoc ? `"${removedDoc.name}" removed` : 'Document removed', 'info');
  };

  const handleAnalyzeRepo = async (profile: ImplementationProfile) => {
    if (!currentProjectData) return;
    try {
      const evalRes = await evaluateEngineApi(currentProjectData.requirements, profile);
      updateCurrentProjectData((prev) => ({
        ...prev,
        implementationProfile: profile,
        analysisResults: evalRes.analysisResults,
        healthMetrics: evalRes.healthMetrics,
      }));
      await persistProject(currentProjectData.project.id, {
        implementationProfile: profile,
        analysisResults: evalRes.analysisResults,
        healthMetrics: evalRes.healthMetrics,
      });
      showToast(`Repository analyzed — ${evalRes.healthMetrics.overallScore}% overall health`, 'success');
      // Feature 4: analysis complete notification
      addNotification({
        type: 'success',
        title: 'Analysis Complete',
        message: `${profile.repoName} analyzed — ${evalRes.healthMetrics.overallScore}% overall health score.`,
        tab: 'coverage',
      });
      // Feature 4: scope creep notification if detected
      if (evalRes.healthMetrics.scopeCreep && evalRes.healthMetrics.scopeCreep.length > 0) {
        addNotification({
          type: 'warning',
          title: 'Scope Creep Detected',
          message: `${evalRes.healthMetrics.scopeCreep.length} out-of-scope feature(s) detected in your codebase.`,
          tab: 'scope',
        });
      }
    } catch (err) {
      updateCurrentProjectData((prev) => ({
        ...prev,
        implementationProfile: profile,
      }));
      await persistProject(currentProjectData.project.id, { implementationProfile: profile });
      showToast('Repository connected, but coverage scoring failed. Try re-analyzing.', 'error');
    }
  };

  // Steps 11 & 12: persist AI Copilot conversation history
  const handleChatMessagesUpdate = async (messages: ChatMessage[]) => {
    if (!currentProjectData) return;
    updateCurrentProjectData((prev) => ({ ...prev, chatMessages: messages }));
    await persistProject(currentProjectData.project.id, { chatMessages: messages });
  };

  // Consent gate for the AI Copilot's RAG retrieval: off by default per
  // project. Persisted server-side so the backend enforces it, not just
  // the UI (see server/routes/copilot.js).
  const handleToggleExternalAI = async (allow: boolean) => {
    if (!currentProjectData) return;
    updateCurrentProjectData((prev) => ({
      ...prev,
      project: { ...prev.project, allowExternalAI: allow },
    }));
    await persistProject(currentProjectData.project.id, { project: { allowExternalAI: allow } });
    showToast(
      allow
        ? 'AI-assisted mode enabled — retrieved data will be sent to Gemini for this project'
        : 'Switched to local-only mode — no data will be sent externally',
      allow ? 'info' : 'success'
    );
  };

  // Sign out handler — clears auth and returns to landing
  const handleSignOut = () => {
    signOut();
    setView('landing');
    // Reset project state so next login starts fresh
    setProjectsData([]);
    setCurrentProjectId('');
    setActiveTab('dashboard');
  };

  // ── Auth is still being restored from localStorage — show spinner ──
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    );
  }

  // ── Public pages ────────────────────────────────────────────────────
  if (view === 'landing') {
    return (
      <LandingPage
        onGetStarted={() => setView('signin')}
        onSignIn={() => setView('signin')}
        onSignUp={() => setView('signup')}
      />
    );
  }

  if (view === 'signin') {
    return (
      <SignInPage
        onNavigateSignUp={() => setView('signup')}
        onNavigateLanding={() => setView('landing')}
        onNavigateForgotPassword={() => setView('forgot-password')}
      />
    );
  }

  if (view === 'signup') {
    return (
      <SignUpPage
        onNavigateSignIn={() => setView('signin')}
        onNavigateLanding={() => setView('landing')}
      />
    );
  }

  if (view === 'forgot-password') {
    return (
      <ForgotPasswordPage
        onNavigateSignIn={() => setView('signin')}
        onNavigateLanding={() => setView('landing')}
      />
    );
  }

  if (view === 'reset-password') {
    return (
      <ResetPasswordPage
        token={resetToken}
        onNavigateSignIn={() => setView('signin')}
        onNavigateForgotPassword={() => setView('forgot-password')}
      />
    );
  }

  // ── Protected: redirect unauthenticated users to sign in ────────────
  if (!user) {
    return (
      <SignInPage
        onNavigateSignUp={() => setView('signup')}
        onNavigateLanding={() => setView('landing')}
      />
    );
  }

  if (isLoading) {
    return <AppShellSkeleton />;
  }

  const freeRemaining = user.freeProjectsRemaining ?? 2;
  const paidCreds     = user.paidCredits           ?? 0;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-1)] font-sans selection:bg-[var(--accent)]/25 selection:text-[var(--accent)] antialiased">
      {loadError && (
        <div className="bg-rose-950/60 border-b border-rose-500/30 text-rose-200 text-xs font-mono px-4 py-2 text-center">
          {loadError}
        </div>
      )}

      {/* Top Header Navbar */}
      <Navbar
        projects={projectsData}
        currentProject={currentProjectData}
        onSelectProject={(id) => setCurrentProjectId(id)}
        onOpenNewProject={() => setIsNewProjectModalOpen(true)}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onDeleteProject={handleDeleteProject}
        onOpenSettings={currentProjectData ? () => setIsSettingsModalOpen(true) : undefined}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSignOut={handleSignOut}
        onBuyCredits={() => setIsBuyCreditsModalOpen(true)}
        user={user}
        onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
        onNavigateTab={setActiveTab}
      />

      {/* Main View Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <Dashboard
            data={currentProjectData}
            onNavigateTab={setActiveTab}
            freeProjectsRemaining={freeRemaining}
            paidCredits={paidCreds}
            onBuyCredits={() => setIsBuyCreditsModalOpen(true)}
          />
        )}

        {/* BUG FIX: these tabs used to dereference currentProjectData directly
            (no null-check), which threw a runtime error whenever the project
            list was empty. They now render an empty-state instead of crashing. */}
        {activeTab === 'rtm' && (
          <TraceabilityMatrix
            analysisResults={currentProjectData?.analysisResults || []}
            onSelectRequirement={(reqId) => {
              const found = currentProjectData?.analysisResults.find((r) => r.requirementId === reqId) || null;
              setSelectedRequirement(found);
            }}
          />
        )}

        {activeTab === 'coverage' && (
          <CoverageAnalyzer
            analysisResults={currentProjectData?.analysisResults || []}
            projectId={currentProjectData?.project?.id}
          />
        )}

        {activeTab === 'documents' && currentProjectData && (
          <DocumentUploader
            documents={currentProjectData.documents}
            requirements={currentProjectData.requirements}
            onAddDocument={handleAddDocument}
            onRemoveDocument={handleRemoveDocument}
          />
        )}

        {activeTab === 'documents' && !currentProjectData && (
          <EmptyProjectPrompt onCreate={() => setIsNewProjectModalOpen(true)} />
        )}

        {activeTab === 'github' && currentProjectData && (
          <GitHubConnector
            githubUrl={currentProjectData.project.githubUrl}
            implementationProfile={currentProjectData.implementationProfile}
            expectedRequirements={currentProjectData.requirements}
            onAnalyzeRepo={handleAnalyzeRepo}
          />
        )}

        {activeTab === 'github' && !currentProjectData && (
          <EmptyProjectPrompt onCreate={() => setIsNewProjectModalOpen(true)} />
        )}

        {activeTab === 'copilot' && currentProjectData && (
          <AICopilotChat data={currentProjectData} onMessagesUpdate={handleChatMessagesUpdate} onToggleExternalAI={handleToggleExternalAI} />
        )}

        {activeTab === 'copilot' && !currentProjectData && (
          <EmptyProjectPrompt onCreate={() => setIsNewProjectModalOpen(true)} />
        )}

        {/* Feature 1: Scope Creep Panel */}
        {activeTab === 'scope' && currentProjectData && (
          <ScopeCreepPanel healthMetrics={currentProjectData.healthMetrics} />
        )}
        {activeTab === 'scope' && !currentProjectData && (
          <EmptyProjectPrompt onCreate={() => setIsNewProjectModalOpen(true)} />
        )}

        {/* Feature 2: Test Coverage Gap Report */}
        {activeTab === 'tests' && (
          <TestCoverageReport analysisResults={currentProjectData?.analysisResults || []} />
        )}

        {/* Feature 3: Analysis History & Diff */}
        {activeTab === 'history' && (
          <AnalysisHistory
            analysisHistory={currentProjectData?.analysisHistory || []}
            currentResults={currentProjectData?.analysisResults || []}
          />
        )}
      </main>

      {/* Step 1: New Project Modal */}
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onCreateProject={handleCreateProject}
      />

      {/* Step 14: Report Generator Modal */}
      <ReportGeneratorModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        data={currentProjectData}
      />

      {/* Buy Credits Modal */}
      <BuyCreditsModal
        isOpen={isBuyCreditsModalOpen}
        onClose={() => setIsBuyCreditsModalOpen(false)}
        onSuccess={async () => {
          await refreshCredits();
        }}
      />

      {/* Project Settings Modal (Slack + API Keys) */}
      {currentProjectData && isSettingsModalOpen && (
        <ProjectSettingsModal
          project={currentProjectData}
          onClose={() => setIsSettingsModalOpen(false)}
          onSaved={(updated) => {
            setProjectsData((prev) =>
              prev.map((p) => p.project.id === updated.project.id ? updated : p)
            );
          }}
        />
      )}

      {/* ── Feature 1: Onboarding Tour ──────────────────────────────── */}
      <OnboardingTour />

      {/* ── Feature 2: Command Palette ─────────────────────────────── */}
      <CommandPalette
        projects={projectsData}
        currentProjectId={currentProjectId}
        onSelectProject={(id) => setCurrentProjectId(id)}
        onNavigateTab={setActiveTab}
        onOpenNewProject={() => setIsNewProjectModalOpen(true)}
        onOpenReport={() => setIsReportModalOpen(true)}
        onBuyCredits={() => setIsBuyCreditsModalOpen(true)}
        onSignOut={handleSignOut}
        onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
      />

      {/* ── Feature 5: Keyboard Shortcuts Modal ─────────────────────── */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      {/* ── Feature 6: Requirement Detail Drawer ────────────────────── */}
      <RequirementDrawer
        result={selectedRequirement}
        onClose={() => setSelectedRequirement(null)}
        onAskCopilot={(query) => {
          copilotPrefilledQuery.current = query;
          setActiveTab('copilot');
          setSelectedRequirement(null);
        }}
      />

      {/* ── Feature 7: Floating Copilot Button ──────────────────────── */}
      <FloatingCopilot
        activeTab={activeTab}
        onNavigateCopilot={() => setActiveTab('copilot')}
      />
    </div>
  );
}

function EmptyProjectPrompt({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-10 text-center max-w-lg mx-auto space-y-4 my-8 shadow-2xl">
      <p className="text-sm text-[var(--text-4)]">Create a project first to use this section.</p>
      <button
        onClick={onCreate}
        className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:brightness-110 text-black text-xs font-bold transition-all shadow-[0_0_15px_-4px_var(--accent)] cursor-pointer"
      >
        New Project
      </button>
    </div>
  );
}
