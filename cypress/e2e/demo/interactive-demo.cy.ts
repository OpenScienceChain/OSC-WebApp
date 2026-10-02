/// <reference types="cypress" />

const artifactId = '11111111-1111-4111-8111-111111111111';
const workflowId = '22222222-2222-4222-8222-222222222222';
const opensAt = '2026-10-20T15:00:00.000Z';
const closesAt = '2026-10-23T15:00:00.000Z';

const counters = {
  anonymousBrowserSessions: 12,
  acceptedArtifacts: 7,
  confirmedArtifacts: 6,
  acceptedWorkflows: 3,
  confirmedWorkflows: 2,
  provenanceHistoryViews: 9,
};

const publicArtifacts = [
  {
    id: '33333333-3333-4333-8333-333333333333',
    title: 'Public neuroscience demonstration artifact',
    description: 'A controlled public neuroscience demonstration record.',
    organization: 'Neuroscience Gateway',
    organizationSlug: 'neuroscience-gateway',
    contributorAlias: 'guest-aabbccdd',
    researchContext: 'research_dataset',
    verified: true,
    submissionState: 'SUCCESS',
    submittedAt: opensAt,
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    title: 'Public citizen science demonstration artifact',
    description: 'A controlled public citizen science demonstration record.',
    organization: 'Citizen Science',
    organizationSlug: 'citizen-science',
    contributorAlias: 'guest-eeff0011',
    researchContext: 'reproducible_analysis',
    verified: true,
    submissionState: 'SUCCESS',
    submittedAt: opensAt,
  },
];

function installPublicRequests(state = 'OPEN'): void {
  cy.intercept('GET', '**/assets/runtime-config.json', {
    API_BASE_URL: '/api/v1',
    DEMO_MODE: true,
  });
  cy.intercept('GET', '**/api/v1/demo/status', {
    state,
    message:
      state === 'OPEN'
        ? 'The interactive demonstration is open.'
        : 'New contributions are paused; public demonstration records remain available.',
    opensAt,
    closesAt,
    interactionsAllowed: state === 'OPEN',
  }).as('status');
  cy.intercept('GET', '**/api/v1/demo/counters', counters).as('counters');
  cy.intercept('GET', '**/api/v1/demo/artifacts*', (request) => {
    const organization = new URL(request.url).searchParams.get('organization');
    request.reply(
      organization
        ? publicArtifacts.filter(
            (artifact) => artifact.organizationSlug === organization,
          )
        : publicArtifacts,
    );
  }).as('publicArtifacts');
  cy.intercept('GET', '**/api/v1/demo/workflows*', [] as unknown[]).as(
    'publicWorkflows',
  );
}

