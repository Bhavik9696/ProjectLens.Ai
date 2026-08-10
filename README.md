# ProjectLens AI

> **Evidence-First Requirement-to-Code Traceability Engine** — verify whether your software specification documents are actually implemented in a real GitHub repository, powered by a 6-stage multi-method analysis pipeline with optional Gemini AI.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)](https://cloud.mongodb.com/)
[![Gemini](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-orange)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/license-MIT-blue)](#license)

---

## What It Does

ProjectLens AI answers the question every engineering manager asks on Friday: *"Is this feature actually built?"*

Upload an SRS, proposal, or sprint doc → connect a GitHub repository → get a **file-level, evidence-backed answer for every requirement**, a Requirement Traceability Matrix, a project health score, contradiction warnings, and a privacy-first AI Copilot.

Unlike naive "send the spec to AI and ask if it's done" tools, ProjectLens AI runs a **multi-stage, evidence-first pipeline**:

```
SRS Document
    ↓
Structured Requirement Extraction  (actor · action · object)
    ↓
Acceptance Criteria Generation     (4–7 testable criteria per req)
    ↓
GitHub Repository Processing       (file tree · commits · PRs · issues)
    ↓
Code Graph Construction            (routes · controllers · tests · services)
    ↓
Multi-Method Evidence Retrieval    (keyword · semantic · structural · commit)
    ↓
Focused AI Analysis                (only top 20 relevant files sent, never full repo)
    ↓
AI Claim Verification              (hallucinated file names are rejected)
    ↓
Deterministic Contradiction Check  (authorization gaps · missing verifications)
    ↓
Per-Criterion Coverage Scoring
```

Every project, document, requirement, analysis result, and Copilot conversation persists in MongoDB — nothing resets on page refresh.

---

## Tech Stack

```
projectlens.ai/
├── client/     React 19 + Vite + TypeScript + Tailwind CSS
└── server/     Node.js + Express 4 + Mongoose / MongoDB Atlas
```

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS |
| Backend | Node.js, Express 4, Mongoose |
| Database | MongoDB (Atlas or local `mongod`) |
| AI | Google Gemini `gemini-2.5-flash` — optional |
| GitHub | GitHub REST API v3 |
| Payments | Razorpay Test Mode |
| Auth | JWT (`jsonwebtoken`) + bcrypt |
| Email | Nodemailer (Forgot Password flow) |

---

## Features

### 🔍 Evidence-Based Analysis Pipeline (v2)

The core of ProjectLens AI is a **6-stage, evidence-first analysis engine** that does not simply ask an AI "is this implemented?":

| Stage | What Happens |
|---|---|
| **1. Structured Extraction** | Each requirement is parsed into `actor + action + object` (e.g. *user → reset → password*) |
| **2. Acceptance Criteria** | Gemini (or heuristics) generates 4–7 specific, testable criteria per requirement |
| **3. Code Graph** | All repository file paths are classified into routes, controllers, services, models, components, tests, middleware — no raw file content fetched |
| **4. Multi-Method Retrieval** | Keyword matching, structural classification, and commit/PR linking retrieve the top relevant files per requirement |
| **5. Focused AI Analysis** | Only the top 20 relevant files + inferred API routes are sent to Gemini — never the full repository |
| **6. Claim Verification** | Every file name Gemini cites is verified against the actual file tree; hallucinated names are rejected and confidence is reduced |

**Results include:**
- ✅ Per-criterion pass/fail checklist
- 📊 Coverage % based on satisfied acceptance criteria (not just component name matching)
- 🛡️ Contradiction warnings (e.g. admin-delete operation found without authorization middleware)
- ⚠️ Negative evidence (expected patterns that are missing)
- 🧪 Test evidence (whether test files exist for each requirement)
- 🔒 Confidence score (reduced when AI claims can't be verified)

---

### 📄 SRS / Document Parsing

- Paste or upload any specification (`.txt`, `.md`)
- Structured requirements are extracted automatically with Gemini AI, falling back to deterministic heuristics if Gemini is unavailable
- Each extracted requirement includes: `id · title · module · priority · category · actor · action · object · expectedComponents · acceptanceCriteria`

### 🐙 GitHub Code Verification

- Analyzes file tree, commits, pull requests, and open issues
- Builds a lightweight **Code Graph** from file paths alone (no raw content fetched — privacy-safe, no rate limit overhead)
- Maps requirements to real code evidence: matching files, inferred API routes, related commits and PRs

### 📋 Requirement Traceability Matrix (RTM)

- Filterable table mapping each requirement to its implementation status and file-level evidence
- Expandable evidence drawer showing: criteria checklist, detected files, test coverage, contradictions, missing signals, related commits/PRs, and an AI recommendation
- Mobile card view + desktop table+drawer layout
- Export to PDF (jsPDF + jspdf-autotable)

### 📊 Coverage Analyzer

- Per-requirement cards showing acceptance criteria checklist (✓/✗ per criterion)
- Test evidence row (how many test files were found)
- Contradiction badges (severity-coded: LOW / MEDIUM / HIGH / CRITICAL)
- Negative evidence alerts (what should exist but doesn't)
- Mathematical coverage formula display

### 🏥 Project Health Score

Single weighted score blending:
- **40%** — Requirement / acceptance criteria coverage
- **30%** — Implementation coverage (file evidence)
- **20%** — Sprint progress
- **10%** — GitHub activity (commits)

Ratings: `Healthy` · `Medium Risk` · `High Risk`

### 🤖 AI Copilot (Real RAG)

- Server-enforced **off-by-default** consent gate per project — Gemini is never called unless the user explicitly opts in
- **Real retrieval pipeline** — TF-IDF cosine similarity ranks small data chunks against the user's question; only the top ≈8 chunks (capped at a character budget) are sent, never the full project bundle
- **Redaction** — no commit author names/emails, raw commit/PR text, or full file trees ever included in prompts
- **Per-answer transparency** — every response shows exactly what left the server ("Answered locally" vs expandable "View data sent to AI" panel)
- **Audit log** — rolling per-project log of every query, mode, and chunk IDs used (last 50 entries)

### 🔐 Authentication

- Email + password sign-up / sign-in with JWT sessions
- Forgot Password → email reset link (Nodemailer)
- User-scoped projects — users see only their own projects

### 💳 Freemium Credit System

- Every new account gets **2 free projects** — all features included, no credit card required
- Additional projects require **paid project credits** (purchased via Razorpay)
- Free credits are always consumed before paid credits
- No feature restrictions between free and paid projects

### 💰 Payments (Razorpay Test Mode)

| Pack | Projects | Price |
|---|---|---|
| Starter | 5 | ₹129 |
| Best Value | 10 | ₹249 |
| Pro | 25 | ₹549 |
| Enterprise | 50 | ₹999 |

- HMAC-SHA256 signature verification on the server — no client-side trust
- **Simulation mode** — if Razorpay keys are not configured, the system automatically runs in simulation mode (credits added instantly, no real charge)

### 🎨 UX

- Dark / light theme toggle (persists to `localStorage`, applied before React mounts to prevent flash)
- Global project search with keyboard navigation
- Loading skeletons matching the dashboard layout
- Toast notifications for all actions
- One-click PDF export with RTM table, health metrics, and risk sections
- Responsive landing page with hero, features, how-it-works, and pricing sections

---

## Privacy & Security

| Guarantee | How It's Enforced |
|---|---|
| No full repo to AI | Only top 20 relevant file paths per requirement are sent — never raw code content |
| Secret redaction | `.env`, API keys, JWT secrets, `.pem`, `.key`, `credentials` paths are stripped before any AI call |
| AI claim verification | Every file name Gemini cites is checked against the real file tree; phantom files are rejected |
| RAG consent gate | Gemini is never called for the Copilot unless the project owner has explicitly opted in |
| No raw commit data | Author emails, full commit messages, and PR bodies are never included in AI prompts |

---

## Prerequisites

- **Node.js 18+**
- **MongoDB** — free [MongoDB Atlas](https://cloud.mongodb.com/) cluster or local `mongod`
  ```
  docker run -d -p 27017:27017 mongo
  ```
- **Razorpay account** *(optional)* — [Test Mode keys](https://dashboard.razorpay.com/) for real checkout; app works without them in simulation mode
- **Gemini API key** *(optional)* — enables live AI extraction, evidence analysis, and RAG chat; without one the app falls back to deterministic heuristics and an offline Copilot
- **GitHub Personal Access Token** *(optional)* — raises rate limit from 60 → 5,000 req/hr and allows private repo analysis

---

## Setup

### 1. Clone & install

```bash
git clone https://github.com/Bhavik9696/ProjectLens.Ai.git
cd projectlens.ai
npm run install:all
```

### 2. Configure the server

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:

```env
# ── Required ──────────────────────────────────────────────────────────────────
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/<db>
JWT_SECRET=change-me-to-a-long-random-string

# ── AI & GitHub (optional but recommended) ────────────────────────────────────
GEMINI_API_KEY=your-gemini-api-key
GITHUB_TOKEN=your-github-personal-access-token

# ── Email — Forgot Password flow (optional) ───────────────────────────────────
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your-app-password
CLIENT_URL=http://localhost:5173

# ── Razorpay Test Mode (optional — simulation mode if omitted) ────────────────
# Get keys from: https://dashboard.razorpay.com/ → Test Mode → Settings → API Keys
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
```

### 3. Run (development)

```bash
npm run dev
```

This starts:
- **Express API** → `http://localhost:5000`
- **Vite dev server** → `http://localhost:5173` (proxies `/api/*` to Express)

### 4. Run separately (if preferred)

```bash
npm run dev:server   # Express only
npm run dev:client   # Vite only
```

### 5. Production build

```bash
npm run build:client    # Outputs client/dist — deploy to any static host
npm run start:server    # node server/server.js
```

Set `VITE_API_URL` in `client/.env` to the deployed API origin before building if client and server are on different hosts.

---

## Environment Variables

### `server/.env`

| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGODB_URI` | ✅ | — | MongoDB connection string |
| `JWT_SECRET` | ✅ | — | Secret for signing JWTs |
| `PORT` | ❌ | `5000` | API server port |
| `GEMINI_API_KEY` | ❌ | — | Enables live AI extraction, evidence analysis + RAG Copilot |
| `GITHUB_TOKEN` | ❌ | — | Raises GitHub API rate limit; allows private repos |
| `CLIENT_ORIGIN` | ❌ | `http://localhost:5173` | CORS allow-list |
| `CLIENT_URL` | ❌ | `http://localhost:5173` | Base URL for password-reset email links |
| `EMAIL_HOST` | ❌ | — | SMTP host for Nodemailer |
| `EMAIL_PORT` | ❌ | `587` | SMTP port |
| `EMAIL_USER` | ❌ | — | SMTP username |
| `EMAIL_PASS` | ❌ | — | SMTP password / app password |
| `EMAIL_FROM` | ❌ | — | Sender name + address |
| `RAZORPAY_KEY_ID` | ❌ | — | Razorpay Test Mode key ID (`rzp_test_...`) |
| `RAZORPAY_KEY_SECRET` | ❌ | — | Razorpay Test Mode key secret |

### `client/.env` (only needed in production)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | ❌ | `''` (proxy) | Override API origin for production deployments |

---

## API Reference

### Auth (`/api/auth`)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/signup` | Register — returns JWT + user (with credit counters) |
| `POST` | `/api/auth/signin` | Sign in — returns JWT + user |
| `GET` | `/api/auth/me` | Refresh session — returns current user + credits |
| `POST` | `/api/auth/forgot-password` | Send password-reset email |
| `POST` | `/api/auth/reset-password` | Consume reset token, set new password |

### Projects (`/api/projects`) — requires Bearer token

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/projects` | List authenticated user's projects |
| `POST` | `/api/projects` | Create project (deducts free credit first, then paid; returns `402` if none remain) |
| `PUT` | `/api/projects/:id` | Save project snapshot |
| `DELETE` | `/api/projects/:id` | Delete project |

### Payments (`/api/payments`) — requires Bearer token

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/payments/credits` | Get current credit counters |
| `GET` | `/api/payments/mode` | Returns `{ mode: 'live' \| 'simulation' }` |
| `POST` | `/api/payments/create-order` | Create a Razorpay order (or mock in simulation mode) |
| `POST` | `/api/payments/verify` | Verify payment signature + credit the account |

### Analysis

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/documents/parse` | Extract structured requirements (with acceptance criteria) from document text |
| `POST` | `/api/github/analyze` | Analyze GitHub repo — returns file tree, code graph, commits, PRs, issues |
| `POST` | `/api/engine/evaluate` | Run 6-stage evidence pipeline — returns per-criterion results, contradictions, health metrics |
| `POST` | `/api/copilot/chat` | AI Copilot query (RAG pipeline, persists to project) |
| `GET` | `/api/health` | Health check |

---

## Project Structure

```
projectlens.ai/
├── client/
│   └── src/
│       ├── components/
│       │   ├── LandingPage.tsx          # Marketing page + pricing section
│       │   ├── Dashboard.tsx            # Credit banner + project overview
│       │   ├── Navbar.tsx               # Buy Credits button + credit counter
│       │   ├── BuyCreditsModal.tsx      # Razorpay / simulation checkout
│       │   ├── NewProjectModal.tsx
│       │   ├── TraceabilityMatrix.tsx   # RTM with enhanced evidence drawer
│       │   ├── CoverageAnalyzer.tsx     # Per-criterion checklist + contradictions
│       │   ├── DocumentUploader.tsx
│       │   ├── GitHubConnector.tsx
│       │   ├── AICopilotChat.tsx
│       │   └── ReportGeneratorModal.tsx
│       ├── contexts/
│       │   ├── AuthContext.tsx          # JWT session + credit state
│       │   ├── ThemeContext.tsx
│       │   └── ToastContext.tsx
│       └── services/
│           ├── api.ts                   # All API calls (auth header injected)
│           └── authApi.ts               # Auth-specific endpoints
│
└── server/
    ├── models/
    │   ├── User.js                      # freeProjectsRemaining + paidCredits
    │   └── Project.js                   # userId-scoped project bundle
    ├── routes/
    │   ├── auth.js                      # Signup / signin / me / password reset
    │   ├── projects.js                  # Credit-gated CRUD
    │   ├── payments.js                  # Razorpay order + verify + credits
    │   ├── documents.js
    │   ├── github.js
    │   ├── engine.js
    │   └── copilot.js
    ├── middleware/
    │   └── auth.js                      # requireAuth JWT middleware
    └── services/
        ├── geminiService.js             # Gemini API wrapper with retry logic
        ├── ragService.js                # TF-IDF retriever + redaction
        ├── documentService.js           # Structured requirement extraction
        ├── githubService.js             # Repo analysis + code graph integration
        ├── engineService.js             # 6-stage evidence pipeline
        ├── codeGraphService.js          # File-path-based code classification
        ├── heuristics.js                # Deterministic fallbacks + acceptance criteria
        └── emailService.js             # Password reset emails
```

---

## Credit & Billing Logic

```
New user signs up
  └── freeProjectsRemaining = 2, paidCredits = 0

POST /api/projects
  ├── freeProjectsRemaining > 0  →  deduct free credit (free always first)
  ├── paidCredits > 0            →  deduct paid credit
  └── both = 0                  →  402 Payment Required

Purchase (Razorpay / Simulation)
  └── POST /api/payments/verify  →  $inc paidCredits by pack amount
```

**Rules:**
- Free projects are never reset or removed when paid credits are purchased
- Paid credits are never used until all free projects are exhausted
- Users can purchase credits at any time, including before using their free projects
- There are **no feature restrictions** between free and paid projects — all features are always available

---

## Payment Testing (Razorpay Test Mode)

Set real test keys in `server/.env`:
```env
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
```

Use these test card details in the Razorpay popup:
- **Card:** `4111 1111 1111 1111`
- **Expiry:** Any future date (e.g. `12/26`)
- **CVV:** Any 3 digits
- **OTP:** `1234`

**No keys set?** The server auto-detects this and runs in **Simulation Mode** — clicking "Simulate Payment" adds credits instantly with no real API call.

---

## How Analysis Works (Detailed)

### Step 1 — Document Parsing

When you upload or paste a document, `documentService.js` sends it to Gemini with a structured prompt requesting:
- Requirement `id`, `title`, `module`, `priority`, `category`
- `actor` (who), `action` (what), `object` (on what)
- `expectedComponents` (sub-feature names expected in code)
- `acceptanceCriteria` — 4 to 7 specific, testable criteria

If Gemini is unavailable, `heuristics.js` extracts requirements deterministically using regex patterns, keyword analysis, and section headers.

### Step 2 — GitHub Analysis

`githubService.js` fetches from the GitHub REST API:
- File tree (all paths, recursively)
- Last 30 commits with messages and changed files
- Open + merged pull requests
- Open issues

`codeGraphService.js` then classifies every file path into structured buckets (routes, controllers, services, models, components, pages, hooks, middleware, tests) and infers API routes from route file paths — without fetching any file content.

### Step 3 — Evidence Retrieval

For each requirement, `engineService.js` runs multi-method retrieval:
1. **Keyword matching** — extracts significant nouns/verbs from requirement title + description
2. **Structural matching** — matches against code graph buckets (e.g. auth requirement → auth files)
3. **Commit/PR linking** — matches keywords against commit messages and PR titles
4. **Negative evidence** — identifies what should exist but doesn't (e.g. payment without webhook)

### Step 4 — Focused AI Analysis (if Gemini configured)

A single prompt is built containing:
- Code graph summary (file counts by type)
- The focused evidence bundle per requirement (top 20 relevant file paths, inferred routes, test files, negative evidence)
- All acceptance criteria to evaluate

Gemini is instructed to:
- Only cite files from the provided evidence list
- Evaluate each acceptance criterion independently
- Return structured JSON (status, coverage%, confidence, criteria results, contradictions)

### Step 5 — Claim Verification

Every file name Gemini returns in `detectedFiles` is verified against the actual file tree. Files that don't exist are removed. If more than 30% of claimed files don't exist, the coverage percentage is reduced proportionally and confidence drops.

### Step 6 — Scoring

- **Coverage %** = satisfied criteria ÷ total criteria × 100
- **Confidence** = blend of evidence quality, criteria score, and route evidence
- **Health score** = weighted blend of requirement coverage (40%), implementation coverage (30%), sprint progress (20%), GitHub activity (10%)

---

## Known Limitations

- **PDF/DOCX upload** — files are read as raw text client-side (`FileReader.readAsText`); binary PDF/DOCX aren't properly decoded. Use `.txt` / `.md` files or paste the extracted text directly.
- **GitHub rate limits** — public API is capped at 60 req/hr without a token; set `GITHUB_TOKEN` to raise this to 5,000 req/hr
- **Razorpay is India-only** — the payment gateway only accepts INR and Indian payment methods in Test Mode
- **Private repositories** — require a GitHub Personal Access Token with `repo` scope

---

## Bugs Fixed

1. **Non-existent Gemini model** — `gemini-3.6-flash` doesn't exist; updated to valid model IDs with retry chain
2. **RTM status filter broken** — dropdown used `Completed`/`Partial` but engine emits `Implemented`/`Partially Implemented`/`Missing`; filter options corrected
3. **Report generator mislabeled implemented features as risks** — fixed to use correct status values
4. **Hardcoded dashboard insight** — always showed "Authentication and Shopping Cart are 100% verified" regardless of actual data; now derived from real analysis results
5. **Couldn't delete the last document** — delete button hidden when `documents.length === 1`; fixed
6. **Crash with zero projects** — `currentProjectData.field` dereferenced without null check; guarded throughout
7. **No persistence** — all state was in-memory and reset on refresh; full MongoDB persistence added
8. **Fabricated Copilot fallback answer** — hardcoded made-up analysis returned on API error; replaced with honest error message
9. **No real RAG** — entire project bundle sent to Gemini on every message; replaced with TF-IDF retriever, chunk budget, redaction, and per-project consent gate
10. **0% coverage on fully-implemented repos** — old engine sent entire repo to AI asking "is this done?"; replaced with 6-stage evidence-first pipeline that correctly scores against acceptance criteria

---

## License

MIT
