describe('OSC-IS landing page', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/v1/artifacts', { body: [] }).as('artifacts');
    cy.intercept('GET', '**/api/v1/workflows', { body: [] }).as('workflows');
    cy.visit('/');
    cy.wait(['@artifacts', '@workflows']);
  });

  it('introduces the product and its permissioned provenance value', () => {
    cy.contains('h1', 'Open Science Chain').should('be.visible');
    cy.contains('Scientific outputs, with their history intact.').should(
      'be.visible',
    );
    cy.contains(
      'h2',
      'Storage preserves a file. OSC-IS preserves its context.',
    ).should('be.visible');
    cy.contains('Hyperledger Fabric').should('be.visible');
    cy.contains('Research files remain off-chain').should('be.visible');
  });

  it('provides honest representative artifact and workflow records', () => {
    cy.contains('Demonstration data, not researcher submissions').should(
      'be.visible',
    );
    cy.contains('h3', 'Neuroscience image segmentation dataset').should(
      'be.visible',
    );
    cy.contains('h3', 'Reproducible neuroimaging preparation').should(
      'be.visible',
    );
    cy.contains('a', 'Inspect sample artifact').should(
      'have.attr',
      'href',
      '/artifacts/artifact-nsg-001',
    );
    cy.contains('a', 'Inspect sample workflow').should(
      'have.attr',
      'href',
      '/workflows/workflow-nsg-001',
    );
  });

  it('keeps the primary actions visible on a narrow mobile viewport', () => {
    cy.viewport(320, 700);
    cy.get('h1').should('be.visible');
    cy.contains('a', 'Explore records').should('be.visible');
    cy.contains('a', 'View sample records').should('be.visible');
    cy.get('body').then(($body) => {
      expect($body[0].scrollWidth).to.be.at.most($body[0].clientWidth + 1);
    });
  });
});
