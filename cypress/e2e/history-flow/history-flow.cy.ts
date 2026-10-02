/// <reference types="cypress" />

describe('History flow - single artifact', () => {
  const UNIQUE_TITLE = `e2e-history-artifact-${Date.now()}`;
  const UNIQUE_KEYWORDS = 'hist-k1, hist-k2, special-hist-key';
  const UNIQUE_LINKS = 'https://example.com/a, https://example.com/b';
  const UNIQUE_DOIS = '10.1234/abcd1, 10.5678/efgh2';
  const DESCRIPTION =
    'E2E history test description with more than fifty characters to pass validation.';

  function loginAsPI() {
    cy.contains('Contribute').click();
    cy.url().should('include', '/auth/sign-in');
    cy.get('input[formcontrolname="username"]').type(Cypress.env('PI1_EMAIL'));
    cy.get('input[formcontrolname="password"]').type(
      Cypress.env('PI1_PASSWORD'),
      { log: false },
    );
    cy.get('.form-actions button').click();
    cy.url().should('not.include', '/auth/sign-in');
  }

  it('creates artifact, searches it, opens history and validates single current card', () => {
    cy.visit('/');

    // Sign in
    loginAsPI();

    // Go to create page
    cy.contains('Contribute').click();

    // Fill minimal metadata
    cy.get('input[formcontrolname="title"]').type(UNIQUE_TITLE);
    cy.get('textarea[formcontrolname="description"]').type(DESCRIPTION);
    cy.get('textarea[formcontrolname="submission_comment"]').type(
      'Initial submission comment for E2E history flow test.',
    );
    cy.get('input[formcontrolname="keywords"]').type(UNIQUE_KEYWORDS);
    cy.get('input[formcontrolname="links"]').type(UNIQUE_LINKS);
    cy.get('input[formcontrolname="doi"]').type(UNIQUE_DOIS);
    // Funding agencies: check NSF and NIH, plus type other agency
    cy.get('input[formcontrolname="nsf"]').check({ force: true });
    cy.get('input[formcontrolname="nih"]').check({ force: true });
    cy.get('input[formcontrolname="otherAgency"]').type('Agency-X, Agency-Y');

    // Upload single file (fixtures/sample.txt must exist)
    cy.get('input[type="file"]')
      .first()
      .selectFile('cypress/fixtures/sample.txt', { force: true });

    // Submit
    cy.get('[data-cy="submit-btn"]').should('not.be.disabled').click();
    cy.contains('Your artifact has been successfully submitted!').should(
      'be.visible',
    );

    // Navigate to list and search by unique terms
    cy.visit('/list-artifacts');
    cy.get('input[placeholder="Artifact\'s title contains"]').type(
      UNIQUE_TITLE,
    );
    cy.get('button').contains('Search').click();
    cy.get('app-artifact-card').should('have.length', 1);

    // Open Detail → verify fields → then History
    cy.get('app-artifact-card a.view-button').contains('View').click();
    cy.url().should('match', /\/artifacts\/.+/);

    // Detail assertions (title, description, keywords, links, agencies, dois)
    cy.contains(UNIQUE_TITLE).should('exist');
    cy.contains('Description').should('exist');
    cy.contains(DESCRIPTION.substring(0, 20)).should('exist');
    UNIQUE_KEYWORDS.split(',').forEach((k) => {
      cy.contains(k.trim()).should('exist');
    });
    UNIQUE_LINKS.split(',').forEach((l) => {
      cy.get(`a[href="${l.trim()}"]`).should('exist');
    });
    cy.contains('Funding Agencies')
      .parent()
      .should('contain.text', 'NSF')
      .and('contain.text', 'NIH')
      .and('contain.text', 'Agency-X');
    cy.contains('DOIs')
      .parent()
      .should('contain.text', '10.1234/abcd1')
      .and('contain.text', '10.5678/efgh2');

    // Open history
    cy.contains('a', 'History').click();
    cy.url().should('match', /\/artifacts\/.+\/history$/);
    cy.wait(2000);

    // History page: click Refresh first, then expect exactly one card
    cy.contains('button', 'Refresh History').click();
    cy.contains('Loading history…', { timeout: 10000 }).should('exist');
    cy.contains('Loading history…', { timeout: 10000 }).should('not.exist');
    cy.contains('No history found.').should('not.exist');
    cy.get('.history-list a').should('have.length', 1).first().click();

    // History detail should show Current State badge and metadata
    cy.contains('Current State').should('be.visible');
    cy.contains(UNIQUE_TITLE).should('be.visible');
    cy.contains(DESCRIPTION.substring(0, 20)).should('be.visible');

    // From History detail: go to See Artifact's Detail and validate all fields
    cy.contains("See Artifact's Detail").click();
    cy.url().should('match', /\/artifacts\/.+$/);
    cy.contains(UNIQUE_TITLE).should('exist');
    cy.contains(DESCRIPTION.substring(0, 20)).should('exist');
    UNIQUE_KEYWORDS.split(',').forEach((k) =>
      cy.contains(k.trim()).should('exist'),
    );
    UNIQUE_LINKS.split(',').forEach((l) =>
      cy.get(`a[href="${l.trim()}"]`).should('exist'),
    );
    cy.contains('Funding Agencies')
      .parent()
      .should('contain.text', 'NSF')
      .and('contain.text', 'NIH')
      .and('contain.text', 'Agency-X');
    cy.contains('DOIs')
      .parent()
      .should('contain.text', '10.1234/abcd1')
      .and('contain.text', '10.5678/efgh2');

    // Click Update Artifact and modify metadata
    cy.contains('Update Artifact').click();
    cy.url().should('include', '/update-artifact/');

    // Change metadata fields
    const NEW_KEYWORDS = 'new-k1, new-k2';
    const NEW_LINKS = 'https://example.com/c, https://example.com/d';
    const NEW_DOIS = '10.9999/xyz1, 10.8888/xyz2';
    const NEW_ACK = 'Updated acknowledgements for history flow.';

    cy.get('input[formcontrolname="keywords"]').clear().type(NEW_KEYWORDS);
    cy.get('input[formcontrolname="links"]').clear().type(NEW_LINKS);
    cy.get('input[formcontrolname="doi"]').clear().type(NEW_DOIS);
    // Toggle agencies: uncheck NIH, check NASA and type other agency
    cy.get('input[formcontrolname="nih"]').uncheck({ force: true });
    cy.get('input[formcontrolname="nasa"]').check({ force: true });
    cy.get('input[formcontrolname="otherAgency"]').clear().type('Agency-Z');
    cy.get('textarea[formcontrolname="acknowledgment"]').clear().type(NEW_ACK);

    // Select a new file (or folder) and store footprint
    cy.get('input[type="file"]')
      .first()
      .selectFile('cypress/fixtures/sample.txt', { force: true });

    cy.get('textarea[formcontrolname="submission_comment"]')
      .clear()
      .type('History flow update reason E2E.');

    // Ensure Update button is enabled and submit
    cy.contains('button', 'Update').should('not.be.disabled').click();

    // Expect success toast and CTA
    cy.contains('Artifact updated successfully!', { timeout: 10000 }).should(
      'be.visible',
    );
    cy.contains('Check your modified artifact')
      .scrollIntoView()
      .should('exist')
      .click({ force: true });

    cy.url()
      .should('match', /\/artifacts\/[^/]+$/)
      .and('not.include', 'update-artifact');

    // On updated detail, verify new values
    cy.contains(NEW_KEYWORDS.split(',')[0].trim()).should('exist');
    NEW_LINKS.split(',').forEach((l) =>
      cy.get(`a[href="${l.trim()}"]`).should('exist'),
    );
    cy.contains('Funding Agencies')
      .parent()
      .should('contain.text', 'NSF')
      .and('not.contain.text', 'NIH')
      .and('contain.text', 'NASA')
      .and('contain.text', 'Agency-Z');
    cy.contains('DOIs')
      .parent()
      .should('contain.text', '10.9999/xyz1')
      .and('contain.text', '10.8888/xyz2');
    cy.contains(NEW_ACK).should('exist');

    // Wait for success toast to dismiss before clicking History
    cy.contains('Artifact updated successfully!', { timeout: 10000 }).should(
      'not.exist',
    );

    // Go to history, refresh, and assert two cards: Current and Initial
    cy.contains('a', 'History').click();
    cy.url().should('match', /\/artifacts\/.+\/history$/);
    cy.wait(2000);
    cy.contains('button', 'Refresh History').click();
    cy.contains('Loading history…', { timeout: 10000 }).should('exist');
    cy.contains('Loading history…', { timeout: 10000 }).should('not.exist');
    cy.get('.history-list a').should('have.length', 2);

    // Open the Current State snapshot via its permalink (🔗)
    cy.contains('.history-card', 'Current State')
      .find('a.permalink')
      .first()
      .click();
    cy.contains('Current State').should('be.visible');
    // Validate updated fields in snapshot detail
    cy.contains(NEW_KEYWORDS.split(',')[0].trim()).should('exist');
    // Blockchain stores only the first URL, so check only the first link
    cy.contains(NEW_LINKS.split(',')[0].trim()).should('exist');
    cy.contains('Description').should('exist');

    // Update again using the "Keep manifest unchanged" toggle
    cy.contains('Update this Artifact').click();
    cy.url().should('include', '/update-artifact/');

    // Toggle: Keep manifest unchanged (disables Select buttons)
    cy.contains('span', 'Keep manifest unchanged')
      .parent()
      .find('input[type="checkbox"]')
      .check({ force: true });
    cy.contains('button', 'Select a Folder').should('be.disabled');
    cy.contains('button', 'Select a File').should('be.disabled');

    // Update button should be disabled until metadata changes
    cy.contains('button', 'Update').should('be.disabled');

    // Capture current footprint shown in update form (will be reused)
    cy.contains('.section-heading', 'Footprint', { timeout: 10000 })
      .should('exist')
      .parent()
      .find('code')
      .invoke('text')
      .then((t) => t.trim())
      .as('savedFootprint');

    // Change keywords to enable submit
    const AGAIN_KEYWORDS = 'again-k1, again-k2';
    cy.get('input[formcontrolname="keywords"]').clear().type(AGAIN_KEYWORDS);
    cy.get('textarea[formcontrolname="submission_comment"]')
      .clear()
      .type('Keep manifest unchanged update E2E.');
    cy.contains('button', 'Update').should('not.be.disabled').click();
    cy.contains('Artifact updated successfully!', { timeout: 10000 }).should(
      'be.visible',
    );

    // Go to the modified artifact and assert unchanged footprint and new keywords
    cy.contains('Check your modified artifact').click({ force: true });
    cy.url()
      .should('match', /\/artifacts\/[^/]+$/)
      .and('not.include', 'update-artifact');
    cy.get('@savedFootprint').then((fp: any) => {
      cy.contains('Footprint (SHA-256)')
        .parent()
        .find('code')
        .should(($c) => expect($c.text().trim()).to.eq(String(fp).trim()));
    });
    cy.contains(AGAIN_KEYWORDS.split(',')[0].trim()).should('exist');

    // Wait for success toast to dismiss before clicking History
    cy.contains('Artifact updated successfully!', { timeout: 10000 }).should(
      'not.exist',
    );

    // Open History and verify the footprint appears in a card
    cy.contains('a', 'History').click();
    cy.contains('Loading history…', { timeout: 10000 }).should('not.exist');
    cy.get('@savedFootprint').then((fp: any) => {
      const expected = String(fp).trim();
      cy.get('.history-card').should('exist');
      cy.get('.history-card .card-body').contains(expected, {
        matchCase: false,
      });
    });

    // Final single assertion so the Cypress reporter shows an overall pass
    cy.wrap('History flow complete').should('eq', 'History flow complete');

    // -------- Extended scenario: create a new artifact and update it 15 times --------
    const NEW_TITLE = `e2e-batch-artifact-${Date.now()}`;
    const NEW_DESC =
      'Batch update test description with sufficient length to pass validation rules.';
    const NEW_KEYS_BASE = 'batch-k1, batch-k2';
    const NEW_LINKS_BASE = 'https://example.com/x, https://example.com/y';
    const NEW_DOIS_BASE = '10.1111/xyz1, 10.2222/xyz2';

    cy.visit('/');
    cy.contains('Contribute').click();
    cy.get('input[formcontrolname="title"]').type(NEW_TITLE);
    cy.get('textarea[formcontrolname="description"]').type(NEW_DESC);
    cy.get('textarea[formcontrolname="submission_comment"]').type(
      'Initial submission comment for E2E batch history flow test.',
    );
    cy.get('input[formcontrolname="keywords"]').type(NEW_KEYS_BASE);
    cy.get('input[formcontrolname="links"]').type(NEW_LINKS_BASE);
    cy.get('input[formcontrolname="doi"]').type(NEW_DOIS_BASE);
    cy.get('input[formcontrolname="nsf"]').check({ force: true });
    cy.get('input[formcontrolname="nih"]').check({ force: true });
    cy.get('input[formcontrolname="otherAgency"]').type('Batch-Agency');
    cy.get('input[type="file"]')
      .first()
      .selectFile('cypress/fixtures/sample.txt', { force: true });
    cy.contains('button', 'Submit').should('exist');
    cy.get('[data-cy="submit-btn"]').should('not.be.disabled').click();
    cy.contains('Your artifact has been successfully submitted!').should(
      'be.visible',
    );

    // Navigate to detail via CTA or list
    cy.contains('View new artifact here').click({ force: true });

    // Helper to perform a single randomized update cycle
    const doOneUpdate = (idx: number) => {
      cy.contains('Footprint (SHA-256)')
        .parent()
        .find('code')
        .invoke('text')
        .then((prevFp) => {
          cy.contains('Update Artifact').click();
          cy.url().should('include', '/update-artifact/');

          const changeManifest = Cypress._.random(0, 1) === 1;
          if (changeManifest) {
            // Ensure toggle is off and pick a file to change manifest
            cy.contains('span', 'Keep manifest unchanged')
              .parent()
              .find('input[type="checkbox"]')
              .uncheck({ force: true });
            cy.get('input[type="file"]')
              .first()
              .selectFile('cypress/fixtures/sample.txt', { force: true });
          } else {
            // Keep manifest and change metadata
            cy.contains('span', 'Keep manifest unchanged')
              .parent()
              .find('input[type="checkbox"]')
              .check({ force: true });
            cy.get('input[formcontrolname="keywords"]')
              .clear()
              .type(`bupd-${idx}, ${Date.now()}`);
          }

          cy.get('textarea[formcontrolname="submission_comment"]')
            .clear()
            .type(
              `Batch update ${idx} E2E. ADDing more text to the submission comment to make it longer than 50 characters.`,
            );
          cy.contains('button', 'Update', { timeout: 10000 })
            .should('not.be.disabled')
            .click();
          cy.contains('Artifact updated successfully!', {
            timeout: 10000,
          }).should('be.visible');
          cy.contains('Check your modified artifact').click({ force: true });
          cy.url()
            .should('match', /\/artifacts\/[^/]+$/)
            .and('not.include', 'update-artifact');

          cy.contains('Footprint (SHA-256)')
            .parent()
            .find('code')
            .invoke('text')
            .then((newFp) => {
              const trimmed = String(newFp).trim();
              if (changeManifest) {
                // When manifest changes, footprint may or may not change depending on selected content.
                // Assert it is a valid SHA-256 hex string.
                expect(trimmed).to.match(/^[a-f0-9]{64}$/);
              } else {
                expect(trimmed).to.equal(String(prevFp).trim());
              }
            });
        });
    };

    // Perform 15 randomized updates
    for (let i = 1; i <= 15; i++) {
      doOneUpdate(i);
    }

    // From the artifact detail, open history and validate pagination and tags
    cy.contains('a', 'History').click();
    cy.contains('Loading history…', { timeout: 10000 }).should('not.exist');

    // Page 1: expect 5 cards and first tagged Current State
    cy.get('.history-list .history-card').should('have.length', 5);
    cy.get('.history-list .history-card')
      .first()
      .find('.card-header .badge')
      .should('contain.text', 'Current State');

    // Pager has at least 3 pages
    cy.get('.custom-pager .page-number').its('length').should('be.gte', 3);

    // Go to page 2 and validate 5 Snapshot tags
    cy.get('.custom-pager .page-number').contains('2').click();
    cy.contains('Loading history…').should('not.exist');
    cy.get('.history-list .history-card').should('have.length', 5);
    cy.get('.history-list .history-card .card-header .badge').each(($b) => {
      expect($b.text().trim()).to.eq('Snapshot');
    });

    // Go to LAST page (not hardcoded index) and validate at most 5 cards,
    // first is Initial State, others Snapshot
    cy.get('.custom-pager .page-number').then(($pages) => {
      cy.wrap($pages).last().click();
    });
    cy.contains('Loading history…').should('not.exist');
    cy.get('.history-list .history-card').its('length').should('be.lte', 5);
    // Initial State badge is on the LAST card of the last page
    cy.get('.history-list .history-card')
      .last()
      .find('.card-header .badge')
      .should('contain.text', 'Initial State');
    // All previous cards should be Snapshot
    cy.get('.history-list .history-card').then(($cards) => {
      Cypress.$($cards)
        .slice(0, -1)
        .each((_, el) => {
          const text = Cypress.$(el).find('.card-header .badge').text().trim();
          expect(text).to.eq('Snapshot');
        });
    });

    // Back to page 1 and ensure first is Current State
    cy.get('.custom-pager .page-number').contains('1').click();
    cy.contains('Loading history…').should('not.exist');
    cy.get('.history-list .history-card')
      .first()
      .find('.card-header .badge')
      .should('contain.text', 'Current State');

    // Additional final assertion
    cy.wrap('History mega flow complete').should(
      'eq',
      'History mega flow complete',
    );
  });
});
