# OSC WebApp Accessibility

## Standard and scope

The OSC WebApp uses WCAG 2.2 Level AA as its engineering target. The current
automated suite covers the public landing page, primary and mobile navigation,
the Contribute menu, sign-in form and validation, artifact and workflow
catalogs, blockchain provenance detail records, and representative empty and
failure states.

Passing automation is not a legal certification or a complete accessibility
assessment. Automated tools cannot reliably judge reading order, useful
alternative text, clarity, focus quality, screen-reader usability, or whether a
workflow is understandable.

## Automated checks

The Cypress suite uses `axe-core` through `cypress-axe` and evaluates WCAG A,
AA, and WCAG 2.2 AA rules.

Run the WebApp and accessibility checks together:

```bash
npm run test:a11y
```

Run the check against an already-running WebApp at `http://127.0.0.1:4200`:

```bash
npm run test:a11y:run
```

The checks are also part of `.github/workflows/ci.yml`. A detected violation
fails the CI job and prints the rule, help text, and affected selectors.

The maintained scenarios are in
`cypress/e2e/accessibility/accessibility.cy.ts`:

- Landing page and desktop Contribute menu.
- Responsive navigation and Escape-key dismissal at 390x844.
- Sign-in labels, instructions, and validation messages.
- Artifact results, empty search results, and API failure recovery state.
- Workflow results and API failure recovery state.
- Artifact and workflow detail pages with transaction, peer, manifest, linked
  record, and repository evidence.

The sign-in page is the current public form. There are no application dialogs
in the maintained public routes. When dialogs are introduced, tests must cover
an accessible name, initial focus, contained Tab order, Escape dismissal, and
focus return to the trigger.

## Manual release checklist

Complete this checklist for a conference release or a substantial interaction
change:

- Navigate the page with Tab, Shift+Tab, Enter, Space, and Escape only.
- Confirm the skip link is the first keyboard stop and moves focus to the main
  content.
- Confirm focus is always visible and is not obscured by the header.
- Confirm the desktop Contribute menu and mobile navigation expose their state,
  close with Escape, and return focus predictably.
- Confirm landmarks and headings give the page a useful outline in a screen
  reader.
- Confirm every input has a persistent label and that errors are associated
  with the relevant field and announced.
- Confirm loading, success, empty, expired-session, offline, and error messages
  are announced without moving focus unexpectedly.
- Confirm meaningful images have useful alternatives and decorative images do
  not add noise.
- Test at 200% browser zoom and with text-only enlargement. Repeat at 400% for
  the primary reading and sign-in workflows.
- Test 1440x900, 1024x768, 390x844, and 320x700 for reflow, overlap, clipping,
  and horizontal scrolling.
- Confirm controls remain usable by touch and do not rely on color, hover, or
  motion alone.
- Enable reduced motion at the operating-system level and confirm no essential
  information depends on animation.
- Test sign-in, catalog search, and menu operation with NVDA plus Chrome or
  Firefox on Windows.

## Current safeguards

- Semantic header, navigation, main, section, article, form, status, and alert
  structures.
- A keyboard-visible skip link and shared `:focus-visible` treatment.
- Persistent form labels, autocomplete hints, field-linked errors, and live
  authentication status.
- Buttons with accessible names, `aria-expanded`, `aria-controls`, current-page
  state, and keyboard dismissal where applicable.
- Text alternatives for brand imagery and intentionally decorative treatment
  for the photographic hero.
- Explicit loading, empty, failure, unauthorized, and recovery experiences.
- Color tokens checked by axe and layouts that reflow without horizontal
  overflow at the four supported review sizes.
- Reduced-motion styles that suppress nonessential transitions.

## Known limitations

- Axe coverage is representative rather than exhaustive. Authenticated artifact
  and workflow contribution forms still need a credentialed manual pass.
- Screen-reader behavior has not been certified by an external auditor.
- The local simulator validates UI behavior, not Globus, Fabric identity,
  blockchain consensus, or production authorization.
- Angular template-specific accessibility lint rules are not enabled because
  the repository does not currently use the Angular ESLint template parser.
  Adding that parser should be handled as a focused tooling change rather than
  mixed into a visual release.
- Dependency and browser upgrades can change axe results. Review rule changes
  instead of suppressing new failures globally.

## Reporting an issue

Record the route, browser, viewport or zoom level, assistive technology, exact
steps, expected result, and observed result. Include a screenshot or short
recording when it helps, but do not include passwords, tokens, or research data.
