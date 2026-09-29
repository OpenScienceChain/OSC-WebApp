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
    page.getByRole('heading', { level: 1, name: 'Magnetic arch plasma' }),
  ).toBeVisible();
  await expect(
    page.getByText('Confirmed', { exact: true }).first(),
  ).toBeVisible();
  await expect(page.locator('.configuration-list button')).toHaveCount(5);
  await expect(page.getByText('80', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: /^DA - ECR source cluster/ }).click();
  await expect(page.getByText('DA_FC.txt')).toBeVisible();
  await page
    .getByRole('button', { name: 'Show ledger history', exact: true })
    .click();
  await expect(
    page.locator('#artifact-ledger-history .history-list > li'),
  ).toHaveCount(1);
  await page
    .getByText('Inspect hashes recorded in this ledger revision')
    .click();
  await expect(page.locator('.ledger-snapshot li')).toHaveCount(14);
  await expect(
    page.getByText('Ledger footprint matches the current record'),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Show workflow history' }).click();
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
