/// <reference types="cypress" />

describe('Artifacts List and Creation Flow', () => {
  const randomTitle = `${Math.random().toString(36).substring(2, 15)} ${Math.random().toString(36).substring(2, 15)}  Test Artifact  Test Artifact Test Artifact`;
  const randomKeywords = Array.from({ length: 5 }, () =>
    Math.random().toString(36).substring(2, 10),
  ).join(', ');

  beforeEach(() => {
    cy.visit('/');
  });

  it('should allow a user to see the artifacts list, create a new artifact, and see it in the list', () => {
    // 1. Check for initial artifacts preview and navigate to the full list
    cy.get('app-artifacts-preview').should('be.visible');
    cy.contains('VIEW ALL').click();
    cy.url().should('include', '/list-artifacts');

    // 2. Check initial artifact list and pagination
    cy.get('app-artifact-card').should('have.length.at.least', 6); // Assuming at least 1 artifact
    cy.get('.pagination-container').should('be.visible');

    // 3. Navigate to login and sign in as PI
    cy.contains('Contribute').click();
    cy.url().should('include', '/auth/sign-in');

    cy.get('input[formcontrolname="username"]').type(Cypress.env('PI1_EMAIL'));
    cy.get('input[formcontrolname="password"]').type(
      Cypress.env('PI1_PASSWORD'),
      { log: false },
    );
    cy.get('.form-actions button').click();

    // 4. Navigate to create artifact page
    cy.url().should('not.include', '/auth/sign-in');
    cy.contains('Contribute').click();

    // 5. Fill out and submit the artifact form
    cy.get('input[formcontrolname="title"]').type(randomTitle);
    cy.get('textarea[formcontrolname="description"]').type(
      'This is a test description for the artifact. It needs to be at least 50 characters long to be valid.',
    );
    cy.get('textarea[formcontrolname="submission_comment"]').type(
      'Initial submission comment for E2E.',
    );
    cy.get('input[formcontrolname="keywords"]').type(randomKeywords);

    // Mock file upload
    cy.get('input[type="file"]')
      .first()
      .selectFile('cypress/fixtures/sample.txt', { force: true });

    cy.get('[data-cy="submit-btn"]').should('not.be.disabled').click();

    // 6. Verify success toast is shown
    cy.contains('Your artifact has been successfully submitted!').should(
      'be.visible',
    );

    // 7. Go back to home, then to artifact list to search for the new artifact
    cy.visit('/');
    cy.url().should('eq', Cypress.config().baseUrl + '/');
    cy.contains('VIEW ALL').click();

    cy.get('input[placeholder="Artifact\'s title contains"]').type(randomTitle);
    cy.get('button').contains('Search').click();
    cy.get('app-artifact-card').should('have.length', 1);

    // 8. Test keyword search variations
    const titleSearchInput = 'input[placeholder="Artifact\'s title contains"]';
    const keywordSearchInput =
      'input[placeholder="Artifact\'s keyword list contains"]';
    const searchButton = 'button:contains("Search")';
    const firstKeyword = randomKeywords.split(',')[0];
    const firstWordOfTitle = randomTitle.split(' ')[0];

    // Search for "pineapple" - should yield 0 results
    cy.get(titleSearchInput).clear();
    cy.get(keywordSearchInput).type('pineappleHorseRandomLightBulbStreet');
    cy.get(searchButton).click();
    cy.contains('No artifacts found matching your search.').should(
      'be.visible',
    );

    // Search for one of the created keywords
    cy.get(keywordSearchInput).clear().type(firstKeyword);
    cy.get(searchButton).click();
    cy.get('app-artifact-card').should('have.length.at.least', 1);

    // Search for "pineapple ..." AND a real keyword
    cy.get(keywordSearchInput).type(', pineappleHorseRandomLightBulbStreet');
    cy.get(searchButton).click();
    cy.contains('No artifacts found matching your search.').should(
      'be.visible',
    );

    // Search for "pineapple" in keywords OR a real title word
    cy.get(keywordSearchInput)
      .clear()
      .type('pineappleHorseRandomLightBulbStreet');
    cy.get(titleSearchInput).type(firstWordOfTitle);
    cy.get('select.search-operator').should('have.value', 'OR'); // Default is OR
    cy.get(searchButton).click();
    cy.get('app-artifact-card').should('have.length.at.least', 1);

    // Search for "pineapple" in keywords AND a real title word
    cy.get('select.search-operator').select('AND');
    cy.get(searchButton).click();
    cy.contains('No artifacts found matching your search.').should(
      'be.visible',
    );
  });
});
