import {
  ImplementationProfile,
  Project,
  ProjectHealthMetrics,
  ProjectIntelligenceData,
  RequirementAnalysisResult,
  SoftwareRequirement,
} from '../types';

// In dev, VITE_API_URL=http://localhost:5000 (see client/.env).
// In production, set VITE_API_URL=https://projectlens-ai.onrender.com in Vercel env vars.
// IMPORTANT: fallback must be an explicit origin — never empty string — so that
// fetch calls always resolve to the Express backend, not the Vercel CDN.
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const TOKEN_KEY = 'projectlens-token';

function getToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path: string, options?: RequestInit) {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      ...options,
    });
  } catch (networkErr) {
    // Network-level failure (server unreachable, CORS preflight blocked, etc.)
    const err: any = new Error(
      'Unable to reach the ProjectLens server. Check your connection or try again later.'
    );
    err.status = 0;
    err.body = {};
    throw err;
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err: any = new Error(body.error || `Request failed: ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return res.json();
}

/* ------------------------------------------------------------------ */
/* Persistence (MongoDB backed project records)                       */
/* ------------------------------------------------------------------ */

export async function fetchProjectsApi(): Promise<ProjectIntelligenceData[]> {
  return apiFetch('/api/projects');
}

export async function createProjectApi(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProjectIntelligenceData & { credits?: { freeProjectsRemaining: number; paidCredits: number } }> {
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

export async function parseDocumentApi(
  documentName: string,
  documentType: string,
  content: string,
  fileType?: string,
  pdfBase64?: string,
) {
  try {
    const body: Record<string, any> = { documentName, documentType, fileType };

    if (fileType === 'PDF' && pdfBase64) {
      // Send PDF as base64 — never send raw binary as text
      body.pdfBase64 = pdfBase64;
    } else {
      body.content = content;
    }

    return await apiFetch('/api/documents/parse', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch (err: any) {
    console.warn('API document parse fallback:', err);

    // Surface OCR / unreadable errors properly to the UI
    if (err?.body?.error === 'OCR_REQUIRED') {
      throw new Error('OCR_REQUIRED: ' + (err?.body?.message || 'Scanned PDF detected'));
    }
    if (err?.body?.error === 'PDF_UNREADABLE') {
      throw new Error(err?.body?.message || 'Unable to extract readable text from this PDF.');
    }

    // Generic fallback for connection issues
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
    return {
      content:
        "I couldn't reach the ProjectLens server just now, so I have no analysis to show for that question. Check your connection and try again.",
      citations: [],
      ragMeta: { mode: 'local', sentExternally: false, chunksSent: [] },
    };
  }
}

export async function askRequirementApi(question: string, requirementContext: any, projectId?: string) {
  try {
    return await apiFetch('/api/copilot/ask-requirement', {
      method: 'POST',
      body: JSON.stringify({ question, requirementContext, projectId }),
    });
  } catch (err: any) {
    console.error('[askRequirementApi] failed:', err?.message || err, err?.status, err?.body);
    return {
      content: `Error: ${err?.message || 'Could not reach the server'}. Check the browser console for details.`,
      citations: [],
      ragMeta: { mode: 'requirement-scoped-local', sentExternally: false, chunksSent: [] },
    };
  }
}



/* ------------------------------------------------------------------ */
/* Payments & Credits (Razorpay Test Mode)                            */
/* ------------------------------------------------------------------ */

export interface CreditState {
  freeProjectsRemaining: number;
  paidCredits: number;
}

export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  packId: string;
  credits: number;
  label: string;
  simulation?: boolean;
}

export async function fetchCreditsApi(): Promise<CreditState> {
  return apiFetch('/api/payments/credits');
}

export async function createPaymentOrderApi(packId: string): Promise<CreateOrderResponse> {
  return apiFetch('/api/payments/create-order', {
    method: 'POST',
    body: JSON.stringify({ packId }),
  });
}

export async function verifyPaymentApi(params: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  packId: string;
}): Promise<CreditState & { success: boolean; creditsAdded: number }> {
  return apiFetch('/api/payments/verify', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
