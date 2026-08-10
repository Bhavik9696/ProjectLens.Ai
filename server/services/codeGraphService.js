/**
 * codeGraphService.js
 *
 * Builds a lightweight "code graph" from a GitHub repository file tree
 * (array of path strings). Works purely from file path classification —
 * no raw source content is fetched, so it is fast, privacy-safe, and
 * never hits GitHub API rate limits for content.
 *
 * Output is attached to ImplementationProfile.codeGraph and consumed
 * by engineService.js for multi-method evidence retrieval.
 */

// ── Secret / sensitive file exclusion ────────────────────────────────────────
const SECRET_PATH_PATTERNS = [
  /\.env($|\.)/i,
  /\.pem$/i,
  /\.key$/i,
  /\.cert$/i,
  /\.p12$/i,
  /credentials/i,
  /private[-_]?key/i,
  /secrets?\//i,
];

const EXCLUDED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', 'coverage',
  '__pycache__', '.cache', 'vendor', 'tmp', 'temp',
]);

// ── File type detection ───────────────────────────────────────────────────────
function isExcluded(filePath) {
  const parts = filePath.split('/');
  if (parts.some(p => EXCLUDED_DIRS.has(p))) return true;
  if (SECRET_PATH_PATTERNS.some(re => re.test(filePath))) return true;
  return false;
}

function classifyFile(filePath) {
  const lower = filePath.toLowerCase();
  const parts = lower.split('/');
  const fileName = parts[parts.length - 1];
  const ext = fileName.split('.').pop();

  // Binary / non-code files — skip
  if (/\.(png|jpg|jpeg|gif|svg|ico|webp|pdf|woff|woff2|ttf|eot|mp4|mp3|zip|tar|gz|bin|exe|dll|so|dylib)$/.test(lower)) {
    return 'asset';
  }

  // Test files
  if (
    /\.(test|spec)\.(js|ts|jsx|tsx|py|rb|go|java|cs)$/.test(lower) ||
    /\/__tests__\//.test(lower) ||
    /\/test\//.test(lower) ||
    /\/tests\//.test(lower) ||
    /\/spec\//.test(lower) ||
    fileName.includes('.test.') ||
    fileName.includes('.spec.')
  ) return 'test';

  // Configuration / environment
  if (
    /\.(env|config|conf|yaml|yml|toml|ini|json)$/.test(lower) &&
    !lower.includes('package.json') &&
    !lower.includes('tsconfig')
  ) return 'config';

  // Package / project files
  if (fileName === 'package.json' || fileName === 'tsconfig.json' || fileName === 'vite.config.ts') return 'config';

  // Middleware
  if (lower.includes('middleware') || lower.includes('/middleware/')) return 'middleware';

  // Routes / API
  if (
    lower.includes('/routes/') ||
    lower.includes('/route/') ||
    lower.includes('/api/') ||
    /router\.(js|ts)$/.test(lower) ||
    fileName.endsWith('routes.js') ||
    fileName.endsWith('routes.ts') ||
    fileName.endsWith('router.js') ||
    fileName.endsWith('router.ts')
  ) return 'route';

  // Controllers
  if (
    lower.includes('controller') ||
    lower.includes('/controllers/') ||
    fileName.includes('controller.')
  ) return 'controller';

  // Services / business logic
  if (
    lower.includes('service') ||
    lower.includes('/services/') ||
    fileName.includes('service.')
  ) return 'service';

  // Models / schemas / entities
  if (
    lower.includes('/models/') ||
    lower.includes('/model/') ||
    lower.includes('schema') ||
    lower.includes('entity') ||
    lower.includes('.model.') ||
    fileName.endsWith('model.js') ||
    fileName.endsWith('model.ts')
  ) return 'model';

  // React / UI pages
  if (
    lower.includes('/pages/') ||
    lower.includes('/views/') ||
    lower.includes('/screens/') ||
    fileName.endsWith('page.tsx') ||
    fileName.endsWith('page.jsx') ||
    fileName.endsWith('page.js') ||
    lower.includes('page.')
  ) return 'page';

  // React / UI components
  if (
    lower.includes('/components/') ||
    lower.includes('/component/') ||
    /\.(tsx|jsx)$/.test(lower) ||
    fileName.endsWith('component.ts') ||
    fileName.endsWith('component.js')
  ) return 'component';

  // Hooks
  if (lower.includes('/hooks/') || fileName.startsWith('use') && /\.(ts|js|tsx|jsx)$/.test(lower)) {
    return 'hook';
  }

  // Utilities / helpers
  if (
    lower.includes('/utils/') ||
    lower.includes('/util/') ||
    lower.includes('/helpers/') ||
    lower.includes('/helper/') ||
    lower.includes('/lib/') ||
    fileName.includes('util.') ||
    fileName.includes('helper.')
  ) return 'util';

  // Context / store / state
  if (lower.includes('/context') || lower.includes('/store/') || lower.includes('/redux/') || lower.includes('/state/')) {
    return 'state';
  }

  // Default: generic source
  return 'source';
}

