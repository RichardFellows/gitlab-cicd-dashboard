#!/usr/bin/env node
/**
 * Mock GitLab API Server
 * Returns realistic generated data for all endpoints used by the dashboard.
 * 
 * Usage:
 *   node scripts/mock-gitlab-api.mjs
 *   MOCK_PORT=4000 node scripts/mock-gitlab-api.mjs
 */

import http from 'node:http';
import { URL } from 'node:url';

const PORT = parseInt(process.env.MOCK_PORT || '4000', 10);

// ─── Seeded PRNG for deterministic output ───────────────────────────
let seed = 42;
function rand() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}
function randInt(min, max) { return Math.floor(rand() * (max - min + 1)) + min; }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }

// ─── Reference data ─────────────────────────────────────────────────
const GROUP_ID = 99001;
const GROUP = { id: GROUP_ID, name: 'acme-platform', full_path: 'acme/acme-platform', path: 'acme-platform', web_url: 'https://gitlab.com/acme/acme-platform' };

const PROJECT_DEFS = [
  { name: 'payment-service',    lang: 'Java',       coverage: 87.3 },
  { name: 'auth-gateway',       lang: 'Go',         coverage: 92.1 },
  { name: 'order-processor',    lang: 'Python',     coverage: 74.6 },
  { name: 'notification-hub',   lang: 'TypeScript', coverage: 81.2 },
  { name: 'user-dashboard',     lang: 'React/TS',   coverage: 68.9 },
  { name: 'api-gateway',        lang: 'Go',         coverage: 88.4 },
  { name: 'data-pipeline',      lang: 'Python',     coverage: 55.7 },
  { name: 'infra-toolkit',      lang: 'Terraform',  coverage: null },
  { name: 'mobile-bff',         lang: 'Kotlin',     coverage: 79.1 },
  { name: 'report-engine',      lang: 'C#',         coverage: 62.3 },
  { name: 'search-indexer',     lang: 'Rust',       coverage: 91.8 },
  { name: 'legacy-monolith',    lang: 'PHP',        coverage: 31.2 },
];

const AUTHORS = [
  { id: 1001, name: 'Sarah Chen',       username: 'schen' },
  { id: 1002, name: 'Marcus Johnson',   username: 'mjohnson' },
  { id: 1003, name: 'Priya Patel',      username: 'ppatel' },
  { id: 1004, name: 'Alex Kowalski',    username: 'akowalski' },
  { id: 1005, name: 'James Morrison',   username: 'jmorrison' },
  { id: 1006, name: 'Li Wei',           username: 'lwei' },
  { id: 1007, name: 'Emma Torres',      username: 'etorres' },
  { id: 1008, name: 'David Kim',        username: 'dkim' },
];

const JIRA_KEYS = ['PAY', 'AUTH', 'ORD', 'NOT', 'USR', 'API', 'DAT', 'INF', 'MOB', 'RPT', 'SRC', 'LEG'];
const BRANCH_VERBS = ['add', 'fix', 'update', 'refactor', 'implement', 'migrate', 'improve', 'remove'];
const BRANCH_NOUNS = ['caching', 'validation', 'logging', 'auth-flow', 'retry-logic', 'pagination', 'rate-limiting', 'error-handling', 'metrics', 'healthcheck', 'db-migration', 'api-versioning'];
const COMMIT_PREFIXES = ['feat:', 'fix:', 'chore:', 'refactor:', 'test:', 'docs:', 'perf:', 'ci:'];
const COMMIT_MSGS = [
  'add retry logic for external API calls',
  'fix null pointer in payment validation',
  'update dependencies to latest versions',
  'refactor auth middleware for clarity',
  'implement rate limiting on public endpoints',
  'add integration tests for order flow',
  'fix flaky test in notification service',
  'improve error messages for debugging',
  'migrate database schema to v3',
  'add structured logging with correlation IDs',
  'fix race condition in concurrent processing',
  'update CI pipeline to use parallel jobs',
  'implement circuit breaker pattern',
  'add health check endpoint',
  'fix memory leak in connection pool',
  'refactor configuration loading',
  'add OpenTelemetry tracing',
  'fix incorrect status code on 404',
  'improve query performance with indexing',
  'update API documentation',
];

