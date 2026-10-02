import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

test('selected file bytes stay in the browser', async ({ page }) => {
  test.setTimeout(120_000);
  const sizes = [1024, 1024 * 1024, 10 * 1024 * 1024, 40 * 1024 * 1024];
  const observations: Array<{
    selectedBytes: number;
    requestBytes: number;
    fileBytesInRequest: boolean;
    filenameInRequest: boolean;
  }> = [];

  await page.route('**/assets/runtime-config.json', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ API_BASE_URL: '/api/v1', MOCK_PREVIEW: false }),
    }),
  );
  await page.route('**/api/v1/demo/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        path.endsWith('/status')
          ? {
              state: 'OPEN',
              interactionsAllowed: true,
              opensAt: '2026-09-01T00:00:00.000Z',
              closesAt: '2026-12-01T00:00:00.000Z',
            }
          : {},
      ),
    });
  });
  await page.addInitScript(() => {
    localStorage.setItem(
      'osc-usrse26-account-session',
      JSON.stringify({
        csrfToken: 'synthetic-csrf',
        expiresAt: new Date(Date.now() + 20 * 60_000).toISOString(),
        organization: 'neuroscience-gateway',
        contributorAlias: 'member-privacy-probe',
        accountUsername: 'privacy-probe',
      }),
    );
  });

  for (const selectedBytes of sizes) {
    await page.goto('/contribute');
    await page.getByLabel('Title', { exact: true }).fill('Synthetic privacy measurement');
    await page.getByLabel('Description', { exact: true }).fill(
      'Synthetic file created locally to check that the portal sends its fingerprint and metadata but never uploads its original bytes.',
    );
    await page.getByLabel('Submission Comment').fill(
      'Controlled browser upload-privacy evidence test.',
    );
    await page.locator('input[aria-label="Choose a file"]').setInputFiles({
      name: 'private-fixture.txt',
      mimeType: 'text/plain',
      buffer: Buffer.alloc(selectedBytes, 0x58),
    });
    await expect(page.getByText('1 file processed')).toBeVisible();
    const submit = page.getByRole('button', { name: 'Submit', exact: true });
    await expect(submit).toBeEnabled();

    let captured = false;
    await page.route('**/api/v1/demo/artifacts', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      const request = route.request();
      const bytes = request.postDataBuffer();
      expect(bytes).not.toBeNull();
      const body = JSON.parse(bytes!.toString('utf8'));
      expect(body.sizeBytes).toBe(selectedBytes);
      expect(body.fingerprint).toMatch(/^[0-9a-f]{64}$/);
      expect(body.files).toBeUndefined();
      const text = bytes!.toString('utf8');
      const fileBytesInRequest = text.includes('X'.repeat(64));
      const filenameInRequest = text.includes('private-fixture.txt');
      expect(fileBytesInRequest).toBe(false);
      expect(filenameInRequest).toBe(false);
      observations.push({
        selectedBytes,
        requestBytes: bytes!.length,
        fileBytesInRequest,
        filenameInRequest,
      });
      captured = true;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: '84aee052-97fb-4a6f-9f7d-52b856ed2b8d' }),
      });
    });
    await submit.click();
    await expect.poll(() => captured).toBe(true);
    await page.unroute('**/api/v1/demo/artifacts');
  }

  expect(observations).toHaveLength(sizes.length);
  const output = process.env.OSC_PRIVACY_EVIDENCE_PATH;
  if (output) {
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(
      output,
      JSON.stringify(
        {
          schemaVersion: 1,
          method: 'Playwright intercepted JSON POST from the portal after selecting synthetic text files; the API was mocked and no bytes reached a backend.',
          observations,
        },
        null,
        2,
      ) + '\n',
    );
  }
});
