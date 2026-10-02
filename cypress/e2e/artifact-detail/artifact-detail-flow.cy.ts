/// <reference types="cypress" />

/**
 * End-to-end flow:
 * 1. Sign in as PI.
 * 2. Create two artifacts via UI with deterministic random data.
 * 3. Navigate to list-artifacts page, search each artifact by title, open its detail page and assert critical fields.
 */

describe('Artifact detail flow – create two artifacts and verify details', () => {
  interface ArtifactInput {
    title: string;
    description: string;
    keywords: string;
  }

  // Generate two unique artifacts
  const makeArtifact = (suffix: string): ArtifactInput => {
    const rand = Math.random().toString(36).substring(2, 8);
    return {
      title: `Cypress Artifact ${suffix} ${rand}`,
      description: `This is a Cypress-generated description for artifact ${suffix}. It must be well over fifty characters long, so here are some extra words to meet that limit.`,
      keywords: Array.from({ length: 3 }, () =>
        Math.random().toString(36).substring(2, 8),
      ).join(', '),
    };
  };

  const artifactA = makeArtifact('A');
  const artifactB = makeArtifact('B');

  const signIn = () => {
    // Navigate to sign-in page via Contribute link if not already signed in
    cy.contains('Contribute').click();

    cy.url().then((url) => {
      if (url.includes('/auth/sign-in')) {
        cy.get('input[formcontrolname="username"]').type(
          Cypress.env('PI1_EMAIL'),
        );
        cy.get('input[formcontrolname="password"]').type(
          Cypress.env('PI1_PASSWORD'),
          { log: false },
        );
        cy.get('.form-actions button').click();
        cy.url().should('not.include', '/auth/sign-in');
      }
    });
  };

  const createArtifactViaUI = (artifact: ArtifactInput) => {
    cy.contains('Contribute').click();

    cy.get('input[formcontrolname="title"]').type(artifact.title);
    cy.get('textarea[formcontrolname="description"]').type(
      artifact.description,
    );
    cy.get('textarea[formcontrolname="submission_comment"]').type(
      'Initial submission comment for E2E.',
    );
    cy.get('input[formcontrolname="keywords"]').type(artifact.keywords);

    // upload sample file
    cy.get('input[type="file"]')
      .first()
      .selectFile('cypress/fixtures/sample.txt', { force: true });

    cy.wait(2000);

    cy.get('[data-cy="submit-btn"]').should('not.be.disabled');

    cy.get('[data-cy="submit-btn"]').click();

    cy.contains('Your artifact has been successfully submitted!').should(
      'be.visible',
    );

    cy.get('[data-cy="submit-btn"]').should('be.disabled');
  };

  before(() => {
    cy.visit('/');
    signIn();
    createArtifactViaUI(artifactA);
    createArtifactViaUI(artifactB);
  });

  const searchAndOpen = (title: string) => {
    cy.visit('/');
    cy.contains('VIEW ALL').click();
    cy.url().should('include', '/list-artifacts');

    cy.get('input[placeholder="Artifact\'s title contains"]')
      .clear()
      .type(title);
    cy.contains('button', 'Search').click();

    // one card expected
    cy.get('app-artifact-card')
      .should('have.length', 1)
      .within(() => {
        cy.contains('a.view-button', 'View').click();
      });
  };

  const assertDetailPage = (artifact: ArtifactInput) => {
    cy.get('h1.artifact-title').should('contain', artifact.title);
    cy.contains('.description-col', artifact.description.substring(0, 30));
    const firstKeyword = artifact.keywords.split(',')[0].trim();
    cy.get('.keyword-badge').contains(firstKeyword);
  };

  it('should display correct details for Artifact A', () => {
    searchAndOpen(artifactA.title);
    assertDetailPage(artifactA);
  });

  it('should display correct details for Artifact B', () => {
    searchAndOpen(artifactB.title);
    assertDetailPage(artifactB);
  });
});
