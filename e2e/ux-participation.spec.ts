import { expect, test, type Page, type Request } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function setup(page: Page, eventStatus = 200) {
  const analytics: Request[] = [];
  const feedback: Request[] = [];
  await page.route('**/assets/runtime-config.json', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ API_BASE_URL: '/api/v1', MOCK_PREVIEW: false }),
    }),
  );
  await page.route('**/api/v1/demo/**', (route) => {
    const request = route.request();
    if (request.url().includes('/analytics/')) {
      analytics.push(request);
      return route.fulfill({
        status: request.url().endsWith('/events') ? eventStatus : 200,
        contentType: 'application/json',
        body: JSON.stringify(
          request.method() === 'DELETE'
            ? { consented: false, deleted: true }
            : { accepted: true, consented: true },
        ),
      });
    }
    if (request.url().includes('/ux-feedback')) {
      feedback.push(request);
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ accepted: true }),
      });
    }
    const path = new URL(request.url()).pathname;
    const body = path.endsWith('/status')
      ? {
          state: 'READ_ONLY',
          interactionsAllowed: false,
          message: 'Read only',
          opensAt: '2026-10-20T15:00:00Z',
          closesAt: '2026-10-23T15:00:00Z',
        }
      : path.endsWith('/counters')
        ? {
            anonymousBrowserSessions: 0,
            acceptedArtifacts: 0,
            confirmedArtifacts: 0,
            acceptedWorkflows: 0,
            confirmedWorkflows: 0,
            provenanceHistoryViews: 0,
          }
        : [];
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
  return { analytics, feedback };
}

async function checkA11y(page: Page): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    )
    .toBeLessThanOrEqual(1);
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(result.violations.map((item) => item.id)).toEqual([]);
}

test('reject is equal choice and sends only aggregate reject', async ({
  page,
}) => {
  const { analytics, feedback } = await setup(page);
  await page.goto('/feedback');
  await expect(
    page.getByRole('heading', { name: 'Share feedback' }),
  ).toBeVisible();
  const accept = page
    .getByRole('button', { name: 'Accept', exact: true })
    .first();
  const reject = page
    .getByRole('button', { name: 'Reject', exact: true })
    .first();
  await expect(accept).toBeVisible();
  await expect(reject).toBeVisible();
  expect((await accept.boundingBox())!.width).toBe(
    (await reject.boundingBox())!.width,
  );
  expect(analytics).toHaveLength(0);
  await checkA11y(page);
  await accept.focus();
  await page.keyboard.press('Tab');
  await expect(reject).toBeFocused();
  await page.keyboard.press('Enter');
  await expect.poll(() => analytics.length).toBe(1);
  expect(analytics[0].method()).toBe('POST');
  expect(new URL(analytics[0].url()).pathname).toBe(
    '/api/v1/demo/analytics/reject',
  );
  expect(analytics[0].postData()).toBeNull();
  expect(analytics[0].headers()).not.toHaveProperty('cookie');
  expect(analytics[0].headers()).toHaveProperty('origin');
  await page.reload();
  await expect(
    page.getByRole('region', { name: 'Analytics choice' }),
  ).toHaveCount(0);
  expect(analytics).toHaveLength(1);
  await expect
    .poll(
      () =>
        feedback.filter((request) => request.url().endsWith('/view')).length,
    )
    .toBe(2);
});

test('accept tracks only allowlisted route and deletion stops events', async ({
  page,
}, testInfo) => {
  const { analytics } = await setup(page);
  await page.goto('/feedback');
  await page
    .getByRole('button', { name: 'Accept', exact: true })
    .first()
    .click();
  await expect.poll(() => analytics.length).toBe(2);
  const [session, event] = analytics;
  expect(new URL(session.url()).pathname).toBe(
    '/api/v1/demo/analytics/session',
  );
  expect(event.postDataJSON()).toEqual({
    eventType: 'PAGE_VIEW',
    route: '/feedback',
    deviceCategory: (
      {
        desktop: 'DESKTOP',
        tablet: 'TABLET',
        mobile: 'MOBILE',
        'small-mobile': 'SMALL_MOBILE',
      } as Record<string, string>
    )[testInfo.project.name],
  });
  await page.getByText('Privacy choices').click();
  await page.getByRole('button', { name: 'Delete analytics history' }).click();
  await expect.poll(() => analytics.length).toBe(3);
  expect(analytics[2].method()).toBe('DELETE');
  await page.reload();
  expect(analytics).toHaveLength(3);
  await checkA11y(page);
});

test('expired analytics session clears the accepted choice', async ({
  page,
}) => {
  const { analytics } = await setup(page, 403);
  await page.goto('/feedback');
  await page
    .getByRole('button', { name: 'Accept', exact: true })
    .first()
    .click();
  await expect.poll(() => analytics.length).toBe(2);
  await expect(
    page.getByRole('region', { name: 'Analytics choice' }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      localStorage.getItem('osc-ux-analytics-choice-v1'),
    ),
  ).toBeNull();
});

test('anonymous survey needs one answer and works without analytics consent', async ({
  page,
}) => {
  const { analytics, feedback } = await setup(page);
  await page.route('**/api/v1/users/validate-token', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{}',
    }),
  );
  await page.addInitScript(() => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = `${btoa('{}')}.${btoa(JSON.stringify({ exp, username: 'tester', roles: ['collaborator'] }))}.sig`;
    localStorage.setItem(
      'tokenData',
      JSON.stringify({ token, expiresAt: exp * 1000 }),
    );
    localStorage.setItem('token', token);
  });
  await page.goto('/feedback');
  const send = page.getByRole('button', { name: 'Send feedback' });
  await expect(send).toBeDisabled();
  await page
    .getByLabel('How would you rate the visual design?')
    .selectOption({ label: '5 of 5' });
  await page
    .getByLabel('Would research workflow automation be useful to you?')
    .selectOption('YES');
  await page.getByLabel('What should we improve?').fill('A private comment');
  await expect(send).toBeEnabled();
  await checkA11y(page);
  await send.click();
  await expect(
    page.getByText('Thank you for sharing your feedback.'),
  ).toBeVisible();
  const submitted = feedback.find(
    (request) => !request.url().endsWith('/view'),
  )!;
  expect(submitted.postDataJSON()).toEqual({
    visualRating: 5,
    automationInterest: 'YES',
    overallComment: 'A private comment',
  });
  expect(submitted.headers()).not.toHaveProperty('authorization');
  expect(submitted.headers()).not.toHaveProperty('cookie');
  expect(
    feedback.find((request) => request.url().endsWith('/view'))!.headers(),
  ).not.toHaveProperty('cookie');
  expect(analytics).toHaveLength(0);
});

test('interactive demo remains accessible at its reconciled route', async ({
  page,
}) => {
  const { analytics } = await setup(page);
  await page.goto('/interactive-demo');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await checkA11y(page);
  expect(analytics).toHaveLength(0);
});