// ── Route path extraction ─────────────────────────────────────────────────────
/**
 * Try to infer API route paths from file paths.
 * e.g. "server/routes/auth.js" → "auth"
 *      "api/users/index.js"    → "users"
 */
function inferRoutePaths(filePath) {
  const lower = filePath.toLowerCase();
  const fileName = lower.split('/').pop().replace(/\.(js|ts|jsx|tsx)$/, '');

  // Common route file name → probable route paths
  const routeMap = {
    auth: ['/api/auth/login', '/api/auth/signup', '/api/auth/logout', '/api/auth/reset-password'],
    authentication: ['/api/auth/login', '/api/auth/register'],
    user: ['/api/users', '/api/users/:id'],
    users: ['/api/users', '/api/users/:id'],
    payment: ['/api/payments', '/api/payments/create-order', '/api/payments/verify'],
    payments: ['/api/payments', '/api/payments/create-order', '/api/payments/verify'],
    product: ['/api/products', '/api/products/:id'],
    products: ['/api/products', '/api/products/:id'],
    order: ['/api/orders', '/api/orders/:id'],
    orders: ['/api/orders', '/api/orders/:id'],
    cart: ['/api/cart', '/api/cart/add', '/api/cart/remove'],
    project: ['/api/projects', '/api/projects/:id'],
    projects: ['/api/projects', '/api/projects/:id'],
    github: ['/api/github/analyze'],
    copilot: ['/api/copilot/chat'],
    engine: ['/api/engine/evaluate'],
    notification: ['/api/notifications'],
    notifications: ['/api/notifications'],
    admin: ['/api/admin'],
    analytics: ['/api/analytics'],
    report: ['/api/reports'],
    reports: ['/api/reports'],
    upload: ['/api/upload'],
    search: ['/api/search'],
    chat: ['/api/chat'],
    message: ['/api/messages'],
    messages: ['/api/messages'],
    email: ['/api/email'],
    profile: ['/api/profile'],
    setting: ['/api/settings'],
    settings: ['/api/settings'],
    dashboard: ['/api/dashboard'],
    review: ['/api/reviews'],
    reviews: ['/api/reviews'],
    comment: ['/api/comments'],
    comments: ['/api/comments'],
  };

  return routeMap[fileName] || [`/api/${fileName}`];
}

// ── Main export ───────────────────────────────────────────────────────────────
/**
 * Build a lightweight code graph from a file tree.
 *
 * @param {string[]} fileTree - Array of file paths from GitHub API
 * @returns {CodeGraph}
 */
export function buildCodeGraph(fileTree) {
  const graph = {
    routes: [],
    tests: [],
    controllers: [],
    services: [],
    models: [],
    components: [],
    pages: [],
    hooks: [],
    middleware: [],
    utils: [],
    stateFiles: [],
    configFiles: [],
    allSourceFiles: [],
    // Inferred API route paths (not file paths, but URL paths)
    inferredApiRoutes: [],
    // File-type counts for display
    summary: {
      totalFiles: 0,
      routeFiles: 0,
      testFiles: 0,
      controllerFiles: 0,
      serviceFiles: 0,
      modelFiles: 0,
      componentFiles: 0,
      pageFiles: 0,
    },
  };

  for (const filePath of fileTree) {
    if (isExcluded(filePath)) continue;

    const type = classifyFile(filePath);
    graph.allSourceFiles.push(filePath);

    switch (type) {
      case 'route':
        graph.routes.push(filePath);
        graph.inferredApiRoutes.push(...inferRoutePaths(filePath));
        graph.summary.routeFiles++;
        break;
      case 'test':
        graph.tests.push(filePath);
        graph.summary.testFiles++;
        break;
      case 'controller':
        graph.controllers.push(filePath);
        graph.summary.controllerFiles++;
        break;
      case 'service':
        graph.services.push(filePath);
        graph.summary.serviceFiles++;
        break;
      case 'model':
        graph.models.push(filePath);
        graph.summary.modelFiles++;
        break;
      case 'component':
        graph.components.push(filePath);
        graph.summary.componentFiles++;
        break;
      case 'page':
        graph.pages.push(filePath);
        graph.summary.pageFiles++;
        break;
      case 'hook':
        graph.hooks.push(filePath);
        break;
      case 'middleware':
        graph.middleware.push(filePath);
        break;
      case 'util':
        graph.utils.push(filePath);
        break;
      case 'state':
        graph.stateFiles.push(filePath);
        break;
      case 'config':
        graph.configFiles.push(filePath);
        break;
      default:
        break;
    }
  }

  graph.summary.totalFiles = graph.allSourceFiles.length;
  graph.inferredApiRoutes = [...new Set(graph.inferredApiRoutes)];

  return graph;
}