const STAGES = ['build', 'test', 'lint', 'security', 'deploy'];
const JOB_NAMES_BY_STAGE = {
  build:    ['compile', 'docker-build', 'package'],
  test:     ['unit-test', 'integration-test', 'e2e-test'],
  lint:     ['eslint', 'sonarqube', 'code-style'],
  security: ['sast', 'dependency-scan', 'container-scan'],
  deploy:   ['deploy-to-dev', 'deploy-to-sit', 'deploy-to-uat', 'deploy-to-prod'],
};

const PIPELINE_STATUSES = ['success', 'success', 'success', 'success', 'success', 'success', 'failed', 'failed', 'running', 'canceled'];

const FAILURE_REASONS = [
  'script_failure',
  'runner_system_failure',
  'stuck_or_timeout_failure',
];

// ─── Time helpers ───────────────────────────────────────────────────
const NOW = new Date();
function daysAgo(n) { return new Date(NOW.getTime() - n * 86400000); }
function hoursAgo(n) { return new Date(NOW.getTime() - n * 3600000); }
function minutesAgo(n) { return new Date(NOW.getTime() - n * 60000); }
function iso(d) { return d.toISOString(); }
function sha() { return Array.from({ length: 40 }, () => '0123456789abcdef'[randInt(0, 15)]).join(''); }
function shortSha(s) { return s.slice(0, 8); }

// ─── Generate projects ──────────────────────────────────────────────
const projects = PROJECT_DEFS.map((def, i) => {
  const id = 50001 + i;
  return {
    id,
    name: def.name,
    path: def.name,
    path_with_namespace: `acme/acme-platform/${def.name}`,
    web_url: `https://gitlab.com/acme/acme-platform/${def.name}`,
    default_branch: 'main',
    _lang: def.lang,
    _baseCoverage: def.coverage,
  };
});

// ─── Generate pipelines per project ─────────────────────────────────
const pipelinesByProject = {};
const pipelineDetails = {};

for (const proj of projects) {
  const pipelines = [];
  const count = proj.name === 'infra-toolkit' ? 3 : randInt(15, 40);

  for (let p = 0; p < count; p++) {
    const pid = proj.id * 1000 + p;
    const status = pick(PIPELINE_STATUSES);
    const createdAt = daysAgo(rand() * 30);
    const duration = randInt(120, 900); // 2-15 min
    const cov = proj._baseCoverage != null ? (proj._baseCoverage + (rand() - 0.5) * 8).toFixed(1) : null;

    const pipeline = {
      id: pid,
      iid: p + 1,
      status,
      ref: p === 0 ? 'main' : (rand() > 0.3 ? 'main' : `feature/${pick(JIRA_KEYS)}-${randInt(100, 999)}-${pick(BRANCH_NOUNS)}`),
      web_url: `${proj.web_url}/-/pipelines/${pid}`,
      created_at: iso(createdAt),
      updated_at: iso(new Date(createdAt.getTime() + duration * 1000)),
      finished_at: status !== 'running' ? iso(new Date(createdAt.getTime() + duration * 1000)) : undefined,
      duration: status !== 'running' ? duration : undefined,
      coverage: cov,
    };
    pipelines.push(pipeline);

    // Detailed version includes same data
    pipelineDetails[pid] = { ...pipeline };
  }

  // Sort newest first
  pipelines.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  pipelinesByProject[proj.id] = pipelines;
}

// ─── Generate jobs per pipeline ─────────────────────────────────────
const jobsByPipeline = {};

