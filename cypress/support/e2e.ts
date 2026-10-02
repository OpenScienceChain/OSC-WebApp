/// <reference types="cypress" />

// Import commands.js using ES2015 syntax:
import type {
  AxeResults,
  ElementContext,
  Result as AxeViolation,
  RunOptions,
} from 'axe-core';
import './commands';

type AxeWindow = Window & {
  axe?: {
    run(context: ElementContext, options: RunOptions): Promise<AxeResults>;
  };
};

declare global {
  // Cypress custom commands require declaration merging with its global namespace.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      injectAxe(): Chainable<void>;
      checkA11y(
        context?: ElementContext,
        options?: RunOptions,
        violationCallback?: (violations: AxeViolation[]) => void,
        skipFailures?: boolean,
      ): Chainable<void>;
    }
  }
}

Cypress.Commands.add('injectAxe', () => {
  cy.readFile<string>('node_modules/axe-core/axe.min.js', { log: false }).then(
    (axeSource) => {
      cy.window({ log: false }).then((win) => {
        const axeWindow = win as AxeWindow;
        if (axeWindow.axe) return;

        const script = win.document.createElement('script');
        script.textContent = axeSource;
        win.document.head.appendChild(script);
        script.remove();
      });
    },
  );
});

Cypress.Commands.add(
  'checkA11y',
  (
    context?: ElementContext,
    options?: RunOptions,
    violationCallback?: (violations: AxeViolation[]) => void,
    skipFailures = false,
  ) => {
    cy.window({ log: false }).then(async (win) => {
      const axeWindow = win as AxeWindow;
      if (!axeWindow.axe) {
        throw new Error('axe-core is not installed in the application window');
      }

      const results = await axeWindow.axe.run(
        context ?? win.document,
        options ?? {},
      );
      violationCallback?.(results.violations);

      if (!skipFailures) {
        expect(
          results.violations,
          'expected the page to have no accessibility violations',
        ).to.have.length(0);
      }
    });
  },
);

function configureRuntimeStorage(
  storage: Storage,
  useStaging: unknown,
  apiBaseUrl: unknown,
): void {
  if (String(useStaging).toLowerCase() === 'true') {
    storage.setItem('USE_STAGING_API', 'true');
  } else {
    storage.removeItem('USE_STAGING_API');
  }

  if (apiBaseUrl) {
    storage.setItem('API_BASE_URL', String(apiBaseUrl));
  } else {
    storage.removeItem('API_BASE_URL');
  }
}

function installLocalSession(win: Window, authToken: unknown): void {
  const token = String(authToken ?? '').trim();
  if (!token) return;

  const payloadSegment = token.split('.')[1];
  if (!payloadSegment) {
    throw new Error('CYPRESS_AUTH_TOKEN is not a JWT');
  }

  const normalized = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const payload = JSON.parse(win.atob(padded)) as { exp?: number };
  if (!payload.exp || payload.exp * 1000 <= Date.now()) {
    throw new Error('CYPRESS_AUTH_TOKEN is missing an expiry or has expired');
  }

  const tokenData = JSON.stringify({
    token,
    expiresAt: payload.exp * 1000,
  });
  win.localStorage.setItem('tokenData', tokenData);
  win.localStorage.setItem('token', token);
}

let activeAuthToken = '';

beforeEach(() => {
  activeAuthToken = '';
  cy.env(['AUTH_TOKEN']).then(({ AUTH_TOKEN }) => {
    activeAuthToken = String(AUTH_TOKEN ?? '');
  });
});

// Configure the application origin before Angular initializes. This works for
// both credential-driven specs and an explicitly supplied local session token.
Cypress.on('window:before:load', (win) => {
  configureRuntimeStorage(
    win.localStorage,
    Cypress.expose('USE_STAGING_API'),
    Cypress.expose('API_BASE_URL'),
  );
  installLocalSession(win, activeAuthToken);
});
