import { extractModulesFromPaths } from './heuristics.js';
import { buildCodeGraph } from './codeGraphService.js';


export function parseGithubUrl(githubUrl) {
  if (!githubUrl) return null;
  const match = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  return { owner: match[1], repoName: match[2].replace(/\.git$/, '') };
}

async function githubFetch(url) {
  const headers = {
    'User-Agent': 'ProjectLens-AI',
    Accept: 'application/vnd.github.v3+json',
  };
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  }
  return fetch(url, { headers });
}

export async function analyzeGithubRepo(githubUrl, expectedRequirements) {
  const parsed = parseGithubUrl(githubUrl);
  if (!parsed) {
    const err = new Error(
      'Invalid GitHub URL format. Please provide a valid repository URL like https://github.com/owner/repository'
    );
    err.statusCode = 400;
    throw err;
  }
  const { owner, repoName } = parsed;

  const repoRes = await githubFetch(`https://api.github.com/repos/${owner}/${repoName}`);
  if (!repoRes.ok) {
    const statusText = repoRes.status === 404 ? 'Repository not found or is private' : 'GitHub API limit reached or invalid repository';
    const err = new Error(`GitHub Repository analysis failed: ${statusText}`);
    err.statusCode = repoRes.status;
    throw err;
  }
  const repoData = await repoRes.json();
  const defaultBranch = repoData.default_branch || 'main';

  let fileTree = [];
  try {
    const treeRes = await githubFetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/trees/${defaultBranch}?recursive=1`
    );
    if (treeRes.ok) {
      const treeData = await treeRes.json();
      if (Array.isArray(treeData.tree)) {
        fileTree = treeData.tree.filter((item) => item.type === 'blob').map((item) => item.path);
      }
    }
  } catch (e) {
    console.warn('Could not fetch git tree:', e.message);
  }

  let commits = [];
  try {
    const commitsRes = await githubFetch(`https://api.github.com/repos/${owner}/${repoName}/commits?per_page=30`);
    if (commitsRes.ok) {
      const commitsData = await commitsRes.json();
      if (Array.isArray(commitsData)) {
        commits = commitsData.map((c) => ({
          hash: c.sha ? c.sha.substring(0, 7) : 'head',
          message: c.commit?.message ? c.commit.message.split('\n')[0] : 'Commit',
          author: c.commit?.author?.name || c.author?.login || 'Contributor',
          date: c.commit?.author?.date ? c.commit.author.date.split('T')[0] : new Date().toISOString().split('T')[0],
          filesChanged: [],
          moduleRef: '',
        }));
      }
    }
  } catch (e) {
    console.warn('Could not fetch commits:', e.message);
  }

  let pullRequests = [];
  try {
    const prsRes = await githubFetch(`https://api.github.com/repos/${owner}/${repoName}/pulls?state=all&per_page=30`);
    if (prsRes.ok) {
      const prsData = await prsRes.json();
      if (Array.isArray(prsData)) {
        pullRequests = prsData.map((pr) => ({
          id: pr.number,
          title: pr.title,
          state: pr.state === 'closed' && pr.merged_at ? 'merged' : pr.state,
          author: pr.user?.login || 'Contributor',
          mergedAt: pr.merged_at ? pr.merged_at.split('T')[0] : undefined,
          relatedModule: '',
        }));
      }
    }
  } catch (e) {
    console.warn('Could not fetch pull requests:', e.message);
  }

  let issues = [];
  try {
    const issuesRes = await githubFetch(`https://api.github.com/repos/${owner}/${repoName}/issues?state=all&per_page=30`);
    if (issuesRes.ok) {
      const issuesData = await issuesRes.json();
      if (Array.isArray(issuesData)) {
        issues = issuesData
          .filter((iss) => !iss.pull_request)
          .map((iss) => ({
            id: iss.number,
            title: iss.title,
            state: iss.state,
            labels: Array.isArray(iss.labels) ? iss.labels.map((l) => (typeof l === 'string' ? l : l.name)) : [],
            relatedModule: '',
          }));
      }
    }
  } catch (e) {
    console.warn('Could not fetch issues:', e.message);
  }

  const reqList = expectedRequirements || [];
  const moduleNames = Array.from(
    new Set(reqList.length > 0 ? reqList.map((r) => r.module) : extractModulesFromPaths(fileTree))
  );

  const detectedModules = [];

  for (const mod of moduleNames) {
    const modLower = mod.toLowerCase();
    const modClean = modLower.replace(/[^a-z0-9]/g, '');

    const moduleFiles = fileTree.filter((p) => {
      const pLower = p.toLowerCase();
      return pLower.includes(modLower) || (modClean.length > 3 && pLower.includes(modClean));
    });

    const controllers = fileTree.filter((p) => {
      const pLower = p.toLowerCase();
      return (
        (pLower.includes('controller') || pLower.includes('/controllers/')) &&
        (moduleFiles.includes(p) || pLower.includes(modClean) || reqList.length === 0)
      );
    });

    const services = fileTree.filter((p) => {
      const pLower = p.toLowerCase();
      return (
        (pLower.includes('service') || pLower.includes('/services/')) &&
        (moduleFiles.includes(p) || pLower.includes(modClean) || reqList.length === 0)
      );
    });

    const models = fileTree.filter((p) => {
      const pLower = p.toLowerCase();
      return (
        (pLower.includes('model') || pLower.includes('schema') || pLower.includes('entity') || pLower.includes('/models/')) &&
        (moduleFiles.includes(p) || pLower.includes(modClean) || reqList.length === 0)
      );
    });

    const pages = fileTree.filter((p) => {
      const pLower = p.toLowerCase();
      return (
        (pLower.includes('page') || pLower.includes('/pages/') || pLower.includes('/views/')) &&
        (moduleFiles.includes(p) || pLower.includes(modClean) || reqList.length === 0)
      );
    });

    const components = fileTree.filter((p) => {
      const pLower = p.toLowerCase();
      return (
        (pLower.includes('component') || pLower.includes('/components/')) &&
        (moduleFiles.includes(p) || pLower.includes(modClean) || reqList.length === 0)
      );
    });

    const routes = fileTree.filter((p) => {
      const pLower = p.toLowerCase();
      return (
        (pLower.includes('route') || pLower.includes('api') || pLower.includes('/routes/')) &&
        (moduleFiles.includes(p) || pLower.includes(modClean) || reqList.length === 0)
      );
    });

    const apis = routes.map((r) => `/${r.replace(/\\/g, '/')}`);

    const configs = fileTree.filter((p) => {
      const pLower = p.toLowerCase();
      return pLower.includes('config') || pLower.includes('package.json') || pLower.includes('tsconfig');
    });

    const hasFiles =
      moduleFiles.length > 0 ||
      controllers.length > 0 ||
      services.length > 0 ||
      models.length > 0 ||
      pages.length > 0 ||
      components.length > 0;

    let status = 'Missing';
    if (hasFiles) {
      status = controllers.length > 0 || services.length > 0 ? 'Implemented' : 'Partial';
    }

    commits.forEach((c) => {
      if (!c.moduleRef && (c.message.toLowerCase().includes(modLower) || (modClean.length > 3 && c.message.toLowerCase().includes(modClean)))) {
        c.moduleRef = mod;
      }
    });

    pullRequests.forEach((pr) => {
      if (!pr.relatedModule && pr.title.toLowerCase().includes(modLower)) {
        pr.relatedModule = mod;
      }
    });

    issues.forEach((iss) => {
      if (!iss.relatedModule && (iss.title.toLowerCase().includes(modLower) || iss.labels.some((l) => l.toLowerCase().includes(modLower)))) {
        iss.relatedModule = mod;
      }
    });

    detectedModules.push({
      name: mod,
      controllers: controllers.slice(0, 10),
      services: services.slice(0, 10),
      apis: apis.slice(0, 10),
      routes: routes.slice(0, 10),
      models: models.slice(0, 10),
      pages: pages.slice(0, 10),
      components: components.slice(0, 10),
      configs: configs.slice(0, 5),
      commitsCount: commits.filter((c) => c.moduleRef === mod).length,
      prsCount: pullRequests.filter((pr) => pr.relatedModule === mod).length,
      issuesCount: issues.filter((iss) => iss.relatedModule === mod).length,
      status,
    });
  }

  if (detectedModules.length > 0) {
    commits.forEach((c) => {
      if (!c.moduleRef) c.moduleRef = detectedModules[0].name;
    });
    pullRequests.forEach((pr) => {
      if (!pr.relatedModule) pr.relatedModule = detectedModules[0].name;
    });
    issues.forEach((iss) => {
      if (!iss.relatedModule) iss.relatedModule = detectedModules[0].name;
    });
  }

  return {
    repoName: repoData.name || repoName,
    owner: repoData.owner?.login || owner,
    defaultBranch,
    stars: repoData.stargazers_count ?? 0,
    openIssuesCount: repoData.open_issues_count ?? issues.length,
    detectedModules,
    commits,
    pullRequests,
    issues,
    fileTree,
    codeGraph: buildCodeGraph(fileTree),
    lastAnalyzedAt: new Date().toISOString(),
  };
}