for (const proj of projects) {
  for (const pipeline of pipelinesByProject[proj.id]) {
    const jobs = [];
    let jobId = pipeline.id * 100;
    const pipelineCreated = new Date(pipeline.created_at);

    for (const stage of STAGES) {
      const stageJobs = JOB_NAMES_BY_STAGE[stage];
      // Not every pipeline has deploy jobs
      if (stage === 'deploy' && rand() > 0.4) continue;

      for (const jobName of stageJobs) {
        // Skip some jobs randomly
        if (rand() > 0.7 && stage !== 'build') continue;

        jobId++;
        const jobDuration = randInt(10, 180);
        let jobStatus;
        if (pipeline.status === 'failed' && stage === pick(['test', 'build', 'deploy']) && rand() > 0.5) {
          jobStatus = 'failed';
        } else if (pipeline.status === 'running' && rand() > 0.7) {
          jobStatus = 'running';
        } else {
          jobStatus = 'success';
        }

        const startedAt = new Date(pipelineCreated.getTime() + randInt(5, 60) * 1000);
        const finishedAt = jobStatus !== 'running' ? new Date(startedAt.getTime() + jobDuration * 1000) : undefined;

        jobs.push({
          id: jobId,
          name: jobName,
          stage,
          status: jobStatus,
          web_url: `${proj.web_url}/-/jobs/${jobId}`,
          created_at: iso(pipelineCreated),
          started_at: iso(startedAt),
          finished_at: finishedAt ? iso(finishedAt) : undefined,
          duration: jobDuration,
          failure_reason: jobStatus === 'failed' ? pick(FAILURE_REASONS) : undefined,
          pipeline: { id: pipeline.id, ref: pipeline.ref },
        });
      }
    }

    jobsByPipeline[pipeline.id] = jobs;
  }
}

// ─── Generate merge requests per project ────────────────────────────
const mrsByProject = {};

for (const proj of projects) {
  const mrs = [];
  const mrCount = randInt(0, 5);
  const jiraKey = JIRA_KEYS[projects.indexOf(proj)];

  for (let m = 0; m < mrCount; m++) {
    const mrIid = m + 1;
    const author = pick(AUTHORS);
    const ticketNum = randInt(100, 999);
    const noun = pick(BRANCH_NOUNS);
    const verb = pick(BRANCH_VERBS);
    const branch = `feature/${jiraKey}-${ticketNum}-${verb}-${noun}`;
    const isDraft = rand() > 0.8;
    const createdAt = daysAgo(randInt(1, 14));
    const updatedAt = hoursAgo(randInt(1, 48));

    // Pick a pipeline for this MR
    const pipelines = pipelinesByProject[proj.id];
    const headPipeline = pipelines.length > 0 ? pipelines[randInt(0, Math.min(4, pipelines.length - 1))] : null;

    const mr = {
      id: proj.id * 100 + m,
      iid: mrIid,
      title: isDraft ? `Draft: ${verb} ${noun} for ${jiraKey}-${ticketNum}` : `${pick(COMMIT_PREFIXES)} ${verb} ${noun} for ${jiraKey}-${ticketNum}`,
      description: `Implements ${jiraKey}-${ticketNum}\n\n## Changes\n- ${verb} ${noun}\n- Updated tests\n- Added documentation`,
      state: 'opened',
      created_at: iso(createdAt),
      updated_at: iso(updatedAt),
      source_branch: branch,
      target_branch: 'main',
      web_url: `${proj.web_url}/-/merge_requests/${mrIid}`,
      draft: isDraft,
      author,
      head_pipeline: headPipeline ? {
        id: headPipeline.id,
        status: headPipeline.status,
        web_url: headPipeline.web_url,
        created_at: headPipeline.created_at,
        updated_at: headPipeline.updated_at,
      } : null,
    };
    mrs.push(mr);
  }
  mrsByProject[proj.id] = mrs;
}

// ─── Generate commits ───────────────────────────────────────────────
function makeCommits(projectId, count = 3) {
  const commits = [];
  for (let i = 0; i < count; i++) {
    const s = sha();
    const author = pick(AUTHORS);
    commits.push({
      id: s,
      short_id: shortSha(s),
      title: `${pick(COMMIT_PREFIXES)} ${pick(COMMIT_MSGS)}`,
      message: `${pick(COMMIT_PREFIXES)} ${pick(COMMIT_MSGS)}\n\nSigned-off-by: ${author.name}`,
      author_name: author.name,
      committer_name: author.name,
      created_at: iso(hoursAgo(randInt(1, 72))),
      web_url: `https://gitlab.com/acme/acme-platform/-/commit/${s}`,
    });
  }
  return commits;
}

