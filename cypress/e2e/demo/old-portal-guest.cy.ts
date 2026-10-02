/// <reference types="cypress" />

function checkGuestA11y(): void {
  cy.injectAxe();
  cy.checkA11y(
    'main',
    undefined,
    (violations) => {
      if (violations.length)
        throw new Error(
          JSON.stringify(
            violations.map((item) => ({
              rule: item.id,
              targets: item.nodes.map((node) => node.target),
            })),
          ),
        );
    },
    true,
  );
}

describe('old portal guest flow against the local mock', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it('keeps the approved home and shows safe public detail and colorful version history', () => {
    cy.viewport(1280, 900);
    cy.visit('/');
    cy.get('#hero-heading').should(
      'have.attr',
      'aria-label',
      'Open Science Chain',
    );
    cy.contains('a', 'Explore artifacts').click();
    cy.location('pathname').should('equal', '/list-artifacts');
    cy.get('#artifact-title-search').should('be.visible');
    cy.contains('.catalog-card', 'Coastal sample analysis')
      .contains('a', 'View artifact')
      .click();
    cy.location('pathname').should(
      'equal',
      '/artifacts/11111111-1111-4111-8111-111111111111',
    );
    cy.contains('h1', 'Coastal sample analysis').should('be.visible');
    cy.contains('Recorded on the OSC permissioned blockchain').should(
      'be.visible',
    );
    cy.get('main').should('not.contain', 'generated-example.txt');
    cy.get('main').should('not.contain', 'example@example');
    checkGuestA11y();
    cy.screenshot('old-guest-artifact-detail-desktop', { capture: 'viewport' });

    cy.contains('a', 'View provenance history').click();
    cy.location('pathname').should(
      'equal',
      '/artifacts/11111111-1111-4111-8111-111111111111/history',
    );
    cy.get('.history-card').should('have.length', 3);
    cy.get('.tag-current').should('contain', 'Current State');
    cy.get('.tag-update').should('contain', 'Snapshot');
    cy.get('.tag-initial').should('contain', 'Initial State');
    cy.get('main').should('not.contain', 'generated-example.txt');
    cy.get('main').should('not.contain', 'submitterEmail');
    checkGuestA11y();
    cy.screenshot('old-guest-artifact-history-desktop', {
      capture: 'fullPage',
    });

    cy.get('.history-card').eq(1).contains('a', 'View snapshot').click();
    cy.location('pathname').should('match', /\/history\/[^/]+$/);
    cy.contains('h1', 'Artifact snapshot').should('be.visible');
    cy.get('.history-card').should('have.length', 1);
    cy.contains('a', 'All history').click();
    cy.get('.history-card').should('have.length', 3);

    cy.viewport(390, 844);
    cy.reload();
    cy.get('.history-card').should('have.length', 3);
    cy.document().then((doc) =>
      expect(doc.documentElement.scrollWidth).to.be.at.most(390),
    );
    checkGuestA11y();
    cy.screenshot('old-guest-artifact-history-mobile', { capture: 'fullPage' });
  });

  it('creates a session, submits a fingerprint, links a workflow, and edits owned metadata', () => {
    cy.viewport(1280, 900);
    cy.visit('/');
    cy.contains('LOCAL MOCK PREVIEW').should('be.visible');
    cy.contains('a', 'Contribute an artifact').click();
    cy.location('pathname').should('equal', '/contribute');
    cy.get('#session-organization').select('neuroscience-gateway');
    cy.contains('button', 'Start session').click();
    cy.contains('Contributing for neuroscience-gateway').should('be.visible');

    cy.get('#title').type('AB').blur();
    cy.get('#title-error').should('contain', 'at least 3 characters');
    cy.get('#title').clear().type('Local synthetic sample');
    cy.get('#description').type('Too short').blur();
    cy.get('#description-error').should('contain', 'at least 50 characters');
    cy.get('#description')
      .clear()
      .type(
        'A synthetic artifact used to test the original portal guest contribution workflow end to end.',
      );
    cy.get('#keywords').type('synthetic, provenance');
    cy.get('#submission_comment').type('short').blur();
    cy.get('#submission-comment-error').should(
      'contain',
      'at least 20 characters',
    );
    cy.get('#submission_comment')
      .clear()
      .type('Initial local synthetic contribution for review.');
    cy.get('#guest-file').selectFile({
      contents: Cypress.Buffer.from('synthetic research bytes'),
      fileName: 'private-original.txt',
      mimeType: 'text/plain',
    });
    cy.get('main').should('contain', 'SHA-256:');
    cy.intercept('POST', '**/api/v1/demo/artifacts').as('createdArtifact');
    cy.contains('button', 'Submit').click();
    cy.wait('@createdArtifact').then(({ request }) => {
      expect(request.body.fingerprint).to.match(/^[0-9a-f]{64}$/);
      expect(request.body.keywords).to.deep.equal(['synthetic', 'provenance']);
      expect(request.body).not.to.have.property('originalFilename');
      expect(request.body).not.to.have.property('fileContents');
      expect(request.headers).not.to.have.property('authorization');
      expect(request.headers).to.have.property('x-demo-csrf');
    });
    cy.contains('h1', 'Local synthetic sample').should('be.visible');
    cy.location('pathname').then((path) => {
      const id = path.split('/').pop();
      cy.get('button.contribute-button').click();
      cy.contains('[role="menuitem"]', 'Workflow').click();
      cy.location('pathname').should('equal', '/create-workflow');
      cy.get('#workflow-title').type('Local synthetic analysis workflow');
      cy.get('#workflow-description').type(
        'A reproducible local workflow linking the synthetic sample and its documented analysis steps.',
      );
      cy.get('#workflow-keywords').type('synthetic, provenance');
      cy.get('#workflow-comment').type(
        'Initial local workflow contribution for review.',
      );
      cy.get('#workflow-artifact-search').click();
      cy.contains('button.dropdown-item', 'Local synthetic sample').click();
      cy.intercept(
        'GET',
        'https://api.github.com/repos/example/research-workflow',
        {
          description: 'Synthetic analysis source',
        },
      );
      cy.intercept(
        'GET',
        'https://api.github.com/repos/example/research-workflow/commits?per_page=1',
        [{ sha: 'a'.repeat(40) }],
      );
      cy.intercept(
        'GET',
        'https://api.github.com/repos/example/research-workflow/contents*',
        [{ name: 'analysis.py', sha: 'b'.repeat(40), type: 'file' }],
      ).as('repoContents');
      cy.contains('button', '+ Add Repository').click();
      cy.get('#repo-url-0').type(
        'https://github.com/example/research-workflow',
      );
      cy.get('#repo-url-0').blur();
      cy.get('#repo-description-0').should(
        'have.value',
        'Synthetic analysis source',
      );
      cy.get('#repo-hash-0').should('have.value', 'a'.repeat(40));
      cy.wait('@repoContents').its('response.body').should('have.length', 1);
      cy.get('.content-entry input')
        .first()
        .should('have.value', 'analysis.py');
      cy.screenshot('restored-workflow-form-desktop', { capture: 'fullPage' });
      cy.intercept('POST', '**/api/v1/demo/workflows').as('createdWorkflow');
      cy.contains('button', 'Submit workflow').click();
      cy.wait('@createdWorkflow').then(({ request }) => {
        expect(request.body.artifactIds).to.deep.equal([id]);
        expect(request.body.title).to.equal(
          'Local synthetic analysis workflow',
        );
        expect(request.body.githubRepositories[0].url).to.equal(
          'https://github.com/example/research-workflow',
        );
      });
      cy.contains('h1', 'Local synthetic analysis workflow').should(
        'be.visible',
      );

      cy.visit(`/update-artifact/${id}`);
      cy.get('#title').should('have.attr', 'readonly');
      cy.get('#keywords').clear().type('synthetic, provenance, revised');
      cy.get('#submission_comment').type(
        'A reviewed metadata revision for the local preview.',
      );
      cy.intercept('PATCH', `**/api/v1/demo/artifacts/${id}`).as(
        'editedArtifact',
      );
      cy.contains('button', 'Submit revision').click();
      cy.wait('@editedArtifact').then(({ request }) => {
        expect(request.body).not.to.have.property('title');
        expect(request.body).not.to.have.property('description');
        expect(request.body.keywords).to.deep.equal([
          'synthetic',
          'provenance',
          'revised',
        ]);
      });
      cy.contains('h1', 'Local synthetic sample').should('be.visible');
      cy.contains('Awaiting blockchain confirmation').should('be.visible');
    });
  });

  it('keeps the authenticated product catalog and protected contribution route', () => {
    cy.viewport(1280, 900);
    cy.intercept('GET', '**/api/v1/users/validate-token', {
      statusCode: 200,
      body: {},
    });
    cy.intercept('GET', '**/api/v1/artifacts', []).as('productArtifacts');
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    cy.visit('/list-artifacts', {
      onBeforeLoad(win) {
        const payload = win.btoa(
          JSON.stringify({
            username: 'reviewer',
            sub: 'reviewer',
            roles: ['collaborator'],
            email: 'reviewer@example.test',
            exp: expiresAt,
          }),
        );
        const token = `eyJhbGciOiJub25lIn0.${payload}.signature`;
        win.localStorage.setItem(
          'tokenData',
          JSON.stringify({ token, expiresAt: expiresAt * 1000 }),
        );
      },
    });
    cy.wait('@productArtifacts');
    cy.contains('h2', 'Catalog results').should('be.visible');
    cy.get('#artifact-title-search').should('be.visible');
    cy.contains('button', 'Sign out').should('be.visible');
    cy.get('a[href="/demo"]').should('not.exist');
    cy.visit('/contribute');
    cy.contains('h1', "Add a New Artifact to your Org's Vault!").should(
      'be.visible',
    );
    cy.get('#session-organization').should('not.exist');
  });

  it('redirects old guest bookmarks into the unified portal', () => {
    cy.visit('/demo');
    cy.location('pathname').should('equal', '/list-artifacts');
    cy.get('a[href="/demo"]').should('not.exist');
  });

  it('keeps guest contribution pages accessible at phone width', () => {
    cy.viewport(390, 844);
    cy.visit('/contribute');
    cy.get('#session-organization').should('be.visible');
    checkGuestA11y();
    cy.document().then((doc) =>
      expect(doc.documentElement.scrollWidth).to.be.at.most(390),
    );
    cy.contains('button', 'Start session').click();
    cy.get('#title').should('be.visible');
    checkGuestA11y();
    cy.visit('/create-workflow');
    cy.contains('h1', 'Contribute Workflow').should('be.visible');
    checkGuestA11y();
    cy.document().then((doc) =>
      expect(doc.documentElement.scrollWidth).to.be.at.most(390),
    );
  });
});
