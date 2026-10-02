import { expect, test } from '@playwright/test';

const artifactId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const workflowId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const date = '2026-09-28T12:00:00.000Z';
const attack = '<img src=x onerror="window.__oscXss = true">';
const badLink = 'javascript:window.__oscXss = true';

test('public record text and links cannot execute submitted markup', async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as typeof window & { __oscXss?: boolean }).__oscXss = false;
  });
  await page.route('**/assets/runtime-config.json', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ API_BASE_URL: '/api/v1', MOCK_PREVIEW: false }),
    }),
  );
  await page.route('**/api/v1/demo/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    const artifact = {
      id: artifactId,
      title: attack,
      description: attack,
      organization: 'Neuroscience Gateway',
      organizationSlug: 'neuroscience-gateway',
      contributorAlias: attack,
      submissionState: 'SUCCESS',
      submittedAt: date,
      lastUpdatedAt: date,
      blockchainTxId: 'a'.repeat(64),
      fingerprint: 'b'.repeat(64),
      footprint: 'b'.repeat(64),
      manifest: [
        { filename: attack, hash: 'b'.repeat(64), algorithm: 'sha256' },
      ],
      keywords: [attack],
      links: [badLink, 'data:text/html,<script>window.__oscXss=true</script>'],
      submissionComment: attack,
    };
    const workflow = {
      id: workflowId,
      title: attack,
      description: attack,
      organization: 'Neuroscience Gateway',
      organizationSlug: 'neuroscience-gateway',
      contributorAlias: attack,
      submissionState: 'SUCCESS',
      submittedAt: date,
      blockchainTxId: 'c'.repeat(64),
      artifactIds: [artifactId],
      githubRepositories: [
        { url: badLink, description: attack, gitHash: 'a'.repeat(40) },
      ],
    };
    let body: unknown = {};
    if (path.endsWith(`/public/artifacts/${artifactId}`)) body = artifact;
    else if (path.endsWith(`/public/workflows/${workflowId}`)) body = workflow;
    else if (path.endsWith(`/public/artifacts/${artifactId}/history`)) {
      body = {
        count: 1,
        items: [
          {
            txId: 'ledger-revision-1',
            timestamp: date,
            revision: 1,
            snapshot: { ...artifact, links: [badLink] },
          },
        ],
      };
    } else if (path.endsWith('/status')) {
      body = {
        state: 'OPEN',
        interactionsAllowed: true,
        opensAt: date,
        closesAt: '2026-10-23T15:00:00.000Z',
      };
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });

  for (const path of [
    `/artifacts/${artifactId}`,
    `/artifacts/${artifactId}/history/ledger-revision-1`,
    `/workflows/${workflowId}`,
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 }).first()).toContainText(
      attack,
    );
    expect(
      await page.evaluate(
        () => (window as typeof window & { __oscXss?: boolean }).__oscXss,
      ),
    ).toBe(false);
    expect(await page.locator('img[src="x"]').count()).toBe(0);
    const unsafeHrefs = await page
      .locator('a[href]')
      .evaluateAll((links) =>
        links
          .map((link) => link.getAttribute('href') || '')
          .filter((href) => /^(javascript|data):/i.test(href)),
      );
    expect(unsafeHrefs).toEqual([]);
  }
});