// ─── Test reports ───────────────────────────────────────────────────
function makeTestReport(projectId) {
  const proj = projects.find(p => p.id === projectId);
  if (!proj || proj._baseCoverage == null) {
    return { total: 0, success: 0, failed: 0, skipped: 0, available: false };
  }
  const total = randInt(50, 500);
  const failed = rand() > 0.7 ? randInt(1, 8) : 0;
  const skipped = randInt(0, 15);
  return {
    total,
    success: total - failed - skipped,
    failed,
    skipped,
    available: true,
  };
}

// ─── MR Notes (signoffs) ───────────────────────────────────────────
function makeMRNotes(projectId, mrIid) {
  const notes = [];
  const noteCount = randInt(1, 4);
  for (let i = 0; i < noteCount; i++) {
    const author = pick(AUTHORS);
    const env = pick(['dev', 'sit', 'uat']);
    notes.push({
      id: projectId * 10000 + mrIid * 100 + i,
      body: rand() > 0.5
        ? `/signoff v${randInt(1, 3)}.${randInt(0, 20)}.${randInt(0, 9)} ${env}`
        : `Looks good! Tested on ${env} environment. LGTM 👍`,
      author: { id: author.id, username: author.username, name: author.name },
      created_at: iso(hoursAgo(randInt(1, 48))),
      system: false,
    });
  }
  return notes;
}

// ─── Job trace (realistic CI log) ───────────────────────────────────
function makeJobTrace(jobId) {
  const lines = [
    'Running with gitlab-runner 17.8.0 (abc12345)',
    '  on runner-acme-shared-01 xY1z2W3',
    'Preparing the "docker" executor',
    'Using Docker executor with image node:20-alpine ...',
    'Pulling docker image node:20-alpine ...',
    'Using docker image sha256:a1b2c3d4e5f6 for node:20-alpine with digest node@sha256:deadbeef ...',
    'Preparing environment',
    'Running on runner-acme-shared-01-concurrent-3 via runner-host-01...',
    '$ npm ci --prefer-offline',
    'npm warn deprecated @humanwhocodes/config-array@0.11.14',
    'added 1247 packages in 28s',
    '$ npm run build',
    '> acme-service@2.4.1 build',
    '> tsc && vite build',
    'vite v5.1.0 building for production...',
    '✓ 487 modules transformed.',
    'dist/index.html                 0.45 kB │ gzip:  0.29 kB',
    'dist/assets/index-Bk3sfJ2l.css  45.32 kB │ gzip: 8.12 kB',
    'dist/assets/index-Da1bR4ek.js  312.67 kB │ gzip: 89.45 kB',
    '✓ built in 4.21s',
    '$ npm test -- --coverage',
    '',
    ' PASS  src/services/PaymentService.test.ts',
    ' PASS  src/utils/validation.test.ts',
    ' PASS  src/middleware/auth.test.ts',
    ' PASS  src/routes/api.test.ts',
    ' FAIL  src/services/NotificationService.test.ts',
    '  ● NotificationService › should retry on transient failure',
    '',
    '    expect(received).toBe(expected) // Object.is equality',
    '',
    '    Expected: 3',
    '    Received: 2',
    '',
    '      42 |     await service.send(notification);',
    '      43 |     expect(mockRetry).toHaveBeenCalledTimes(3);',
    '         |                       ^',
    '      44 |   });',
    '',
    'Test Suites: 1 failed, 47 passed, 48 total',
    'Tests:       1 failed, 312 passed, 313 total',
    'Snapshots:   0 total',
    'Time:        12.847 s',
    'Ran all test suites.',
    '',
    '----------|---------|----------|---------|---------|',
    'File      | % Stmts | % Branch | % Funcs | % Lines |',
    '----------|---------|----------|---------|---------|',
    'All files |   87.32 |    74.18 |   82.45 |   86.91 |',
    '----------|---------|----------|---------|---------|',
    '',
    'Uploading artifacts for failed job',
    'Job succeeded',
  ];
  return lines.join('\n');
}