describe("US-RSE'26 interactive demonstration", () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  it('uses the QR root for the complete privacy-preserving guest journey', () => {
    installPublicRequests();
    cy.intercept('POST', '**/api/v1/demo/session', (request) => {
      expect(request.body).to.deep.equal({
        organization: 'neuroscience-gateway',
      });
      expect(request.headers).not.to.have.property('authorization');
      request.reply({
        csrfToken: 'csrf-token',
        contributorAlias: 'guest-1234abcd',
        organization: 'neuroscience-gateway',
        expiresAt: '2026-10-20T15:30:00.000Z',
      });
    }).as('session');

    const artifact = {
      id: artifactId,
      title: 'Demo artifact guest-1234abcd 11111111',
      organization: 'Neuroscience Gateway',
      contributorAlias: 'guest-1234abcd',
      fingerprint:
        'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      manifestName: `demo-artifact-${artifactId}.txt`,
      verified: true,
      submissionState: 'SUCCESS',
      blockchainTxId: 'artifact-ledger-transaction',
      submittedAt: opensAt,
    };
    cy.intercept('POST', '**/api/v1/demo/artifacts', (request) => {
      expect(request.headers['x-demo-csrf']).to.equal('csrf-token');
      expect(request.headers['x-correlation-id']).to.equal(
        request.body.requestId,
      );
      expect(Object.keys(request.body).sort()).to.deep.equal(
        [
          'extension',
          'fingerprint',
          'requestId',
          'researchContext',
          'sizeBytes',
        ].sort(),
      );
      expect(request.body).to.include({
        extension: 'txt',
        sizeBytes: 3,
        researchContext: 'RESEARCH_DATASET',
      });
      expect(request.body.fingerprint).to.equal(artifact.fingerprint);
      expect(JSON.stringify(request.body)).not.to.contain(
        'private-original-name',
      );
      expect(JSON.stringify(request.body)).not.to.contain('abc');
      request.reply(artifact);
    }).as('createArtifact');
    cy.intercept('GET', `**/api/v1/demo/artifacts/${artifactId}`, artifact).as(
      'artifactStatus',
    );
    cy.intercept('GET', `**/api/v1/demo/artifacts/${artifactId}/history`, {
      artifactId,
      items: [
        {
          txId: 'artifact-ledger-transaction',
          timestamp: opensAt,
          isDelete: false,
        },
      ],
      total: 1,
    }).as('artifactHistory');

    const workflow = {
      id: workflowId,
      title: 'Demo workflow guest-1234abcd 22222222',
      organization: 'Neuroscience Gateway',
      contributorAlias: 'guest-1234abcd',
      artifactIds: [artifactId],
      submissionState: 'SUCCESS',
      blockchainTxId: 'workflow-ledger-transaction',
      submittedAt: opensAt,
    };
    cy.intercept('POST', '**/api/v1/demo/workflows', (request) => {
      expect(request.headers['x-demo-csrf']).to.equal('csrf-token');
      expect(request.body.artifactIds).to.deep.equal([artifactId]);
      expect(request.body.researchContext).to.equal('REPRODUCIBLE_ANALYSIS');
      expect(Object.keys(request.body).sort()).to.deep.equal(
        ['artifactIds', 'requestId', 'researchContext'].sort(),
      );
      request.reply(workflow);
    }).as('createWorkflow');
    cy.intercept('GET', `**/api/v1/demo/workflows/${workflowId}`, workflow).as(
      'workflowStatus',
    );
    cy.intercept('GET', `**/api/v1/demo/workflows/${workflowId}/history`, {
      assetType: 'workflow',
      artifactId: workflowId,
      items: [
        {
          txId: 'workflow-ledger-transaction',
          timestamp: opensAt,
          isDelete: false,
        },
      ],
      total: 1,
    }).as('workflowHistory');
    cy.intercept('POST', '**/api/v1/demo/ux-feedback/view', {
      accepted: true,
    });
    cy.intercept('POST', '**/api/v1/demo/ux-feedback', (request) => {
      expect(request.headers).not.to.have.property('authorization');
      expect(request.body).to.deep.equal({
        visualRating: 5,
        automationInterest: 'YES',
        overallComment: '<private comment>',
      });
      request.reply({ accepted: true });
    }).as('feedback');

    cy.visit('/interactive-demo');
    cy.wait('@status');
    cy.contains('h1', 'See a fingerprint become a provenance record').should(
      'be.visible',
    );
    cy.get('[data-cy="demo-state"]').should('contain.text', 'OPEN');
    cy.contains('Anonymous browser sessions').should('be.visible');
    cy.contains('Public neuroscience demonstration artifact').should(
      'be.visible',
    );
    cy.contains('Public citizen science demonstration artifact').should(
      'be.visible',
    );

    cy.contains('button.organization-card', 'Neuroscience Gateway').click();
    cy.get('[data-cy="start-demo-session"]').click();
    cy.wait('@session');
    cy.contains('guest-1234abcd').should('be.visible');
    cy.get('.organization-card').should('not.exist');

    cy.get('[data-cy="demo-file"]').selectFile(
      {
        contents: Cypress.Buffer.from('abc'),
        fileName: 'private-original-name.txt',
        mimeType: 'text/plain',
      },
      { force: true },
    );
    cy.get('[data-cy="fingerprint-summary"] code').should(
      'have.text',
      artifact.fingerprint,
    );
    cy.get('body').should('not.contain.text', 'private-original-name.txt');
    cy.get('[data-cy="submit-demo-artifact"]').click();
    cy.wait('@createArtifact');
    cy.get('[data-cy="artifact-result"]').should(
      'contain.text',
      'artifact-ledger-transaction',
    );
    cy.contains('button', 'Inspect provenance history').click();
    cy.wait('@artifactHistory');
    cy.contains('code', 'artifact-ledger-transaction').should('be.visible');

    cy.get('.artifact-options input[type="checkbox"]')
      .check()
      .should('be.checked');
    cy.get('[data-cy="submit-demo-workflow"]').should('be.enabled');
    cy.get('[data-cy="submit-demo-workflow"]').click();
    cy.wait('@createWorkflow');
    cy.get('[data-cy="workflow-result"]').should(
      'contain.text',
      'workflow-ledger-transaction',
    );
    cy.contains('button', 'Inspect workflow history').click();
    cy.wait('@workflowHistory');
    cy.contains('code', 'workflow-ledger-transaction').should('be.visible');

    cy.contains('a', 'Share feedback').click();
    cy.get('#visual-rating').select('5 of 5');
    cy.get('#automation-interest').select('YES');
    cy.get('#overall-comment').type('<private comment>');
    cy.contains('button', 'Send feedback').click();
    cy.wait('@feedback');
    cy.contains('Thank you for sharing your feedback.').should('be.visible');
  });

  it('keeps status and both public spaces useful in read-only mode', () => {
    installPublicRequests('READ_ONLY');
    cy.visit('/interactive-demo');
    cy.get('[data-cy="demo-state"]').should('contain.text', 'READ_ONLY');
    cy.get('[data-cy="start-demo-session"]').should('not.exist');
    cy.contains('New writes are paused').should('be.visible');
    cy.contains('Public neuroscience demonstration artifact').should(
      'be.visible',
    );
    cy.contains('button', 'Citizen Science').last().click();
    cy.wait('@publicArtifacts');
    cy.contains('Public citizen science demonstration artifact').should(
      'be.visible',
    );
    cy.contains('Public neuroscience demonstration artifact').should(
      'not.exist',
    );
  });

  it('rejects oversized local files before any artifact request and passes axe', () => {
    installPublicRequests();
    cy.intercept('POST', '**/api/v1/demo/session', {
      csrfToken: 'csrf-token',
      contributorAlias: 'guest-1234abcd',
      organization: 'neuroscience-gateway',
      expiresAt: '2026-10-20T15:30:00.000Z',
    });
    cy.intercept('POST', '**/api/v1/demo/artifacts').as('unexpectedArtifact');

    cy.visit('/interactive-demo');
    cy.contains('button.organization-card', 'Citizen Science').click();
    cy.get('[data-cy="start-demo-session"]').click();
    cy.get('[data-cy="demo-file"]').selectFile(
      'cypress/fixtures/bigfile_20MB.bin',
      { force: true },
    );
    cy.contains('Choose a non-empty file no larger than 10 MiB.').should(
      'be.visible',
    );
    cy.get('[data-cy="submit-demo-artifact"]').should('be.disabled');
    cy.get('@unexpectedArtifact.all').should('have.length', 0);

    cy.injectAxe();
    cy.checkA11y();
  });
});
