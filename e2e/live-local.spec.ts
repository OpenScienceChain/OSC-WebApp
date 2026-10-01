import { createHash, randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';

test.skip(
  !process.env.PLAYWRIGHT_LIVE,
  'Run only against the local Fabric stack.',
);

type ApiResult<T> = { status: number; body: T };

async function api<T>(
  page: Page,
  method: string,
  path: string,
  payload?: unknown,
): Promise<ApiResult<T>> {
  return page.evaluate(
    async ({ method, path, payload }) => {
      const session = JSON.parse(
        localStorage.getItem('osc-usrse26-account-session') ||
          sessionStorage.getItem('osc-usrse26-demo-session') ||
          'null',
      );
      const response = await fetch(`/api/v1/demo${path}`, {
        method,
        credentials: 'include',
        headers: {
          ...(payload ? { 'Content-Type': 'application/json' } : {}),
          ...(session?.csrfToken ? { 'X-Demo-CSRF': session.csrfToken } : {}),
        },
        ...(payload ? { body: JSON.stringify(payload) } : {}),
      });
      return { status: response.status, body: await response.json() };
    },
    { method, path, payload },
  );
}

async function register(
  page: Page,
  username: string,
  pin: string,
): Promise<void> {
  await page.goto('/auth/sign-in');
  await page.getByRole('button', { name: 'Create account' }).first().click();
  await page.getByLabel('Organization').selectOption('neuroscience-gateway');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Choose a PIN').fill(pin);
  await page.getByRole('button', { name: 'Create account' }).last().click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
}

async function signIn(
  page: Page,
  username: string,
  pin: string,
): Promise<void> {
  await page.goto('/auth/sign-in');
  await page.getByLabel('Organization').selectOption('neuroscience-gateway');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('PIN', { exact: true }).fill(pin);
  await page
    .getByRole('button', { name: 'Sign in', exact: true })
    .last()
    .click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
}

test('local account ownership and confirmed artifact/workflow revisions', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.goto('/');
  const suffix = randomUUID().replaceAll('-', '').slice(0, 9);
  const owner = `research${suffix}`;
  const other = `other${suffix}`;
  const ownerPin = '482716';
  const otherPin = '7314';

  const status = await api<{ state: string }>(page, 'GET', '/status');
  expect(status.status).toBe(200);
  expect(status.body.state).toBe('OPEN');

  await register(page, owner, ownerPin);
  const artifact = await api<{ id: string; submissionState: string }>(
    page,
    'POST',
    '/artifacts',
    {
      requestId: randomUUID(),
      fingerprint: createHash('sha256')
        .update(`synthetic-${suffix}`)
        .digest('hex'),
      sizeBytes: 16,
      extension: 'txt',
      researchContext: 'RESEARCH_DATASET',
      title: `Local account E2E dataset ${suffix}`,
      description:
        'A synthetic local-only dataset used to verify contributor ownership and public ledger confirmation.',
      submissionComment:
        'Initial synthetic contribution from the live local account test.',
      keywords: ['local-e2e'],
    },
  );
  expect(artifact.status).toBe(201);
  const artifactId = artifact.body.id;
  expect(artifactId).toMatch(/^[a-f0-9-]{36}$/);
  await expect
    .poll(
      async () => {
        const result = await api<{
          submissionState: string;
          blockchainTxId?: string;
        }>(page, 'GET', `/public/artifacts/${artifactId}`);
        return `${result.body.submissionState}:${Boolean(result.body.blockchainTxId)}`;
      },
      { timeout: 90_000, intervals: [1000, 2000, 3000] },
    )
    .toBe('SUCCESS:true');

  await page.goto(`/artifacts/${artifactId}`);
  await expect(
    page.getByRole('link', { name: /Update Artifact/i }),
  ).toBeVisible();
  const originalFootprint = (
    await api<{ footprint: string }>(
      page,
      'GET',
      `/public/artifacts/${artifactId}`,
    )
  ).body.footprint;
  await page.goto(`/update-artifact/${artifactId}`);
  await page
    .getByRole('switch', { name: 'Keep current manifest and footprint' })
    .check();
  await page.getByLabel('Key Words').fill('local-e2e, artifact-revision');
  await page
    .getByLabel('Submission Comment')
    .fill('Revised synthetic artifact metadata from the owning account.');
  await page.getByRole('button', { name: 'Submit revision' }).click();
  await expect(page).toHaveURL(new RegExp(`/artifacts/${artifactId}$`));
  await expect
    .poll(
      async () => {
        const result = await api<{ keywords: string[] }>(
          page,
          'GET',
          `/public/artifacts/${artifactId}`,
        );
        return result.body.keywords?.includes('artifact-revision') || false;
      },
      { timeout: 90_000, intervals: [1000, 2000, 3000] },
    )
    .toBe(true);
  await expect
    .poll(
      async () => {
        const result = await api<{
          items: { revision: number }[];
        }>(
          page,
          'GET',
          `/public/artifacts/${artifactId}/history`,
        );
        return result.status === 200
          ? result.body.items.some((item) => item.revision === 2)
          : false;
      },
      { timeout: 90_000, intervals: [1000, 2000, 3000] },
    )
    .toBe(true);
  expect(
    (
      await api<{ footprint: string }>(
        page,
        'GET',
        `/public/artifacts/${artifactId}`,
      )
    ).body.footprint,
  ).toBe(originalFootprint);
  const artifactHistory = await api<{
    items: { txId: string; revision: number }[];
  }>(page, 'GET', `/public/artifacts/${artifactId}/history`);
  const artifactRevision = artifactHistory.body.items.find(
    (item) => item.revision === 2,
  );
  expect(artifactRevision).toBeDefined();
  await page.goto(
    `/artifacts/${artifactId}/history/${artifactRevision!.txId}`,
  );
  await expect
    .poll(
      async () => {
        await page.reload();
        try {
          await page
            .getByRole('heading', {
              name: `Local account E2E dataset ${suffix}`,
            })
            .waitFor({ state: 'visible', timeout: 5_000 });
          return 1;
        } catch {
          return 0;
        }
      },
      { timeout: 60_000, intervals: [1000, 2000, 3000] },
    )
    .toBe(1);
  const workflow = await api<{ id: string }>(page, 'POST', '/workflows', {
    requestId: randomUUID(),
    artifactIds: [artifactId],
    researchContext: 'REPRODUCIBLE_ANALYSIS',
    title: `Local account E2E workflow ${suffix}`,
    description:
      'A synthetic local-only workflow connecting a confirmed artifact to an owner-managed ledger record.',
    submissionComment:
      'Initial synthetic workflow contribution from the live local test.',
    keywords: ['local-e2e'],
    githubRepositories: [],
  });
  expect(workflow.status).toBe(201);
  const workflowId = workflow.body.id;
  await expect
    .poll(
      async () => {
        const result = await api<{
          submissionState: string;
          blockchainTxId?: string;
        }>(page, 'GET', `/public/workflows/${workflowId}`);
        return `${result.body.submissionState}:${Boolean(result.body.blockchainTxId)}`;
      },
      { timeout: 90_000, intervals: [1000, 2000, 3000] },
    )
    .toBe('SUCCESS:true');

  await page.goto(`/workflows/${workflowId}`);
  await expect(
    page.getByRole('link', { name: /Manage Workflow/i }),
  ).toBeVisible();
  const revision = await api<{ id: string }>(
    page,
    'PATCH',
    `/workflows/${workflowId}`,
    {
      requestId: randomUUID(),
      artifactIds: [artifactId],
      keywords: ['local-e2e', 'revision'],
      submissionComment:
        'Revised synthetic workflow metadata from the owning account.',
      githubRepositories: [],
    },
  );
  expect(revision.status).toBe(200);
  await expect
    .poll(
      async () => {
        const result = await api<{ keywords: string[] }>(
          page,
          'GET',
          `/public/workflows/${workflowId}`,
        );
        return result.body.keywords?.includes('revision') || false;
      },
      { timeout: 90_000, intervals: [1000, 2000, 3000] },
    )
    .toBe(true);
  await expect
    .poll(
      async () => {
        const result = await api<{
          items: { revision: number }[];
        }>(
          page,
          'GET',
          `/public/workflows/${workflowId}/history`,
        );
        return result.status === 200
          ? result.body.items.some((item) => item.revision === 2)
          : false;
      },
      { timeout: 90_000, intervals: [1000, 2000, 3000] },
    )
    .toBe(true);
  const workflowHistory = await api<{
    items: { txId: string; revision: number }[];
  }>(page, 'GET', `/public/workflows/${workflowId}/history`);
  expect(workflowHistory.body.items.some((item) => item.revision === 2)).toBe(
    true,
  );
  await page.goto(`/workflows/${workflowId}/history`);
  await expect(
    page.getByRole('heading', { name: /Workflow's Full History/i }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
  await register(page, other, otherPin);
  const unauthorizedArtifact = await api(
    page,
    'PATCH',
    `/artifacts/${artifactId}`,
    {
      requestId: randomUUID(),
      submissionComment: 'Unauthorized artifact revision attempt.',
      keywords: ['rejected'],
    },
  );
  const unauthorizedWorkflow = await api(
    page,
    'PATCH',
    `/workflows/${workflowId}`,
    {
      requestId: randomUUID(),
      artifactIds: [artifactId],
      submissionComment: 'Unauthorized workflow revision attempt.',
      keywords: ['rejected'],
      githubRepositories: [],
    },
  );
  expect(unauthorizedArtifact.status).toBe(404);
  expect(unauthorizedWorkflow.status).toBe(404);
  await page.goto(`/workflows/${workflowId}`);
  await expect(
    page.getByRole('link', { name: /Manage Workflow/i }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await signIn(page, owner, ownerPin);
  await page.goto(`/workflows/${workflowId}`);
  await expect(
    page.getByRole('link', { name: /Manage Workflow/i }),
  ).toBeVisible();
});

test('500 file hashes totaling 50 MiB confirm on the local ledger', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.goto('/');
  const suffix = randomUUID().replaceAll('-', '').slice(0, 9);
  await register(page, `bundle${suffix}`, '482716');
  const files = Array.from({ length: 500 }, (_, index) => ({
    hash: createHash('sha256')
      .update(`bundle-${suffix}-${index}`)
      .digest('hex'),
    sizeBytes: index < 400 ? 104858 : 104856,
    extension: 'txt',
  }));
  const fingerprint = createHash('sha256')
    .update(
      files
        .map(
          (file, index) =>
            `${index + 1}\t${file.extension}\t${file.hash}\t${file.sizeBytes}`,
        )
        .join('\n'),
    )
    .digest('hex');
  const result = await api<{ id: string }>(page, 'POST', '/artifacts', {
    requestId: randomUUID(),
    fingerprint,
    sizeBytes: 50 * 1024 * 1024,
    extension: 'bundle',
    files,
    researchContext: 'RESEARCH_DATASET',
    title: `Local boundary manifest ${suffix}`,
    description:
      'A synthetic local-only manifest that verifies the maximum file count and aggregate size against the real ledger.',
    submissionComment:
      'Initial bounded manifest contribution for local ledger testing.',
  });
  expect(result.status).toBe(201);
  await expect
    .poll(
      async () => {
        const detail = await api<{
          submissionState: string;
          manifest?: unknown[];
        }>(page, 'GET', `/public/artifacts/${result.body.id}`);
        return `${detail.body.submissionState}:${detail.body.manifest?.length || 0}`;
      },
      { timeout: 120_000, intervals: [1000, 2000, 3000] },
    )
    .toBe('SUCCESS:500');
});
