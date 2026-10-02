const describeLive = Cypress.expose('LIVE_DEMO') ? describe : describe.skip;

describeLive('US-RSE 2026 live Kind demonstration', () => {
  it('completes a browser-to-ledger guest journey with both histories and private feedback', () => {
    cy.visit('/');
    cy.get('[data-cy="demo-state"]').should('contain.text', 'OPEN');
    cy.contains('button.organization-card', 'Neuroscience Gateway').click();
    cy.get('[data-cy="start-demo-session"]').click();
    cy.contains(/guest-[a-f0-9]{8}/).should('be.visible');

    cy.get('[data-cy="demo-file"]').selectFile(
      {
        contents: Cypress.Buffer.from('kind-browser-ledger-evidence'),
        fileName: 'must-remain-local.txt',
        mimeType: 'text/plain',
      },
      { force: true },
    );
    cy.get('[data-cy="fingerprint-summary"] code')
      .invoke('text')
      .then((value) =>
        expect(value.replace(/\s/g, '')).to.match(/^[a-f0-9]{64}$/),
      );
    cy.get('body').should('not.contain.text', 'must-remain-local.txt');
    cy.get('[data-cy="submit-demo-artifact"]').click();
    cy.get('[data-cy="artifact-result"]', { timeout: 300_000 })
      .should('contain.text', 'SUCCESS')
      .and('not.contain.text', 'must-remain-local.txt');
    cy.contains('button', 'Inspect provenance history').click();
    cy.get('.history-panel code', { timeout: 30_000 }).should('be.visible');

    cy.get('.artifact-options input[type="checkbox"]').first().check();
    cy.get('[data-cy="submit-demo-workflow"]').click();
    cy.get('[data-cy="workflow-result"]', { timeout: 300_000 }).should(
      'contain.text',
      'SUCCESS',
    );
    cy.contains('button', 'Inspect workflow history').click();
    cy.get('.history-panel code', { timeout: 30_000 }).should('be.visible');

    cy.get('#ease-rating').select('5');
    cy.get('#provenance-rating').select('5');
    cy.get('#usefulness-rating').select('5');
    cy.get('#feedback-comment').type(
      'Private local rehearsal response; never public or on-ledger.',
    );
    cy.contains('button', 'Submit optional survey').click();
    cy.contains('Your private response was accepted once').should('be.visible');
  });
});
