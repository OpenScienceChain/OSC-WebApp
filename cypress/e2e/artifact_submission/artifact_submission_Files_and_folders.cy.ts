/// <reference types="cypress" />

describe('Artifact Submission Full Flow Test', () => {
  const loginAsPI = () => {
    cy.visit('/auth/sign-in');
    cy.get('#username').type(Cypress.env('PI1_USERNAME'));
    cy.get('#password').type(Cypress.env('PI1_PASSWORD'));
    cy.contains('button', 'Sign In').click();
    cy.url().should('eq', Cypress.config().baseUrl + '/');
    cy.get('.toast-success').should('be.visible');
  };

  const navigateToContribute = () => {
    cy.contains('a', 'Contribute').click();
    cy.url().should('include', '/contribute');
    cy.contains('Add a New Artifact').should('be.visible');
  };

  const logout = () => {
    cy.visit('/');
    cy.contains('a', /sign out/i).click();
    cy.contains('a', 'Sign In').should('be.visible');
  };

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    loginAsPI();
    navigateToContribute();
  });

  afterEach(() => {
    logout();
  });

  it('validates big folders', () => {
    /* ---------- 1. Required fields ---------- */

    // Unique title (avoid backend collisions)
    const uniqueTitle = `Valid Artifact Title ${Date.now()}`;
    cy.get('#title').type(uniqueTitle).blur();
    cy.contains('Title must be at least 3 characters').should('not.exist');
    cy.contains('Title cannot exceed 200 characters').should('not.exist');

    // Valid description (> 50 characters)
    cy.get('#description')
      .type(
        'This is a valid description with more than fifty characters to meet the minimum requirement.',
      )
      .blur();
    cy.contains('Description must be at least 50 characters').should(
      'not.exist',
    );
    cy.contains('Description cannot exceed 3000 characters').should(
      'not.exist',
    );

    // Submission Comment (required)
    cy.get('textarea[formcontrolname="submission_comment"]')
      .type('Initial submission comment for E2E.')
      .blur();

    // Keywords (required)
    cy.get('#keywords').type('e2e-test').blur();

    /* ---------- 2. Upload folder using button click ---------- */

    const folderName = `random_files_${Date.now()}`;
    const filesCount = 10; // Reduced for stability

    // Create files for folder simulation
    const files: File[] = [];
    for (let i = 0; i < filesCount; i++) {
      const content = `sample content ${i}`;
      const blob = new Blob([content], { type: 'text/plain' });
      const file = new File([blob], `file_${i}.txt`, { type: 'text/plain' });

      // Set webkitRelativePath for folder recognition
      Object.defineProperty(file, 'webkitRelativePath', {
        value: `${folderName}/file_${i}.txt`,
        writable: false,
      });

      files.push(file);
    }

    // Simulate folder selection through hidden input
    cy.get('input[webkitdirectory]').then((input) => {
      const dataTransfer = new DataTransfer();
      files.forEach((file: File) => dataTransfer.items.add(file));

      const event = new Event('change', { bubbles: true });
      Object.defineProperty(event, 'target', {
        value: { files: dataTransfer.files },
        enumerable: true,
      });

      input[0].dispatchEvent(event);
    });

    /* ---------- 3. Wait for processing and verify upload ---------- */

    // Wait for processing to complete
    cy.get('.processing-state', { timeout: 10000 }).should('be.visible');
    cy.get('.processing-state', { timeout: 15000 }).should('not.exist');

    // Verify success state
    cy.get('.success-state').should('be.visible');
    cy.contains('Successfully Processed!').should('be.visible');

    // Verify file list container exists
    cy.get('.file-list-container').should('be.visible');

    // Verify file items are present
    cy.get('.file-item').should('have.length.at.least', 1);

    // Verify file hashes are calculated
    cy.get('.file-hash').should('exist').and('not.be.empty');
    cy.get('.file-hash').first().should('contain', 'sha256:');

    /* ---------- 4. Submit form ---------- */

    cy.intercept('POST', '**/api/v1/artifacts').as('submitArtifact');

    cy.get('[data-cy="submit-btn"]')
      .should('not.be.disabled') // Should be enabled now
      .click();

    cy.wait('@submitArtifact').its('response.statusCode').should('eq', 201);
    cy.get('.toast-success').should(
      'contain',
      'Your artifact has been successfully submitted',
    );

    // Final confirmation
    cy.url().should('include', '/contribute');
  });

  it('Validate big files - Retries submission', () => {
    const uniqueTitle = `Valid Artifact Title ${Date.now()}`;

    cy.get('#title').type(uniqueTitle).blur();
    cy.contains('Title must be at least 3 characters').should('not.exist');
    cy.contains('Title cannot exceed 200 characters').should('not.exist');

    cy.get('#description')
      .type(
        'This is a valid description with more than fifty characters to meet the minimum requirement.',
      )
      .blur();
    cy.contains('Description must be at least 50 characters').should(
      'not.exist',
    );
    cy.contains('Description cannot exceed 3000 characters').should(
      'not.exist',
    );

    // Submission Comment (required)
    cy.get('textarea[formcontrolname="submission_comment"]')
      .type('Initial submission comment for E2E.')
      .blur();

    // Keywords (required)
    cy.get('#keywords').type('e2e-test').blur();

    // Upload oversized file
    cy.fixture('bigfile_21MB.bin', 'base64').then((fileContent) => {
      const testFile = Cypress.Blob.base64StringToBlob(
        fileContent,
        'application/octet-stream',
      );
      const file = new File([testFile], 'bigfile_21MB.bin', {
        type: 'application/octet-stream',
      });

      // Use the hidden file input instead of drag-and-drop
      cy.get('input[type="file"]:not([webkitdirectory])').then((input) => {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);

        const event = new Event('change', { bubbles: true });
        Object.defineProperty(event, 'target', {
          value: { files: dataTransfer.files },
          enumerable: true,
        });

        input[0].dispatchEvent(event);
      });
    });

    // Wait for error processing
    cy.get('.error-state', { timeout: 5000 }).should('be.visible');

    // Verify error state
    cy.get('[data-cy="submit-btn"]').should('be.disabled');
    cy.contains("😬 Well, that didn't go as planned...").should('be.visible');

    // Check error message (with decimal format)
    cy.get('.error-state p').should('contain', 'exceeds the limit of 20.00 MB');

    cy.url().should('include', '/contribute');
    cy.wait(1000);

    // Try again with valid file
    cy.get('button:contains("Try Again")').click();
    cy.wait(2000);

    // Upload valid file
    cy.fixture('bigfile_20MB.bin', 'base64').then((fileContent) => {
      const testFile = Cypress.Blob.base64StringToBlob(
        fileContent,
        'application/octet-stream',
      );
      const file = new File([testFile], 'bigfile_20MB.bin', {
        type: 'application/octet-stream',
      });

      cy.get('input[type="file"]:not([webkitdirectory])').then((input) => {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);

        const event = new Event('change', { bubbles: true });
        Object.defineProperty(event, 'target', {
          value: { files: dataTransfer.files },
          enumerable: true,
        });

        input[0].dispatchEvent(event);
      });
    });

    // Verify success state
    cy.get('.success-state').should('be.visible');
    cy.get('.file-item').should('contain', 'bigfile_20MB.bin');
    cy.get('.file-hash').should('not.be.empty');

    cy.intercept('POST', '**/api/v1/artifacts').as('submitArtifact');
    cy.get('[data-cy="submit-btn"]').should('not.be.disabled').click();
    cy.wait('@submitArtifact').its('response.statusCode').should('eq', 201);
    cy.get('.toast-success').should(
      'contain',
      'Your artifact has been successfully submitted',
    );
    cy.url().should('include', '/contribute');
  });
});
