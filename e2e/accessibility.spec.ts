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
  peerId: 'peer0.nsg.osc.example',
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
  await page.evaluate(() => window.scrollTo(0, 0));
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
  test('artifact history pages through events and keeps snapshot navigation', async ({
    page,
  }) => {
    await mockDemo(page);
    const items = Array.from({ length: 8 }, (_, index) => ({
      txId: `ledger-revision-${index + 1}`,
      timestamp: date,
      revision: index + 1,
      snapshot: {
        title: artifact.title,
        description: artifact.description,
        submissionState: 'SUCCESS',
        keywords: ['microscopy'],
        dois: ['10.1234/example'],
        fundingAgencies: ['Research fund'],
        submissionComment: `Revision ${index + 1} comment`,
        acknowledgements: 'Research team',
        links: ['https://example.org/source'],
        manifest: artifact.manifest,
        footprint: artifact.footprint,
      },
    }));
    await page.route(
      `**/api/v1/demo/public/artifacts/${artifactId}/history`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ count: items.length, items }),
        }),
    );
    await page.goto(`/artifacts/${artifactId}/history`);
    await expect(page.locator('.history-card')).toHaveCount(6);
    await expect(
      page.getByText('Showing 8 public ledger events'),
    ).toBeVisible();
    await expect(page.getByText('Page 1 of 2')).toBeVisible();
    await expect(page.locator('.history-card').first()).toContainText(
      'Revision 1 comment',
    );
    await expect(page.locator('.history-card').first()).toContainText(
      'https://example.org/source',
    );
    await checkPage(page);

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.locator('.history-card')).toHaveCount(2);
    await expect(page.locator('.history-card').first()).toContainText(
      '7 of 8 returned',
    );
    await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
    await checkPage(page);

    await page
      .getByRole('link', { name: 'View snapshot for revision 7' })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/artifacts/${artifactId}/history/ledger-revision-7$`),
    );
    await expect(page.getByText('ledger-revision-7').first()).toBeVisible();
    await expect(page.locator('.snapshot-layout aside dt')).toHaveText([
      'Contributor',
      'ID',
      'Timestamp',
      'Revision',
      'Keywords',
      'Funding Agencies',
      'DOIs',
      'Comment',
      'State',
    ]);
    await expect(
      page.getByRole('link', { name: 'Go back to History' }),
    ).toBeVisible();
    await checkPage(page);
    await page.getByRole('link', { name: 'Go back to History' }).click();
    await expect(page.locator('.history-card')).toHaveCount(6);
  });

  test('workflow history uses the shared ledger event design', async ({
    page,
  }) => {
    await mockDemo(page);
    await page.goto(`/workflows/${workflowId}/history`);
    await expect(page.locator('.history-card')).toHaveCount(1);
    await expect(page.locator('.history-card')).toContainText(
      'ledger-revision-1',
    );
    await expect(page.getByText('Showing 1 public ledger event')).toBeVisible();
    await expect(
      page.getByText('No additional metadata recorded for this event.'),
    ).toBeVisible();
    await expect(page.locator('.history-pagination')).toHaveCount(0);
    await expect(
      page.getByRole('link', { name: "See Workflow's Detail" }),
    ).toHaveAttribute('href', `/workflows/${workflowId}`);
    await checkPage(page);
  });

  test('artifact identity stacks recorded details and shows committing peer', async ({
    page,
  }) => {
    await mockDemo(page);
    await page.goto(`/artifacts/${artifactId}`);

    await expect(
      page.getByRole('link', { name: 'Back to Artifacts' }),
    ).toHaveAttribute('href', '/list-artifacts');
    await expect(page.locator('.record-identity dt')).toHaveText([
      'Contributor',
      'ID',
      'Organization',
      'Submitted',
      'Last Updated',
    ]);
    await expect(page.locator('.record-identity .contributor-name')).toHaveText(
      artifact.contributorAlias,
    );
    await expect(
      page.locator('.record-identity .contributor-organization'),
    ).toHaveText(artifact.organization);
    const contributorLabel = await page
      .locator('.record-identity dt')
      .first()
      .boundingBox();
    const contributorValue = await page
      .locator('.record-identity dd')
      .first()
      .boundingBox();
    expect(contributorLabel).not.toBeNull();
    expect(contributorValue).not.toBeNull();
    expect(contributorValue!.y).toBeGreaterThan(
      contributorLabel!.y + contributorLabel!.height,
    );
    const contributorName = await page
      .locator('.record-identity .contributor-name')
      .boundingBox();
    const contributorOrganization = await page
      .locator('.record-identity .contributor-organization')
      .boundingBox();
    expect(contributorName).not.toBeNull();
    expect(contributorOrganization).not.toBeNull();
    expect(contributorOrganization!.y).toBeGreaterThan(
      contributorName!.y + contributorName!.height,
    );
    await expect(page.locator('.ledger-facts')).toContainText(
      'peer0.nsg.osc.example',
    );
    await checkPage(page);
  });

  test('artifact does not invent an unreported committing peer', async ({
    page,
  }) => {
    await mockDemo(page);
    await page.route(`**/api/v1/demo/public/artifacts/${artifactId}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...artifact, peerId: null }),
      }),
    );
    await page.goto(`/artifacts/${artifactId}`);
    await expect(page.locator('.ledger-facts')).toContainText(
      'Committing peer',
    );
    await expect(page.locator('.ledger-facts')).toContainText('Not recorded');
    await checkPage(page);
  });

  test('failed and pending records explain state and copying confirms success', async ({
    page,
  }) => {
    await mockDemo(page);
    await page
      .context()
      .grantPermissions(['clipboard-read', 'clipboard-write']);
    let state = 'FAILED';
    await page.route(
      `**/api/v1/demo/public/artifacts/${artifactId}`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...artifact,
            submissionState: state,
            blockchainTxId: null,
            manifest: undefined,
            footprint: undefined,
            failureReason:
              state === 'FAILED'
                ? 'The blockchain network was unavailable during submission. No ledger confirmation was recorded.'
                : undefined,
          }),
        });
      },
    );
    await page.goto(`/artifacts/${artifactId}`);
    await expect(page.getByText('Blockchain submission failed')).toBeVisible();
    await expect(
      page.getByText('Not confirmed on the blockchain'),
    ).toBeVisible();
    await checkPage(page);
    await page.getByRole('button', { name: 'Copy artifact ID' }).click();
    await expect(
      page.getByRole('button', { name: 'Artifact ID copied' }),
    ).toBeVisible();
    await expect(
      page
        .getByRole('status')
        .filter({ hasText: 'Artifact ID copied to clipboard.' }),
    ).toBeAttached();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      artifactId,
    );

    state = 'PENDING';
    await page.reload();
    await expect(
      page.getByText('Blockchain confirmation pending'),
    ).toBeVisible();
    await expect(
      page.getByText('Awaiting blockchain confirmation'),
    ).toBeVisible();
    await checkPage(page);
  });

  test('artifact management offers sign-in when signed out', async ({
    page,
  }) => {
    await mockDemo(page);
    await page.goto(`/artifacts/${artifactId}`);
    await expect(
      page.getByRole('link', { name: 'Manage Artifact' }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Manage Artifact' }).click();
    await expect(
      page.getByRole('heading', { name: 'Manage Artifact' }),
    ).toBeVisible();
    await expect(
      page.getByText('Artifact updates are restricted'),
    ).toBeVisible();
    await expect(
      page
        .locator('#main-content')
        .getByRole('link', { name: 'Sign in', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Back to artifact' }),
    ).toBeVisible();
    await checkPage(page);
  });

  test('workflow detail paginates linked artifacts and confirms ID copy', async ({
    page,
  }) => {
    await mockDemo(page);
    await page
      .context()
      .grantPermissions(['clipboard-read', 'clipboard-write']);
    const linkedIds = Array.from(
      { length: 8 },
      (_, index) =>
        `dddddddd-dddd-4ddd-8ddd-${String(index + 1).padStart(12, '0')}`,
    );
    await page.route(`**/api/v1/demo/public/workflows/${workflowId}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...workflow, artifactIds: linkedIds }),
      }),
    );
    await page.route('**/api/v1/demo/public/artifacts/*', (route) => {
      const id = new URL(route.request().url()).pathname.split('/').pop() || '';
      const index = linkedIds.indexOf(id);
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...artifact,
          id,
          title: `Linked artifact ${index + 1}`,
        }),
      });
    });
    await page.goto(`/workflows/${workflowId}`);
    await expect(
      page.getByRole('heading', { name: workflow.title }),
    ).toBeVisible();
    await expect(page.locator('.record-identity dt')).toHaveText([
      'Contributor',
      'ID',
      'Organization',
      'Submitted',
    ]);
    await expect(page.locator('.record-identity .contributor-name')).toHaveText(
      workflow.contributorAlias,
    );
    await expect(
      page.locator('.record-identity .contributor-organization'),
    ).toHaveText(workflow.organization);
    const metadataBox = await page.locator('.record-context').boundingBox();
    const identityBox = await page.locator('.record-identity').boundingBox();
    expect(metadataBox).not.toBeNull();
    expect(identityBox).not.toBeNull();
    expect(identityBox!.y).toBeGreaterThan(
      metadataBox!.y + metadataBox!.height,
    );
    const contributorLabel = await page
      .locator('.record-identity dt')
      .first()
      .boundingBox();
    const contributorValue = await page
      .locator('.record-identity dd')
      .first()
      .boundingBox();
    expect(contributorLabel).not.toBeNull();
    expect(contributorValue).not.toBeNull();
    expect(contributorValue!.y).toBeGreaterThan(
      contributorLabel!.y + contributorLabel!.height,
    );
    await expect(page.locator('.linked-records li')).toHaveCount(6);
    await expect(page.getByText('Page 1 of 2')).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Linked artifact 1' }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Linked artifact 7' }),
    ).toHaveCount(0);
    await checkPage(page);

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.locator('.linked-records li')).toHaveCount(2);
    await expect(page.getByText('Page 2 of 2')).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Linked artifact 7' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
    await checkPage(page);

    await page.getByRole('button', { name: 'Copy workflow ID' }).click();
    await expect(page.getByText('Copied', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Workflow ID copied' }),
    ).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      workflowId,
    );

    await page.getByRole('link', { name: 'Manage Workflow' }).click();
    await expect(
      page.getByText('Workflow updates are restricted'),
    ).toBeVisible();
    await checkPage(page);
  });

  test('workflow identity stays stacked without metadata', async ({ page }) => {
    await mockDemo(page);
    await page.route(`**/api/v1/demo/public/workflows/${workflowId}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...workflow,
          keywords: [],
          submissionComment: '',
        }),
      }),
    );
    await page.goto(`/workflows/${workflowId}`);
    await expect(page.locator('.record-context')).toHaveCount(0);
    await expect(page.locator('.record-identity dt')).toHaveText([
      'Contributor',
      'ID',
      'Organization',
      'Submitted',
    ]);
    await expect(page.locator('.record-identity .contributor-name')).toHaveText(
      workflow.contributorAlias,
    );
    await expect(
      page.locator('.record-identity .contributor-organization'),
    ).toHaveText(workflow.organization);
    await checkPage(page);
  });

  test('workflow detail explains management restriction to another account', async ({
    page,
  }) => {
    await mockDemo(page, true);
    await page.route('**/api/v1/demo/mine/workflows', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      }),
    );
    await page.goto(`/workflows/${workflowId}`);
    await expect(
      page.getByText('Only the contributing account can manage this workflow.'),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Manage Workflow' }),
    ).toBeVisible();
    await checkPage(page);
    await page.getByRole('link', { name: 'Manage Workflow' }).click();
    await expect(
      page.getByText('Workflow updates are restricted'),
    ).toBeVisible();
  });

  test('workflow detail distinguishes failed and pending ledger states', async ({
    page,
  }) => {
    await mockDemo(page);
    let state = 'FAILED';
    await page.route(`**/api/v1/demo/public/workflows/${workflowId}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...workflow,
          submissionState: state,
          blockchainTxId: null,
          failureReason:
            state === 'FAILED' ? 'Ledger submission was rejected.' : undefined,
        }),
      }),
    );
    await page.goto(`/workflows/${workflowId}`);
    await expect(page.getByText('Blockchain submission failed')).toBeVisible();
    await expect(
      page.getByText('Ledger submission was rejected.'),
    ).toBeVisible();
    await expect(
      page.getByText('Not confirmed on the blockchain'),
    ).toBeVisible();
    await checkPage(page);

    state = 'PENDING';
    await page.reload();
    await expect(
      page.getByText('Blockchain confirmation pending'),
    ).toBeVisible();
    await expect(
      page.getByText('Awaiting blockchain confirmation'),
    ).toBeVisible();
    await checkPage(page);
  });

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
  test('artifact management restricts another contributor', async ({
    page,
  }) => {
    await mockDemo(page, true);
    await page.route('**/api/v1/demo/mine/artifacts', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      }),
    );
    await page.goto(`/artifacts/${artifactId}`);
    await expect(
      page.getByText('Only the contributing account can manage this artifact.'),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Manage Artifact' }).click();
    await expect(
      page.getByText('Artifact updates are restricted'),
    ).toBeVisible();
    await expect(
      page.getByText(
        'Only the contributing account can manage a confirmed artifact.',
      ),
    ).toBeVisible();
    await expect(page.locator('form.artifact-form')).toHaveCount(0);
    await checkPage(page);
  });

  test('artifact management opens the owner update form', async ({ page }) => {
    await mockDemo(page, true);
    await page.goto(`/artifacts/${artifactId}`);
    await page.getByRole('link', { name: 'Manage Artifact' }).click();
    await expect(
      page.getByRole('heading', { name: 'Manage Artifact' }),
    ).toBeVisible();
    await expect(page.getByText('Artifact updates are restricted')).toHaveCount(
      0,
    );
    await expect(page.getByLabel('Title', { exact: true })).toHaveValue(
      artifact.title,
    );
    await expect(
      page.getByRole('button', { name: 'Submit revision' }),
    ).toBeVisible();
    await checkPage(page);
  });

  test('signed-in account is available in another tab', async ({
    page,
  }, testInfo) => {
    const waitingTab = await page.context().newPage();
    await mockDemo(waitingTab);
    await waitingTab.goto('/create-workflow');
    await expect(waitingTab.getByText('Sign in to contribute')).toBeVisible();

    await mockDemo(page, true);
    await page.goto('/');
    await expect(page.getByText('Ready to contribute')).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Register an artifact' }),
    ).toBeVisible();
    await expect(waitingTab.getByText('Sign in to contribute')).toHaveCount(0);
    await expect(
      waitingTab.getByPlaceholder(
        'Search confirmed artifacts in your organization',
      ),
    ).toBeVisible();
    await waitingTab.close();

    const secondTab = await page.context().newPage();
    await mockDemo(secondTab);
    await secondTab.goto('/contribute');
    await expect(secondTab.getByText('Sign in to contribute')).toHaveCount(0);
    await expect(secondTab.getByLabel('Title', { exact: true })).toBeVisible();
    if (testInfo.project.name !== 'desktop') {
      await secondTab
        .getByRole('button', { name: 'Open navigation menu' })
        .click();
    }
    await expect(
      secondTab.getByRole('button', { name: 'Sign out' }),
    ).toBeVisible();
    await secondTab.close();
  });

  test('workflow access notice replaces editing guidance for another account', async ({
    page,
  }) => {
    await mockDemo(page, true);
    await page.route('**/api/v1/demo/mine/workflows', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      }),
    );
    await page.goto(`/update-workflow/${workflowId}`);
    await expect(
      page.getByText('Workflow updates are restricted'),
    ).toBeVisible();
    await expect(
      page.getByText(
        'Only the contributing account can manage a confirmed workflow.',
      ),
    ).toBeVisible();
    await expect(
      page.getByText('Link up to three confirmed artifacts from'),
    ).toHaveCount(0);
    await expect(
      page.getByRole('link', { name: 'Back to workflow' }),
    ).toBeVisible();
    await checkPage(page);
  });

  test('artifact update remains restricted for another account', async ({
    page,
  }) => {
    await mockDemo(page, true);
    await page.route('**/api/v1/demo/mine/artifacts', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      }),
    );
    await page.goto(`/update-artifact/${artifactId}`);
    await expect(
      page.getByText(
        'Only the contributing account can manage a confirmed artifact.',
      ),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Back to artifact' }),
    ).toBeVisible();
    await expect(page.getByLabel('Title', { exact: true })).toHaveCount(0);
    await checkPage(page);
  });

  test('workflow submit follows form validity', async ({ page }) => {
    await mockDemo(page, true);
    await page.goto('/create-workflow');
    const submit = page.getByRole('button', { name: 'Submit workflow' });
    await expect(submit).toBeDisabled();

    await page
      .getByLabel('Title', { exact: true })
      .fill('Microscopy review workflow');
    await page
      .getByLabel('Description', { exact: true })
      .fill(
        'This workflow documents a reproducible review of the linked microscopy dataset and its analysis steps.',
      );
    await page
      .getByLabel('Submission Comment')
      .fill('Initial workflow contribution for the microscopy review.');
    await expect(submit).toBeDisabled();

    await page
      .getByPlaceholder('Search confirmed artifacts in your organization')
      .click();
    await page.getByRole('button', { name: /Microscopy dataset/ }).click();
    await expect(submit).toBeEnabled();

    await page.getByRole('button', { name: '+ Add Repository' }).click();
    await expect(submit).toBeDisabled();
    await page.getByRole('button', { name: 'Remove', exact: true }).click();
    await expect(submit).toBeEnabled();

    await page
      .getByRole('button', { name: 'Remove Microscopy dataset' })
      .click();
    await expect(submit).toBeDisabled();
  });

  test('artifact revision retains fields and can keep its manifest', async ({
    page,
  }, testInfo) => {
    await mockDemo(page, true);
    await page.goto(`/update-artifact/${artifactId}`);
    await expect(
      page.getByRole('heading', { name: 'Manage Artifact' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Artifact metadata' }),
    ).toBeVisible();
    await expect(page.getByText('Contributor', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Title', { exact: true })).toHaveAttribute(
      'readonly',
      '',
    );
    await expect(
      page.getByLabel('Description', { exact: true }),
    ).toHaveAttribute('readonly', '');
    await expect(
      page.getByLabel('Type of research output (optional)'),
    ).toHaveCount(0);
    await expect(page.getByLabel('Funding Agencies')).toBeVisible();
    const keepManifest = page.getByRole('switch', {
      name: 'Keep current manifest and footprint',
    });
    await expect(keepManifest).toBeVisible();
    await expect(
      page.locator('.drop-zone').getByRole('switch', {
        name: 'Keep current manifest and footprint',
      }),
    ).toBeVisible();
    const limits = page.getByText('Up to 500 files and 50 MiB total.', {
      exact: false,
    });
    await expect(limits).toBeVisible();
    expect((await keepManifest.boundingBox())!.y).toBeGreaterThan(
      (await limits.boundingBox())!.y,
    );
    await expect(keepManifest).not.toBeChecked();
    await expect(
      page.getByRole('button', { name: 'Submit revision' }),
    ).toBeDisabled();
    await keepManifest.check();
    await expect(page.getByText('Current footprint (SHA-256):')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Select a File' }),
    ).toHaveCount(0);
    await page.getByLabel('Key Words').fill('provenance');
    await page
      .getByLabel('Submission Comment')
      .fill('A documented metadata revision for this artifact.');
    await expect(
      page.getByRole('button', { name: 'Submit revision' }),
    ).toBeEnabled();
    await checkPage(page);
    if (process.env['SAVE_PREVIEW'])
      await page.screenshot({
        path: testInfo.outputPath('artifact-update.png'),
        fullPage: true,
      });
  });

  test('workflow revision keeps editable connections and existing metadata', async ({
    page,
  }, testInfo) => {
    await mockDemo(page, true);
    await page.goto(`/update-workflow/${workflowId}`);
    await expect(
      page.getByRole('heading', { name: 'Manage Workflow' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Workflow metadata' }),
    ).toBeVisible();
    await expect(page.getByText('Contributor', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Title', { exact: true })).toHaveAttribute(
      'readonly',
      '',
    );
    await expect(
      page.getByLabel('Description', { exact: true }),
    ).toHaveAttribute('readonly', '');
    await expect(page.getByLabel('Type of workflow (optional)')).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'GitHub Repositories' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Remove Microscopy dataset' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Save workflow update' }),
    ).toBeEnabled();
    await page
      .getByRole('button', { name: 'Remove Microscopy dataset' })
      .click();
    await expect(
      page.getByRole('button', { name: 'Save workflow update' }),
    ).toBeDisabled();
    await page
      .getByPlaceholder('Search confirmed artifacts in your organization')
      .click();
    await page.getByRole('button', { name: /Microscopy dataset/ }).click();
    await expect(
      page.getByRole('button', { name: 'Save workflow update' }),
    ).toBeEnabled();
    await checkPage(page);
    if (process.env['SAVE_PREVIEW'])
      await page.screenshot({
        path: testInfo.outputPath('workflow-update.png'),
        fullPage: true,
      });
  });

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
