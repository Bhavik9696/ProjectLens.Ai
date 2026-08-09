# ProjectLens AI — MERN Edition

AI-powered project intelligence platform that compares software specification
documents (SRS, proposals, sprint reports) against a real GitHub repository's
code, using deterministic file/heuristic analysis plus optional Gemini AI
extraction and RAG chat.

This is a conversion of the original single-process Vite+Express prototype
into a standard **MERN** stack (**M**ongoDB, **E**xpress, **R**eact,
**N**ode.js) with a separated client/server, real persistence, and a set of
functional bugs fixed. Behavior and UI are the same as the original app —
create a project, upload/paste an SRS, connect a GitHub repo, review the
Requirement Traceability Matrix, coverage math, health score, and chat with
the AI Copilot — but now every project (documents, extracted requirements,
GitHub analysis, coverage results, and even AI Copilot chat history)
persists in MongoDB instead of resetting on every page refresh.

## Architecture

```
projectlens-ai-mern/
├── client/     React 19 + Vite + Tailwind (unchanged UI/UX, talks to the API)
└── server/     Express 4 + Mongoose/MongoDB (Gemini AI + GitHub REST + engine)
```

- **client** — same component structure as the original (`Dashboard`,
  `TraceabilityMatrix`, `CoverageAnalyzer`, `DocumentUploader`,
  `GitHubConnector`, `AICopilotChat`, etc). It now loads/saves project state
  through `src/services/api.ts` instead of an in-memory `SAMPLE_PROJECTS`
  array that was lost on refresh.
- **server** — the original `server.ts` (a single 500-line file mixing Vite
  middleware, Gemini calls, GitHub REST calls, and the scoring engine) is
  split into `models/`, `routes/`, and `services/`, and backed by MongoDB via
  Mongoose. The **same** deterministic algorithms (heuristic requirement
  extraction, coverage formula, health-score weighting) were preserved
  exactly — only the bugs below were fixed and persistence was added.

## Prerequisites

- Node.js 18+
- A MongoDB instance — either a local `mongod` (e.g. via Docker:
  `docker run -d -p 27017:27017 mongo`) or a free
  [MongoDB Atlas](https://www.mongodb.com/atlas) cluster.
- (Optional) A Gemini API key for live AI extraction / RAG chat. Without one,
  the app automatically falls back to deterministic heuristics and an
  offline Copilot summary — it still fully works.

## Setup

```bash
# 1. Install dependencies for both apps
npm run install:all

# 2. Configure the server
cp server/.env.example server/.env
# edit server/.env -> set MONGODB_URI (and optionally GEMINI_API_KEY, GITHUB_TOKEN)

# 3. Configure the client (only needed if the API isn't on localhost:5000)
cp client/.env.example client/.env

# 4. Run both apps together
npm run dev
```

This starts:
- the Express API on **http://localhost:5000**
- the Vite dev server on **http://localhost:5173** (proxies `/api/*` to the
  server, so the client never needs a hardcoded backend URL in dev)

On first boot the server automatically seeds one demo project
(`GitHub Codebase & Document Analyzer`) into MongoDB if the `projects`
collection is empty, so the app isn't blank on a fresh database — matching
the original app's out-of-the-box sample project.

### Running client/server separately

```bash
npm run dev:server   # http://localhost:5000
npm run dev:client   # http://localhost:5173
```

### Production build

```bash
npm run build:client        # outputs client/dist (serve with any static host)
npm run start:server        # node server/server.js
```

Set `VITE_API_URL` in `client/.env` to the deployed API origin before
building if the client and server are hosted separately.

## Environment variables (`server/.env`)

| Variable | Required | Purpose |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `PORT` | No (default `5000`) | API port |
| `GEMINI_API_KEY` | No | Enables live Gemini requirement extraction + RAG copilot |
| `GITHUB_TOKEN` | No | Raises GitHub API rate limit, allows private repos you can access |
| `CLIENT_ORIGIN` | No (default `http://localhost:5173`) | CORS allow-list |

## Bugs found in the original app and fixed in this conversion

1. **Non-existent Gemini model name.** The server called `gemini-3.6-flash`,
   which does not exist as a model id, so every AI request wasted a retry on
   a failure before falling back to `gemini-2.5-flash`. Fixed the fallback
   chain to use valid, current model ids (`server/services/geminiService.js`).
   The matching hardcoded "Gemini 3.6 Flash Server Engine" label in the
   Copilot UI was fixed too.
