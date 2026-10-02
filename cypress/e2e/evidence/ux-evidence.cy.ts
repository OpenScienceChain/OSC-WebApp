/// <reference types="cypress" />

import {
  demoArtifactDetail,
  demoArtifactHistory,
  demoWorkflowDetail,
  installDemoCatalogIntercepts,
  installDemoSession,
} from '../../support/usrse26-demo';

const phase = String(Cypress.env('EVIDENCE_PHASE') || 'baseline');

function capture(name: string): void {
  cy.screenshot(`usrse26/${phase}/${name}`, {
    capture: 'viewport',
    overwrite: true,
  });
}

describe('US-RSE product evidence', () => {
  it('captures the product entry point on desktop and mobile', () => {
    installDemoCatalogIntercepts();
    cy.viewport(1440, 900);
    cy.visit('/');
    cy.wait(['@artifacts', '@workflows']);
    cy.get('h1').should('be.visible');
    capture('home-desktop-1440x900');

    cy.viewport(390, 844);
    cy.visit('/');
    cy.wait(['@artifacts', '@workflows']);
    cy.get('h1').should('be.visible');
    capture('home-mobile-390x844');
  });

  it('captures representative artifact and workflow records', () => {
    cy.intercept('GET', '**/api/v1/artifacts/artifact-nsg-001', {
      body: demoArtifactDetail,
    }).as('artifactDetail');
    cy.viewport(1440, 900);
    cy.visit('/artifacts/artifact-nsg-001');
    cy.wait('@artifactDetail');
    cy.contains('h1', demoArtifactDetail.title).should('be.visible');
    capture('artifact-detail-desktop-1440x900');

    cy.intercept('GET', '**/api/v1/workflows/workflow-nsg-001', {
      body: demoWorkflowDetail,
    }).as('workflowDetail');
    cy.visit('/workflows/workflow-nsg-001');
    cy.wait('@workflowDetail');
    cy.contains('h1', demoWorkflowDetail.title).should('be.visible');
    capture('workflow-detail-desktop-1440x900');
  });

  it('captures the authenticated provenance-history experience', () => {
    cy.intercept('GET', '**/api/v1/users/validate-token', {
      body: { valid: true, userId: 'demo-user' },
    }).as('validateToken');
    cy.intercept('GET', '**/api/v1/artifacts/artifact-nsg-001', {
      body: demoArtifactDetail,
    }).as('artifactDetail');
    cy.intercept('GET', '**/api/v1/artifacts/artifact-nsg-001/history*', {
      body: demoArtifactHistory,
    }).as('artifactHistory');

    cy.viewport(1440, 900);
    cy.visit('/artifacts/artifact-nsg-001/history', {
      onBeforeLoad: installDemoSession,
    });
    cy.wait('@artifactHistory');
    cy.contains(demoArtifactDetail.title).should('be.visible');
    capture('provenance-history-desktop-1440x900');
  });
});
