# ProjectLens AI

> **Evidence-first requirement-to-code analysis for software teams.**

[![Live on GitHub](https://img.shields.io/badge/GitHub-Bhavik9696%2FProjectLens.Ai-181717?logo=github)](https://github.com/Bhavik9696/ProjectLens.Ai)
[![Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node.js%20%7C%20MongoDB%20%7C%20Gemini-4B9CD3)](https://github.com/Bhavik9696/ProjectLens.Ai)
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
AI Reasoning                        (Gemini AI, per-requirement isolated context)
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
| **Privacy-First RAG** | Only requirement-specific evidence is sent to AI — never the full repository |
| **Secret Redaction** | API keys, passwords, JWT secrets, database URLs, private keys are redacted before AI processing |
| **AI Copilot** | Ask "which requirements are missing?", "show evidence for REQ-005", "what should I build next?" — all answers cite verified evidence |
| **Project Health Score** | Weighted composite: requirement coverage (40%) + implementation coverage (30%) + sprint progress (20%) + GitHub activity (10%) |
| **Traceability Matrix** | Full RTM view with criteria breakdown, evidence drawer, contradiction warnings |
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

**What is protected:**
- `.env` files, private keys, certificates are never sent to AI
- API keys, passwords, JWT secrets, database URLs are automatically redacted
- `node_modules`, `.git`, `dist`, `build` directories are excluded
- Binary and asset files are excluded
- Only the minimum evidence needed per requirement is transmitted

**What is NOT claimed:**
- We do not claim "100% secure" or "your code never leaves your server" — the system sends redacted, relevant file path evidence to Gemini AI for semantic reasoning.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide icons |
| **Backend** | Node.js, Express.js (ESM) |
| **Database** | MongoDB (Mongoose) |
| **AI / LLM** | Google Gemini (via `@google/genai`) |
| **Payments** | Razorpay |
| **Auth** | JWT + bcrypt |
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

Each requirement is sent to Gemini as an **isolated prompt** with only its own evidence:

```
REQ-001 — User Password Reset
Relevant files: server/routes/auth.js, server/services/authService.js, server/models/User.js
Inferred routes: /api/auth/reset-password, /api/auth/forgot-password
Test files: tests/auth.test.js
Negative evidence: No email service files found
Deterministic criteria check: [token: FOUND, validation: FOUND, email: NOT_FOUND]
```

AI must **only cite files from the provided list** and evaluate each acceptance criterion independently.

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

## Project Structure

```
projectlens.ai(RAG)/
├── client/                         # React + Vite frontend
│   └── src/
│       ├── components/
│       │   ├── LandingPage.tsx     # Landing page with Privacy section
│       │   ├── Dashboard.tsx       # Project dashboard
│       │   ├── CoverageAnalyzer.tsx# Requirement analysis view
│       │   ├── TraceabilityMatrix.tsx # RTM with evidence drawer
│       │   ├── AICopilotChat.tsx   # Copilot chat interface
│       │   ├── GitHubConnector.tsx # GitHub repository connection
│       │   └── DocumentUploader.tsx# SRS upload + requirement extraction
│       ├── contexts/               # Auth, Theme, Toast
│       ├── services/api.ts         # API client
│       └── types.ts                # TypeScript type definitions
│
├── server/                         # Node.js + Express backend
│   ├── server.js                   # Entry point
│   ├── routes/                     # Express route handlers
│   ├── models/
│   │   └── Project.js              # MongoDB schema
│   └── services/
│       ├── engineService.js        # 6-stage evidence-based analysis pipeline
│       ├── codeGraphService.js     # Code graph + per-requirement retrieval
│       ├── documentService.js      # SRS parsing + requirement extraction
│       ├── githubService.js        # GitHub API integration
│       ├── ragService.js           # RAG index + retrieval for Copilot
│       ├── copilotService.js       # Copilot answer generation
│       ├── geminiService.js        # Gemini AI client
│       └── heuristics.js           # Fallback extraction (no AI needed)
│
└── README.md
```

---

## Environment Variables

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

# Server
PORT=5000
NODE_ENV=development
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas (or local)
- Gemini API key (Google AI Studio)
- Razorpay account (optional — for payments)

### Installation

```bash
# Clone the repository
git clone https://github.com/Bhavik9696/ProjectLens.Ai.git
cd ProjectLens.Ai

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Running Locally

```bash
# Terminal 1 — Backend
cd server
node server.js
# → API running on http://localhost:5000

# Terminal 2 — Frontend
cd client
npm run dev
# → UI running on http://localhost:5173
```

---

## How to Use

1. **Sign up** — first 2 projects are free
2. **Create a project** — give it a name, deadline, and tech stack
3. **Upload a requirements document** — SRS, proposal, sprint doc (PDF, DOCX, TXT, MD)
4. **Connect a GitHub repository** — paste the public or private repo URL
5. **Run analysis** — ProjectLens runs the full evidence pipeline
6. **Review results** — see per-requirement status, evidence, criteria, contradictions
7. **Ask the Copilot** — "what's missing?", "generate a sprint plan", "show REQ-003 evidence"
8. **Export** — download a PDF report

---

## Status Values

| Status | Meaning |
|---|---|
| `IMPLEMENTED` | All or most acceptance criteria satisfied with verified evidence |
| `PARTIALLY IMPLEMENTED` | Some criteria met, some missing |
| `MISSING` | Evidence exists for the requirement domain but criteria are not satisfied |
| `UNABLE TO DETERMINE` | Insufficient evidence in the repository to verify this requirement |

---

## Recent Changes

### Evidence-Based Analysis Pipeline (v2)

- **Per-requirement isolation**: Each requirement now gets its own AI prompt with its own retrieved evidence — no more shared context causing the same file (e.g. `Aside.jsx`) to appear for every requirement
- **Tightened retrieval**: Path-segment keyword matching + minimum score threshold 2.0 eliminates false positives
- **Generic layout filter**: `Aside.jsx`, `Header.jsx`, `Footer.jsx`, `Navbar.jsx` are excluded from business logic evidence
- **Criteria-driven coverage**: Coverage is calculated from actual acceptance-criteria results, not arbitrary percentages
- **Evidence-quality confidence**: Confidence formula: file evidence (40%) + route evidence (20%) + test evidence (15%) + criteria satisfaction (20%) − negative evidence penalty
- **Scope creep detection**: Identifies product features in the codebase not mentioned in requirements
- **Improved Copilot RAG**: Status-indexed chunks, intent-based retrieval boosting, REQ-NNN direct lookup

### Landing Page

- Added **Privacy & Security** section between "What It Does" and "The Flow"
- Added subtle privacy trust line in the hero section
- Added "Privacy" link to the navigation bar

---

## License

MIT — see [LICENSE](LICENSE).

---

*Built with ❤️ by [Bhavik](https://github.com/Bhavik9696)*
