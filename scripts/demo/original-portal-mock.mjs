import { createServer } from 'node:http';
import { randomUUID, createHash } from 'node:crypto';

const username = 'april-preview';
const password = 'Preview-2026!';
const token = [
  Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url'),
  Buffer.from(JSON.stringify({
    sub: 'local-preview-user', username, roles: ['collaborator'],
    email: 'preview@example.invalid', exp: Math.floor(Date.now() / 1000) + 7 * 86400,
  })).toString('base64url'),
  'local-preview-only',
].join('.');
const now = new Date().toISOString();
const fingerprint = (text) => createHash('sha256').update(text).digest('hex');
const artifactId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const secondId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const workflowId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

function artifact(id, title, description, keywords, seed) {
  return {
    id, title, description, keywords, links: [], dois: [], fundingAgencies: ['NSF'],
    acknowledgements: '', footprint: fingerprint(seed),
    manifest: [{ filename: `${seed}.csv`, hash: fingerprint(seed), algorithm: 'sha256' }],
    verified: true, lastTimeVerified: now, lastTimeUpdated: now, submittedAt: now,
    updatedAt: now, submissionState: 'SUCCESS', submitterEmail: 'preview@example.invalid',
    submitterUsername: username, blockchainTxId: `MOCK-${seed}-latest`, peerId: 'local-mock',
    submissionError: null, organization: { name: 'Neuroscience Gateway' },
  };
}

const artifacts = new Map([
  [artifactId, artifact(artifactId, 'Microscopy image dataset',
    'A synthetic microscopy image collection used to inspect the April portal and its artifact provenance cards.',
    ['microscopy', 'synthetic'], 'microscopy')],
  [secondId, artifact(secondId, 'Analysis notebook and figures',
    'A synthetic reproducible analysis package used to inspect workflow linkage and artifact detail pages.',
    ['analysis', 'synthetic'], 'notebook')],
]);
const histories = new Map();
function snapshot(record, revision) {
  return {
    txId: `MOCK-${record.id.slice(0, 8)}-revision-${revision}`,
    timestamp: new Date(Date.now() - (3 - revision) * 86400000).toISOString(),
    isDelete: false,
    value: {
      ...structuredClone(record),
      keywords: revision === 1 ? ['synthetic'] : record.keywords,
      lastTimeVerified: now,
      submissionState: 'SUCCESS',
    },
  };
}
for (const record of artifacts.values()) {
  histories.set(record.id, [3, 2, 1].map((revision) => snapshot(record, revision)));
}
const workflows = new Map([[
  workflowId,
  {
    id: workflowId, title: 'Microscopy analysis workflow',
    description: 'A synthetic workflow joining the microscopy dataset and its analysis notebook for portal inspection.',
    keywords: ['microscopy', 'reproducibility'], githubRepositories: [],
    artifacts: [artifacts.get(artifactId), artifacts.get(secondId)].map(({ id, title, description }) => ({ id, title, description })),
    submissionState: 'SUCCESS', submitterEmail: 'preview@example.invalid',
    submitterUsername: username, submission_comment: 'Synthetic reference workflow.',
    submittedAt: now, updatedAt: now, blockchainTxId: 'MOCK-workflow-1',
    organization: { name: 'Neuroscience Gateway' },
  },
]]);

