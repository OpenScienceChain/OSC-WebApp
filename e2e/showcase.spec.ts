import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const date = '2026-09-29T12:00:00.000Z';
const codes = ['S0', 'S1', 'D0', 'DA', 'DB'];
const counts = [21, 21, 11, 14, 13];
const ids = codes.map(
  (_, index) => `${index + 1}1111111-1111-4111-8111-111111111111`,
);
const workflowId = '99999999-9999-4999-8999-999999999999';

const artifacts = codes.map((code, index) => ({
  id: ids[index],
  title: `${code} - magnetic configuration`,
  description: `Published ${code} measurement series from the magnetic arch plasma experiment.`,
  organizationSlug: 'magnetic-arch-plasma-showcase',
  submissionState: 'SUCCESS',
  submittedAt: date,
  updatedAt: date,
  blockchainTxId: `fabric-artifact-${code}`,
  footprint: 'a'.repeat(64),
  manifest: Array.from({ length: counts[index] }, (_, measurementIndex) => ({
    filename: `${code}_${measurementIndex - 10}deg.csv`,
    hash: measurementIndex.toString(16).padStart(64, '0'),
    algorithm: 'sha256',
    probe: 'RPA',
    angleDegrees: measurementIndex - 10,
  })),
  keywords: ['plasma'],
  links: ['https://zenodo.org/records/13987138'],
  dois: ['10.5281/zenodo.13987138'],
  submissionComment: 'Curated public source file fingerprints.',
}));

async function mockShowcase(page: Page) {
  await page.route('**/assets/runtime-config.json', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ API_BASE_URL: '/api/v1', MOCK_PREVIEW: false }),
    }),
  );
  await page.route('**/api/v1/showcase/examples', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        examples: [
          {
            key: 'magnetic-arch',
            organization: 'Magnetic Arch Plasma Showcase',
            summary: 'Five configurations and 80 file fingerprints.',
            ready: true,
            source: {
              title:
                'Magnetic arch plasma expansion in a cluster of two ECR plasma sources',
              doi: '10.5281/zenodo.13987138',
              url: 'https://zenodo.org/records/13987138',
              creators: [
                'Celian Boye',
                'Mario Merino',
                'Jaume Navarro Cavalle',
              ],
              collected: '2023-02 to 2023-03',
              licenseNote: 'Consult the Zenodo source record for reuse terms.',
            },
            artifacts,
            workflows: [
              {
                id: workflowId,
                title: 'Magnetic arch RPA and FC measurement workflow',
                description: 'Connects five configuration manifests.',
                organizationSlug: 'magnetic-arch-plasma-showcase',
                submissionState: 'SUCCESS',
                blockchainTxId: 'fabric-workflow-tx',
                artifactIds: ids,
                submittedAt: date,
                updatedAt: date,
              },
            ],
          },
        ],
      }),
    }),
  );
  await page.route(
    '**/api/v1/showcase/examples/magnetic-arch/artifacts/*/history',
    (route) => {
      const artifactId = new URL(route.request().url()).pathname
        .split('/')
        .at(-2);
      const artifact = artifacts.find((item) => item.id === artifactId);
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              txId: 'fabric-artifact-history-1',
              timestamp: date,
              revision: 1,
              snapshot: {
                footprint: 'a'.repeat(64),
                manifest: artifact?.manifest ?? [],
              },
            },
          ],
          count: 1,
          hasMore: false,
        }),
      });
    },
  );
  await page.route(
    '**/api/v1/showcase/examples/magnetic-arch/workflows/*/history',
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              txId: 'fabric-workflow-tx',
              timestamp: date,
              revision: 1,
              snapshot: { artifactIds: ids },
            },
          ],
          count: 1,
          hasMore: false,
        }),
      }),
  );
}

test('research example is usable and accessible', async ({
  page,
}, testInfo) => {
  await mockShowcase(page);
  await page.goto('/research-example');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Follow the evidence' }),
  ).toBeVisible();
  await expect(page.getByText('80', { exact: true })).toBeVisible();
  await expect(page.locator('.artifact-grid button')).toHaveCount(5);
  await page.locator('.artifact-grid button').nth(3).click();
  await expect(page.getByText('DA_-10deg.csv')).toBeVisible();
  await page
    .getByRole('button', { name: 'View artifact ledger history', exact: true })
    .click();
  await expect(page.getByText('fabric-artifact-history-1')).toBeVisible();
  await page.getByText('Inspect ledger-recorded hashes').click();
  await expect(page.locator('.ledger-snapshot li')).toHaveCount(14);
  await expect(
    page.getByText('Footprint matches current record'),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'View workflow ledger history' })
    .click();
  await expect(page.getByText('fabric-workflow-tx').last()).toBeVisible();

  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(horizontalOverflow).toBe(false);
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath('showcase.png'),
    fullPage: true,
  });
});
