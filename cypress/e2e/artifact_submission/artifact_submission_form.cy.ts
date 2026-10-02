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

  // Helper function to upload a file
  const uploadFile = (fileName: string, fileType: string = 'text/plain') => {
    cy.fixture(fileName, 'base64').then((fileContent) => {
      const testFile = Cypress.Blob.base64StringToBlob(fileContent, fileType);
      const file = new File([testFile], fileName, { type: fileType });

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

    // Verify success state
    cy.get('.success-state').should('be.visible');
    cy.get('.file-list-container').should('be.visible');
    cy.get('.file-item').should('contain', fileName);
    cy.get('.file-hash').should('not.be.empty');
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

  it('validates form fields and completes artifact submission', () => {
    // Title validations
    cy.get('#title').type('AB').blur();
    cy.contains('Title must be at least 3 characters').should('be.visible');

    cy.get('#title').clear().type('A'.repeat(201)).blur();
    cy.contains('Title cannot exceed 200 characters').should('be.visible');

    cy.get('#title').clear().blur();
    cy.contains('Title is required').should('be.visible');

    const uniqueTitle = `Valid Artifact Title ${Date.now()}`;

    cy.get('#title').type(uniqueTitle).blur();
    cy.contains('Title must be at least 3 characters').should('not.exist');
    cy.contains('Title cannot exceed 200 characters').should('not.exist');

    // Description validations
    cy.get('#description').type('Short desc').blur();
    cy.contains('Description must be at least 50 characters').should(
      'be.visible',
    );

    cy.get('#description').clear().blur();
    cy.contains('Description is required').should('be.visible');

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

    // Keyword validations
    cy.get('#keywords').type('test-keyword, ').blur();
    cy.contains('Please enter valid keywords separated by commas').should(
      'be.visible',
    );

    cy.get('#keywords').type('test-keyword, test-keyword-2').blur();

    // Link validations
    cy.get('#links').type('invalid-url').blur();
    cy.contains('Please enter valid URLs separated by commas').should(
      'be.visible',
    );

    cy.get('#links')
      .clear()
      .type('https://example.com, https://example.com/2')
      .blur();

    // DOI validations
    cy.get('#doi').type('invalid-doi').blur();
    cy.contains('Please enter valid DOIs separated by commas').should(
      'be.visible',
    );

    cy.get('#doi').clear().type('10.1000/xyz123, 10.1000/xyz124').blur();

    // Funding Agencies – NSF
    cy.get('input[formcontrolname="nsf"]').check().should('be.checked');

    // Other Agencies validations
    // 1) Invalid format (missing comma between agencies)
    cy.get('#otherAgency').type('NSF NASA, ').blur();
    cy.contains('Please enter valid agencies separated by commas').should(
      'be.visible',
    );

    // 2) Length > 100 characters
    cy.get('#otherAgency').clear().type('A'.repeat(101)).blur();
    cy.contains('Other agencies cannot exceed 100 characters').should(
      'be.visible',
    );

    // 3) Valid input
    cy.get('#otherAgency').clear().type('DOE, DARPA').blur();
    cy.contains('Other agencies cannot exceed 100 characters').should(
      'not.exist',
    );
    cy.contains('Please enter valid agencies separated by commas').should(
      'not.exist',
    );

    // Upload file
    uploadFile('sample.txt');

    // Submit the form
    cy.intercept('POST', '**/api/v1/artifacts').as('submitArtifact');
    cy.get('[data-cy="submit-btn"]').should('not.be.disabled').click();
    cy.wait('@submitArtifact').its('response.statusCode').should('eq', 201);
    cy.get('.toast-success').should(
      'contain',
      'Your artifact has been successfully submitted',
    );
    cy.url().should('include', '/contribute');
  });

  it('Submits artifact with basic information only', () => {
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

    // Upload file
    uploadFile('sample.txt');

    cy.intercept('POST', '**/api/v1/artifacts').as('submitArtifact');
    cy.get('[data-cy="submit-btn"]').should('not.be.disabled').click();
    cy.wait('@submitArtifact').its('response.statusCode').should('eq', 201);
    cy.get('.toast-success').should(
      'contain',
      'Your artifact has been successfully submitted',
    );
    cy.url().should('include', '/contribute');
  });

  it('Submits Artifact with repeated title', () => {
    const uniqueTitle = `Valid Artifact Title ${Date.now()}`;

    cy.get('#title').type(uniqueTitle).blur();
    cy.get('#description')
      .type(
        'This is a valid description with more than fifty characters to meet the minimum requirement.',
      )
      .blur();
    cy.get('textarea[formcontrolname="submission_comment"]')
      .type('Initial submission comment for E2E.')
      .blur();
    cy.get('#keywords').type('e2e-test').blur();

    // Upload file
    uploadFile('sample.txt');

    cy.intercept('POST', '**/api/v1/artifacts').as('submitArtifact');
    cy.get('[data-cy="submit-btn"]').should('not.be.disabled').click();
    cy.wait('@submitArtifact').its('response.statusCode').should('eq', 201);
    cy.get('.toast-success').should(
      'contain',
      'Your artifact has been successfully submitted',
    );
    cy.url().should('include', '/contribute');

    // Submit again with the same title
    cy.get('#title').type(uniqueTitle).blur();
    cy.get('#description')
      .type(
        'This is a valid description with more than fifty characters to meet the minimum requirement.',
      )
      .blur();
    cy.get('textarea[formcontrolname="submission_comment"]')
      .clear()
      .type('Submitting same title for E2E.')
      .blur();
    cy.get('#keywords').type('e2e-test').blur();

    // Upload file again
    uploadFile('sample.txt');

    cy.intercept('POST', '**/api/v1/artifacts').as('submitArtifact');
    cy.get('[data-cy="submit-btn"]').should('not.be.disabled').click();
    cy.wait('@submitArtifact').its('response.statusCode').should('eq', 412);
    cy.contains(
      'An artifact with this title already exists in the organization',
    );
  });
});
