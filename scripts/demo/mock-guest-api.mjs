import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const port = Number(process.env.PORT || 3000);
const now = Date.now();
const opensAt = new Date(now - 60_000).toISOString();
const closesAt = new Date(now + 24 * 60 * 60_000).toISOString();
const orgNames = {
  'neuroscience-gateway': 'Neuroscience Gateway',
  'citizen-science': 'Citizen Science',
};
const artifactId = '11111111-1111-4111-8111-111111111111';
const workflowId = '22222222-2222-4222-8222-222222222222';
const artifacts = new Map([[artifactId, {
  id: artifactId,
  title: 'Coastal sample analysis',
  description: 'A public example artifact for inspecting metadata and its ledger revision history.',
  organization: orgNames['neuroscience-gateway'],
  organizationSlug: 'neuroscience-gateway',
  contributorAlias: 'guest-example',
  researchContext: 'RESEARCH_DATASET',
  keywords: ['coastal data', 'reproducibility'],
  links: ['https://example.org/dataset'],
  dois: ['10.1234/coastal.sample'],
  fundingAgencies: ['Example Research Fund'],
  acknowledgements: 'Illustrative community science data.',
  submissionComment: 'Second example revision for the local preview.',
  fingerprint: 'a'.repeat(64),
  manifestName: 'generated-example.txt',
  verified: false,
  submissionState: 'SUCCESS',
  blockchainTxId: 'mock-ledger-transaction-3',
  submittedAt: new Date(now - 3_600_000).toISOString(),
}]]);
const workflows = new Map([[workflowId, {
  id: workflowId,
  title: 'Coastal analysis workflow',
  description: 'An example workflow linked to the coastal sample artifact.',
  organization: orgNames['neuroscience-gateway'],
  organizationSlug: 'neuroscience-gateway',
  contributorAlias: 'guest-example',
  researchContext: 'REPRODUCIBLE_ANALYSIS',
  artifactIds: [artifactId],
  submissionState: 'SUCCESS',
  blockchainTxId: 'mock-workflow-transaction-1',
  submittedAt: new Date(now - 1_800_000).toISOString(),
}]]);
const histories = new Map([[artifactId, [
  { txId: 'mock-ledger-transaction-3', timestamp: new Date(now - 3_600_000).toISOString(), revision: 3, isDelete: false,
    snapshot: { title: 'Coastal sample analysis', description: 'A public example artifact for inspecting metadata and its ledger revision history.',
      keywords: ['coastal data', 'reproducibility'], submissionComment: 'Second example revision for the local preview.' } },
  { txId: 'mock-ledger-transaction-2', timestamp: new Date(now - 7_200_000).toISOString(), revision: 2, isDelete: false,
    snapshot: { title: 'Coastal sample analysis', keywords: ['coastal data'], submissionComment: 'First example revision for the local preview.' } },
  { txId: 'mock-ledger-transaction-1', timestamp: new Date(now - 10_800_000).toISOString(), revision: 1, isDelete: false,
    snapshot: { title: 'Coastal sample analysis', description: 'A public example artifact for inspecting metadata and its ledger revision history.' } },
]]]);
const sessions = new Map();

function reply(response, status, body, headers = {}) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers });
  response.end(JSON.stringify(body));
}

function sessionFor(request) {
  const token = /(?:^|;\s*)osc-mock=([^;]+)/.exec(request.headers.cookie || '')?.[1];
  const session = token ? sessions.get(token) : undefined;
  return session && Date.parse(session.expiresAt) > Date.now() ? session : undefined;
}

function publicShape(record) {
  const { fingerprint, manifestName, sizeBytes, extension, ...publicRecord } = record;
  return publicRecord;
}

async function bodyFor(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 65_536) throw new Error('Request too large');
  }
  return body ? JSON.parse(body) : {};
}

