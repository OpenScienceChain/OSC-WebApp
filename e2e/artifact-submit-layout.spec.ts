import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('artifact submission keeps its fields, validation, and responsive layout', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'osc-usrse26-account-session',
      JSON.stringify({
        csrfToken: 'preview-only',
        expiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
        organization: 'neuroscience-gateway',
        contributorAlias: 'member-preview',
        accountUsername: 'preview',
      }),
    );
  });
  await page.route('**/api/v1/demo/status', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ state: 'OPEN', interactionsAllowed: true }),
    }),
  );

  await page.goto('/contribute');
  await expect(
    page.getByRole('heading', { name: 'Submit an artifact' }),
  ).toBeVisible();
  await expect(page.getByText('Neuroscience Gateway')).toBeVisible();
  for (const label of [
    'Title',
    'Description',
    'Keywords',
    'Links of interest',
    'DOI',
    'Type of research output (optional)',
    'Acknowledgment',
    'Submission Comment',
  ]) {
    await expect(page.getByLabel(label, { exact: true })).toBeVisible();
  }
  for (const agency of ['NSF', 'NIH', 'NOAA', 'NASA']) {
    await expect(page.getByRole('checkbox', { name: agency })).toBeVisible();
  }
  await expect(page.getByLabel('Other:')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Select a Folder' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Select a File' }),
  ).toBeVisible();
  const submit = page.getByRole('button', { name: 'Submit', exact: true });
  await expect(submit).toBeDisabled();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  const violations = (await new AxeBuilder({ page }).include('main').analyze())
    .violations;
  expect(violations).toEqual([]);

  if (process.env.SAVE_PREVIEW === '1') {
    await page.screenshot({
      path: `test-results/artifact-submit-${testInfo.project.name}.png`,
      fullPage: true,
    });
  }

  await page.getByLabel('Title', { exact: true }).fill('EEG source files');
  await page
    .getByLabel('Description', { exact: true })
    .fill(
      'A documented set of EEG recordings and metadata for a reproducible public research example.',
    );
  await page
    .getByLabel('Submission Comment', { exact: true })
    .fill('Initial submission for provenance review.');
  await expect(submit).toBeDisabled();
  await page.locator('input[aria-label="Choose a file"]').setInputFiles({
    name: 'example.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('public research example'),
  });
  await expect(page.getByText('1 file processed')).toBeVisible();
  await expect(submit).toBeEnabled();
});
