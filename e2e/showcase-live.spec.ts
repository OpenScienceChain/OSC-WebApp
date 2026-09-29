import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.skip(
  !process.env.LIVE_SHOWCASE,
  'Run against a seeded local Fabric stack',
);

test('public research example shows confirmed ledger evidence', async ({
  page,
}) => {
  const failures: string[] = [];
  page.on('response', (response) => {
    if (response.url().includes('/api/v1/showcase') && !response.ok()) {
      failures.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto('/research-example');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Follow the evidence' }),
  ).toBeVisible();
  await expect(
    page.getByText('Ledger confirmed', { exact: true }).first(),
  ).toBeVisible();
  await expect(page.locator('.artifact-grid button')).toHaveCount(5);
  await expect(page.getByText('80', { exact: true })).toBeVisible();

  await page
    .locator('.artifact-grid button')
    .filter({ hasText: /^Source artifactDA - ECR source cluster/ })
    .click();
  await page.getByText(/And \d+ more files. Show all hashes/).click();
  await expect(page.getByText('DA_FC.txt')).toBeVisible();
  await page
    .getByRole('button', { name: 'View artifact ledger history', exact: true })
    .click();
  await expect(
    page.locator('#artifact-ledger-history .history-list > li'),
  ).toHaveCount(1);
  await page.getByText('Inspect ledger-recorded hashes').click();
  await expect(page.locator('.ledger-snapshot li')).toHaveCount(14);
  await expect(
    page.getByText('Footprint matches current record'),
  ).toBeVisible();

  await page
    .getByRole('button', { name: 'View workflow ledger history' })
    .click();
  await expect(
    page.locator('#workflow-ledger-history .history-list > li'),
  ).toHaveCount(1);
  expect(failures).toEqual([]);

  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(horizontalOverflow).toBe(false);
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});

test('all published examples expose source, hashes, and Fabric history', async ({
  page,
}) => {
  await page.goto('/research-example');
  await expect(page.locator('.example-grid button')).toHaveCount(3);
  for (const [index, source, filename, count] of [
    [1, 'EEG Eye State', 'EEG Eye State.arff', 1],
    [
      2,
      'Can citizen science analysis of camera trap data',
      'volunteers_trainedObservers_sequenceClassification.csv',
      2,
    ],
  ] as const) {
    await page.locator('.example-grid button').nth(index).click();
    await expect(page.locator('#active-heading')).toContainText(source);
    await expect(page.locator('.artifact-grid button')).toHaveCount(count);
    await expect(page.getByText(filename)).toBeVisible();
    await page
      .getByRole('button', { name: 'View artifact ledger history' })
      .click();
    await expect(
      page.locator('#artifact-ledger-history .history-list > li'),
    ).not.toHaveCount(0);
    await page
      .getByRole('button', { name: 'View workflow ledger history' })
      .click();
    await expect(
      page.locator('#workflow-ledger-history .history-list > li'),
    ).not.toHaveCount(0);
    const accessibility = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(accessibility.violations).toEqual([]);
  }
  await expect(
    page.getByRole('navigation', { name: 'Footer navigation' }),
  ).toBeVisible();
});

test('landing footer connects to the research examples accessibly', async ({
  page,
}) => {
  await page.goto('/');
  const footer = page.getByRole('contentinfo');
  await expect(
    footer.getByText('Open Science Chain', { exact: true }).first(),
  ).toBeVisible();
  const background = await page
    .locator('.hero')
    .evaluate((element) => getComputedStyle(element).backgroundImage);
  expect(background).toContain('laboratory-research-thisisengineering.jpg');
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await footer.getByRole('link', { name: 'Research example' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Follow the evidence' }),
  ).toBeVisible();
});
