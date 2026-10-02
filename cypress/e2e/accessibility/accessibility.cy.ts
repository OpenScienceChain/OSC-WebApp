/// <reference types="cypress" />

import {
  demoArtifactDetail,
  demoArtifactHistory,
  demoArtifacts,
  demoWorkflowDetail,
  demoWorkflows,
  installDemoCatalogIntercepts,
  installDemoSession,
} from '../../support/usrse26-demo';

function checkWcag(): void {
  cy.injectAxe();
  cy.checkA11y(
    undefined,
    {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
      },
    },
    (violations) => {
      if (violations.length === 0) return;

      const details = violations
        .map((violation) => {
          const targets = violation.nodes
            .map((node) => node.target.join(' '))
            .join(', ');
          return `${violation.id}: ${violation.help} [${targets}]`;
        })
        .join('\n');
      throw new Error(`Accessibility violations:\n${details}`);
    },
    true,
  );
}

function assertNoHorizontalOverflow(): void {
  cy.document().then((document) => {
    expect(document.documentElement.scrollWidth).to.be.at.most(
      document.documentElement.clientWidth + 1,
    );
  });
}

function visitAuthenticated(url: string): void {
  cy.intercept('GET', '**/api/v1/users/validate-token', {
    body: { valid: true },
  }).as('validateToken');
  cy.visit(url, { onBeforeLoad: installDemoSession });
}

