import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.skip(
  !process.env.PLAYWRIGHT_AWS_PRIVATE,
  'Run against the private EKS UI.',
);

test('private EKS UI serves its public pages accessibly', async ({ page }) => {
  const routes = [
    ['/', /Open Science Chain/],
    ['/list-artifacts', /Artifacts Vault/],
    ['/list-workflows', /Workflows/],
    ['/research-example', /Follow the evidence/],
    ['/auth/sign-in', /Sign in/],
  ] as const;

  for (const [path, heading] of routes) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(
      page.getByRole('heading', { level: 1, name: heading }),
    ).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(overflow, `${path} has horizontal overflow`).toBe(false);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations, `${path} has accessibility violations`).toEqual(
      [],
    );
  }
});