/**
 * Check whether a given requirement's keyword set matches known test files.
 * Returns the matching test files.
 */
export function findTestsForRequirement(requirement, codeGraph) {
  if (!codeGraph || !codeGraph.tests || codeGraph.tests.length === 0) return [];

  const keywords = extractSearchKeywords(requirement);
  return codeGraph.tests.filter(testFile => {
    const lower = testFile.toLowerCase();
    return keywords.some(kw => lower.includes(kw));
  });
}

/**
 * Extract a broad keyword set for searching (used by engine and retrieval).
 */
export function extractSearchKeywords(requirement) {
  const STOP_WORDS = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
    'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
    'how', 'its', 'let', 'may', 'new', 'now', 'old', 'see', 'two', 'way',
    'who', 'did', 'put', 'say', 'she', 'too', 'use', 'that', 'this', 'with',
    'from', 'have', 'will', 'your', 'been', 'each', 'they', 'were', 'when',
    'than', 'then', 'here', 'into', 'some', 'what', 'also', 'back', 'just',
    'know', 'most', 'need', 'only', 'over', 'such', 'take', 'them', 'well',
    'their', 'there', 'these', 'those', 'which', 'while', 'shall', 'must',
    'should', 'allow', 'enable', 'provide', 'system', 'user', 'able', 'upon',
    'more', 'very', 'data', 'make', 'work', 'used', 'both', 'based', 'using',
    'given', 'about', 'include', 'general', 'requirements', 'requirement',
    'feature', 'function', 'module', 'component', 'handler', 'between',
    'related', 'other', 'different', 'specific', 'support', 'every', 'after',
    'before', 'through', 'during', 'application', 'software', 'section',
    'service', 'controller', 'interface', 'implement', 'implementation',
  ]);

  const text = [
    requirement.title || '',
    requirement.description || '',
    requirement.actor || '',
    requirement.action || '',
    requirement.object || '',
    ...(requirement.acceptanceCriteria || []),
    ...(requirement.expectedComponents || []),
  ].join(' ');

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w));

  return [...new Set(words)];
}

/**
 * Score a single file path against a keyword set.
 * Returns a numeric relevance score.
 */
export function scoreFileRelevance(filePath, keywords) {
  const lower = filePath.toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    if (lower.includes(kw)) score += 1;
    // Bonus for appearing in file name (not just directory)
    const fileName = lower.split('/').pop();
    if (fileName && fileName.includes(kw)) score += 0.5;
  }
  return score;
}

/**
 * Retrieve top-N most relevant files for a requirement.
 * Uses multi-method: keyword scoring + type-aware boosting.
 */
