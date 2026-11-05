import React, { useCallback, useEffect, useRef } from 'react';
import {
  ProjectDocument,
  RequirementAnalysisResult,
  SoftwareRequirement,
  ImplementationProfile,
  ChatMessage,
  Project,
} from './types';
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
import { OnboardingTour } from './components/OnboardingTour';
import { CommandPalette } from './components/CommandPalette';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { RequirementDrawer } from './components/RequirementDrawer';
import { FloatingCopilot } from './components/FloatingCopilot';
import { AppShellSkeleton } from './components/ui/Skeleton';
import { Loader2 } from 'lucide-react';

// ── Redux ──────────────────────────────────────────────────────────────────────
import { useAppDispatch, useAppSelector } from './store/hooks';
import { restoreSession, signOut as signOutAction, refreshCreditsThunk } from './store/authSlice';
import { addNotification } from './store/notificationsSlice';
import {
  setProjects,
  setCurrentProject,
  prependProject,
  upsertProject,
  removeProject,
  setLoadError,
  resetProjects,
} from './store/projectsSlice';
import {
  setView,
  setResetToken,
  setActiveTab,
  setNewProjectModalOpen,
  setReportModalOpen,
  setBuyCreditsModalOpen,
  setSettingsModalOpen,
  setShortcutsModalOpen,
  setProjectsLoading,
  setSelectedRequirement,
  resetUi,
} from './store/uiSlice';
import {
  useFetchProjectsQuery,
  useCreateProjectMutation,
  useSaveProjectMutation,
  useDeleteProjectMutation,
} from './store/projectsApi';

// ── Context hooks (still used — they're shims over Redux) ─────────────────────
import { useCommandPalette } from './contexts/CommandPaletteContext';
import { useNotifications } from './contexts/NotificationContext';
import { useToast } from './contexts/ToastContext';
import { useAuth } from './contexts/AuthContext';

// ── Service ───────────────────────────────────────────────────────────────────
import { evaluateEngineApi } from './services/api';

const NAV_TAB_IDS = ['dashboard', 'rtm', 'coverage', 'documents', 'github', 'copilot', 'scope', 'tests', 'history'];