2. **Requirement Traceability Matrix status filter was broken.** The filter
   dropdown offered `Completed` / `Partial`, but the analysis engine only
   ever returns `Implemented`, `Partially Implemented`, `Missing`, or
   `Unable to Determine`. Selecting those filter options silently returned
   zero rows. Fixed the dropdown to use the real status values
   (`client/src/components/TraceabilityMatrix.tsx`).
3. **Report generator mislabeled fully-implemented requirements as risks.**
   Both the Markdown export and the on-screen "Risk Analysis &
   Recommendations" section filtered with `status !== 'Completed'` — a
   status the engine never emits — so 100%-covered requirements were
   incorrectly listed as gaps needing attention. Fixed to filter on
   `'Implemented'` (`client/src/components/ReportGeneratorModal.tsx`).
4. **Misleading hardcoded dashboard insight.** The "AI Project Manager
   Insights" card always claimed *"Authentication and Shopping Cart are 100%
   verified"* regardless of what was actually analyzed. It now derives the
   list of implemented modules from the real `analysisResults`
   (`client/src/components/Dashboard.tsx`).
5. **Couldn't delete the last remaining document.** The delete button in the
   document registry was hidden whenever only one document was uploaded
   (`documents.length > 1`), making it impossible to remove
   (`client/src/components/DocumentUploader.tsx`).
6. **Crash when there are zero projects.** `App.tsx` dereferenced
   `currentProjectData.field` directly in several tabs, assuming a project
   always existed (true only because of static sample data). Since this
   MERN version supports real project creation/deletion, the list can
   legitimately be empty — the app now renders a proper empty state instead
   of throwing (`client/src/App.tsx`).
7. **No persistence at all.** The single biggest functional gap: every
   project, document, requirement, GitHub analysis, and AI Copilot
   conversation lived only in React state and vanished on refresh. This is
   the core of the MERN conversion — a `Project` Mongoose model now stores
   the full project bundle, and the client saves a snapshot to MongoDB after
   every meaningful action (`server/models/Project.js`,
   `server/routes/projects.js`, `client/src/services/api.ts`).
8. **Fabricated fallback answer in the Copilot.** If the client's fetch to
   `/api/copilot/chat` failed outright (e.g. the API was briefly
   unreachable), the frontend silently returned a hardcoded, made-up
   answer — *"The Payment Gateway refund API and Admin Dashboard modules
   require developer attention"* — regardless of the actual project,
   presenting fabricated analysis as if it were real. Fixed to report the
   connection failure honestly instead of inventing findings
   (`client/src/services/api.ts`).
9. **Copilot claimed to be "RAG" without doing any retrieval.** The whole
   project bundle was dumped into every prompt with no retrieval step and
   no redaction — see the dedicated section below for the full fix.

## API overview

| Method & Path | Purpose |
|---|---|
| `GET /api/projects` | List all persisted projects |
| `POST /api/projects` | Create a new project |
| `PUT /api/projects/:id` | Save a project snapshot (documents, requirements, GitHub profile, analysis, health metrics, chat history) |
| `DELETE /api/projects/:id` | Delete a project |
| `POST /api/documents/parse` | Extract sections + requirements from pasted/uploaded document text |
| `POST /api/github/analyze` | Analyze a GitHub repo (file tree, commits, PRs, issues, detected modules) |
| `POST /api/engine/evaluate` | Run the deterministic + AI coverage engine and health-score calculator |
| `POST /api/copilot/chat` | Ask the AI Copilot a question (persists to chat history when `projectId` is supplied) |
| `GET /api/health` | Health check |

## Known limitations (carried over from the original app)

- Uploading a PDF/DOCX file reads it as raw text client-side (`FileReader.readAsText`),
  which does not properly decode binary PDF/DOCX formats. For real files in
  those formats, paste the extracted text into the textarea instead, or use
  a `.txt`/`.md` file — this matches the original app's behavior and wasn't
  changed as part of this conversion (out of scope: would require adding
  `pdf-parse`/`mammoth` server-side extraction).
- GitHub analysis relies on the public REST API's default rate limits; set
  `GITHUB_TOKEN` in `server/.env` if you hit rate limiting.

## UX features added

