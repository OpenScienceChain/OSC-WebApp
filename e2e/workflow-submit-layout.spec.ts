import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('workflow submission keeps its fields, interactions, and responsive layout', async ({
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
  await page.route('**/api/v1/demo/artifacts**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          title: 'EEG source files',
          organizationSlug: 'neuroscience-gateway',
          submissionState: 'SUCCESS',
          contributorAlias: 'member-preview',
        },
      ]),
    }),
  );

  await page.goto('/create-workflow');
  await expect(
    page.getByRole('heading', { name: 'Submit a workflow' }),
  ).toBeVisible();
  await expect(page.getByText('Neuroscience Gateway').first()).toBeVisible();
  for (const label of [
    'Title',
    'Description',
    'Keywords',
    'Submission Comment',
    'Type of workflow (optional)',
  ]) {
    await expect(page.getByLabel(label, { exact: true })).toBeVisible();
  }
  await expect(page.getByLabel(/Linked Artifacts/)).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'GitHub Repositories' }),
  ).toBeVisible();
  const submit = page.getByRole('button', { name: 'Submit workflow' });
  await expect(submit).toBeDisabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
  expect(
    (await new AxeBuilder({ page }).include('main').analyze()).violations,
  ).toEqual([]);

  if (process.env.SAVE_PREVIEW === '1') {
    await page.screenshot({
      path: `test-results/workflow-submit-${testInfo.project.name}.png`,
      fullPage: true,
    });
  }

  await page.getByLabel('Title', { exact: true }).fill('EEG review workflow');
  await page
    .getByLabel('Description', { exact: true })
    .fill(
      'This workflow documents a reproducible review of linked EEG data and its analysis steps.',
    );
  await page
    .getByLabel('Submission Comment', { exact: true })
    .fill('Initial submission for provenance review.');
  await expect(submit).toBeDisabled();
  await page.getByLabel(/Linked Artifacts/).click();
  await page.getByRole('button', { name: /EEG source files/ }).click();
  await expect(submit).toBeEnabled();
  await page.getByRole('button', { name: '+ Add Repository' }).click();
  await expect(page.getByLabel('GitHub URL')).toBeVisible();
  await expect(page.getByLabel('Repository description')).toBeVisible();
  await expect(page.getByLabel('Commit hash')).toBeVisible();
  await expect(submit).toBeDisabled();
  await page.getByRole('button', { name: '+ Add File' }).click();
  await expect(page.getByLabel('Repository 1 file 1 filename')).toBeVisible();
  await expect(
    page.getByLabel('Repository 1 file 1 hash (optional)'),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
  expect(
    (await new AxeBuilder({ page }).include('main').analyze()).violations,
  ).toEqual([]);
  if (process.env.SAVE_PREVIEW === '1') {
    await page.screenshot({
      path: `test-results/workflow-repository-${testInfo.project.name}.png`,
      fullPage: true,
    });
  }
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(submit).toBeEnabled();
});
