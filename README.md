# ProjectLens AI

> **Requirement-to-Code Traceability Engine** — compare software specification documents against a real GitHub repository, powered by deterministic analysis and optional Gemini AI RAG.

---

## What it does

ProjectLens AI answers the question every engineering manager asks on Friday: *"Is this feature actually built?"*

Upload an SRS, proposal, or sprint doc → connect a GitHub repository → get a file-level, evidence-backed answer for every requirement, a Requirement Traceability Matrix, a health score, and a privacy-first AI Copilot.

Every project, document, requirement, GitHub analysis result, and Copilot conversation persists in MongoDB — nothing resets on page refresh.

---

## Tech Stack

```
projectlens.ai/
├── client/     React 19 + Vite + Tailwind CSS
└── server/     Node.js + Express 4 + Mongoose / MongoDB Atlas
```

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS |
| Backend | Node.js, Express 4, Mongoose |
| Database | MongoDB (Atlas or local `mongod`) |
| AI | Google Gemini (`gemini-2.5-flash`) — optional |
| GitHub | GitHub REST API v3 |
| Payments | Razorpay Test Mode |
| Auth | JWT (`jsonwebtoken`) + bcrypt |
| Email | Nodemailer (Forgot Password flow) |

---

## Features

### Core Analysis
- **SRS / Document Parsing** — paste or upload any specification; structured requirements are extracted automatically (Gemini-assisted or deterministic fallback)
- **GitHub Code Verification** — every requirement is checked against real files, routes, commits, PRs, and issues in your repository
- **Requirement Traceability Matrix (RTM)** — filterable table mapping each requirement to its implementation status and file-level evidence
- **Coverage Engine** — deterministic heuristic + optional AI scoring with per-requirement confidence ratings
- **Project Health Score** — single weighted score blending requirement coverage, code coverage, GitHub activity, and sprint progress

### AI Copilot (Real RAG)
- Server-enforced **off-by-default** consent gate per project — Gemini is never called unless the user explicitly opts in
- **Real retrieval pipeline** — TF-IDF cosine similarity ranks small data chunks against the user's question; only the top ≈8 chunks (capped at a character budget) are sent, never the full project bundle
- **Redaction** — no commit author names/emails, raw commit/PR text, or full file trees are ever included in Gemini prompts
- **Per-answer transparency** — every response shows exactly what left the server ("Answered locally" vs expandable "View data sent to AI" panel)
- **Audit log** — rolling per-project log of every query, mode, and chunk IDs used (last 50 entries)

### Authentication
- Email + password sign-up / sign-in with JWT sessions
- Forgot Password → email reset link (Nodemailer)
- User-scoped projects — users see only their own projects

### Freemium Credit System
- Every new account gets **2 free projects** — all features included, no credit card required
- Additional projects require **paid project credits** (purchased via Razorpay)
- Free credits are always consumed before paid credits
- Users can purchase credits at any time, even before using their free projects

### Payments (Razorpay Test Mode)
- 4 credit packs purchasable from within the app and the landing page:

  | Pack | Projects | Price |
  |---|---|---|
  | Starter | 5 | ₹129 |
  | Best Value | 10 | ₹249 |
  | Pro | 25 | ₹549 |
  | Enterprise | 50 | ₹999 |

- HMAC-SHA256 signature verification on the server — no client-side trust
- **Simulation mode** — if Razorpay keys are not configured, the system automatically runs in simulation mode (credits are added instantly, no real charge)

### UX
- Dark / light theme toggle (persists to `localStorage`, applied before React mounts to prevent flash)
- Global project search with keyboard navigation
- Loading skeletons matching the dashboard layout
- Toast notifications for all actions
- One-click PDF export (jsPDF + jspdf-autotable) with RTM table, health metrics, and risk sections
- Responsive landing page with hero, features, how-it-works, and pricing sections

---

## Prerequisites

