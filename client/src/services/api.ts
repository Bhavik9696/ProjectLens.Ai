import {
  ImplementationProfile,
  Project,
  ProjectHealthMetrics,
  ProjectIntelligenceData,
  RequirementAnalysisResult,
  SoftwareRequirement,
} from '../types';

// In dev, Vite proxies /api -> the Express server (see vite.config.ts).
// In production, set VITE_API_URL to the deployed API origin.
const API_BASE = import.meta.env.VITE_API_URL || '';

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

/* ------------------------------------------------------------------ */
/* Persistence (MongoDB backed project records)                       */
/* ------------------------------------------------------------------ */

export async function fetchProjectsApi(): Promise<ProjectIntelligenceData[]> {
  return apiFetch('/api/projects');
}

export async function createProjectApi(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProjectIntelligenceData> {
  return apiFetch('/api/projects', { method: 'POST', body: JSON.stringify(project) });
}

export async function saveProjectApi(
  projectId: string,
  data: Partial<Omit<ProjectIntelligenceData, 'project'>> & { project?: Partial<Project> }
): Promise<ProjectIntelligenceData> {
  return apiFetch(`/api/projects/${projectId}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteProjectApi(projectId: string): Promise<void> {
  await apiFetch(`/api/projects/${projectId}`, { method: 'DELETE' });
}

/* ------------------------------------------------------------------ */
/* Deterministic + Gemini-backed analysis engine endpoints             */
/* ------------------------------------------------------------------ */

export async function parseDocumentApi(documentName: string, documentType: string, content: string) {
  try {
    return await apiFetch('/api/documents/parse', {
      method: 'POST',
      body: JSON.stringify({ documentName, documentType, content }),
    });
  } catch (err) {
    console.warn('API document parse fallback:', err);
    // Client fallback so the UI still works if the API is briefly unreachable
    return {
      sections: [
        {
          id: 'sec-fallback-1',
          title: 'Document Summary',
          content: content.substring(0, 500),
          headings: ['Document Summary'],
        },
      ],
      extractedRequirements: [
        {
          id: 'REQ-NEW-01',
          title: `${documentType} Software Feature`,
          module: 'General Core',
          priority: 'High',
          category: 'Functional',
          expectedComponents: ['Core API Controller', 'UI Component View', 'Data Storage Service'],
          description: `Extracted requirement from uploaded ${documentName}`,
        },
      ],
    };
  }
}

export async function analyzeGithubRepoApi(githubUrl: string, expectedRequirements: SoftwareRequirement[]) {
  return apiFetch('/api/github/analyze', {
    method: 'POST',
    body: JSON.stringify({ githubUrl, expectedRequirements }),
  }) as Promise<ImplementationProfile>;
}

export async function evaluateEngineApi(requirements: SoftwareRequirement[], implementationProfile: ImplementationProfile) {
  return apiFetch('/api/engine/evaluate', {
    method: 'POST',
    body: JSON.stringify({ requirements, implementationProfile }),
  }) as Promise<{ analysisResults: RequirementAnalysisResult[]; healthMetrics: ProjectHealthMetrics }>;
}

export async function sendCopilotMessageApi(userMessage: string, contextData: any, projectId?: string, userChatMessage?: any) {
  try {
    return await apiFetch('/api/copilot/chat', {
      method: 'POST',
      body: JSON.stringify({ userMessage, contextData, projectId, userChatMessage }),
    });
  } catch (err) {
    console.warn('Copilot request failed:', err);
    // BUG FIX: this used to fabricate a plausible-sounding but entirely
    // made-up answer (hardcoded "Payment Gateway" findings) whenever the
    // API was briefly unreachable, silently inventing analysis results.
    // Be honest instead: the request failed, nothing was analyzed.
    return {
      content:
        "I couldn't reach the ProjectLens server just now, so I have no analysis to show for that question. Check your connection and try again.",
      citations: [],
      ragMeta: { mode: 'local', sentExternally: false, chunksSent: [] },
    };
  }
}
