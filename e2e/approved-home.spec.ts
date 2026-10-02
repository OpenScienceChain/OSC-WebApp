import { expect, test } from '@playwright/test';

test('demo API mode preserves the approved photo landing page', async ({
  page,
}) => {
  await page.route('**/assets/runtime-config.json', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ API_BASE_URL: '/api/v1', DEMO_MODE: true }),
    }),
  );
  await page.goto('/');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Open Science Chain' }),
  ).toBeVisible();
  await expect(
    page.getByText('Blockchain-backed scientific provenance'),
  ).toBeVisible();
  const background = await page
    .locator('.hero')
    .evaluate((element) => getComputedStyle(element).backgroundImage);
  expect(background).toContain('laboratory-research-thisisengineering.jpg');
  await expect(
    page.getByRole('heading', {
      name: 'See a fingerprint become a provenance record',
    }),
  ).toHaveCount(0);

  await page.goto('/interactive-demo');
  await expect(
    page.getByRole('heading', {
      name: 'See a fingerprint become a provenance record',
    }),
  ).toBeVisible();
});