createServer(async (request, response) => {
  const path = new URL(request.url || '/', 'http://127.0.0.1').pathname;
  if (!path.startsWith('/api/v1/demo/')) return reply(response, 404, { message: 'Preview endpoint not found' });
  const endpoint = path.slice('/api/v1/demo'.length);
  const session = sessionFor(request);
  const method = request.method;

  try {
    if (method === 'GET' && endpoint === '/status') return reply(response, 200, {
      state: 'OPEN', message: 'Local mock preview: illustrative records only', opensAt, closesAt, interactionsAllowed: true,
    });
    if (method === 'GET' && endpoint === '/counters') return reply(response, 200, {
      anonymousBrowserSessions: 0, acceptedArtifacts: artifacts.size, confirmedArtifacts: artifacts.size,
      acceptedWorkflows: workflows.size, confirmedWorkflows: workflows.size, provenanceHistoryViews: 0,
    });
    if (method === 'POST' && endpoint === '/session') {
      const body = await bodyFor(request);
      if (!orgNames[body.organization]) return reply(response, 400, { message: 'Unknown organization' });
      const token = randomUUID();
      const created = {
        csrfToken: randomUUID(), contributorAlias: `guest-${token.slice(0, 8)}`, organization: body.organization,
        expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      };
      sessions.set(token, created);
      return reply(response, 201, created, { 'set-cookie': `osc-mock=${token}; HttpOnly; SameSite=Lax; Path=/api/v1/demo` });
    }
    if (method === 'GET' && endpoint === '/artifacts') return reply(response, 200,
      [...artifacts.values()].filter((record) => !new URL(request.url, 'http://127.0.0.1').searchParams.has('organization') ||
        record.organizationSlug === new URL(request.url, 'http://127.0.0.1').searchParams.get('organization')).map(publicShape));
    if (method === 'GET' && endpoint === '/workflows') return reply(response, 200, [...workflows.values()].map(publicShape));

    const publicArtifact = /^\/public\/artifacts\/([^/]+)(\/history)?$/.exec(endpoint);
    const publicWorkflow = /^\/public\/workflows\/([^/]+)(\/history)?$/.exec(endpoint);
    if (method === 'GET' && publicArtifact) {
      const record = artifacts.get(publicArtifact[1]);
      if (!record) return reply(response, 404, { message: 'Artifact not found' });
      const items = histories.get(record.id) || [];
      return reply(response, 200, publicArtifact[2] ? { items, count: items.length } : publicShape(record));
    }
    if (method === 'GET' && publicWorkflow) {
      const record = workflows.get(publicWorkflow[1]);
      if (!record) return reply(response, 404, { message: 'Workflow not found' });
      return reply(response, 200, publicWorkflow[2]
        ? { items: [{ txId: record.blockchainTxId, timestamp: record.submittedAt, isDelete: false }], count: 1 }
        : publicShape(record));
    }

    if (!session) return reply(response, 401, { message: 'Start a local preview session' });
    if (method !== 'GET' && endpoint !== '/session/refresh' && request.headers['x-demo-csrf'] !== session.csrfToken)
      return reply(response, 403, { message: 'Guest session header missing' });
    if (method === 'POST' && endpoint === '/session/refresh') {
      session.expiresAt = new Date(Date.now() + 30 * 60_000).toISOString();
      return reply(response, 200, session);
    }
    if (method === 'GET' && endpoint === '/mine/artifacts') return reply(response, 200,
      [...artifacts.values()].filter((record) => record.contributorAlias === session.contributorAlias && record.organizationSlug === session.organization));
    if (method === 'GET' && endpoint === '/mine/workflows') return reply(response, 200,
      [...workflows.values()].filter((record) => record.contributorAlias === session.contributorAlias && record.organizationSlug === session.organization));
    if (method === 'POST' && endpoint === '/artifacts') {
      const body = await bodyFor(request);
      const id = randomUUID();
      const record = {
        id, title: body.title, description: body.description, submissionComment: body.submissionComment,
        keywords: body.keywords || [], links: body.links || [], dois: body.dois || [], fundingAgencies: body.fundingAgencies || [],
        acknowledgements: body.acknowledgements || '', organization: orgNames[session.organization],
        organizationSlug: session.organization, contributorAlias: session.contributorAlias, researchContext: body.researchContext,
        fingerprint: body.fingerprint, manifestName: `generated-${id}.txt`, verified: false,
        submissionState: 'SUCCESS', blockchainTxId: `mock-${id}`, submittedAt: new Date().toISOString(),
      };
      artifacts.set(id, record);
      histories.set(id, [{ txId: record.blockchainTxId, timestamp: record.submittedAt, revision: 1, isDelete: false,
        snapshot: { title: record.title, description: record.description, keywords: record.keywords, submissionComment: record.submissionComment } }]);
      return reply(response, 201, record);
    }
    const ownedArtifact = /^\/artifacts\/([^/]+)$/.exec(endpoint);
    if (method === 'PATCH' && ownedArtifact) {
      const record = artifacts.get(ownedArtifact[1]);
      if (!record || record.organizationSlug !== session.organization || record.contributorAlias !== session.contributorAlias)
        return reply(response, 403, { message: 'Not owned by this local session' });
      const body = await bodyFor(request);
      for (const key of ['keywords', 'links', 'dois', 'fundingAgencies', 'acknowledgements', 'fingerprint', 'sizeBytes', 'extension'])
        if (body[key] !== undefined) record[key] = body[key];
      record.submissionComment = body.submissionComment;
      const revision = (histories.get(record.id)?.length || 0) + 1;
      record.submissionState = 'PENDING';
      record.blockchainTxId = null;
      setTimeout(() => {
        record.submissionState = 'SUCCESS';
        record.blockchainTxId = `mock-edit-${record.id}-${revision}`;
        histories.get(record.id).unshift({ txId: record.blockchainTxId, timestamp: new Date().toISOString(), revision, isDelete: false,
          snapshot: { title: record.title, description: record.description, keywords: record.keywords, submissionComment: record.submissionComment } });
      }, 3000);
      return reply(response, 202, record);
    }
    if (method === 'POST' && endpoint === '/workflows') {
      const body = await bodyFor(request);
      const id = randomUUID();
      const record = {
        id, title: `Example workflow ${id.slice(0, 8)}`, description: 'A locally mocked workflow linking selected guest artifacts.',
        organization: orgNames[session.organization], organizationSlug: session.organization, contributorAlias: session.contributorAlias,
        researchContext: body.researchContext, artifactIds: body.artifactIds || [], submissionState: 'SUCCESS',
        blockchainTxId: `mock-workflow-${id}`, submittedAt: new Date().toISOString(),
      };
      workflows.set(id, record);
      return reply(response, 201, record);
    }
    if (method === 'POST' && (endpoint === '/events' || endpoint === '/feedback')) return reply(response, 201, { accepted: true });
    return reply(response, 404, { message: 'Preview endpoint not found' });
  } catch (error) {
    return reply(response, 400, { message: error instanceof Error ? error.message : 'Invalid preview request' });
  }
}).listen(port, '127.0.0.1', () => {
  process.stdout.write(`LOCAL MOCK API listening on http://127.0.0.1:${port}\n`);
});