function send(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-OSC-Preview': 'synthetic-no-ledger',
  });
  response.end(JSON.stringify(body));
}
function authorized(request) {
  return request.headers.authorization === `Bearer ${token}`;
}
async function bodyOf(request) {
  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 100_000) throw new Error('Request too large');
  }
  return raw ? JSON.parse(raw) : {};
}
function listHistory(id, url) {
  const items = histories.get(id) || [];
  const offset = Math.max(0, Number(url.searchParams.get('offset') || 0));
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit') || 50)));
  const order = url.searchParams.get('order') === 'asc' ? 'asc' : 'desc';
  const sorted = order === 'asc' ? [...items].reverse() : items;
  return { artifactId: id, items: sorted.slice(offset, offset + limit), total: items.length,
    offset, limit, order, hasMore: offset + limit < items.length };
}

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const path = url.pathname;
    if (path === '/healthz') return send(response, 200, { state: 'MOCK' });
    if (!path.startsWith('/api/v1/')) return send(response, 404, { message: 'Not found' });
    if (path === '/api/v1/users/login' && request.method === 'POST') {
      const input = await bodyOf(request);
      return input.username === username && input.password === password
        ? send(response, 201, { token })
        : send(response, 401, { message: 'Invalid preview credentials' });
    }
    if (path === '/api/v1/users/validate-token')
      return send(response, authorized(request) ? 200 : 401, authorized(request) ? { valid: true } : { message: 'Unauthorized' });
    if (path === '/api/v1/users/logout' && request.method === 'POST')
      return send(response, 200, { ok: true });
    if (path === '/api/v1/artifacts' && request.method === 'GET')
      return send(response, 200, [...artifacts.values()].map(({ id, title, description, keywords, submittedAt, verified, lastTimeVerified, lastTimeUpdated, updatedAt }) => ({ id, title, description, keywords, submittedAt, verified, lastTimeVerified, lastTimeUpdated, updatedAt })));
    if (path === '/api/v1/workflows' && request.method === 'GET')
      return send(response, 200, [...workflows.values()].map(({ id, title, description, keywords, submissionState, submittedAt, updatedAt }) => ({ id, title, description, keywords, submissionState, submittedAt, updatedAt })));
    const artifactRoute = /^\/api\/v1\/artifacts\/([^/]+)(?:\/(history)(?:\/(refresh))?)?$/.exec(path);
    if (artifactRoute) {
      const [, id, history, refresh] = artifactRoute;
      const record = artifacts.get(id);
      if (!record) return send(response, 404, { message: 'Artifact not found' });
      if (!history && request.method === 'GET') return send(response, 200, record);
      if (history) {
        if (!authorized(request)) return send(response, 401, { message: 'Sign in for history' });
        if (request.method === 'GET' || (refresh && request.method === 'POST'))
          return send(response, 200, listHistory(id, url));
      }
      if (!history && request.method === 'PUT') {
        if (!authorized(request)) return send(response, 401, { message: 'Unauthorized' });
        const input = await bodyOf(request);
        for (const key of ['keywords', 'links', 'dois', 'fundingAgencies', 'acknowledgements', 'manifest', 'footprint']) {
          if (key in input) record[key] = input[key];
        }
        record.updatedAt = new Date().toISOString();
        histories.get(id).unshift(snapshot(record, histories.get(id).length + 1));
        return send(response, 200, { ok: true });
      }
    }
    if (path === '/api/v1/artifacts' && request.method === 'POST') {
      if (!authorized(request)) return send(response, 401, { message: 'Unauthorized' });
      const input = await bodyOf(request);
      if (typeof input.title !== 'string' || input.title.length < 3 || input.title.length > 200 ||
          typeof input.description !== 'string' || input.description.length < 50 || input.description.length > 3000)
        return send(response, 400, { message: ['Invalid artifact metadata'] });
      const id = randomUUID();
      const record = artifact(id, input.title, input.description, input.keywords || [], id);
      for (const key of ['links', 'dois', 'fundingAgencies', 'acknowledgements', 'manifest', 'footprint']) {
        if (key in input) record[key] = input[key];
      }
      artifacts.set(id, record);
      histories.set(id, [snapshot(record, 1)]);
      return send(response, 201, { id });
    }
    const workflowRoute = /^\/api\/v1\/workflows\/([^/]+)$/.exec(path);
    if (workflowRoute) {
      const record = workflows.get(workflowRoute[1]);
      if (!record) return send(response, 404, { message: 'Workflow not found' });
      if (request.method === 'GET') return send(response, 200, record);
      if (request.method === 'PUT' && authorized(request)) {
        const input = await bodyOf(request);
        for (const key of ['keywords', 'githubRepositories', 'submission_comment']) if (key in input) record[key] = input[key];
        if (Array.isArray(input.artifactIds)) record.artifacts = input.artifactIds.map((id) => artifacts.get(id)).filter(Boolean).map(({ id, title, description }) => ({ id, title, description }));
        record.updatedAt = new Date().toISOString();
        return send(response, 200, { ok: true });
      }
    }
    if (path === '/api/v1/workflows' && request.method === 'POST') {
      if (!authorized(request)) return send(response, 401, { message: 'Unauthorized' });
      const input = await bodyOf(request);
      if (!Array.isArray(input.artifactIds) || !input.artifactIds.length ||
          input.artifactIds.some((id) => !artifacts.has(id)))
        return send(response, 400, { message: ['Select an artifact'] });
      const id = randomUUID();
      workflows.set(id, {
        id, title: input.title, description: input.description,
        keywords: input.keywords || [], githubRepositories: input.githubRepositories || [],
        artifacts: input.artifactIds.map((id) => artifacts.get(id)).map(({ id, title, description }) => ({ id, title, description })),
        submissionState: 'SUCCESS', submitterEmail: 'preview@example.invalid',
        submitterUsername: username, submission_comment: input.submission_comment,
        submittedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        blockchainTxId: `MOCK-${id}`, organization: { name: 'Neuroscience Gateway' },
      });
      return send(response, 201, { id });
    }
    return send(response, 404, { message: 'Unknown preview endpoint' });
  } catch (error) {
    return send(response, 400, { message: String(error?.message || error) });
  }
}).listen(3000, '0.0.0.0');