export default function App() {
  const dispatch = useAppDispatch();

  // ── Auth state (from Redux via AuthContext shim) ───────────────────────────
  const { user, isLoading: authLoading, signOut, refreshCredits, loginWithToken } = useAuth();

  // ── UI state from Redux ────────────────────────────────────────────────────
  const {
    view,
    resetToken,
    activeTab,
    isNewProjectModalOpen,
    isReportModalOpen,
    isBuyCreditsModalOpen,
    isSettingsModalOpen,
    isShortcutsModalOpen,
    isProjectsLoading,
    selectedRequirement,
  } = useAppSelector((s) => s.ui);

  // ── Projects state from Redux ──────────────────────────────────────────────
  const { projectsData, currentProjectId, loadError } = useAppSelector((s) => s.projects);

  // ── Context hooks ──────────────────────────────────────────────────────────
  const { open: openPalette } = useCommandPalette();
  const { addNotification: addNote } = useNotifications();
  const { showToast } = useToast();

  // ── RTK Query: fetch projects ─────────────────────────────────────────────
  const {
    data: fetchedProjects,
    isLoading: projectsFetching,
    isError: projectsFetchError,
    error: projectsFetchErrorObj,
  } = useFetchProjectsQuery(undefined, {
    // Only run the query when a user is authenticated
    skip: authLoading || !user,
  });

  // ── RTK Query: mutations ───────────────────────────────────────────────────
  const [createProject] = useCreateProjectMutation();
  const [saveProjectMutation] = useSaveProjectMutation();
  const [deleteProjectMutation] = useDeleteProjectMutation();

  // ── Copilot prefill ref (not Redux — transient, no DevTools value) ─────────
  const copilotPrefilledQuery = useRef<string | null>(null);

  // ── Session restore on mount ──────────────────────────────────────────────
  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  // ── Sync fetched projects into Redux projectsSlice ────────────────────────
  useEffect(() => {
    if (projectsFetching) {
      dispatch(setProjectsLoading(true));
      return;
    }
    dispatch(setProjectsLoading(false));

    if (projectsFetchError) {
      const msg =
        'Could not reach the ProjectLens API / MongoDB. Make sure the server is running and refresh.';
      dispatch(setLoadError(msg));
      showToast(msg, 'error');
      return;
    }

    if (fetchedProjects) {
      dispatch(setProjects(fetchedProjects));
      dispatch(setLoadError(null));
    }
  }, [fetchedProjects, projectsFetching, projectsFetchError, dispatch, showToast]);

  // ── Sync view with auth state once session restored ───────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (user && view !== 'app') dispatch(setView('app'));
  }, [authLoading, user]);

  // ── URL param handling: ?token= and ?oauthToken= ──────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const token = params.get('token');
    if (token) {
      dispatch(setResetToken(token));
      dispatch(setView('reset-password'));
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    const oauthToken = params.get('oauthToken');
    if (oauthToken) {
      window.history.replaceState({}, '', window.location.pathname);
      loginWithToken(oauthToken)
        .then(() => dispatch(setView('app')))
        .catch((err) => {
          console.error('[OAuth] Failed to validate token:', err);
          dispatch(setView('signin'));
        });
    }
  }, []);

  // ── Global keyboard shortcuts ─────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        openPalette();
        return;
      }
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        dispatch(setShortcutsModalOpen(true));
        return;
      }
      if (e.altKey && /^[1-9]$/.test(e.key)) {
        e.preventDefault();
        const idx = parseInt(e.key, 10) - 1;
        if (idx < NAV_TAB_IDS.length) dispatch(setActiveTab(NAV_TAB_IDS[idx]));
        return;
      }
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        dispatch(setNewProjectModalOpen(true));
        return;
      }
      if (e.altKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        dispatch(setReportModalOpen(true));
        return;
      }
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        dispatch(setActiveTab('copilot'));
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openPalette, dispatch]);

  // ── Derived current project ────────────────────────────────────────────────
  const currentProjectData =
    projectsData.find((p) => p.project.id === currentProjectId) || projectsData[0] || null;

  // ── Helper: update one project in the Redux store optimistically ──────────
  const updateCurrentProjectData = useCallback(
    (updater: (prev: typeof currentProjectData) => typeof currentProjectData) => {
      if (!currentProjectData) return;
      const updated = updater(currentProjectData);
      if (updated) dispatch(upsertProject(updated));
    },
    [currentProjectData, dispatch]
  );

  // ── Helper: persist project snapshot to server ────────────────────────────
  const persistProject = useCallback(
    async (
      projectId: string,
      snapshot: Parameters<typeof saveProjectMutation>[0]['data']
    ) => {
      try {
        const result = await saveProjectMutation({ projectId, data: snapshot }).unwrap();
        dispatch(upsertProject(result));
      } catch (err) {
        console.warn('Failed to persist project changes', err);
        showToast('Changes were made locally but failed to save. Check your connection.', 'error');
      }
    },
    [saveProjectMutation, dispatch, showToast]
  );

  // ── Step 1: Create Project ─────────────────────────────────────────────────
  const handleCreateProject = async (draftProject: Project) => {
    try {
      const created = await createProject({
        name: draftProject.name,
        description: draftProject.description,
        deadline: draftProject.deadline,
        techStack: draftProject.techStack,
        githubUrl: draftProject.githubUrl,
      }).unwrap();

      dispatch(prependProject(created));
      dispatch(setActiveTab('documents'));
      dispatch(setNewProjectModalOpen(false));
      showToast(`Project "${created.project.name}" created`, 'success');
      dispatch(
        addNotification({
          type: 'success',
          title: 'Project Created',
          message: `"${created.project.name}" created successfully. Upload documents to get started.`,
          tab: 'documents',
        })
      );
      await refreshCredits();
    } catch (err: any) {
      console.error('Failed to create project', err);
      if (err.status === 402) {
        showToast('No credits remaining. Purchase credits to create more projects.', 'error');
        dispatch(setNewProjectModalOpen(false));
        dispatch(setBuyCreditsModalOpen(true));
      } else {
        showToast('Could not create the project. Try again.', 'error');
      }
    }
  };

  // ── Delete Project ─────────────────────────────────────────────────────────
  const handleDeleteProject = async (projectId: string) => {
    const deletedName =
      projectsData.find((p) => p.project.id === projectId)?.project.name || 'Project';
    try {
      await deleteProjectMutation(projectId).unwrap();
      dispatch(removeProject(projectId));
      showToast(`"${deletedName}" deleted`, 'success');
    } catch (err) {
      console.error('Failed to delete project', err);
      showToast('Could not delete the project. Try again.', 'error');
    }
  };

  // ── Add Document & Extract Requirements ────────────────────────────────────
  const handleAddDocument = async (doc: ProjectDocument, extractedReqs: SoftwareRequirement[]) => {
    if (!currentProjectData) return;
    const updatedDocs = [...currentProjectData.documents, doc];
    const updatedReqs = [...currentProjectData.requirements, ...extractedReqs];

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
        status: 'Missing' as const,
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
        healthRating: 'Healthy' as const,
        highRiskModules: [],
        keyRiskFactors: ['Connect GitHub repository to evaluate code implementation.'],
      };
    }

    updateCurrentProjectData((prev) =>
      prev
        ? { ...prev, documents: updatedDocs, requirements: updatedReqs, analysisResults: updatedResults, healthMetrics: updatedHealth }
        : prev
    );

    await persistProject(currentProjectData.project.id, {
      documents: updatedDocs,
      requirements: updatedReqs,
      analysisResults: updatedResults,
      healthMetrics: updatedHealth,
    });

    showToast(
      `"${doc.name}" added — ${extractedReqs.length} requirement${extractedReqs.length === 1 ? '' : 's'} extracted`,
      'success'
    );
  };

  // ── Remove Document ────────────────────────────────────────────────────────
  const handleRemoveDocument = async (docId: string) => {
    if (!currentProjectData) return;
    const removedDoc = currentProjectData.documents.find((d) => d.id === docId);
    const updatedDocs = currentProjectData.documents.filter((d) => d.id !== docId);
    const updatedReqs = currentProjectData.requirements.filter(
      (r) => !removedDoc || r.sourceDocument !== removedDoc.name
    );

    let updatedResults: RequirementAnalysisResult[] = [];
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

    updateCurrentProjectData((prev) =>
      prev
        ? { ...prev, documents: updatedDocs, requirements: updatedReqs, analysisResults: updatedResults, healthMetrics: updatedHealth }
        : prev
    );

    await persistProject(currentProjectData.project.id, {
      documents: updatedDocs,
      requirements: updatedReqs,
      analysisResults: updatedResults,
      healthMetrics: updatedHealth,
    });

    showToast(removedDoc ? `"${removedDoc.name}" removed` : 'Document removed', 'info');
  };

  // ── Analyze Repo ───────────────────────────────────────────────────────────
  const handleAnalyzeRepo = async (profile: ImplementationProfile) => {
    if (!currentProjectData) return;
    try {
      const evalRes = await evaluateEngineApi(currentProjectData.requirements, profile);
      updateCurrentProjectData((prev) =>
        prev
          ? { ...prev, implementationProfile: profile, analysisResults: evalRes.analysisResults, healthMetrics: evalRes.healthMetrics }
          : prev
      );
      await persistProject(currentProjectData.project.id, {
        implementationProfile: profile,
        analysisResults: evalRes.analysisResults,
        healthMetrics: evalRes.healthMetrics,
      });
      showToast(`Repository analyzed — ${evalRes.healthMetrics.overallScore}% overall health`, 'success');
      dispatch(
        addNotification({
          type: 'success',
          title: 'Analysis Complete',
          message: `${profile.repoName} analyzed — ${evalRes.healthMetrics.overallScore}% overall health score.`,
          tab: 'coverage',
        })
      );
      if (evalRes.healthMetrics.scopeCreep && evalRes.healthMetrics.scopeCreep.length > 0) {
        dispatch(
          addNotification({
            type: 'warning',
            title: 'Scope Creep Detected',
            message: `${evalRes.healthMetrics.scopeCreep.length} out-of-scope feature(s) detected in your codebase.`,
            tab: 'scope',
          })
        );
      }
    } catch (err) {
      updateCurrentProjectData((prev) =>
        prev ? { ...prev, implementationProfile: profile } : prev
      );
      await persistProject(currentProjectData.project.id, { implementationProfile: profile });
      showToast('Repository connected, but coverage scoring failed. Try re-analyzing.', 'error');
    }
  };

  // ── Copilot chat history ───────────────────────────────────────────────────
  const handleChatMessagesUpdate = async (messages: ChatMessage[]) => {
    if (!currentProjectData) return;
    updateCurrentProjectData((prev) => (prev ? { ...prev, chatMessages: messages } : prev));
    await persistProject(currentProjectData.project.id, { chatMessages: messages });
  };

  // ── Toggle external AI ─────────────────────────────────────────────────────
  const handleToggleExternalAI = async (allow: boolean) => {
    if (!currentProjectData) return;
    updateCurrentProjectData((prev) =>
      prev ? { ...prev, project: { ...prev.project, allowExternalAI: allow } } : prev
    );
    await persistProject(currentProjectData.project.id, { project: { allowExternalAI: allow } });
    showToast(
      allow
        ? 'AI-assisted mode enabled — retrieved data will be sent to Gemini for this project'
        : 'Switched to local-only mode — no data will be sent externally',
      allow ? 'info' : 'success'
    );
  };

  // ── Sign out ───────────────────────────────────────────────────────────────
  const handleSignOut = () => {
    signOut();
    dispatch(resetProjects());
    dispatch(resetUi());
  };

  // ── Render guards ──────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    );
  }

  if (view === 'landing') {
    return (
      <LandingPage
        onGetStarted={() => dispatch(setView('signin'))}
        onSignIn={() => dispatch(setView('signin'))}
        onSignUp={() => dispatch(setView('signup'))}
      />
    );
  }

  if (view === 'signin') {
    return (
      <SignInPage
        onNavigateSignUp={() => dispatch(setView('signup'))}
        onNavigateLanding={() => dispatch(setView('landing'))}
        onNavigateForgotPassword={() => dispatch(setView('forgot-password'))}
      />
    );
  }

  if (view === 'signup') {
    return (
      <SignUpPage
        onNavigateSignIn={() => dispatch(setView('signin'))}
        onNavigateLanding={() => dispatch(setView('landing'))}
      />
    );
  }

  if (view === 'forgot-password') {
    return (
      <ForgotPasswordPage
        onNavigateSignIn={() => dispatch(setView('signin'))}
        onNavigateLanding={() => dispatch(setView('landing'))}
      />
    );
  }

  if (view === 'reset-password') {
    return (
      <ResetPasswordPage
        token={resetToken}
        onNavigateSignIn={() => dispatch(setView('signin'))}
        onNavigateForgotPassword={() => dispatch(setView('forgot-password'))}
      />
    );
  }

  if (!user) {
    return (
      <SignInPage
        onNavigateSignUp={() => dispatch(setView('signup'))}
        onNavigateLanding={() => dispatch(setView('landing'))}
      />
    );
  }

  if (isProjectsLoading) {
    return <AppShellSkeleton />;
  }

  const freeRemaining = user.freeProjectsRemaining ?? 2;
  const paidCreds = user.paidCredits ?? 0;

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
        onSelectProject={(id) => dispatch(setCurrentProject(id))}
        onOpenNewProject={() => dispatch(setNewProjectModalOpen(true))}
        onOpenReportModal={() => dispatch(setReportModalOpen(true))}
        onDeleteProject={handleDeleteProject}
        onOpenSettings={currentProjectData ? () => dispatch(setSettingsModalOpen(true)) : undefined}
        activeTab={activeTab}
        setActiveTab={(tab) => dispatch(setActiveTab(tab))}
        onSignOut={handleSignOut}
        onBuyCredits={() => dispatch(setBuyCreditsModalOpen(true))}
        user={user}
        onOpenShortcuts={() => dispatch(setShortcutsModalOpen(true))}
        onNavigateTab={(tab) => dispatch(setActiveTab(tab))}
      />

      {/* Main View Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <Dashboard
            data={currentProjectData}
            onNavigateTab={(tab) => dispatch(setActiveTab(tab))}
            freeProjectsRemaining={freeRemaining}
            paidCredits={paidCreds}
            onBuyCredits={() => dispatch(setBuyCreditsModalOpen(true))}
          />
        )}

        {activeTab === 'rtm' && (
          <TraceabilityMatrix
            analysisResults={currentProjectData?.analysisResults || []}
            onSelectRequirement={(reqId) => {
              const found =
                currentProjectData?.analysisResults.find((r) => r.requirementId === reqId) || null;
              dispatch(setSelectedRequirement(found));
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
          <EmptyProjectPrompt onCreate={() => dispatch(setNewProjectModalOpen(true))} />
        )}

        {activeTab === 'github' && currentProjectData && (
          <GitHubConnector
            githubUrl={currentProjectData.project.githubUrl}
            implementationProfile={currentProjectData.implementationProfile}
            expectedRequirements={currentProjectData.requirements}
            onAnalyzeRepo={handleAnalyzeRepo}
            analysisMode={currentProjectData.project.analysisMode || 'cloud'}
            ollamaModel={currentProjectData.project.privacyConfig?.ollamaModel}
            localAgentUrl={currentProjectData.project.privacyConfig?.localAgentUrl}
          />
        )}

        {activeTab === 'github' && !currentProjectData && (
          <EmptyProjectPrompt onCreate={() => dispatch(setNewProjectModalOpen(true))} />
        )}

        {activeTab === 'copilot' && currentProjectData && (
          <AICopilotChat
            data={currentProjectData}
            onMessagesUpdate={handleChatMessagesUpdate}
            onToggleExternalAI={handleToggleExternalAI}
          />
        )}

        {activeTab === 'copilot' && !currentProjectData && (
          <EmptyProjectPrompt onCreate={() => dispatch(setNewProjectModalOpen(true))} />
        )}

        {activeTab === 'scope' && currentProjectData && (
          <ScopeCreepPanel healthMetrics={currentProjectData.healthMetrics} />
        )}
        {activeTab === 'scope' && !currentProjectData && (
          <EmptyProjectPrompt onCreate={() => dispatch(setNewProjectModalOpen(true))} />
        )}

        {activeTab === 'tests' && (
          <TestCoverageReport analysisResults={currentProjectData?.analysisResults || []} />
        )}

        {activeTab === 'history' && (
          <AnalysisHistory
            analysisHistory={currentProjectData?.analysisHistory || []}
            currentResults={currentProjectData?.analysisResults || []}
          />
        )}
      </main>

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => dispatch(setNewProjectModalOpen(false))}
        onCreateProject={handleCreateProject}
      />

      {/* Report Generator Modal */}
      <ReportGeneratorModal
        isOpen={isReportModalOpen}
        onClose={() => dispatch(setReportModalOpen(false))}
        data={currentProjectData}
      />

      {/* Buy Credits Modal */}
      <BuyCreditsModal
        isOpen={isBuyCreditsModalOpen}
        onClose={() => dispatch(setBuyCreditsModalOpen(false))}
        onSuccess={async () => {
          await refreshCredits();
        }}
      />

      {/* Project Settings Modal */}
      {currentProjectData && isSettingsModalOpen && (
        <ProjectSettingsModal
          project={currentProjectData}
          onClose={() => dispatch(setSettingsModalOpen(false))}
          onSaved={(updated) => dispatch(upsertProject(updated))}
        />
      )}

      {/* Onboarding Tour */}
      <OnboardingTour />

      {/* Command Palette */}
      <CommandPalette
        projects={projectsData}
        currentProjectId={currentProjectId}
        onSelectProject={(id) => dispatch(setCurrentProject(id))}
        onNavigateTab={(tab) => dispatch(setActiveTab(tab))}
        onOpenNewProject={() => dispatch(setNewProjectModalOpen(true))}
        onOpenReport={() => dispatch(setReportModalOpen(true))}
        onBuyCredits={() => dispatch(setBuyCreditsModalOpen(true))}
        onSignOut={handleSignOut}
        onOpenShortcuts={() => dispatch(setShortcutsModalOpen(true))}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => dispatch(setShortcutsModalOpen(false))}
      />

      {/* Requirement Detail Drawer */}
      <RequirementDrawer
        result={selectedRequirement}
        onClose={() => dispatch(setSelectedRequirement(null))}
        onAskCopilot={(query) => {
          copilotPrefilledQuery.current = query;
          dispatch(setActiveTab('copilot'));
          dispatch(setSelectedRequirement(null));
        }}
      />

      {/* Floating Copilot Button */}
      <FloatingCopilot
        activeTab={activeTab}
        onNavigateCopilot={() => dispatch(setActiveTab('copilot'))}
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
