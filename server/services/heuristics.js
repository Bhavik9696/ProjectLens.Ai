// Dynamic heuristic fallback for requirement extraction when Gemini API
// is unavailable or not configured. Ported from the original server.ts.
export function extractRequirementsHeuristically(documentName, content) {
  const reqs = [];
  const lines = content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let currentModule = 'General Requirements';
  let reqCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (
      /^(Module|Section|Category|Feature|Epic|System|Chapter)\s*[:\-\d]/i.test(line) ||
      (/^[A-Z][A-Za-z0-9\s]{2,35}:$/.test(line) && !line.toLowerCase().includes('http')) ||
      /^#{1,3}\s+(.+)/.test(line)
    ) {
      currentModule = line.replace(/[:\-#]/g, '').trim();
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

        reqs.push({
          id: `REQ-${String(reqCounter++).padStart(3, '0')}`,
          title: title || `Requirement ${reqCounter}`,
          module: currentModule || 'Core Features',
          priority,
          category: isNonFunc ? 'Non-Functional' : 'Functional',
          expectedComponents: Array.from(new Set(components)).slice(0, 4),
          description,
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
        const titleLine = para.split(/[.\n]/)[0].trim().substring(0, 60);
        const title = titleLine || `Specification Requirement ${idx + 1}`;

        const words = para
          .replace(/[^a-zA-Z0-9\s]/g, '')
          .split(/\s+/)
          .filter(
            (w) => w.length >= 4 && !['shall', 'must', 'will', 'should', 'allow', 'enable', 'system'].includes(w.toLowerCase())
          );

        const uniqueWords = Array.from(new Set(words)).slice(0, 3);
        const components = uniqueWords.map((w) => `${w.charAt(0).toUpperCase() + w.slice(1)} Controller`);

        reqs.push({
          id: `REQ-${String(idx + 1).padStart(3, '0')}`,
          title,
          module: currentModule || 'Core Specification',
          priority: idx < 3 ? 'High' : 'Medium',
          category: 'Functional',
          expectedComponents: components.length > 0 ? components : ['Core Controller', 'Service Handler'],
          description: para.substring(0, 200),
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
