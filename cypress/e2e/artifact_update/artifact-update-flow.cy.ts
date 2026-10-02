/// <reference types="cypress" />

/**
 * End-to-end flow:
 * 1. Sign in as PI.
 * 2. Create two artifacts via UI with deterministic random data.
 * 3. Navigate to list-artifacts page, search each artifact by title, open its detail page and assert critical fields.
 * 4. Update the artifacts via UI and assert the changes.
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
  let artifactAFootprintBefore: string | undefined;

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

    // Assert success link appears and navigate to detail page
    cy.contains('a.btn.btn-success', 'View new artifact here')
      .scrollIntoView()
      .should('exist')
      .click({ force: true });

    // Reuse common detail assertions (buttons, footprint subtitle/value, print stub, etc.)
    assertDetailPage(artifact);

    // Return to home to proceed with the next artifact flow
    cy.visit('/');
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
    cy.get('app-artifact-card').should('have.length', 1);
    cy.get('app-artifact-card')
      .first()
      .within(() => {
        cy.contains('a.view-button', 'View').click();
      });
  };

  const assertDetailPage = (artifact: ArtifactInput) => {
    cy.get('h1.artifact-title').should('contain', artifact.title);
    cy.contains('.description-col', artifact.description.substring(0, 30));
    const firstKeyword = artifact.keywords.split(',')[0].trim();
    cy.get('.keyword-badge').contains(firstKeyword);

    // Assert action buttons exist and are enabled
    cy.contains('button', 'Print full Manifest')
      .should('be.visible')
      .and('not.be.disabled');
    cy.contains('button', 'Update Artifact')
      .should('be.visible')
      .and('not.be.disabled');

    // Assert Footprint subtitle and value
    cy.contains('.section-heading', 'Footprint (SHA-256)').should('be.visible');
    cy.get('code.text-break')
      .invoke('text')
      .should('match', /^[a-f0-9]{64}$/);
    // Capture current footprint if checking Artifact A and not yet stored
    cy.get('code.text-break')
      .invoke('text')
      .then((fp) => {
        if (!artifactAFootprintBefore && artifact.title.includes('A')) {
          artifactAFootprintBefore = (fp as string).trim();
        }
      });

    // Stub window.open and verify print writes manifest content
    cy.window().then((win) => {
      const docOpen = cy.stub().as('docOpen');
      const docWrite = cy.stub().as('docWrite');
      const docClose = cy.stub().as('docClose');
      const focus = cy.stub().as('focus');
      cy.stub(win, 'open')
        .as('winOpen')
        .callsFake(
          () =>
            ({
              document: { open: docOpen, write: docWrite, close: docClose },
              focus,
            }) as any,
        );
    });

    cy.contains('button', 'Print full Manifest').click();

    cy.get('@winOpen').should('have.been.called');
    cy.get('@docOpen').should('have.been.called');
    cy.get('@docWrite').should('have.been.called');
    cy.get('@docWrite').then((stub: any) => {
      const html = stub.getCall(0).args[0] as string;
      expect(html).to.include('sha256');
    });
  };

  it('should display correct details for Artifact A', () => {
    searchAndOpen(artifactA.title);
    assertDetailPage(artifactA);
  });

  it('should display correct details for Artifact B', () => {
    searchAndOpen(artifactB.title);
    assertDetailPage(artifactB);
  });

  it('should update Artifact A keywords and manifest, then reflect changes on detail page', () => {
    // Make sure we are authenticated at the start of this test
    cy.visit('/');
    signIn();
    // Start from Artifact A detail page
    searchAndOpen(artifactA.title);
    assertDetailPage(artifactA);

    // Click Update Artifact
    cy.contains('button', 'Update Artifact').click();
    cy.url().should('include', '/update-artifact/');

    // Change keywords
    const updatedKeyword = 'e2e-updated';
    cy.get('input[formcontrolname="keywords"]')
      .clear()
      .type(`${updatedKeyword}`);

    // Upload a new file with a different name (ensures new footprint via Cypress fast-path)
    const contents = Cypress.Buffer.from('updated content ' + Date.now());
    cy.get('input[type="file"]')
      .first()
      .selectFile(
        { contents, fileName: 'updated-e2e.txt', mimeType: 'text/plain' },
        { force: true },
      );

    // Provide reason for update
    cy.get('textarea[formcontrolname="submission_comment"]')
      .clear()
      .type('Reason for update via E2E flow.');

    // Submit update
    cy.contains('button', 'Update').should('not.be.disabled').click();

    // Button should become disabled and link to check updated artifact should appear
    cy.contains('a.btn.btn-success', 'Check your modified artifact')
      .scrollIntoView()
      .should('exist')
      .click({ force: true });

    // Back on detail page -> assert new keyword badge exists
    cy.get('.keyword-badge').contains(updatedKeyword);

    // Assert manifest shows the new filename
    cy.get('.manifest-section').within(() => {
      cy.contains('td.filename', 'updated-e2e.txt');
    });

    // Assert footprint has changed from original capture
    if (artifactAFootprintBefore) {
      cy.get('code.text-break')
        .invoke('text')
        .should((fp) => {
          expect((fp as string).trim()).not.to.eq(artifactAFootprintBefore);
        });
    }
  });
});