1. **Global project search.** The navbar's plain project `<select>` was
   replaced with a type-to-filter combobox (`client/src/components/ProjectSearch.tsx`)
   that searches by project name, description, and tech stack, with
   keyboard navigation (arrow keys, Enter, Escape) and click-outside to close.

2. **Light/dark theme toggle.** A sun/moon toggle in the navbar switches the
   whole app between the original dark theme and a new light theme. This
   works via CSS custom properties (`client/src/index.css`) — every
   hardcoded dark-mode Tailwind class across the app (`bg-slate-900`,
   `text-slate-400`, `bg-[#05070a]`, etc.) was converted to a theme-aware
   `var(--token)` equivalent, so the whole app — not just the navbar —
   actually re-themes. The preference persists to `localStorage` and is
   applied before React mounts (via an inline script in `index.html`) to
   avoid a flash of the wrong theme on load. The landing page keeps its
   own fixed dark + acid-lime brand identity regardless of the app theme,
   matching typical marketing-page conventions.

3. **Loading skeletons.** The initial "Loading ProjectLens AI…" spinner was
   replaced with a shaped skeleton (`client/src/components/ui/Skeleton.tsx`)
   that mirrors the actual navbar + dashboard layout, so the page doesn't
   visually jump once real data arrives.

4. **Toast notifications.** A toast system (`client/src/contexts/ToastContext.tsx`)
   now surfaces success/error feedback for every action that used to fail
   silently into the console: creating/deleting a project, saving changes,
   adding/removing a document, analyzing a GitHub repo, and exporting a
   report.

5. **Export to PDF.** The report modal's "Print / Save PDF" button (which
   relied on the browser's manual print dialog) was replaced with a real
   one-click "Download PDF" button using `jsPDF` + `jspdf-autotable`
   (`client/src/services/pdfExport.ts`) that generates a properly formatted,
   multi-page PDF — health metrics, the full Requirement Traceability
   Matrix as a real table, and risk/recommendation sections — and downloads
   it directly, no print dialog required. The `window.print()` button was
   kept alongside it for anyone who still wants that path.

## AI Copilot: real RAG + data protection

The original app's "AI Copilot" wasn't actually RAG — it dumped the
*entire* project bundle (every analysis result, every commit message,
every commit author, every PR/issue title, the full repo file tree) into
the prompt on every single message, sent whole to Gemini whenever
`GEMINI_API_KEY` was configured. There was no retrieval step, no
redaction, and no way to keep a project's data from leaving the server.

This has been replaced with an actual retrieval pipeline
(`server/services/ragService.js`) and a server-enforced consent gate:

- **Off by default, per project.** Every project has an `allowExternalAI`
  flag that defaults to `false`. When off, the Copilot only ever answers
  from the deterministic local summary already computed on the server —
  it never calls Gemini, even if `GEMINI_API_KEY` is set globally. This is
  enforced in `server/routes/copilot.js` by reading the flag from the
  persisted project document, not from whatever the client sends — a
  tampered client request can't flip a project into "external AI allowed."
- **Real retrieval, not a full dump.** When a project has opted in, the
  project's data is broken into small chunks (one per requirement, one
  per detected module, one aggregate health summary) and scored against
  the user's question with a local, in-process lexical ranker (TF-IDF
  cosine similarity — no embedding API call, so nothing leaves the server
  just to figure out what's relevant). Only the top ~8 matching chunks,
  capped at a character budget, are sent — never the full project.
- **Redaction before retrieval.** The chunks themselves never include
  commit author names/emails, raw commit/PR/issue text, or the full repo
  file tree — only aggregate counts and the small evidence-file list
  already computed to justify each requirement's status.
- **Per-answer transparency.** Every assistant message in the Copilot UI
  shows either "Answered locally — nothing sent externally" or an
  expandable "View data sent to AI" panel listing the exact chunks that
  were sent for that specific question — not a generic policy statement,
  the literal text that left the server.
- **Audit log.** Every Copilot query is recorded in a rolling
  `ragAuditLog` on the project (timestamp, query, mode, which chunk IDs
  were used), capped at the most recent 50 entries.

This is a simple, dependency-free retriever by design — it's meant to be
auditable (anyone can read `ragService.js` top to bottom and see exactly
what can and cannot leave the server), not a state-of-the-art RAG system.
For production use with much larger projects, swapping the lexical ranker
for a real vector index (e.g. MongoDB Atlas Vector Search, since you're
already on Mongo) would improve retrieval quality without changing the
consent/redaction/audit architecture.


