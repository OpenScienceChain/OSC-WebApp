# Accessibility evidence inventory, 2026-09-02

This directory supports
`docs/ACCESSIBILITY-MANUAL-EVIDENCE-20260902.md`. It records a local manual and
automated regression review of `OSC-WebApp` starting from commit
`07e2a0faf0093fc7a25e8f628213a14e42038e4d`.

## Screenshots

- `home-desktop-1440x900.png`: representative desktop landing page and visible
  keyboard focus on Home.
- `keyboard-focus-home-desktop-1440x900.png`: explicit keyboard-focus capture.
- `artifact-detail-mobile-390x844.png`: loaded artifact metadata and blockchain
  evidence at the mobile breakpoint.
- `artifact-error-mobile-390x844.png`: record API failure with alert, level-one
  heading, and retry action.
- `sign-in-expired-400-percent-reflow-equivalent-320x900.png`: expired-session
  sign-in state at the 320-pixel reflow equivalent used for the 400% check.

## Logs

- `cypress-axe.log`: 9 passing Cypress/axe scenarios.
- `focused-unit.log`: 18 passing `AppComponent` tests.

## Reproduction

From the repository root, use the repository secure-install wrapper before
running local project binaries. With a preview listening at
`http://127.0.0.1:14202`, the accessibility suite was run as:

```powershell
.\node_modules\.bin\cypress.cmd run --browser chrome `
  --spec cypress/e2e/accessibility/accessibility.cy.ts `
  --config baseUrl=http://127.0.0.1:14202
```

The focused unit suite was run as:

```powershell
.\node_modules\.bin\ng.cmd test --watch=false `
  --browsers=ChromeHeadless `
  --include=src/app/app.component.spec.ts `
  --progress=false
```

The deterministic catalog and record data came from the existing
`OSC-IS-Infra/ui-tests/simulator/server.mjs`, running locally on port 3000. No
cloud service, personal session, or production credential was used.
