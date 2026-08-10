// Dynamic heuristic fallback for requirement extraction when Gemini API
// is unavailable or not configured. Ported from the original server.ts.

/**
 * Generate a basic set of acceptance criteria from a requirement's title and description.
 * Used as fallback when Gemini AI is not available.
 */
export function generateAcceptanceCriteria(title = '', description = '') {
  const text = (title + ' ' + description).toLowerCase();
  const criteria = [];

  // Auth / login patterns
  if (/\b(login|sign.?in|authentication|authenticate)\b/.test(text)) {
    criteria.push('User can submit login credentials');
    criteria.push('System validates credentials against stored data');
    criteria.push('Invalid credentials return an error message');
    criteria.push('Successful login redirects to dashboard');
    if (/\btoken|jwt\b/.test(text)) criteria.push('Authentication token is generated and returned');
  }

  // Registration patterns
  if (/\b(register|sign.?up|create.?account|new.?user)\b/.test(text)) {
    criteria.push('User can submit registration form');
    criteria.push('System validates input fields');
    criteria.push('Duplicate accounts are rejected');
    criteria.push('Successful registration creates user record');
    if (/\bemail\b/.test(text)) criteria.push('Confirmation email is sent upon registration');
  }

  // Password reset patterns
  if (/\b(password.?reset|reset.?password|forgot.?password)\b/.test(text)) {
    criteria.push('User can request password reset via email');
    criteria.push('System generates a unique reset token');
    criteria.push('Reset email is delivered to the user');
    criteria.push('Reset token is validated before allowing change');
    criteria.push('User can set a new password');
    criteria.push('Reset token expires after a defined period');
  }

  // Payment patterns
  if (/\b(payment|checkout|billing|invoice|purchase|order|transaction)\b/.test(text)) {
    criteria.push('User can initiate payment process');
    criteria.push('Payment details are validated');
    criteria.push('Payment is processed via payment gateway');
    criteria.push('Successful payment triggers confirmation');
    criteria.push('Failed payment returns meaningful error');
    if (/\bhistory|record\b/.test(text)) criteria.push('Payment record is stored');
  }

  // Search / filter patterns
  if (/\b(search|filter|find|query|browse)\b/.test(text)) {
    criteria.push('User can enter search query');
    criteria.push('Search results are returned');
    criteria.push('Empty query returns appropriate response');
    if (/\bfilter\b/.test(text)) criteria.push('Results can be filtered by criteria');
    if (/\bsort\b/.test(text)) criteria.push('Results can be sorted');
  }

  // Upload / file patterns
  if (/\b(upload|file|document|attachment|image)\b/.test(text)) {
    criteria.push('User can select file for upload');
    criteria.push('File type is validated before upload');
    criteria.push('File size limits are enforced');
    criteria.push('Upload progress is indicated to user');
    criteria.push('Uploaded file is stored and accessible');
  }

  // Notification / email patterns
  if (/\b(notification|notify|alert|email|sms|message)\b/.test(text)) {
    criteria.push('Notification is triggered by the appropriate event');
    criteria.push('Notification content is accurate and relevant');
    criteria.push('Notification is delivered to the intended recipient');
    if (/\bemail\b/.test(text)) criteria.push('Email is delivered via email service provider');
  }

  // Dashboard / display patterns
  if (/\b(dashboard|overview|summary|display|show|view|list)\b/.test(text)) {
    criteria.push('Data is fetched from the backend');
    criteria.push('Data is displayed correctly in the UI');
    criteria.push('Loading state is shown while fetching');
    criteria.push('Empty state is handled gracefully');
    if (/\breal.?time|live\b/.test(text)) criteria.push('Data updates in real-time or near real-time');
  }

  // Admin / role patterns
  if (/\b(admin|administrator|role|permission|access.?control|privilege)\b/.test(text)) {
    criteria.push('Only authorized roles can access the feature');
    criteria.push('Unauthorized users receive an access denied response');
    criteria.push('Role-based permissions are enforced server-side');
    if (/\bdelete|remove\b/.test(text)) criteria.push('Deletion requires elevated permission');
  }

  // CRUD patterns
  if (/\b(create|add|new)\b/.test(text)) criteria.push('User can create a new record');
  if (/\b(read|view|fetch|get|retrieve|list)\b/.test(text)) criteria.push('User can retrieve existing records');
  if (/\b(update|edit|modify|change)\b/.test(text)) criteria.push('User can update existing records');
  if (/\b(delete|remove)\b/.test(text)) criteria.push('User can delete records');

  // If no specific patterns found, generate generic criteria
  if (criteria.length === 0) {
    const titleWords = title.split(' ').filter(w => w.length > 3).slice(0, 3);
    criteria.push(`${title || 'Feature'} functionality is accessible`);
    criteria.push(`Input data is validated`);
    criteria.push(`Response is returned correctly`);
    criteria.push(`Error cases are handled gracefully`);
    if (titleWords.length > 0) {
      criteria.push(`${titleWords[0]} data is persisted correctly`);
    }
  }

  // Deduplicate and limit
  return [...new Set(criteria)].slice(0, 8);
}

