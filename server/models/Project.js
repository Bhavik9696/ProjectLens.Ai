import mongoose from 'mongoose';

const { Schema } = mongoose;

/* ---------------------------------------------------------------- */
/* Sub-schemas mirror the frontend TypeScript types (src/types.ts)  */
/* so the API can be a near drop-in replacement for the previous    */
/* stateless Express server, just with MongoDB persistence added.   */
/* ---------------------------------------------------------------- */

const DocumentSectionSchema = new Schema(
  {
    id: String,
    title: String,
    content: String,
    headings: [String],
  },
  { _id: false }
);

const ProjectDocumentSchema = new Schema(
  {
    id: String,
    projectId: String,
    name: String,
    type: String,
    fileType: String,
    content: String,
    sections: [DocumentSectionSchema],
    uploadDate: String,
  },
  { _id: false }
);

const SoftwareRequirementSchema = new Schema(
  {
    id: String,
    projectId: String,
    title: String,
    module: String,
    priority: String,
    category: String,
    expectedComponents: [String],
    description: String,
    sourceDocument: String,
    // Enhanced fields (optional, backward compat)
    actor: String,
    action: String,
    object: String,
    acceptanceCriteria: [String],
  },
  { _id: false }
);

const DetectedModuleSchema = new Schema(
  {
    name: String,
    controllers: [String],
    services: [String],
    apis: [String],
    routes: [String],
    models: [String],
    pages: [String],
    components: [String],
    configs: [String],
    commitsCount: Number,
    prsCount: Number,
    issuesCount: Number,
    status: String,
  },
  { _id: false }
);

const GitCommitSchema = new Schema(
  {
    hash: String,
    message: String,
    author: String,
    date: String,
    filesChanged: [String],
    moduleRef: String,
  },
  { _id: false }
);

const GitPullRequestSchema = new Schema(
  {
    id: Number,
    title: String,
    state: String,
    author: String,
    mergedAt: String,
    relatedModule: String,
  },
  { _id: false }
);

const GitIssueSchema = new Schema(
  {
    id: Number,
    title: String,
    state: String,
    labels: [String],
    relatedModule: String,
  },
  { _id: false }
);

const ImplementationProfileSchema = new Schema(
  {
    repoName: String,
    owner: String,
    defaultBranch: String,
    stars: Number,
    openIssuesCount: Number,
    detectedModules: [DetectedModuleSchema],
    commits: [GitCommitSchema],
    pullRequests: [GitPullRequestSchema],
    issues: [GitIssueSchema],
    fileTree: [String],
    codeGraph: { type: mongoose.Schema.Types.Mixed, default: null },
    lastAnalyzedAt: String,
  },
  { _id: false }
);

const RequirementEvidenceSchema = new Schema(
  {
    detectedFiles: [String],
    detectedRoutes: [String],
    relatedCommits: [
      { hash: String, message: String, author: String, date: String, _id: false },
    ],
    relatedPRs: [{ id: Number, title: String, state: String, _id: false }],
    relatedIssues: [{ id: Number, title: String, state: String, _id: false }],
  },
  { _id: false }
);

const CriterionResultSchema = new Schema(
  {
    description: String,
    status: String,
    confidence: Number,
    evidence: [String],
    missing: [String],
    reason: String,
  },
  { _id: false }
);

const ContradictionSchema = new Schema(
  {
    type: String,
    severity: String,
    confidence: Number,
    title: String,
    evidence: [String],
    recommendation: String,
  },
  { _id: false }
);

const RequirementAnalysisResultSchema = new Schema(
  {
    requirementId: String,
    requirementTitle: String,
    module: String,
    priority: String,
    expectedComponents: [String],
    foundComponents: [String],
    missingComponents: [String],
    coveragePercent: Number,
    confidencePercent: Number,
    confidence: Number,
    status: String,
    evidence: RequirementEvidenceSchema,
    recommendation: String,
    // Enhanced fields (optional, backward compat)
    criteria: [CriterionResultSchema],
    contradictions: [ContradictionSchema],
    negativeEvidence: [String],
    testEvidence: {
      type: { hasTests: Boolean, testFiles: [String] },
      default: null,
    },
  },
  { _id: false }
);

