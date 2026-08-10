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
 *
 * FIX (v2): Tightened keyword extraction, raised minimum score threshold,
 * and added whole-segment path matching to prevent generic files (e.g.
 * Aside.jsx) from appearing as evidence for unrelated requirements.
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
  if (lower.includes('/hooks/') || (fileName.startsWith('use') && /\.(ts|js|tsx|jsx)$/.test(lower))) {
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
function inferRoutePaths(filePath) {
  const lower = filePath.toLowerCase();
  const fileName = lower.split('/').pop().replace(/\.(js|ts|jsx|tsx)$/, '');

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
    document: ['/api/documents', '/api/documents/parse'],
    documents: ['/api/documents', '/api/documents/parse'],
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
    reset: ['/api/auth/reset-password', '/api/auth/forgot-password'],
    forgot: ['/api/auth/forgot-password'],
    register: ['/api/auth/register', '/api/auth/signup'],
    login: ['/api/auth/login', '/api/auth/signin'],
  };

  return routeMap[fileName] || [`/api/${fileName}`];
}

// ── Main export ───────────────────────────────────────────────────────────────
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
    inferredApiRoutes: [],
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

export function findTestsForRequirement(requirement, codeGraph) {
  if (!codeGraph || !codeGraph.tests || codeGraph.tests.length === 0) return [];

  const keywords = extractSearchKeywords(requirement);
  return codeGraph.tests.filter(testFile => {
    const segments = testFile.toLowerCase().split(/[\/\-_.]/);
    return keywords.some(kw => kw.length >= 4 && segments.some(seg => seg.includes(kw)));
  });
}

// ── Keyword extraction (v2 — tightened) ──────────────────────────────────────
/**
 * Extract meaningful domain-specific keywords from a requirement.
 *
 * KEY FIX: The previous stop-words list wrongly excluded domain words like
 * "service", "controller", "component", "implement" which are essential for
 * matching code files. The new list only removes truly generic English words
 * that cannot match meaningful filenames.
 */
export function extractSearchKeywords(requirement) {
  // These are ONLY generic English function words that have zero chance
  // of being a useful filename segment. Domain words are intentionally kept.
  const HARD_STOP_WORDS = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
    'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
    'how', 'its', 'let', 'may', 'new', 'now', 'old', 'see', 'two', 'way',
    'who', 'did', 'put', 'say', 'she', 'too', 'use', 'that', 'this', 'with',
    'from', 'have', 'will', 'your', 'been', 'each', 'they', 'were', 'when',
    'than', 'then', 'here', 'into', 'some', 'what', 'also', 'back', 'just',
    'know', 'most', 'need', 'only', 'over', 'such', 'take', 'them', 'well',
    'their', 'there', 'these', 'those', 'which', 'while', 'shall', 'must',
    'should', 'allow', 'enable', 'provide', 'upon', 'more', 'very', 'make',
    'work', 'used', 'both', 'based', 'using', 'given', 'about', 'include',
    'general', 'requirements', 'requirement', 'between', 'related', 'other',
    'different', 'specific', 'every', 'after', 'before', 'through', 'during',
    'each', 'such', 'very', 'also', 'even', 'many', 'well', 'then', 'than',
    'into', 'over', 'back', 'from', 'with', 'same', 'when', 'where', 'were',
    'been', 'being', 'have', 'having', 'does', 'doing', 'done', 'make',
    'makes', 'made', 'take', 'takes', 'taken', 'come', 'comes', 'came',
    'give', 'gives', 'given', 'show', 'shows', 'showed', 'shown',
  ]);

  const text = [
    requirement.title || '',
    requirement.description || '',
    requirement.actor || '',
    requirement.action || '',
    requirement.object || '',
    ...(requirement.acceptanceCriteria || []),
    ...(requirement.expectedComponents || []),
    requirement.module || '',
  ].join(' ');

  const words = text
    .toLowerCase()
    // camelCase split: "authController" → "auth controller"
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !HARD_STOP_WORDS.has(w));

  // Deduplicate and return
  return [...new Set(words)];
}

// ── Relevance scoring (v2 — tightened) ───────────────────────────────────────
/**
 * Score a single file path against a keyword set using path SEGMENT matching.
 *
 * KEY FIX: The previous implementation split the file path into a single
 * string and checked if any keyword appeared as a substring. This caused
 * false positives (e.g. "ai" matching "Aside.jsx", "side" matching many
 * unrelated files). Now we split on path separators and check each segment
 * independently, requiring the segment to CONTAIN the keyword as a
 * meaningful part (not just as scattered characters).
 *
 * Scoring:
 *   +3 filename stem matches keyword exactly
 *   +2 filename stem contains keyword (length >= 4)
 *   +1 directory segment contains keyword (length >= 4)
 *   +1 bonus for each additional keyword matched (up to 3 bonus)
 *
 * Minimum threshold: 2.0 (set in retrieveRelevantFiles)
 */
