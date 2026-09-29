import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const artifactId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const workflowId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const date = '2026-09-28T12:00:00.000Z';
const artifact = {
  id: artifactId,
  title: 'Microscopy dataset',
  description:
    'A documented microscopy dataset for reproducible public research and provenance verification.',
  organization: 'Neuroscience Gateway',
  organizationSlug: 'neuroscience-gateway',
  contributorAlias: 'member-researcher',
  researchContext: 'RESEARCH_DATASET',
  verified: true,
  submissionState: 'SUCCESS',
  submittedAt: date,
  lastUpdatedAt: date,
  blockchainTxId: 'a'.repeat(64),
  keywords: ['microscopy'],
  links: [],
  dois: [],
  fundingAgencies: [],
  acknowledgements: '',
  submissionComment: 'Initial release of this public dataset.',
  fingerprint: 'b'.repeat(64),
  footprint: 'b'.repeat(64),
  manifest: [
    {
      filename: `demo-artifact-${artifactId}.csv`,
      hash: 'b'.repeat(64),
      algorithm: 'sha256',
    },
  ],
};
const workflow = {
  id: workflowId,
  title: 'Microscopy analysis workflow',
  description:
    'A reproducible workflow that connects confirmed microscopy data to a documented analysis process.',
  organization: 'Neuroscience Gateway',
  organizationSlug: 'neuroscience-gateway',
  contributorAlias: 'member-researcher',
  researchContext: 'REPRODUCIBLE_ANALYSIS',
  submissionState: 'SUCCESS',
  submittedAt: date,
  blockchainTxId: 'c'.repeat(64),
  artifactIds: [artifactId],
  keywords: ['analysis'],
  submissionComment: 'Initial workflow release for public verification.',
  githubRepositories: [],
};
const history = {
  count: 1,
  items: [
    {
      txId: 'ledger-revision-1',
      timestamp: date,
      revision: 1,
      snapshot: {
        title: artifact.title,
        description: artifact.description,
        submissionState: 'SUCCESS',
        manifest: artifact.manifest,
        footprint: artifact.footprint,
      },
    },
  ],
};

async function mockDemo(page: Page, owner = false): Promise<void> {
  await page.route('**/assets/runtime-config.json', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ API_BASE_URL: '/api/v1', MOCK_PREVIEW: false }),
    });
  });
  if (owner) {
    await page.addInitScript(() => {
      sessionStorage.setItem(
        'osc-usrse26-demo-session',
        JSON.stringify({
          csrfToken: 'test-csrf',
          expiresAt: new Date(Date.now() + 20 * 60_000).toISOString(),
          organization: 'neuroscience-gateway',
          contributorAlias: 'member-researcher',
          accountUsername: 'researcher',
        }),
      );
    });
  }
  await page.route('**/api/v1/demo/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace(
      '/api/v1/demo',
      '',
    );
    let body: unknown = {};
    if (path === '/status')
      body = {
        state: 'OPEN',
        interactionsAllowed: true,
        opensAt: date,
        closesAt: '2026-10-23T15:00:00.000Z',
      };
    else if (path === '/counters')
      body = {
        anonymousBrowserSessions: 1,
        acceptedArtifacts: 1,
        confirmedArtifacts: 1,
        acceptedWorkflows: 1,
        confirmedWorkflows: 1,
        provenanceHistoryViews: 1,
      };
    else if (path === '/artifacts' || path === '/mine/artifacts')
      body = [artifact];
    else if (path === '/workflows' || path === '/mine/workflows')
      body = [workflow];
    else if (
      path === `/public/artifacts/${artifactId}` ||
      path === `/artifacts/${artifactId}`
    )
      body = artifact;
    else if (
      path === `/public/workflows/${workflowId}` ||
      path === `/workflows/${workflowId}`
    )
      body = workflow;
    else if (path.endsWith('/history')) body = history;
    else if (path === '/account/register' || path === '/account/sign-in')
      body = {
        csrfToken: 'test-csrf',
        expiresAt: new Date(Date.now() + 20 * 60_000).toISOString(),
        organization: 'neuroscience-gateway',
        contributorAlias: 'member-researcher',
        accountUsername: 'researcher',
      };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
}

async function checkPage(page: Page): Promise<void> {
  await expect(page.locator('h1').first()).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    )
    .toBeLessThanOrEqual(1);
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(
    result.violations.map(
      (issue) =>
        `${issue.id}: ${issue.nodes.map((node) => node.target.join(' ')).join(', ')}`,
    ),
  ).toEqual([]);
}

test.describe('public views', () => {
  const paths = [
    '/',
    '/list-artifacts',
    '/list-workflows',
    `/artifacts/${artifactId}`,
    `/workflows/${workflowId}`,
    `/artifacts/${artifactId}/history`,
    `/artifacts/${artifactId}/history/ledger-revision-1`,
    `/workflows/${workflowId}/history`,
    '/contribute',
    '/create-workflow',
    '/auth/sign-in',
    '/auth/team-sign-in',
    '/auth',
    '/forbidden',
  ];
  for (const path of paths) {
    test(path, async ({ page }) => {
      await mockDemo(page);
      await page.goto(path);
      await checkPage(page);
    });
  }

  test('mobile navigation and account validation', async ({
    page,
  }, testInfo) => {
    await mockDemo(page);
    await page.goto('/auth/sign-in');
    await page.getByRole('button', { name: 'Create account' }).first().click();
    await page.getByRole('button', { name: 'Create account' }).last().click();
    await checkPage(page);
    if (testInfo.project.name !== 'desktop') {
      await page.getByRole('button', { name: 'Open navigation menu' }).click();
      await checkPage(page);
      await page.keyboard.press('Escape');
      await expect(
        page.getByRole('button', { name: 'Open navigation menu' }),
      ).toHaveAttribute('aria-expanded', 'false');
    }
  });
});

test.describe('owner views', () => {
  for (const path of [
    `/update-artifact/${artifactId}`,
    `/update-workflow/${workflowId}`,
  ]) {
    test(path, async ({ page }) => {
      await mockDemo(page, true);
      await page.goto(path);
      await checkPage(page);
    });
  }
});