- **Node.js 18+**
- **MongoDB** — free [MongoDB Atlas](https://cloud.mongodb.com/) cluster or local `mongod` (`docker run -d -p 27017:27017 mongo`)
- **Razorpay account** (optional) — [Test Mode keys](https://dashboard.razorpay.com/) for real checkout popup; the app works without them in simulation mode
- **Gemini API key** (optional) — enables live AI extraction and RAG chat; without one the app falls back to deterministic heuristics and an offline Copilot
- **GitHub Personal Access Token** (optional) — raises rate limit from 60 → 5,000 req/hr and allows private repo analysis

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
# Required
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/<db>
JWT_SECRET=change-me-to-a-long-random-string

# Optional — AI & GitHub
GEMINI_API_KEY=your-gemini-key
GITHUB_TOKEN=your-github-pat

# Optional — Email (Forgot Password)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your-app-password
CLIENT_URL=http://localhost:5173

# Optional — Razorpay Test Mode
# Get keys from: https://dashboard.razorpay.com/ → Test Mode → Settings → API Keys
# Without these keys the app runs in simulation mode automatically.
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
```

### 3. Run (development)

```bash
npm run dev
```

This starts:
- **Express API** → `http://localhost:5000`
- **Vite dev server** → `http://localhost:5173` (proxies `/api/*` to the Express server)

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
| `GEMINI_API_KEY` | ❌ | — | Enables live AI extraction + RAG Copilot |
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
| `POST` | `/api/documents/parse` | Extract sections + requirements from document text |
| `POST` | `/api/github/analyze` | Analyze GitHub repo (file tree, commits, PRs, issues) |
| `POST` | `/api/engine/evaluate` | Run coverage engine + health-score calculator |
| `POST` | `/api/copilot/chat` | AI Copilot query (RAG pipeline, persists to project) |
| `GET` | `/api/health` | Health check |

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

## Project Structure

```
projectlens.ai/
├── client/
│   └── src/
│       ├── components/
│       │   ├── LandingPage.tsx       # Marketing page + pricing section
│       │   ├── Dashboard.tsx         # Credit banner + project overview
│       │   ├── Navbar.tsx            # Buy Credits button + credit counter
│       │   ├── BuyCreditsModal.tsx   # Razorpay / simulation checkout
│       │   ├── NewProjectModal.tsx
│       │   ├── TraceabilityMatrix.tsx
│       │   ├── CoverageAnalyzer.tsx
│       │   ├── DocumentUploader.tsx
│       │   ├── GitHubConnector.tsx
│       │   ├── AICopilotChat.tsx
│       │   └── ReportGeneratorModal.tsx
│       ├── contexts/
│       │   ├── AuthContext.tsx        # JWT session + credit state
│       │   ├── ThemeContext.tsx
│       │   └── ToastContext.tsx
│       └── services/
│           ├── api.ts                # All API calls (auth header injected)
│           └── authApi.ts            # Auth-specific endpoints
│
└── server/
    ├── models/
    │   ├── User.js                   # freeProjectsRemaining + paidCredits
    │   └── Project.js                # userId-scoped project bundle
    ├── routes/
    │   ├── auth.js                   # Signup / signin / me / password reset
    │   ├── projects.js               # Credit-gated CRUD
    │   ├── payments.js               # Razorpay order + verify + credits
    │   ├── documents.js
    │   ├── github.js
    │   ├── engine.js
    │   └── copilot.js
    ├── middleware/
    │   └── auth.js                   # requireAuth JWT middleware
    ├── services/
    │   ├── geminiService.js
    │   ├── ragService.js             # TF-IDF retriever + redaction
    │   ├── documentService.js
    │   ├── githubService.js
    │   ├── engineService.js
    │   └── emailService.js
    └── config/
        ├── db.js
        └── seed.js                   # No-op (projects are user-scoped)
```

---

## Bugs Fixed (from original prototype)

1. **Non-existent Gemini model** — `gemini-3.6-flash` doesn't exist; updated fallback chain to valid model IDs
2. **RTM status filter broken** — dropdown used `Completed`/`Partial` but engine emits `Implemented`/`Partially Implemented`/`Missing`; filter options corrected
3. **Report generator mislabeled implemented features as risks** — filtered on `status !== 'Completed'` (never emitted); fixed to use `'Implemented'`
4. **Hardcoded dashboard insight** — always showed "Authentication and Shopping Cart are 100% verified" regardless of actual data; now derived from real `analysisResults`
5. **Couldn't delete the last document** — delete button hidden when `documents.length === 1`; fixed
6. **Crash with zero projects** — `currentProjectData.field` dereferenced without null check; guarded throughout
7. **No persistence** — all state was in-memory and reset on refresh; full MongoDB persistence added
8. **Fabricated Copilot fallback answer** — hardcoded made-up analysis returned on API error; replaced with honest error message
9. **No real RAG** — entire project bundle sent to Gemini on every message with no retrieval; replaced with TF-IDF retriever, chunk budget, redaction, and per-project consent gate

---

## Known Limitations

- **PDF/DOCX upload** — files are read as raw text client-side (`FileReader.readAsText`); binary PDF/DOCX aren't properly decoded. Use `.txt`/`.md` files or paste the extracted text directly. (Out of scope: would require `pdf-parse`/`mammoth` server-side)
- **GitHub rate limits** — public API is capped at 60 req/hr without a token; set `GITHUB_TOKEN` to raise this to 5,000 req/hr
- **Razorpay is India-only** — the payment gateway only accepts INR and Indian payment methods in Test Mode

---

## License

MIT