/**
 * Extract actor, action, and object from a requirement string.
 */
export function extractActorActionObject(title = '', description = '') {
  const text = title || description || '';

  // Common actor patterns
  let actor = 'user';
  if (/\badmin(istrator)?\b/i.test(text)) actor = 'administrator';
  else if (/\bregistered.?user\b/i.test(text)) actor = 'registered user';
  else if (/\bguest\b/i.test(text)) actor = 'guest user';
  else if (/\bsystem\b/i.test(text)) actor = 'system';
  else if (/\bmanager\b/i.test(text)) actor = 'manager';

  // Action extraction — find main verb
  const actionPatterns = [
    { re: /\b(reset).?password\b/i, action: 'reset password' },
    { re: /\b(change).?password\b/i, action: 'change password' },
    { re: /\b(sign.?in|log.?in|login)\b/i, action: 'login' },
    { re: /\b(sign.?up|register|create.?account)\b/i, action: 'register' },
    { re: /\b(upload)\b/i, action: 'upload' },
    { re: /\b(download)\b/i, action: 'download' },
    { re: /\b(search)\b/i, action: 'search' },
    { re: /\b(filter)\b/i, action: 'filter' },
    { re: /\b(delete|remove)\b/i, action: 'delete' },
    { re: /\b(update|edit|modify)\b/i, action: 'update' },
    { re: /\b(create|add|new)\b/i, action: 'create' },
    { re: /\b(view|see|display|show)\b/i, action: 'view' },
    { re: /\b(pay|checkout|purchase)\b/i, action: 'process payment' },
    { re: /\b(notify|send.?notification|alert)\b/i, action: 'receive notification' },
    { re: /\b(manage)\b/i, action: 'manage' },
    { re: /\b(access)\b/i, action: 'access' },
    { re: /\b(track)\b/i, action: 'track' },
  ];

  let action = 'perform action';
  for (const { re, action: a } of actionPatterns) {
    if (re.test(text)) { action = a; break; }
  }

  // Object extraction
  const objectPatterns = [
    { re: /\bpassword\b/i, obj: 'password' },
    { re: /\bprofile\b/i, obj: 'profile' },
    { re: /\bproduct\b/i, obj: 'product' },
    { re: /\border\b/i, obj: 'order' },
    { re: /\bcart\b/i, obj: 'shopping cart' },
    { re: /\bpayment\b/i, obj: 'payment' },
    { re: /\bnotification\b/i, obj: 'notification' },
    { re: /\breport\b/i, obj: 'report' },
    { re: /\bdashboard\b/i, obj: 'dashboard' },
    { re: /\bproject\b/i, obj: 'project' },
    { re: /\bdocument|file\b/i, obj: 'document' },
    { re: /\buser\b/i, obj: 'user account' },
    { re: /\bdata\b/i, obj: 'data' },
    { re: /\brequirement\b/i, obj: 'requirement' },
    { re: /\brepository\b/i, obj: 'repository' },
  ];

  let obj = 'resource';
  for (const { re, obj: o } of objectPatterns) {
    if (re.test(text)) { obj = o; break; }
  }

  return { actor, action, object: obj };
}

/**
 * Derive a meaningful module name from a section heading line.
 * Avoids generic placeholders like "General Requirements".
 */