export function scoreFileRelevance(filePath, keywords) {
  if (!keywords || keywords.length === 0) return 0;

  const parts = filePath.toLowerCase().split('/');
  const rawFileName = parts[parts.length - 1];
  // Strip extension for matching
  const fileNameStem = rawFileName.replace(/\.(js|ts|jsx|tsx|py|java|rb|go|cs|vue|svelte|html|css|scss|md)$/i, '');
  const dirParts = parts.slice(0, -1);

  let score = 0;
  let matchedKeywords = 0;

  for (const kw of keywords) {
    if (kw.length < 3) continue;

    let kwMatched = false;

    // Exact filename stem match (highest value)
    if (fileNameStem === kw) {
      score += 3;
      kwMatched = true;
    }
    // Filename stem contains keyword (require length >= 4 to reduce noise)
    else if (kw.length >= 4 && fileNameStem.includes(kw)) {
      score += 2;
      kwMatched = true;
    }
    // Keyword is a whole segment or meaningful sub-word of filename stem (length >= 4)
    else if (kw.length >= 4 && dirParts.some(d => d.includes(kw))) {
      score += 1;
      kwMatched = true;
    }
    // Short keyword (3 chars): only match if it's an EXACT directory segment
    else if (kw.length === 3 && dirParts.some(d => d === kw)) {
      score += 0.5;
      kwMatched = true;
    }

    if (kwMatched) matchedKeywords++;
  }

  // Bonus for matching multiple distinct keywords (rewards more specific matches)
  if (matchedKeywords >= 2) score += Math.min(matchedKeywords - 1, 3) * 0.5;

  return score;
}

// ── Multi-method retrieval (v2) ───────────────────────────────────────────────
/**
 * Retrieve top-N most relevant files for a requirement.
 *
 * KEY FIX: Minimum score threshold raised from > 0 to >= 2.0 to eliminate
 * accidental low-quality matches. Files scoring below the threshold are
 * excluded entirely rather than being returned as weak evidence.
 *
 * Added: type-aware boosting that promotes backend files (routes, controllers,
 * services, models) for backend requirements and frontend files for UI
 * requirements, so requirements are matched to the right layer.
 */
export function retrieveRelevantFiles(requirement, fileTree, codeGraph, topN = 20) {
  const keywords = extractSearchKeywords(requirement);
  if (keywords.length === 0) return [];

  const titleLower = (requirement.title || '').toLowerCase();
  const descLower = (requirement.description || '').toLowerCase();
  const actorLower = (requirement.actor || '').toLowerCase();
  const combined = titleLower + ' ' + descLower + ' ' + actorLower;

  // Detect requirement domain to prioritize file types
  const isFrontend = /\b(ui|interface|page|form|component|display|render|visual|react|vue|angular|screen|view|button|modal|widget)\b/.test(combined);
  const isBackend = /\b(api|route|endpoint|server|database|model|schema|controller|middleware|jwt|token|session|auth|backend)\b/.test(combined);
  const isAuth = /\b(auth|login|signup|register|password|session|jwt|oauth|logout)\b/.test(combined);
  const isPayment = /\b(payment|checkout|order|billing|invoice|stripe|paypal|razorpay|purchase)\b/.test(combined);
  const isUpload = /\b(upload|file|document|attachment|image|pdf|csv)\b/.test(combined);
  const isNotification = /\b(notification|email|sms|push|alert|notify|mail)\b/.test(combined);
  const isAdmin = /\b(admin|role|permission|authorize|privilege|rbac)\b/.test(combined);

  const MIN_SCORE = 2.0; // FIX: Minimum relevance threshold — no accidental matches

  const scored = fileTree
    .filter(f => !isExcluded(f))
    .map(filePath => {
      let score = scoreFileRelevance(filePath, keywords);
      if (score === 0) return { filePath, score: 0, type: 'source' };

      const type = classifyFile(filePath);
      const lowerPath = filePath.toLowerCase();

      // ── Type-aware boosts ────────────────────────────────────────────────────
      // Always boost implementation-critical types
      if (type === 'route') score *= 1.8;
      else if (type === 'controller') score *= 1.6;
      else if (type === 'service') score *= 1.5;
      else if (type === 'model') score *= 1.4;
      else if (type === 'middleware') score *= 1.3;
      else if (type === 'page') score *= 1.2;
      else if (type === 'component') score *= 1.1;
      else if (type === 'test') score *= 0.7; // Tests are secondary
      else if (type === 'config') score *= 0.2; // Config rarely implements features
      else if (type === 'asset') score = 0; // Assets never implement features

      // Domain-specific boosts
      if (isAuth && (lowerPath.includes('auth') || lowerPath.includes('login') || lowerPath.includes('session') || lowerPath.includes('jwt'))) score += 2;
      if (isPayment && (lowerPath.includes('payment') || lowerPath.includes('checkout') || lowerPath.includes('order'))) score += 2;
      if (isUpload && (lowerPath.includes('upload') || lowerPath.includes('document') || lowerPath.includes('file'))) score += 2;
      if (isNotification && (lowerPath.includes('notif') || lowerPath.includes('email') || lowerPath.includes('mail'))) score += 2;
      if (isAdmin && (lowerPath.includes('admin') || lowerPath.includes('role') || lowerPath.includes('permission'))) score += 2;

      // Layer alignment boost
      if (isBackend && !isFrontend && ['route', 'controller', 'service', 'model', 'middleware'].includes(type)) score += 1;
      if (isFrontend && !isBackend && ['component', 'page', 'hook'].includes(type)) score += 1;

      return { filePath, score, type };
    })
    .filter(x => x.score >= MIN_SCORE) // FIX: Only return genuinely relevant files
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, topN);
}

