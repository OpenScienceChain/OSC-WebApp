describe('Artifact Contribution Authentication Flows', () => {
  const goToContributePage = () => {
    cy.visit('/');
    cy.contains('a', 'Contribute').click();
  };

  const verifyLoginMessage = () => {
    cy.contains('Welcome!').should('be.visible');
    cy.contains(
      "We'd love to have your contribution, but first Sign in to continue",
    ).should('be.visible');
    cy.contains('button', 'Sign In').should('be.visible');
  };

  const login = (username: string, password: string) => {
    cy.get('#username').type(username);
    cy.get('#password').type(password);
    cy.contains('button', 'Sign In').click();
  };

  const logout = () => {
    cy.visit('/');
    cy.contains('a', 'Sign Out').click();
    cy.contains('a', 'Sign In').should('be.visible');
  };

  beforeEach(() => {
    // Clear cookies and localStorage before each test
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it('Admin 1 cannot contribute and sees error message', () => {
    // 1. Unauthenticated user tries to contribute
    goToContributePage();

    // 2. User sees login message
    verifyLoginMessage();

    // 4. User logs in as Admin 1
    login(Cypress.env('USER1_USERNAME'), Cypress.env('USER1_PASSWORD'));

    // 5. User should be redirected to home after login
    cy.url().should('eq', Cypress.config().baseUrl + '/');

    // 6. User tries to contribute again
    cy.contains('a', 'Contribute').click();

    // 7. User should see error message because admins cannot contribute
    cy.contains("You don't have permission to access this page.").should(
      'be.visible',
    );

    // 8. User goes back to home
    cy.contains('a', 'Go Home').click();
    cy.url().should('eq', Cypress.config().baseUrl + '/');

    // 9. User logs out
    logout();
  });

  it('Admin 2 cannot contribute and sees error message', () => {
    // 1. Unauthenticated user tries to contribute
    goToContributePage();

    // 2. User sees login message
    verifyLoginMessage();

    // 4. User logs in as Admin 2
    login(Cypress.env('USER2_USERNAME'), Cypress.env('USER2_PASSWORD'));

    // 5. User should be redirected to home after login
    cy.url().should('eq', Cypress.config().baseUrl + '/');

    // 6. User tries to contribute again
    cy.contains('a', 'Contribute').click();

    // 7. User should see error message because admins cannot contribute
    cy.contains("You don't have permission to access this page.").should(
      'be.visible',
    );

    // 8. User goes back to home
    cy.contains('a', 'Go Home').click();
    cy.url().should('eq', Cypress.config().baseUrl + '/');

    // 9. User logs out
    logout();
  });

  it('PI can contribute and is directed to contribution page', () => {
    // 1. Unauthenticated user tries to contribute
    goToContributePage();

    // 2. User sees login message
    verifyLoginMessage();

    // 4. User logs in as PI
    login(Cypress.env('PI1_USERNAME'), Cypress.env('PI1_PASSWORD'));

    // Wait for redirect away from auth route
    cy.url().should('not.include', '/auth');

    // Go to Contribute page
    cy.contains('a', 'Contribute').click();

    // 5. User should be redirected to contribution page after login
    cy.url().should('include', '/contribute');

    // 6. Verify presence of contribution form elements
    cy.contains('Add a New Artifact').should('be.visible');
    cy.get('#title').should('be.visible');
    cy.get('#description').should('be.visible');

    // 7. User goes back to home
    cy.visit('/');

    // 8. User logs out
    logout();
  });

  it('Collaborator can contribute and is directed to contribution page', () => {
    // 1. Unauthenticated user tries to contribute
    goToContributePage();

    // 2. User sees login message
    verifyLoginMessage();

    // 4. User logs in as Collaborator
    login(
      Cypress.env('COLLABORATOR1_USERNAME'),
      Cypress.env('COLLABORATOR_PASSWORD'),
    );

    // Wait for redirect away from auth route
    cy.url().should('not.include', '/auth');

    // Go to Contribute page
    cy.contains('a', 'Contribute').click();

    // 5. User should be redirected to contribution page after login
    cy.url().should('include', '/contribute');

    // 6. Verify presence of contribution form elements
    cy.contains('Add a New Artifact').should('be.visible');
    cy.get('#title').should('be.visible');
    cy.get('#description').should('be.visible');

    // 7. User goes back to home
    cy.visit('/');

    // 8. User logs out
    logout();
  });
});