const ProjectHealthMetricsSchema = new Schema(
  {
    requirementCoverage: { type: Number, default: 0 },
    implementationCoverage: { type: Number, default: 0 },
    sprintProgress: { type: Number, default: 0 },
    githubActivity: { type: Number, default: 0 },
    overallScore: { type: Number, default: 0 },
    healthRating: { type: String, default: 'Healthy' },
    highRiskModules: [String],
    keyRiskFactors: [String],
    scopeCreep: { type: mongoose.Schema.Types.Mixed, default: [] },
  },
  { _id: false }
);

// Lightweight per-run snapshot stored in analysisHistory
const AnalysisSnapshotSchema = new Schema(
  {
    runId: String,
    timestamp: String,
    overallScore: Number,
    healthRating: String,
    // [ { reqId, status, coveragePercent } ] — one entry per requirement
    statusSnapshot: [
      {
        reqId: String,
        status: String,
        coveragePercent: Number,
        _id: false,
      },
    ],
  },
  { _id: false }
);

const ChatMessageSchema = new Schema(
  {
    id: String,
    role: { type: String, enum: ['user', 'assistant'] },
    content: String,
    timestamp: String,
    citations: [{ type: { type: String }, ref: String, label: String, _id: false }],
    suggestedQuestions: [String],
  },
  { _id: false }
);

/* ---------------------------------------------------------------- */
/* Top level Project document                                       */
/* ---------------------------------------------------------------- */

const RagAuditEntrySchema = new Schema(
  {
    id: String,
    timestamp: String,
    query: String,
    mode: { type: String, enum: ['local', 'external'] },
    chunkIds: [String],
  },
  { _id: false }
);

const ProjectSchema = new Schema(
  {
    // Use the same human-readable id format the original app generated
    // client-side (proj-<timestamp>) as the Mongo _id, so no id-mapping
    // layer is needed between frontend and database.
    _id: { type: String },
    // Owner reference — populated by the credit-gated POST /api/projects route.
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    deadline: { type: String, default: '' },
    techStack: [String],
    githubUrl: { type: String, default: '' },
    // Explicit, per-project opt-in. When false (the default for every new
    // project), the AI Copilot never calls an external AI provider — it
    // only uses the deterministic local summary. See copilotService.js.
    allowExternalAI: { type: Boolean, default: false },
    ragAuditLog: { type: [RagAuditEntrySchema], default: [] },
    // Slack Incoming Webhook URL — optional, set per-project in Settings
    slackWebhookUrl: { type: String, default: '' },
    createdAt: { type: String },
    updatedAt: { type: String },

    documents: { type: [ProjectDocumentSchema], default: [] },
    requirements: { type: [SoftwareRequirementSchema], default: [] },
    implementationProfile: { type: ImplementationProfileSchema, default: null },
    analysisResults: { type: [RequirementAnalysisResultSchema], default: [] },
    // Stores up to 20 lightweight snapshots — one per analysis run
    analysisHistory: { type: [AnalysisSnapshotSchema], default: [] },
    healthMetrics: {
      type: ProjectHealthMetricsSchema,
      default: () => ({
        requirementCoverage: 0,
        implementationCoverage: 0,
        sprintProgress: 0,
        githubActivity: 0,
        overallScore: 0,
        healthRating: 'Healthy',
        highRiskModules: [],
        keyRiskFactors: ['Upload SRS documents or connect a GitHub repository to begin analysis.'],
      }),
    },
    chatMessages: { type: [ChatMessageSchema], default: [] },
  },
  { minimize: false, versionKey: false }
);

// Shape a Mongo document back into the exact ProjectIntelligenceData
// contract the React frontend already expects (project.id, not _id).
ProjectSchema.methods.toIntelligenceData = function toIntelligenceData() {
  const obj = this.toObject();
  const { _id, name, description, deadline, techStack, githubUrl, allowExternalAI, createdAt, updatedAt, ...rest } =
    obj;

  return {
    project: {
      id: _id,
      name,
      description,
      deadline,
      techStack,
      githubUrl,
      allowExternalAI: Boolean(allowExternalAI),
      slackWebhookUrl: rest.slackWebhookUrl || '',
      createdAt,
      updatedAt,
    },
    documents: rest.documents || [],
    requirements: rest.requirements || [],
    implementationProfile: rest.implementationProfile || null,
    analysisResults: rest.analysisResults || [],
    analysisHistory: rest.analysisHistory || [],
    ragAuditLog: rest.ragAuditLog || [],
    healthMetrics: rest.healthMetrics,
    chatMessages: rest.chatMessages || [],
  };
};

export default mongoose.model('Project', ProjectSchema);
