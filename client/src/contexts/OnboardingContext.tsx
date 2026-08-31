import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'pl_onboarding_done';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  tab?: string;
  emoji: string;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    emoji: '👋',
    title: 'Welcome to ProjectLens AI',
    description:
      'ProjectLens AI analyzes your software specifications against your codebase — giving you deterministic traceability, coverage scores, and AI-powered insights. Let\'s walk you through how it works.',
  },
  {
    id: 'create-project',
    emoji: '🗂️',
    title: 'Step 1 — Create a Project',
    description:
      'Click "New Project" in the top navbar to create your first software project. Give it a name, description, tech stack, and optionally your GitHub repository URL. Each project uses one credit.',
    tab: 'dashboard',
  },
  {
    id: 'upload-docs',
    emoji: '📄',
    title: 'Step 2 — Upload Documents',
    description:
      'Go to the Documents tab and upload your SRS, Proposals, or Sprint Reports (PDF, DOCX, TXT, or MD). ProjectLens will automatically extract and classify software requirements from them.',
    tab: 'documents',
  },
  {
    id: 'connect-github',
    emoji: '🔗',
    title: 'Step 3 — Connect GitHub',
    description:
      'Go to the GitHub tab and enter your repository URL. ProjectLens will analyze your codebase — scanning files, commits, PRs, and issues — to map them against your requirements.',
    tab: 'github',
  },
  {
    id: 'rtm-coverage',
    emoji: '📊',
    title: 'Step 4 — Review Coverage & RTM',
    description:
      'The RTM tab shows a full Requirement Traceability Matrix. The Coverage tab shows per-requirement implementation scores. Click any row to see detailed evidence (files, commits, PRs).',
    tab: 'rtm',
  },
  {
    id: 'copilot',
    emoji: '🤖',
    title: 'Step 5 — Ask the AI Copilot',
    description:
      'The AI Copilot tab lets you ask natural-language questions about your project: "Which requirements are missing?", "Generate a sprint plan", or "Summarize implementation status." Use the floating bot button on any tab!',
    tab: 'copilot',
  },
];

interface OnboardingContextValue {
  isOpen: boolean;
  isDone: boolean;
  currentStep: number;
  totalSteps: number;
  step: OnboardingStep;
  next: () => void;
  prev: () => void;
  skip: () => void;
  finish: () => void;
  restart: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDone, setIsDone] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [isOpen, setIsOpen] = useState(!isDone);
  const [currentStep, setCurrentStep] = useState(0);

  // Don't show if already done
  useEffect(() => {
    if (!isDone) setIsOpen(true);
  }, [isDone]);

  const finish = useCallback(() => {
    setIsOpen(false);
    setIsDone(true);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch { /* ignore */ }
  }, []);

  const skip = useCallback(() => finish(), [finish]);

  const next = useCallback(() => {
    setCurrentStep((s) => {
      if (s >= ONBOARDING_STEPS.length - 1) {
        finish();
        return s;
      }
      return s + 1;
    });
  }, [finish]);

  const prev = useCallback(() => {
    setCurrentStep((s) => Math.max(0, s - 1));
  }, []);

  const restart = useCallback(() => {
    setCurrentStep(0);
    setIsOpen(true);
    setIsDone(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch { /* ignore */ }
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        isOpen,
        isDone,
        currentStep,
        totalSteps: ONBOARDING_STEPS.length,
        step: ONBOARDING_STEPS[currentStep],
        next,
        prev,
        skip,
        finish,
        restart,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within an OnboardingProvider');
  return ctx;
}
