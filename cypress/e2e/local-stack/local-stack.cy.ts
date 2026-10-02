/// <reference types="cypress" />

const simulatorControlUrl = 'http://127.0.0.1:3310/__control/scenario';

function useScenario(scenario: string): void {
  cy.request('POST', simulatorControlUrl, { scenario });
}

describe('Credential-free local deployment', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    useScenario('success');
  });

  it('serves seeded NSG and Citizen Science records', () => {
    cy.visit('/');
    cy.contains('Neuroscience Gateway').should('be.visible');
    cy.contains('Citizen Science').should('be.visible');
    cy.get('app-artifact-card').should('have.length', 3);
    cy.get('app-workflow-card').should('have.length', 2);

    cy.request('http://127.0.0.1:3310/api/v1/artifacts?organization=NSG')
      .its('body')
      .should((records) => {
        expect(records).to.have.length(2);
        expect(
          records.every((record: any) => record.organization.code === 'NSG'),
        ).to.equal(true);
      });

    cy.request(
      'http://127.0.0.1:3310/api/v1/artifacts?organization=Citizen%20Science',
    )
      .its('body')
      .should((records) => {
        expect(records).to.have.length(1);
        expect(records[0].organization.code).to.equal('CS');
      });
  });

  it('renders artifact and workflow details with blockchain provenance', () => {
    cy.visit('/artifacts/artifact-cs-001');
    cy.contains('h1', 'Citizen Science coastal observations').should(
      'be.visible',
    );
    cy.contains('h2', 'Recorded on the OSC permissioned blockchain').should(
      'be.visible',
    );
    cy.contains('dt', 'Transaction').should('be.visible');
    cy.contains('h2', 'SHA-256 file manifest').should('be.visible');

    cy.visit('/workflows/workflow-nsg-001');
    cy.contains('h1', 'Reproducible neuroimaging preparation').should(
      'be.visible',
    );
    cy.contains(
      'h2',
      'Workflow relationships committed as a ledger event',
    ).should('be.visible');
    cy.contains('h2', 'Linked OSC artifacts').should('be.visible');
    cy.contains('h2', 'Repository revisions').should('be.visible');
  });

  it('distinguishes slow and empty catalog responses', () => {
    useScenario('slow');
    cy.visit('/list-artifacts');
    cy.contains('Loading artifacts').should('be.visible');
    cy.get('app-artifact-card', { timeout: 5000 }).should('have.length', 3);

    useScenario('empty');
    cy.visit('/list-workflows');
    cy.contains('No workflows yet').should('be.visible');
  });

  it('recovers after a failed dependency request', () => {
    useScenario('recovery');
    cy.visit('/list-artifacts');
    cy.contains('We could not load the artifact catalog').should('be.visible');
    cy.contains('button', 'Try again').click();
    cy.get('app-artifact-card').should('have.length', 3);
  });

  it('shows a stable error when the API is offline', () => {
    useScenario('offline');
    cy.visit('/list-workflows');
    cy.contains('We could not load the workflow catalog').should('be.visible');
  });

  it('replaces detail loading states with a recoverable error', () => {
    useScenario('error');
    cy.visit('/artifacts/artifact-nsg-001');
    cy.contains('Artifact unavailable').should('be.visible');
    cy.contains('button', 'Try again').should('be.visible');

    cy.visit('/workflows/workflow-nsg-001');
    cy.contains('Workflow unavailable').should('be.visible');
    cy.contains('button', 'Try again').should('be.visible');
  });

  it('redirects unauthorized and expired sessions to sign in', () => {
    useScenario('unauthorized');
    cy.visit('/list-artifacts');
    cy.url().should('include', '/auth/sign-in');
    cy.contains('Sign in to your account').should('be.visible');

    useScenario('expired');
    cy.visit('/list-workflows');
    cy.url().should('include', '/auth/sign-in');
    cy.contains('Session expired', { timeout: 8000 }).should('be.visible');
  });
});