// ── Negative evidence detection ───────────────────────────────────────────────
export function detectNegativeEvidence(requirement, fileTree, codeGraph) {
  const negatives = [];
  const keywords = extractSearchKeywords(requirement);
  const allFilesLower = fileTree.map(f => f.toLowerCase());
  const title = (requirement.title || '').toLowerCase();
  const desc = (requirement.description || '').toLowerCase();
  const combined = title + ' ' + desc;

  // Auth-related requirements
  if (/\b(auth|login|password|session|token|jwt|register|signup)\b/.test(combined)) {
    if (!allFilesLower.some(f => f.includes('auth') || f.includes('jwt') || f.includes('token') || f.includes('session'))) {
      negatives.push('No authentication/JWT token handling files found');
    }
    if (!allFilesLower.some(f => f.includes('middleware') || f.includes('guard') || f.includes('protect'))) {
      negatives.push('No auth middleware or route protection files found');
    }
    if (/reset|forgot/.test(combined)) {
      if (!allFilesLower.some(f => f.includes('email') || f.includes('mail') || f.includes('smtp'))) {
        negatives.push('Password reset requires email delivery but no email service files found');
      }
    }
  }

  // Admin / authorization requirements
  if (/\b(admin|role|permission|authorization|privilege)\b/.test(combined)) {
    if (!allFilesLower.some(f => f.includes('admin') || f.includes('role') || f.includes('permission') || f.includes('guard') || f.includes('authorize'))) {
      negatives.push('No role-based access control (RBAC) or admin authorization files found');
    }
  }

  // Payment requirements
  if (/\b(payment|checkout|order|billing|invoice|stripe|paypal|razorpay)\b/.test(combined)) {
    if (!allFilesLower.some(f => f.includes('payment') || f.includes('order') || f.includes('checkout') || f.includes('billing'))) {
      negatives.push('No payment processing files found');
    }
    if (!allFilesLower.some(f => f.includes('webhook') || f.includes('verify'))) {
      negatives.push('No payment verification/webhook handler found');
    }
  }

  // Notification requirements
  if (/\b(notification|email|sms|push|alert|notify)\b/.test(combined)) {
    if (!allFilesLower.some(f => f.includes('notification') || f.includes('email') || f.includes('mail') || f.includes('sms'))) {
      negatives.push('No notification/email service files found');
    }
  }

  // Test coverage check
  const relevantImpl = fileTree.filter(f => {
    if (isExcluded(f) || classifyFile(f) === 'test') return false;
    return keywords.some(kw => kw.length >= 4 && f.toLowerCase().includes(kw));
  });
  const relevantTests = (codeGraph?.tests || []).filter(f =>
    keywords.some(kw => kw.length >= 4 && f.toLowerCase().includes(kw))
  );
  if (relevantImpl.length > 0 && relevantTests.length === 0) {
    negatives.push(`Implementation found (${relevantImpl.length} file(s)) but no test files detected for this requirement`);
  }

  // Validation / input sanitization
  if (
    /\b(form|input|validation|validate|register|submit|upload)\b/.test(combined) ||
    (requirement.acceptanceCriteria || []).some(c => c.toLowerCase().includes('valid'))
  ) {
    if (!allFilesLower.some(f => f.includes('valid') || f.includes('schema') || f.includes('joi') || f.includes('zod') || f.includes('yup'))) {
      negatives.push('No input validation library or validation schema files found');
    }
  }

  return negatives;
}

// ── Secret redaction ──────────────────────────────────────────────────────────
export function redactSecrets(text) {
  return text
    .replace(/\b(API[_-]?KEY|SECRET[_-]?KEY|ACCESS[_-]?TOKEN|PRIVATE[_-]?KEY|PASSWORD|PASSWD|PWD|JWT[_-]?SECRET|DATABASE[_-]?URL|MONGODB[_-]?URI|REDIS[_-]?URL|STRIPE[_-]?KEY|RAZORPAY[_-]?KEY|AWS[_-]?SECRET|SENDGRID[_-]?KEY)\s*[=:]\s*\S+/gi, '[REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, 'Bearer [REDACTED]')
    .replace(/ghp_[A-Za-z0-9]{36}/g, '[GITHUB_TOKEN_REDACTED]')
    .replace(/sk[-_][A-Za-z0-9]{20,}/g, '[API_KEY_REDACTED]');
}