// ─── Deploy info artifact ───────────────────────────────────────────
function makeDeployInfo(projectId) {
  const major = randInt(1, 4);
  const minor = randInt(0, 20);
  const patch = randInt(0, 9);
  return { version: `${major}.${minor}.${patch}` };
}

// ─── CODEOWNERS ─────────────────────────────────────────────────────
const CODEOWNERS_CONTENT = `# Code Owners for acme-platform
* @schen @mjohnson
/src/services/ @ppatel @akowalski
/deploy/ @jmorrison @lwei
/docs/ @etorres
`;
const CODEOWNERS_B64 = Buffer.from(CODEOWNERS_CONTENT).toString('base64');

// ─── Router ─────────────────────────────────────────────────────────
function route(method, pathname, query) {
  // Health check
  if (pathname === '/health') return { status: 200, body: { ok: true, projects: projects.length } };

  // Strip /api/v4 prefix
  const path = pathname.replace(/^\/api\/v4/, '');

  // GET /groups/:id
  let m;

  m = path.match(/^\/groups\/(\d+)\/projects$/);
  if (m) {
    const gid = parseInt(m[1]);
    if (gid !== GROUP_ID) return { status: 404, body: { message: 'Group not found' } };
    // Return projects without internal fields
    return { status: 200, body: projects.map(({ _lang, _baseCoverage, ...p }) => p) };
  }

  m = path.match(/^\/groups\/(\d+)$/);
  if (m) {
    const gid = parseInt(m[1]);
    if (gid !== GROUP_ID) return { status: 404, body: { message: 'Group not found' } };
    return { status: 200, body: GROUP };
  }

  // GET /projects/:id/pipelines/latest/test_report
  m = path.match(/^\/projects\/(\d+)\/pipelines\/latest\/test_report$/);
  if (m) {
    const pid = parseInt(m[1]);
    return { status: 200, body: makeTestReport(pid) };
  }

  // GET /projects/:id/pipelines/:pipelineId/jobs
  m = path.match(/^\/projects\/(\d+)\/pipelines\/(\d+)\/jobs$/);
  if (m) {
    const pipelineId = parseInt(m[2]);
    return { status: 200, body: jobsByPipeline[pipelineId] || [] };
  }

  // GET /projects/:id/pipelines/:pipelineId
  m = path.match(/^\/projects\/(\d+)\/pipelines\/(\d+)$/);
  if (m) {
    const pipelineId = parseInt(m[2]);
    const detail = pipelineDetails[pipelineId];
    if (!detail) return { status: 404, body: { message: 'Pipeline not found' } };
    return { status: 200, body: detail };
  }

  // GET /projects/:id/pipelines
  m = path.match(/^\/projects\/(\d+)\/pipelines$/);
  if (m) {
    const pid = parseInt(m[1]);
    let pipelines = pipelinesByProject[pid] || [];
    const ref = query.get('ref');
    if (ref) pipelines = pipelines.filter(p => p.ref === ref);
    const perPage = parseInt(query.get('per_page') || '100');
    return { status: 200, body: pipelines.slice(0, perPage) };
  }

  // GET /projects/:id/merge_requests/:iid/commits
  m = path.match(/^\/projects\/(\d+)\/merge_requests\/(\d+)\/commits$/);
  if (m) {
    const pid = parseInt(m[1]);
    return { status: 200, body: makeCommits(pid, 3) };
  }

  // GET /projects/:id/merge_requests/:iid/pipelines
  m = path.match(/^\/projects\/(\d+)\/merge_requests\/(\d+)\/pipelines$/);
  if (m) {
    const pid = parseInt(m[1]);
    const pipelines = pipelinesByProject[pid] || [];
    return { status: 200, body: pipelines.slice(0, 3) };
  }

  // GET /projects/:id/merge_requests/:iid/notes
  m = path.match(/^\/projects\/(\d+)\/merge_requests\/(\d+)\/notes$/);
  if (m) {
    const pid = parseInt(m[1]);
    const mrIid = parseInt(m[2]);
    return { status: 200, body: makeMRNotes(pid, mrIid) };
  }

  // GET /projects/:id/merge_requests
  m = path.match(/^\/projects\/(\d+)\/merge_requests$/);
  if (m) {
    const pid = parseInt(m[1]);
    return { status: 200, body: mrsByProject[pid] || [] };
  }

  // GET /projects/:id/repository/commits
  m = path.match(/^\/projects\/(\d+)\/repository\/commits$/);
  if (m) {
    const pid = parseInt(m[1]);
    const perPage = parseInt(query.get('per_page') || '3');
    return { status: 200, body: makeCommits(pid, perPage) };
  }

  // GET /projects/:id/jobs/:jobId/trace
  m = path.match(/^\/projects\/(\d+)\/jobs\/(\d+)\/trace$/);
  if (m) {
    return { status: 200, body: makeJobTrace(parseInt(m[2])), contentType: 'text/plain' };
  }

  // GET /projects/:id/jobs/:jobId/artifacts/:path
  m = path.match(/^\/projects\/(\d+)\/jobs\/(\d+)\/artifacts\/(.+)$/);
  if (m) {
    const pid = parseInt(m[1]);
    if (m[3] === 'deploy-info.json') {
      return { status: 200, body: makeDeployInfo(pid) };
    }
    return { status: 404, body: { message: 'Artifact not found' } };
  }

  // GET /projects/:id/jobs
  m = path.match(/^\/projects\/(\d+)\/jobs$/);
  if (m) {
    const pid = parseInt(m[1]);
    // Collect all jobs across all pipelines for this project
    const pipelines = pipelinesByProject[pid] || [];
    const allJobs = [];
    for (const pl of pipelines.slice(0, 10)) {
      const jobs = jobsByPipeline[pl.id] || [];
      allJobs.push(...jobs);
    }
    const perPage = parseInt(query.get('per_page') || '100');
    return { status: 200, body: allJobs.slice(0, perPage) };
  }

  // GET /projects/:id/repository/files/:filePath
  m = path.match(/^\/projects\/(\d+)\/repository\/files\/(.+)$/);
  if (m) {
    const filePath = decodeURIComponent(m[2]);
    if (filePath === 'CODEOWNERS' || filePath.endsWith('CODEOWNERS')) {
      return { status: 200, body: { file_name: 'CODEOWNERS', file_path: filePath, content: CODEOWNERS_B64, encoding: 'base64' } };
    }
    return { status: 404, body: { message: 'File not found' } };
  }

  // GET /projects/:id
  m = path.match(/^\/projects\/(\d+)$/);
  if (m) {
    const pid = parseInt(m[1]);
    const proj = projects.find(p => p.id === pid);
    if (!proj) return { status: 404, body: { message: 'Project not found' } };
    const { _lang, _baseCoverage, ...clean } = proj;
    return { status: 200, body: clean };
  }

  return { status: 404, body: { message: 'Not found', path: pathname } };
}

// ─── HTTP server ────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;
  const query = url.searchParams;

  console.log(`${req.method} ${pathname}${url.search || ''}`);

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  try {
    const result = route(req.method, pathname, query);
    const contentType = result.contentType || 'application/json';
    res.writeHead(result.status, { 'Content-Type': contentType });

    if (contentType === 'text/plain') {
      res.end(typeof result.body === 'string' ? result.body : JSON.stringify(result.body));
    } else {
      res.end(JSON.stringify(result.body));
    }
  } catch (err) {
    console.error('Error handling request:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Internal server error' }));
  }
});

server.listen(PORT, () => {
  console.log(`\n🦊 Mock GitLab API running on http://localhost:${PORT}`);
  console.log(`   Group ID: ${GROUP_ID} (${GROUP.name})`);
  console.log(`   Projects: ${projects.length}`);
  console.log(`   Health:   http://localhost:${PORT}/health\n`);
});