describe('WCAG 2.2 AA regression checks', () => {
  it('checks the provenance-led landing page and desktop contribution menu', () => {
    cy.viewport(1440, 900);
    installDemoCatalogIntercepts();
    cy.visit('/');
    cy.wait(['@artifacts', '@workflows']);
    cy.contains('h1', 'Open Science Chain').should('be.visible');
    cy.contains('Demonstration data, not researcher submissions').should(
      'be.visible',
    );
    checkWcag();
    assertNoHorizontalOverflow();

    cy.contains('button', 'Contribute').click();
    cy.get('#contribute-options').should('be.visible');
    checkWcag();
  });

  it('checks keyboard access and mobile navigation at 390 pixels', () => {
    cy.viewport(390, 844);
    installDemoCatalogIntercepts();
    cy.visit('/');
    cy.wait(['@artifacts', '@workflows']);
    cy.get('h1').should('be.visible');
    cy.get('.navigation-toggle').focus().should('have.focus').click();
    cy.get('#primary-navigation-links').should('be.visible');
    cy.contains('button', 'Contribute').click();
    cy.get('#contribute-options').should('be.visible');
    checkWcag();
    assertNoHorizontalOverflow();

    cy.get('#contribute-options button').first().focus().type('{esc}');
    cy.get('#contribute-options').should('not.exist');
    cy.contains('button', 'Contribute')
      .should('have.focus')
      .and('have.attr', 'aria-expanded', 'false')
      .type('{esc}');
    cy.get('#primary-navigation-links').should('not.be.visible');
    cy.get('.navigation-toggle').should('have.focus');
  });

  it('checks sign-in validation and expired-session recovery', () => {
    cy.visit(
      '/auth/sign-in?reason=expired&returnUrl=%2Fartifacts%2Fartifact-nsg-001%2Fhistory',
    );
    cy.get('[data-cy="session-expired"]')
      .should('be.visible')
      .and('contain.text', 'Your session ended');
    checkWcag();

    cy.get('#username').focus().blur();
    cy.get('#password').focus().blur();
    cy.get('#username-error').should('be.visible');
    cy.get('#password-error').should('be.visible');
    checkWcag();
    assertNoHorizontalOverflow();
  });

  it('checks artifact results, empty search, and API failure states', () => {
    installDemoCatalogIntercepts();
    cy.visit('/list-artifacts');
    cy.wait('@artifacts');
    cy.get('app-artifact-card').should('have.length', demoArtifacts.length);
    checkWcag();

    cy.get('#artifact-title-search').type('no matching title');
    cy.contains('button', 'Search').click();
    cy.contains('No matching artifacts').should('be.visible');
    checkWcag();

    cy.intercept('GET', '**/api/v1/artifacts', {
      statusCode: 503,
      body: { message: 'simulated outage' },
    }).as('artifactFailure');
    cy.visit('/list-artifacts');
    cy.wait('@artifactFailure');
    cy.contains('We could not load the artifact catalog').should('be.visible');
    checkWcag();
  });

  it('checks workflow results and API failure states', () => {
    installDemoCatalogIntercepts();
    cy.visit('/list-workflows');
    cy.wait('@workflows');
    cy.get('app-workflow-card').should('have.length', demoWorkflows.length);
    checkWcag();

    cy.intercept('GET', '**/api/v1/workflows', {
      statusCode: 503,
      body: { message: 'simulated outage' },
    }).as('workflowFailure');
    cy.visit('/list-workflows');
    cy.wait('@workflowFailure');
    cy.contains('We could not load the workflow catalog').should('be.visible');
    checkWcag();
  });

  it('checks blockchain evidence on artifact and workflow details', () => {
    cy.intercept('GET', '**/api/v1/artifacts/artifact-nsg-001', {
      body: demoArtifactDetail,
    }).as('artifactDetail');
    cy.visit('/artifacts/artifact-nsg-001');
    cy.wait('@artifactDetail');
    cy.contains('h2', 'Recorded on the OSC permissioned blockchain').should(
      'be.visible',
    );
    checkWcag();
    assertNoHorizontalOverflow();

    cy.intercept('GET', '**/api/v1/workflows/workflow-nsg-001', {
      body: demoWorkflowDetail,
    }).as('workflowDetail');
    cy.visit('/workflows/workflow-nsg-001');
    cy.wait('@workflowDetail');
    cy.contains(
      'h2',
      'Workflow relationships committed as a ledger event',
    ).should('be.visible');
    checkWcag();
    assertNoHorizontalOverflow();
  });

  it('keeps a route heading when artifact and workflow APIs fail', () => {
    cy.intercept('GET', '**/api/v1/artifacts/artifact-nsg-001', {
      statusCode: 503,
      body: { message: 'simulated outage' },
    }).as('artifactDetailFailure');
    cy.visit('/artifacts/artifact-nsg-001');
    cy.wait('@artifactDetailFailure');
    cy.contains('h1', 'Artifact unavailable').should('be.visible');
    checkWcag();

    cy.intercept('GET', '**/api/v1/workflows/workflow-nsg-001', {
      statusCode: 503,
      body: { message: 'simulated outage' },
    }).as('workflowDetailFailure');
    cy.visit('/workflows/workflow-nsg-001');
    cy.wait('@workflowDetailFailure');
    cy.contains('h1', 'Workflow unavailable').should('be.visible');
    checkWcag();
  });

  it('checks accepted provenance history on desktop and mobile', () => {
    cy.intercept('GET', '**/api/v1/artifacts/artifact-nsg-001', {
      body: demoArtifactDetail,
    }).as('artifactDetail');
    cy.intercept('GET', '**/api/v1/artifacts/artifact-nsg-001/history*', {
      body: demoArtifactHistory,
    }).as('artifactHistory');
    visitAuthenticated('/artifacts/artifact-nsg-001/history');
    cy.wait(['@artifactDetail', '@artifactHistory']);
    cy.contains('h2', 'Accepted ledger events').should('be.visible');
    cy.get('.history-card').should(
      'have.length',
      demoArtifactHistory.items.length,
    );
    cy.contains('Version 3').should('be.visible');
    cy.contains('Verified fingerprint').should('be.visible');
    checkWcag();
    assertNoHorizontalOverflow();

    cy.viewport(390, 844);
    assertNoHorizontalOverflow();
    checkWcag();
  });

  it('checks empty and unavailable provenance history states', () => {
    cy.intercept('GET', '**/api/v1/artifacts/artifact-nsg-001', {
      body: demoArtifactDetail,
    });
    cy.intercept('GET', '**/api/v1/artifacts/artifact-nsg-001/history*', {
      body: { ...demoArtifactHistory, items: [], total: 0 },
    }).as('emptyHistory');
    visitAuthenticated('/artifacts/artifact-nsg-001/history');
    cy.wait('@emptyHistory');
    cy.contains('No accepted history yet').should('be.visible');
    checkWcag();

    cy.intercept('GET', '**/api/v1/artifacts/artifact-nsg-001/history*', {
      statusCode: 503,
      body: { message: 'simulated ledger outage' },
    }).as('historyFailure');
    visitAuthenticated('/artifacts/artifact-nsg-001/history');
    cy.wait('@historyFailure');
    cy.contains('History is temporarily unavailable').should('be.visible');
    cy.contains('button', 'Try again').should('be.visible');
    checkWcag();
  });
});