export function retrieveRelevantFiles(requirement, fileTree, codeGraph, topN = 20) {
  const keywords = extractSearchKeywords(requirement);
  if (keywords.length === 0) return [];

  // Score all non-excluded files
  const scored = fileTree
    .filter(f => !isExcluded(f))
    .map(filePath => {
      let score = scoreFileRelevance(filePath, keywords);

      // Type-aware boosts
      const type = classifyFile(filePath);
      if (type === 'test') score *= 0.8; // tests are secondary evidence
      if (type === 'config') score *= 0.3;
      if (type === 'asset') score = 0;

      return { filePath, score, type };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, topN);
}

/**
 * Detect negative evidence — things that SHOULD exist for a requirement
 * but are NOT found in the file tree.
 */
export function detectNegativeEvidence(requirement, fileTree, codeGraph) {
  const negatives = [];
  const keywords = extractSearchKeywords(requirement);
  const allFilesLower = fileTree.map(f => f.toLowerCase());
  const title = (requirement.title || '').toLowerCase();
  const desc = (requirement.description || '').toLowerCase();

  // Auth-related requirements — check for missing security artifacts
  if (
    keywords.some(k => ['auth', 'login', 'password', 'session', 'token', 'jwt', 'register', 'signup'].includes(k)) ||
    title.includes('auth') || title.includes('login')
  ) {
    if (!allFilesLower.some(f => f.includes('auth') || f.includes('jwt') || f.includes('token'))) {
      negatives.push('No authentication/JWT token handling files found');
    }
    if (!allFilesLower.some(f => f.includes('middleware') || f.includes('guard') || f.includes('protect'))) {
      negatives.push('No auth middleware or route protection files found');
    }
  }

  // Admin / authorization requirements
  if (keywords.some(k => ['admin', 'role', 'permission', 'authorization', 'privilege'].includes(k)) ||
      title.includes('admin') || desc.includes('only admin')) {
    if (!allFilesLower.some(f => f.includes('admin') || f.includes('role') || f.includes('permission') || f.includes('guard') || f.includes('authorize'))) {
      negatives.push('No role-based access control (RBAC) or admin authorization files found');
    }
  }

  // Payment requirements — check for webhook / confirmation
  if (keywords.some(k => ['payment', 'checkout', 'order', 'billing', 'invoice', 'stripe', 'paypal', 'razorpay'].includes(k))) {
    if (!allFilesLower.some(f => f.includes('payment') || f.includes('order') || f.includes('checkout') || f.includes('billing'))) {
      negatives.push('No payment processing files found');
    }
    if (!allFilesLower.some(f => f.includes('webhook') || f.includes('verify'))) {
      negatives.push('No payment verification/webhook handler found');
    }
  }

  // Notification requirements
  if (keywords.some(k => ['notification', 'email', 'sms', 'push', 'alert', 'notify'].includes(k))) {
    if (!allFilesLower.some(f => f.includes('notification') || f.includes('email') || f.includes('mail') || f.includes('sms'))) {
      negatives.push('No notification/email service files found');
    }
  }

  // Test coverage — check if implementation exists but tests don't
  const relevantImpl = fileTree.filter(f => {
    if (isExcluded(f) || classifyFile(f) === 'test') return false;
    return keywords.some(kw => f.toLowerCase().includes(kw));
  });
  const relevantTests = (codeGraph?.tests || []).filter(f =>
    keywords.some(kw => f.toLowerCase().includes(kw))
  );
  if (relevantImpl.length > 0 && relevantTests.length === 0) {
    negatives.push(`Implementation found (${relevantImpl.length} file(s)) but no test files detected for this requirement`);
  }

  // Validation / input sanitization
  if (
    keywords.some(k => ['form', 'input', 'validation', 'validate', 'register', 'submit', 'upload'].includes(k)) ||
    (requirement.acceptanceCriteria || []).some(c => c.toLowerCase().includes('valid'))
  ) {
    if (!allFilesLower.some(f => f.includes('valid') || f.includes('schema') || f.includes('joi') || f.includes('zod') || f.includes('yup'))) {
      negatives.push('No input validation library or validation schema files found');
    }
  }

  return negatives;
}

/**
 * Redact secrets from a text string before sending to external AI.
 */
export function redactSecrets(text) {
  return text
    .replace(/\b(API[_-]?KEY|SECRET[_-]?KEY|ACCESS[_-]?TOKEN|PRIVATE[_-]?KEY|PASSWORD|PASSWD|PWD|JWT[_-]?SECRET|DATABASE[_-]?URL|MONGODB[_-]?URI|REDIS[_-]?URL|STRIPE[_-]?KEY|RAZORPAY[_-]?KEY|AWS[_-]?SECRET|SENDGRID[_-]?KEY)\s*[=:]\s*\S+/gi, '[REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, 'Bearer [REDACTED]')
    .replace(/ghp_[A-Za-z0-9]{36}/g, '[GITHUB_TOKEN_REDACTED]')
    .replace(/sk[-_][A-Za-z0-9]{20,}/g, '[API_KEY_REDACTED]');
}
