# ProjectLens AI

> **Evidence-first requirement-to-code analysis for software teams.**

[![Live on GitHub](https://img.shields.io/badge/GitHub-Bhavik9696%2FProjectLens.Ai-181717?logo=github)](https://github.com/Bhavik9696/ProjectLens.Ai)
[![Stack](https://img.shields.io/badge/Stack-React%20%7C%20Redux%20%7C%20Node.js%20%7C%20MongoDB%20%7C%20Gemini%20%7C%20Ollama-4B9CD3)](https://github.com/Bhavik9696/ProjectLens.Ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## What Is ProjectLens AI?

ProjectLens AI compares your **requirement documents** (SRS, proposals, sprint docs) against a **real GitHub repository** and tells you — with file-level evidence — exactly what is implemented, what is partial, and what was never built.

It does **not** simply ask an AI "does this repo implement requirement X?".

Instead it runs a multi-stage, evidence-first pipeline:

```
Requirement Document
        ↓
Structured Requirement Extraction   (actor / action / object / acceptance criteria)
        ↓
GitHub Repository Processing        (file tree, commits, PRs, issues)
        ↓
Code Structure Analysis             (code graph: routes, controllers, services, models)
        ↓
Requirement-Specific Retrieval      (per-requirement keyword + semantic search)
        ↓
Secret Detection & Redaction        (API keys, .env files, credentials removed)
        ↓
AI Reasoning                        (Gemini AI or local Ollama — per-requirement isolated context)
        ↓
Evidence Verification               (AI-cited files cross-checked against file tree)
        ↓
Final Requirement Status            (IMPLEMENTED / PARTIAL / MISSING / NOT_VERIFIABLE)
        ↓
Confidence + Evidence + Missing Items + Contradictions
```

---

## Key Features

| Feature | Description |
|---|---|
| **Structured Requirement Extraction** | Parses SRS documents into structured requirements with actor, action, object, priority, and 4–7 testable acceptance criteria |
| **Per-Requirement Isolated Analysis** | Each requirement gets its own retrieval context — different requirements find different evidence |
| **Code Graph** | Classifies every repository file into routes, controllers, services, models, pages, components, tests, middleware — without fetching raw source content |
| **Multi-Method Retrieval** | Combines keyword search, semantic scoring, domain-specific boosts, layer alignment (backend vs frontend), and minimum-score threshold to prevent false matches |
| **Acceptance-Criteria Level Analysis** | Every acceptance criterion is evaluated individually — overall status is derived from actual criteria coverage, not a fixed percentage |
| **Evidence Verification** | Every file the AI cites is cross-checked against the actual repository file tree — hallucinated files are rejected and confidence is penalised |
| **Contradiction Detection** | Detects mismatches like "delete endpoint exists but no auth middleware found" |
| **Scope Creep Detection** | Identifies significant features in the codebase not mentioned in the requirements |
| **Negative Evidence** | Reports what *should* exist but is missing — e.g., "password reset requires email delivery but no email service files found" |
| **Test Evidence** | Reports whether test files exist per requirement |
| **Privacy Mode (Local Agent)** | Run analysis entirely on your machine via Ollama — no source code leaves your system |
| **Privacy-First RAG** | Only requirement-specific evidence is sent to AI — never the full repository |
| **Secret Redaction** | API keys, passwords, JWT secrets, database URLs, private keys are redacted before AI processing |
| **AI Copilot** | Ask "which requirements are missing?", "show evidence for REQ-005", "what should I build next?" — all answers cite verified evidence |
| **Project Health Score** | Weighted composite: requirement coverage (40%) + implementation coverage (30%) + sprint progress (20%) + GitHub activity (10%) |
| **Traceability Matrix** | Full RTM view with criteria breakdown, evidence drawer, contradiction warnings |
| **Scheduled Auto-Analysis** | Configure daily or weekly automatic analysis runs with Slack notification on completion |
| **Slack Integration** | Rich Block Kit notifications with delta scores, regression alerts, and high-priority gap summaries |
| **Email Notifications** | Password reset, welcome, and analysis notification emails via Nodemailer |
| **PDF Export** | One-click PDF report generation with jsPDF + AutoTable |
| **REST API v1** | Programmatic access for CI/CD pipelines, supporting both JWT and `pl_live_` API key authentication |
| **Command Palette** | `⌘K` / `Ctrl+K` keyboard-driven navigation across all app views |
| **Credit-Based Pricing** | Razorpay-powered, per-project credits — no subscription |

---

## Privacy & Security

ProjectLens AI follows a **minimum-data approach**:

```
Your Repository
        ↓
Local Processing          (file tree classification, code graph — no content fetched)
        ↓
Secret Detection          (.env, API keys, tokens, credentials identified)
        ↓
Relevant Evidence Retrieval (only the top-N files per requirement)
        ↓
Sensitive Data Redaction  (keys, passwords, secrets → [REDACTED])
        ↓
AI Analysis               (only verified, redacted evidence sent to Gemini)
```

### Privacy Mode (Full Local)

With **Privacy Mode** enabled, the entire analysis runs through the **Local Agent** on your machine using **Ollama**. Zero source code is sent to external APIs.

```
Your Repository
        ↓
Local Agent (http://127.0.0.1:3847)
        ↓
Ollama (llama3.1:8b or any local model)
        ↓
Analysis Results → ProjectLens Backend → Dashboard
```

**What is protected (both modes):**
- `.env` files, private keys, certificates are never sent to AI
- API keys, passwords, JWT secrets, database URLs are automatically redacted
- `node_modules`, `.git`, `dist`, `build` directories are excluded
- Binary and asset files are excluded
- Only the minimum evidence needed per requirement is transmitted

**What is NOT claimed:**
- We do not claim "100% secure" or "your code never leaves your server" — the standard mode sends redacted, relevant file path evidence to Gemini AI for semantic reasoning.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite 6, Tailwind CSS v4, Lucide icons |
| **Animations** | Lenis (smooth scroll), Spline (3D), micro-animation CSS |
| **Charts** | Recharts |
| **State Management** | Redux Toolkit (RTK) + RTK Query |
| **Backend** | Node.js 18+, Express.js 4 (ESM) |
| **Database** | MongoDB (Mongoose 8) |
| **AI / LLM (Cloud)** | Google Gemini (`@google/genai` v2) |
| **AI / LLM (Local)** | Ollama (llama3.1:8b or any compatible model) |
| **PDF Generation** | jsPDF + jspdf-autotable |
| **Payments** | Razorpay |
| **Auth** | JWT + bcryptjs |
| **Email** | Nodemailer |
| **Scheduling** | node-cron |
| **Notifications** | Slack Incoming Webhooks (Block Kit) |
| **GitHub** | GitHub REST API (file tree, commits, PRs, issues) |

---

## Analysis Pipeline — Technical Detail

### 1. Structured Requirement Extraction

When a document is uploaded, Gemini AI (with heuristic fallback) extracts:

```json
{
  "id": "REQ-001",
  "title": "User Password Reset",
  "module": "Authentication",
  "priority": "High",
  "actor": "registered user",
  "action": "reset password",
  "object": "password",
  "acceptanceCriteria": [
    "User can request password reset by entering their email",
    "System generates a secure unique reset token",
    "Reset email is delivered within 5 minutes",
    "Reset link expires after 24 hours",
    "User can set a new password using the reset link",
    "Old password is immediately invalidated after reset"
  ]
}
```

### 2. Code Graph Construction

The `codeGraphService` classifies every repository file **from its path only** — no content is fetched. Files are classified as: `route`, `controller`, `service`, `model`, `page`, `component`, `test`, `middleware`, `hook`, `util`, `state`, `config`, `asset`.

```json
{
  "routes": ["server/routes/auth.js"],
  "controllers": ["server/controllers/authController.js"],
  "services": ["server/services/authService.js"],
  "models": ["server/models/User.js"],
  "pages": ["client/src/pages/Login.tsx"],
  "tests": ["tests/auth.test.js"],
  "summary": { "totalFiles": 87, "routeFiles": 6, "testFiles": 12 }
}
```

### 3. Per-Requirement Retrieval

For each requirement, `retrieveRelevantFiles` runs independently:
- Extracts domain-specific keywords (stop words do NOT remove domain terms like `service`, `controller`, `auth`)
- Scores files using **path-segment matching** (not substring matching) — avoids false positives like `Aside.jsx` appearing for auth requirements
- Applies a **minimum score threshold of 2.0** — files with weak matches are excluded entirely
- Applies domain boosts: auth requirements boost auth files; payment requirements boost payment files

### 4. AI Analysis (Per-Requirement)

Each requirement is sent to the AI provider as an **isolated prompt** with only its own evidence:

```
REQ-001 — User Password Reset
Relevant files: server/routes/auth.js, server/services/authService.js, server/models/User.js
Inferred routes: /api/auth/reset-password, /api/auth/forgot-password
Test files: tests/auth.test.js
Negative evidence: No email service files found
Deterministic criteria check: [token: FOUND, validation: FOUND, email: NOT_FOUND]
```

AI must **only cite files from the provided list** and evaluate each acceptance criterion independently.

The AI provider is determined by the project's `analysisMode`:
- `'cloud'` → **Gemini AI** (`aiProviderService.GeminiProvider`)
- `'privacy'` → **Local Ollama** via the Local Agent (`aiProviderService.LocalOllamaProvider`)

### 5. Evidence Verification

Every file cited by the AI is cross-checked against the actual repository file tree. Hallucinated files are removed. Confidence is penalised if the AI cites files that don't exist.

### 6. Final Status

Status is derived from actual acceptance-criteria coverage:

| Coverage | Status |
|---|---|
| 100% criteria met | `IMPLEMENTED` |
| 1–99% criteria met | `PARTIALLY IMPLEMENTED` |
| 0% criteria met, some evidence | `MISSING` |
| 0% evidence, cannot verify | `UNABLE TO DETERMINE` |

---

## AI Copilot

The Copilot uses retrieval-augmented generation (RAG) to answer questions about the project:

| Query | What the Copilot does |
|---|---|
| "Which requirements are missing?" | Returns only requirements with verified `MISSING` status |
| "Which requirements are incomplete?" | Returns only `PARTIAL` requirements |
| "Show evidence for REQ-005" | Retrieves the specific evidence chunk for REQ-005 |
| "What is the highest-risk module?" | Uses health metrics and risk factors |
| "Generate a sprint action plan" | Uses unmet criteria from all partial/missing requirements |

The RAG index is built from:
- Per-requirement chunks (status, coverage, criteria, evidence files, test evidence, contradictions)
- Status-indexed lists (all missing, all partial, all implemented)
- Scope creep chunk
- Risk factors chunk
- Module activity chunks

No raw source code or commit messages with author identities are included in the RAG index.

---

## Local Agent (Privacy Mode)

The `local-agent/` directory is a standalone Express server that runs entirely on your machine and proxies analysis requests to a local **Ollama** instance.

### How It Works

```
ProjectLens Backend  →  POST /analyze  →  Local Agent (port 3847)
                                                  ↓
                                        Ollama (port 11434)
                                                  ↓
                              Analysis Results ← ← ← ← ← ← ←
```

### Local Agent Routes

| Route | Method | Description |
|---|---|---|
| `/` | GET | Health ping — returns name, version, status |
| `/health` | GET | Checks agent + Ollama connectivity |
| `/models` | GET | Lists available Ollama models |
| `/analyze` | POST | Runs full requirement analysis via Ollama |
| `/retrieve` | POST | Fetches relevant file evidence for a requirement |

### Security

- Binds to `127.0.0.1` only — never exposed to the internet
- Shared-secret auth: every request (except `/health`) must include `x-agent-secret` header
- Accepts connections from localhost origins and configured ngrok/localtunnel/Cloudflare URLs

---

## REST API v1

The public REST API (`/api/v1/*`) is designed for CI/CD integration and automation.

**Authentication:** Bearer JWT token or `pl_live_` API key in the `Authorization` header.

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/projects` | GET | List all projects (lightweight — no analysis data) |
| `/api/v1/projects/:id` | GET | Full project with analysis results, health metrics, history |
| `/api/v1/projects/:id/health` | GET | Health metrics only — ideal for CI/CD status gates |
| `/api/v1/projects/:id/requirements` | GET | All requirements merged with their analysis status |
| `/api/v1/projects/:id/history` | GET | Analysis run history (timestamps + scores) |

All responses include the `X-ProjectLens-API-Version: v1` header.

---

## Scheduled Auto-Analysis

Projects can opt in to **automatic scheduled analysis** via Project Settings.

- **Frequency:** Daily (default) or weekly
- **Schedule:** Controlled by `SCHEDULE_CRON` env var (default: `0 0 * * *` — midnight UTC)
- **On completion:** Results are persisted to MongoDB, history is appended (last 20 runs kept), and a Slack notification is fired (if configured)
- **Regression detection:** Slack message flags a regression when the health score drops since the last run

---

## Slack Integration

Configure a **Slack Incoming Webhook** URL in Project Settings to receive rich notifications.

Notification includes:
- Overall health score + delta vs last run (e.g. `+4.2% ↑` or `-1.5% ↓`)
- Health rating (Healthy / Medium Risk / High Risk)
- Requirement coverage %
- Breakdown: ✅ implemented · ⚡ partial · ❌ missing
- Top 3 high-priority gaps
- High-severity scope creep warning
- Regression alert block (scheduled runs only)

Use the **"Test Webhook"** button in Project Settings to validate the integration before relying on it.

---

## Project Structure

```
projectlens.ai(RAG)/
├── client/                             # React 19 + Vite 6 frontend
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── App.tsx                     # Root component + view routing
│       ├── main.tsx                    # Redux Provider + React entry
│       ├── types.ts                    # TypeScript type definitions
│       ├── index.css                   # Global styles + Tailwind v4
│       ├── components/                 # 32 UI components
│       │   ├── LandingPage.tsx         # Landing page with Privacy section
│       │   ├── Dashboard.tsx           # Project dashboard
│       │   ├── CoverageAnalyzer.tsx    # Requirement analysis view
│       │   ├── TraceabilityMatrix.tsx  # RTM with evidence drawer
│       │   ├── AICopilotChat.tsx       # Copilot chat interface
│       │   ├── GitHubConnector.tsx     # GitHub repository connection
│       │   ├── DocumentUploader.tsx    # SRS upload + requirement extraction
│       │   ├── AnalysisHistory.tsx     # Historical run comparison
│       │   ├── ScopeCreepPanel.tsx     # Scope creep detected items
│       │   ├── RequirementDrawer.tsx   # Slide-out requirement detail
│       │   ├── RequirementAIPanel.tsx  # Per-requirement AI deep dive
│       │   ├── ProjectHealthCard.tsx   # Health score card
│       │   ├── TestCoverageReport.tsx  # Test evidence report
│       │   ├── ProjectSettingsModal.tsx# Full project settings (Slack, schedule, API keys)
│       │   ├── ReportGeneratorModal.tsx# PDF export modal
│       │   ├── PrivacyModeSetup.tsx    # Local agent / Ollama setup wizard
│       │   ├── PrivacyModeIndicator.tsx# Status badge for privacy mode
│       │   ├── CommandPalette.tsx      # ⌘K global command palette
│       │   ├── DocumentPreviewModal.tsx# Uploaded document preview
│       │   ├── BuyCreditsModal.tsx     # Razorpay credits purchase
│       │   ├── NotificationPanel.tsx   # In-app notification list
│       │   ├── OnboardingTour.tsx      # First-use guided tour
│       │   ├── KeyboardShortcutsModal.tsx
│       │   ├── Navbar.tsx
│       │   ├── NewProjectModal.tsx
│       │   ├── ProjectSearch.tsx
│       │   ├── FloatingCopilot.tsx
│       │   ├── SmoothScroll.tsx
│       │   ├── SignInPage.tsx
│       │   ├── SignUpPage.tsx
│       │   ├── ForgotPasswordPage.tsx
│       │   ├── ResetPasswordPage.tsx
│       │   └── ui/                     # Low-level UI primitives
│       ├── store/                      # Redux Toolkit state management
│       │   ├── index.ts                # Root store (RootState, AppDispatch)
│       │   ├── hooks.ts                # Typed useAppDispatch / useAppSelector
│       │   ├── authSlice.ts            # Auth state + async thunks
│       │   ├── notificationsSlice.ts   # In-app notification list
│       │   ├── projectsSlice.ts        # Project list + current project
│       │   ├── uiSlice.ts              # View routing, tabs, modal flags
│       │   ├── themeSlice.ts           # Dark / light theme with localStorage sync
│       │   └── projectsApi.ts          # RTK Query — project CRUD with caching
│       ├── contexts/                   # Thin Redux shims (useAuth, useTheme, useNotifications)
│       │   │                           # + standalone: ToastContext, CommandPaletteContext
│       ├── hooks/                      # Custom React hooks
│       └── services/api.ts             # API client (analysis, copilot, payments)
│
├── server/                             # Node.js + Express 4 backend (ESM)
│   ├── server.js                       # Entry point + scheduler init
│   ├── config/
│   │   └── db.js                       # MongoDB connection
│   ├── middleware/
│   │   └── auth.js                     # JWT + API key auth middleware
│   ├── models/
│   │   ├── Project.js                  # Main MongoDB schema (requirements, results, history)
│   │   ├── User.js                     # User schema (credits, plan)
│   │   ├── ApiKey.js                   # pl_live_ API key schema
│   │   └── PasswordResetToken.js       # Password reset token schema
│   ├── routes/
│   │   ├── auth.js                     # Register, login, password reset
│   │   ├── projects.js                 # Project CRUD
│   │   ├── engine.js                   # Trigger analysis
│   │   ├── github.js                   # GitHub proxy
│   │   ├── documents.js                # Document upload + extraction
│   │   ├── copilot.js                  # AI Copilot Q&A
│   │   ├── payments.js                 # Razorpay order + webhook
│   │   ├── apiKeys.js                  # API key management
│   │   ├── privacy.js                  # Local agent proxy routes
│   │   └── v1.js                       # Public REST API v1 (CI/CD)
│   └── services/
│       ├── engineService.js            # 6-stage evidence-based analysis pipeline
│       ├── codeGraphService.js         # Code graph + per-requirement retrieval
│       ├── documentService.js          # SRS parsing + requirement extraction
│       ├── githubService.js            # GitHub API integration
│       ├── ragService.js               # RAG index + retrieval for Copilot
│       ├── copilotService.js           # Copilot answer generation
│       ├── aiProviderService.js        # Gemini / Ollama provider abstraction
│       ├── geminiService.js            # Gemini AI client (with retry)
│       ├── heuristics.js               # Fallback extraction (no AI needed)
│       ├── email.js                    # Nodemailer email sender
│       ├── pdfService.js               # PDF report generation
│       ├── schedulerService.js         # node-cron auto-analysis scheduler
│       └── slackService.js             # Slack Block Kit notification sender
│
├── local-agent/                        # Standalone privacy-mode agent (Ollama)
│   ├── index.js                        # Express server (binds to 127.0.0.1:3847)
│   ├── routes/
│   │   ├── health.js                   # GET /health — agent + Ollama status
│   │   ├── models.js                   # GET /models — list Ollama models
│   │   ├── analyze.js                  # POST /analyze — full analysis via Ollama
│   │   └── retrieve.js                 # POST /retrieve — evidence retrieval
│   └── services/
│       ├── localEngineService.js       # Local analysis pipeline (mirrors engineService)
│       ├── localRag.js                 # Local RAG index for Copilot
│       ├── ollamaService.js            # Ollama API client
│       └── secretRedaction.js          # Secret redaction (same rules as cloud)
│
├── package.json                        # Root — concurrently dev scripts
├── .gitignore
└── README.md
```

---

## Environment Variables

### Server (`server/.env`)

```env
# MongoDB
MONGODB_URI=mongodb+srv://...

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# JWT
JWT_SECRET=your_jwt_secret

# Razorpay (payments)
RAZORPAY_KEY_ID=rzp_...
RAZORPAY_KEY_SECRET=your_secret

# Nodemailer (email)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=ProjectLens AI <no-reply@projectlens.ai>

# Scheduled auto-analysis (optional — default: daily at midnight UTC)
SCHEDULE_CRON=0 0 * * *

# Local Agent (optional — default shown)
LOCAL_AGENT_URL=http://127.0.0.1:3847

# Server
PORT=5000
NODE_ENV=development
```

### Client (`client/.env`)

```env
VITE_API_URL=http://localhost:5000
VITE_RAZORPAY_KEY_ID=rzp_...
```

### Local Agent (`local-agent/.env`)

```env
LOCAL_AGENT_PORT=3847
LOCAL_AGENT_SECRET=projectlens-local-secret
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=llama3.1:8b

# Optional: additional CORS origins (comma-separated)
CORS_ORIGINS=https://your-tunnel.ngrok-free.app
```

---

## Getting Started

### Prerequisites

- **Node.js 18+**
- **MongoDB Atlas** (or local MongoDB)
- **Gemini API key** (Google AI Studio) — for cloud mode
- **Ollama** — for privacy/local mode (optional)
- **Razorpay account** — for payments (optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/Bhavik9696/ProjectLens.Ai.git
cd ProjectLens.Ai

# Install all dependencies at once (from root)
npm run install:all

# Or install individually:
cd server && npm install
cd ../client && npm install
cd ../local-agent && npm install  # only needed for privacy mode
```

### Running Locally

```bash
# Option A — run both server and client from the root (recommended)
npm run dev

# Option B — run separately
# Terminal 1 — Backend
cd server
npm run dev            # nodemon hot-reload → http://localhost:5000

# Terminal 2 — Frontend
cd client
npm run dev            # Vite → http://localhost:5173

# Terminal 3 — Local Agent (only if using Privacy Mode)
cd local-agent
npm run dev            # → http://127.0.0.1:3847
```

### Production Start

```bash
# Build frontend
npm run build:client

# Start backend
npm run start:server
```

---

## How to Use

1. **Sign up** — first 2 projects are free
2. **Create a project** — give it a name, deadline, and tech stack
3. **Upload a requirements document** — SRS, proposal, sprint doc (PDF, DOCX, TXT, MD)
4. **Connect a GitHub repository** — paste the public or private repo URL
5. **Choose analysis mode** — Cloud (Gemini) or Privacy (local Ollama)
6. **Run analysis** — ProjectLens runs the full evidence pipeline
7. **Review results** — see per-requirement status, evidence, criteria, contradictions
8. **Ask the Copilot** — "what's missing?", "generate a sprint plan", "show REQ-003 evidence"
9. **Export** — download a PDF report or access results via the REST API v1
10. **Set up auto-analysis** — configure daily/weekly runs with Slack notifications in Project Settings

---

## Status Values

| Status | Meaning |
|---|---|
| `IMPLEMENTED` | All or most acceptance criteria satisfied with verified evidence |
| `PARTIALLY IMPLEMENTED` | Some criteria met, some missing |
| `MISSING` | Evidence exists for the requirement domain but criteria are not satisfied |
| `UNABLE TO DETERMINE` | Insufficient evidence in the repository to verify this requirement |

---

## Changelog

### v4 — Local Agent, REST API, Scheduler & Slack

- **Local Agent** (`local-agent/`) — standalone Express + Ollama server for fully private, on-machine analysis
- **AI Provider abstraction** (`aiProviderService.js`) — `GeminiProvider` / `LocalOllamaProvider` selected by `analysisMode` field; `engineService` is provider-agnostic
- **Privacy Mode UI** — `PrivacyModeSetup.tsx` and `PrivacyModeIndicator.tsx` guide users through Ollama setup and show live agent status
- **REST API v1** (`/api/v1/*`) — JWT + API key auth, 5 endpoints for CI/CD integration
- **API Key management** — generate, list, revoke `pl_live_` API keys in Project Settings
- **Scheduled Auto-Analysis** (`schedulerService.js`) — node-cron, configurable cron expression, up to 20 history snapshots per project
- **Slack Integration** (`slackService.js`) — Block Kit rich messages, delta scoring, regression detection, scope creep warning, test webhook button
- **Email service** (`email.js`) — Nodemailer: welcome email, password reset, notification emails
- **Password Reset flow** — forgot-password → email token → reset page (`PasswordResetToken` model)
- **PDF export** (`pdfService.js`) — jsPDF + AutoTable full project report
- **Privacy routes** (`routes/privacy.js`) — backend proxies Local Agent status and model list to the frontend
- **Command Palette** (`CommandPalette.tsx`) — `⌘K` / `Ctrl+K` keyboard-driven global navigation

---

### v3 — Redux Toolkit Integration

- **Centralized state management** — replaced 6 React Contexts with Redux Toolkit slices: `auth`, `notifications`, `projects`, `ui`, `theme`
- **RTK Query** — project CRUD (fetch / create / save / delete) now uses RTK Query with automatic caching and cache invalidation; no more manual `useEffect` + `setIsLoading` patterns
- **Backward-compatible shim pattern** — `useAuth()`, `useNotifications()`, `useTheme()` hooks preserved with identical public APIs; all 30+ components required zero changes
- **Redux DevTools support** — full action history and time-travel debugging available via the Redux DevTools browser extension
- **Leaner `App.tsx`** — removed 15+ `useState` calls; all UI state (`activeTab`, modal flags, `selectedRequirement`, `view`) dispatched via typed Redux actions

---

### v2 — Evidence-Based Analysis Pipeline

- **Per-requirement isolation**: Each requirement now gets its own AI prompt with its own retrieved evidence — no more shared context causing the same file (e.g. `Aside.jsx`) to appear for every requirement
- **Tightened retrieval**: Path-segment keyword matching + minimum score threshold 2.0 eliminates false positives
- **Generic layout filter**: `Aside.jsx`, `Header.jsx`, `Footer.jsx`, `Navbar.jsx` are excluded from business logic evidence
- **Criteria-driven coverage**: Coverage is calculated from actual acceptance-criteria results, not arbitrary percentages
- **Evidence-quality confidence**: Confidence formula: file evidence (40%) + route evidence (20%) + test evidence (15%) + criteria satisfaction (20%) − negative evidence penalty
- **Scope creep detection**: Identifies product features in the codebase not mentioned in requirements
- **Improved Copilot RAG**: Status-indexed chunks, intent-based retrieval boosting, REQ-NNN direct lookup
- **Landing Page**: Added Privacy & Security section, privacy trust line in hero, "Privacy" nav link

---

## License

MIT — see [LICENSE](LICENSE).

---

*Built with ❤️ by [Bhavik](https://github.com/Bhavik9696)*
