export type RequirementPriority = 'High' | 'Medium' | 'Low';
export type RequirementCategory = 'Functional' | 'Non-Functional' | 'Deliverable' | 'Milestone';
export type ImplementationStatus =
  | 'Implemented'
  | 'Partially Implemented'
  | 'Missing'
  | 'Unable to Determine'
  | 'Completed'
  | 'Partial';
export type CriterionStatus = 'IMPLEMENTED' | 'PARTIAL' | 'MISSING' | 'NOT_VERIFIABLE';
export type ContradictionSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ProjectHealthStatus = 'Healthy' | 'Medium Risk' | 'High Risk';
export type DocumentType = 'SRS' | 'Proposal' | 'Sprint Report' | 'Meeting Notes' | 'Design Doc' | 'Timeline' | 'Feature List';

// A lightweight snapshot of a single analysis run (stored in analysisHistory)
export interface AnalysisStatusSnapshot {
  reqId: string;
  status: ImplementationStatus;
  coveragePercent: number;
}

export interface AnalysisSnapshot {
  runId: string;
  timestamp: string;
  overallScore: number;
  healthRating: ProjectHealthStatus;
  statusSnapshot: AnalysisStatusSnapshot[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  deadline: string;
  techStack: string[];
  githubUrl: string;
  // Explicit opt-in: when false (the default), the AI Copilot only uses
  // the local deterministic summary and never calls an external AI
  // provider for this project.
  allowExternalAI?: boolean;
  slackWebhookUrl?: string;      // optional — configured per project in Settings
  createdAt: string;
  updatedAt: string;
}

// API Key for programmatic REST API access
export interface ApiKey {
  _id: string;
  keyPrefix: string;             // first 16 chars for display (e.g. pl_live_a1b2c3d4)
  label: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface DocumentSection {
  id: string;
  title: string;
  content: string;
  headings: string[];
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  name: string;
  type: DocumentType;
  fileType: 'PDF' | 'DOCX' | 'TXT' | 'MD';
  content: string;
  sections: DocumentSection[];
  uploadDate: string;
}

export interface SoftwareRequirement {
  id: string; // e.g. REQ-001
  projectId: string;
  title: string;
  module: string; // e.g. Authentication, Shopping Cart, Payment
  priority: RequirementPriority;
  category: RequirementCategory;
  expectedComponents: string[];
  description: string;
  sourceDocument: string;
  // Enhanced fields (optional for backward compat)
  actor?: string;        // who: 'user', 'admin', 'registered user'
  action?: string;       // what: 'reset password', 'upload file'
  object?: string;       // on what: 'password', 'document'
  acceptanceCriteria?: string[];  // testable criteria derived from requirement
}

export interface DetectedModule {
  name: string;
  controllers: string[];
  services: string[];
  apis: string[];
  routes: string[];
  models: string[];
  pages: string[];
  components: string[];
  configs: string[];
  commitsCount: number;
  prsCount: number;
  issuesCount: number;
  status: ImplementationStatus;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
  filesChanged: string[];
  moduleRef?: string;
}

export interface GitPullRequest {
  id: number;
  title: string;
  state: 'merged' | 'open' | 'closed';
  author: string;
  mergedAt?: string;
  relatedModule?: string;
}

export interface GitIssue {
  id: number;
  title: string;
  state: 'open' | 'closed';
  labels: string[];
  relatedModule?: string;
}

export interface CodeGraph {
  routes: string[];
  tests: string[];
  controllers: string[];
  services: string[];
  models: string[];
  components: string[];
  pages: string[];
  hooks: string[];
  middleware: string[];
  inferredApiRoutes: string[];
  summary: {
    totalFiles: number;
    routeFiles: number;
    testFiles: number;
    controllerFiles: number;
    serviceFiles: number;
    modelFiles: number;
    componentFiles: number;
    pageFiles: number;
  };
}

export interface ImplementationProfile {
  repoName: string;
  owner: string;
  defaultBranch: string;
  stars: number;
  openIssuesCount: number;
  detectedModules: DetectedModule[];
  commits: GitCommit[];
  pullRequests: GitPullRequest[];
  issues: GitIssue[];
  fileTree: string[];
  codeGraph?: CodeGraph;  // New: lightweight code graph from file tree
  lastAnalyzedAt: string;
}

export interface RequirementEvidence {
  detectedFiles: string[];
  detectedRoutes: string[];
  relatedCommits: { hash: string; message: string; author: string; date: string }[];
  relatedPRs: { id: number; title: string; state: string }[];
  relatedIssues: { id: number; title: string; state: string }[];
}

// New: per-criterion analysis result
export interface CriterionResult {
  description: string;
  status: CriterionStatus;
  confidence: number;    // 0.0 – 1.0
  evidence: string[];    // file paths or descriptions
  missing: string[];     // what is missing for this criterion
  reason: string;        // explanation
}

// New: detected contradiction between requirement and implementation
export interface Contradiction {
  type: string;
  severity: ContradictionSeverity;
  confidence: number;
  title: string;
  evidence: string[];
  recommendation: string;
}

export interface RequirementAnalysisResult {
  requirementId: string;
  requirementTitle: string;
  module: string;
  priority: RequirementPriority;
  expectedComponents: string[];
  foundComponents: string[];
  missingComponents: string[];
  coveragePercent: number;
  confidencePercent: number;
  confidence?: number;           // 0.0 – 1.0 version of confidencePercent
  status: ImplementationStatus;
  evidence: RequirementEvidence;
  recommendation: string;
  // Enhanced fields (optional for backward compat)
  criteria?: CriterionResult[];
  contradictions?: Contradiction[];
  testEvidence?: { hasTests: boolean; testFiles: string[] };
  negativeEvidence?: string[];
  evidenceFiles?: string[];      // convenience alias: top-level list of relevant files
}

export interface ScopeCreepItem {
  feature: string;
  keyword: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ProjectHealthMetrics {
  requirementCoverage: number; // 40% weight
  implementationCoverage: number; // 30% weight
  sprintProgress: number; // 20% weight
  githubActivity: number; // 10% weight
  overallScore: number;
  healthRating: ProjectHealthStatus;
  highRiskModules: string[];
  keyRiskFactors: string[];
  scopeCreep?: ScopeCreepItem[];
}

export interface Citation {
  type: 'Requirement' | 'File' | 'Commit' | 'PR' | 'Issue' | 'Document';
  ref: string;
  label: string;
}

export interface RagChunk {
  id: string;
  text: string;
}

export interface RagMeta {
  mode: 'local' | 'external';
  sentExternally: boolean;
  chunksSent: RagChunk[];
  totalChunksAvailable?: number;
}

export interface RagAuditEntry {
  id: string;
  timestamp: string;
  query: string;
  mode: 'local' | 'external';
  chunkIds: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: Citation[];
  suggestedQuestions?: string[];
  // Present on assistant messages: exactly what data (if any) was
  // retrieved and sent to an external AI provider to produce this answer.
  ragMeta?: RagMeta;
}

export interface ProjectIntelligenceData {
  project: Project;
  documents: ProjectDocument[];
  requirements: SoftwareRequirement[];
  implementationProfile: ImplementationProfile | null;
  analysisResults: RequirementAnalysisResult[];
  healthMetrics: ProjectHealthMetrics;
  chatMessages?: ChatMessage[];
  ragAuditLog?: RagAuditEntry[];
  analysisHistory?: AnalysisSnapshot[];
}