function deriveMeaningfulModule(line, documentName) {
  const clean = line
    .replace(/^[\s#*\-•0-9.]+/, '')
    .replace(/[:\-#]/g, '')
    .trim();

  if (!clean || clean.length < 3) {
    // Fall back to document name without extension
    return documentName.replace(/\.[^/.]+$/, '').replace(/[_\-]/g, ' ').trim() || 'Core Features';
  }

  // If the line is just a generic phrase, use document name
  const genericPhrases = /^(general|overview|introduction|scope|purpose|background|summary|abstract|contents|index|preamble|foreword|preface|notes?|remarks?)$/i;
  if (genericPhrases.test(clean)) {
    return documentName.replace(/\.[^/.]+$/, '').replace(/[_\-]/g, ' ').trim() || 'Core Features';
  }

  return clean.substring(0, 50);
}

export function extractRequirementsHeuristically(documentName, content) {
  const reqs = [];
  const lines = content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Derive default module from document name instead of "General Requirements"
  const docBaseName = documentName.replace(/\.[^/.]+$/, '').replace(/[_\-]/g, ' ').trim();
  let currentModule = docBaseName || 'Core Features';
  let reqCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (
      /^(Module|Section|Category|Feature|Epic|System|Chapter)\s*[:\-\d]/i.test(line) ||
      (/^[A-Z][A-Za-z0-9\s]{2,35}:$/.test(line) && !line.toLowerCase().includes('http')) ||
      /^#{1,3}\s+(.+)/.test(line)
    ) {
      currentModule = deriveMeaningfulModule(line, documentName);
      continue;
    }

    const isReqLine =
      /^(REQ|FR|NFR|US|Task|Requirement|Feature)\b/i.test(line) ||
      /^[*\-•]\s+([A-Z])/.test(line) ||
      /^[0-9]+\.\s+([A-Z])/.test(line) ||
      /\b(shall|must|will|should|provide|allow|enable|manage|track|process|create|display|store|handle)\b/i.test(
        line
      );

    if (isReqLine && line.length > 10) {
      const cleanText = line
        .replace(/^[*\-•0-9.\s]+/, '')
        .replace(/^(REQ|FR|NFR|US|Task|Requirement|Feature)[\-:\d\s]*/i, '')
        .trim();

      if (cleanText.length > 5) {
        const title = cleanText.split(/[.:\-]/)[0].trim().substring(0, 60);
        const description = cleanText;

        const words = cleanText
          .replace(/[^a-zA-Z0-9\s]/g, '')
          .split(/\s+/)
          .filter(
            (w) =>
              w.length >= 4 &&
              !['shall', 'must', 'will', 'should', 'allow', 'enable', 'with', 'from', 'that', 'this', 'have', 'user', 'system'].includes(
                w.toLowerCase()
              )
          );

        const components = [];
        const uniqueWords = Array.from(new Set(words)).slice(0, 3);

        uniqueWords.forEach((w) => {
          const capWord = w.charAt(0).toUpperCase() + w.slice(1);
          components.push(`${capWord} Component`, `${capWord} Handler`);
        });

        if (components.length === 0) {
          components.push(`${title.split(' ')[0]} Service`, `${title.split(' ')[0]} Controller`);
        }

        const isNonFunc = /\b(security|performance|latency|encryption|backup|scale|auth|audit|logging|speed)\b/i.test(
          cleanText
        );
        const priority = /\b(must|critical|shall|high|essential)\b/i.test(cleanText)
          ? 'High'
          : /\b(medium|should|expected)\b/i.test(cleanText)
          ? 'Medium'
          : 'Low';

        const { actor, action, object } = extractActorActionObject(title, description);
        reqs.push({
          id: `REQ-${String(reqCounter++).padStart(3, '0')}`,
          title: title || `Requirement ${reqCounter}`,
          module: currentModule || 'Core Features',
          priority,
          category: isNonFunc ? 'Non-Functional' : 'Functional',
          expectedComponents: Array.from(new Set(components)).slice(0, 4),
          description,
          actor,
          action,
          object,
          acceptanceCriteria: generateAcceptanceCriteria(title, description),
        });
      }
    }
  }

  if (reqs.length === 0) {
    const paragraphs = content
      .split(/\n\n+|\r\n\r\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 15);

    if (paragraphs.length > 0) {
      paragraphs.slice(0, 8).forEach((para, idx) => {
        // Extract a meaningful title: prefer the first sentence, strip boilerplate verbs
        const firstSentence = para.split(/[.\n]/)[0].trim();
        const cleanTitle = firstSentence
          .replace(/^(the system shall|the system should|the application shall|users? (shall|should|must|can)|it (shall|should|must))/i, '')
          .trim()
          .substring(0, 60);
        const title = cleanTitle.length > 5 ? cleanTitle : (docBaseName ? `${docBaseName} Requirement ${idx + 1}` : `Requirement ${idx + 1}`);

        const words = para
          .replace(/[^a-zA-Z0-9\s]/g, '')
          .split(/\s+/)
          .filter(
            (w) => w.length >= 4 && !['shall', 'must', 'will', 'should', 'allow', 'enable', 'system'].includes(w.toLowerCase())
          );

        const uniqueWords = Array.from(new Set(words)).slice(0, 3);
        const components = uniqueWords.map((w) => `${w.charAt(0).toUpperCase() + w.slice(1)} Controller`);

        const { actor: pActor, action: pAction, object: pObj } = extractActorActionObject(title, para);
        reqs.push({
          id: `REQ-${String(idx + 1).padStart(3, '0')}`,
          title,
          module: currentModule || 'Core Specification',
          priority: idx < 3 ? 'High' : 'Medium',
          category: 'Functional',
          expectedComponents: components.length > 0 ? components : ['Core Controller', 'Service Handler'],
          description: para.substring(0, 200),
          actor: pActor,
          action: pAction,
          object: pObj,
          acceptanceCriteria: generateAcceptanceCriteria(title, para),
        });
      });
    } else {
      const cleanDocName = documentName.replace(/\.[^/.]+$/, '');
      reqs.push({
        id: 'REQ-001',
        title: `${cleanDocName} Specification`,
        module: 'Core Module',
        priority: 'High',
        category: 'Functional',
        expectedComponents: [`${cleanDocName} Handler`, 'Data Controller', 'API Endpoint'],
        description: `Functional software requirements extracted from ${documentName}.`,
        actor: 'user',
        action: 'use',
        object: cleanDocName.toLowerCase(),
        acceptanceCriteria: generateAcceptanceCriteria(cleanDocName + ' Specification', ''),
      });
    }
  }

  return reqs.slice(0, 10);
}

export function calculateCoverage(found, expected) {
  if (!expected || expected.length === 0) return 100;
  return Math.min(100, Math.round((found.length / expected.length) * 100));
}

export function extractModulesFromPaths(fileTree) {
  const modulesSet = new Set();
  fileTree.forEach((filePath) => {
    const parts = filePath.split('/');
    if (parts.length > 1) {
      const topDir = parts[0] === 'src' && parts.length > 2 ? parts[1] : parts[0];
      if (topDir && !topDir.includes('.') && topDir !== 'node_modules' && topDir !== 'dist' && topDir !== 'public') {
        const formatted = topDir.charAt(0).toUpperCase() + topDir.slice(1);
        modulesSet.add(formatted);
      }
    }
  });
  if (modulesSet.size === 0) {
    modulesSet.add('Core Codebase');
  }
  return Array.from(modulesSet);
}

export function splitDocumentIntoSections(content) {
  const lines = content.split('\n').filter((l) => l.trim().length > 0);
  const sections = [];
  let currentTitle = 'Overview & Scope';
  let currentContent = [];

  for (const line of lines) {
    if (/^[1-9]\.|\b(Section|Module|Requirement|Sprint|Objective)\b/i.test(line) && line.length < 80) {
      if (currentContent.length > 0) {
        sections.push({
          id: `sec-${sections.length + 1}`,
          title: currentTitle,
          content: currentContent.join('\n'),
          headings: [currentTitle],
        });
      }
      currentTitle = line.trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentContent.length > 0) {
    sections.push({
      id: `sec-${sections.length + 1}`,
      title: currentTitle,
      content: currentContent.join('\n'),
      headings: [currentTitle],
    });
  }

  return sections;
}
