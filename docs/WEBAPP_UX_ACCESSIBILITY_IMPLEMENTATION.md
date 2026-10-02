# WebApp UX and Accessibility Implementation Report

**Completed:** July 31, 2026  
**Primary repository:** `OSC-WebApp`  
**Supporting orchestration:** `OSC-IS-Infra/ui-tests`

## Outcome

The OSC WebApp now presents a single, coherent product experience from the
public landing page through sign-in, catalog browsing, and record inspection.
The redesign makes scientific artifacts, workflows, blockchain provenance,
Neuroscience Gateway (NSG), and Citizen Science visible without requiring users
to understand the system architecture first.

The work stayed within the approved boundary. `OSC-API`, `OSC-Docker`, and
`OSC-Network` were not modified. No cloud resources, credentials, commits,
pushes, or deployments were used.

## Design decisions

- Replaced the generic landing treatment with a full-width research context
  image, direct artifact and provenance actions, and a visible hint of the next
  section at every target viewport.
- Expanded the navigation to Home, Artifacts, Workflows, How it works,
  Contribute, and Sign in/out. Desktop and mobile menus share keyboard and
  accessible-state behavior.
- Added distinct paths for researchers, contributors, and organizations
  evaluating OSC, followed by a compact provenance explanation and real catalog
  previews.
- Kept the visual system quiet and work-focused: white and deep blue
  foundations, teal interaction color, visible borders, limited rounding, and
  system typography without external font dependencies.
- Reworked sign-in as a clear two-panel experience with persistent labels,
  field-linked errors, useful authentication messaging, and a responsive
  single-column layout.
- Added explicit loading, empty, error, offline, unauthorized, expired-session,
  and retry states to the artifact and workflow experiences.
- Added complete artifact and workflow detail presentations that connect
  transaction and peer evidence to manifests, organizations, contributors,
  linked artifacts, and exact repository revisions.
- Explained Hyperledger Fabric as permissioned trust infrastructure: research
  files remain off-chain while hashes, context, and accepted revisions form a
  tamper-evident history without wallets or cryptocurrency.

## Brand and image provenance

The navigation and sign-in lockups are derived from the approved Open Science
Chain assets in the public `OpenScienceChain/REHS2024` repository. The
transparent navigation variant was produced locally from the official white
lockup while preserving its proportions.

The favicon uses the OSC globe mark instead of Angular branding. The hero was
generated as a purpose-built bitmap from the earlier research scene. The edit
removed synthetic interface overlays while preserving the scientist,
microscope, monitor, and a clean left-side text area. The generation request
explicitly prohibited text, logos, arrows, check marks, and fake UI elements.

## Accessibility evidence

- WCAG 2.2 AA is the engineering target, with limitations documented in
  `docs/ACCESSIBILITY.md`.
- The public routes include a skip link, visible focus, semantic landmarks,
  persistent labels, accessible menu states, and live status/error messaging.
- Cypress plus axe covers the landing page, navigation, Contribute dropdown,
  mobile menu, sign-in validation, catalogs, empty results, and API failures.
- Responsive measurements report equal document client and scroll widths at
  1440x900, 1024x768, 390x844, and 320x700.
- Human keyboard, zoom, screen-reader, and authenticated contribution checks
  remain release responsibilities and are listed explicitly in the manual
  checklist.

## Credential-free deployment test environment

`OSC-IS-Infra/ui-tests` starts:

- the production WebApp image behind Nginx;
- the real API Gateway;
- disposable PostgreSQL and RabbitMQ services; and
- a deterministic downstream API simulator.

The browser uses the simulator so success, empty, slow, error, offline,
unauthorized, expired, recovery, and organization-isolation behavior stays
repeatable. The real Gateway runs beside it to verify that the application can
boot against clean PostgreSQL and RabbitMQ dependencies. Stopping and restarting
RabbitMQ and the Gateway verifies the expected container boundaries.

Seed data includes NSG (Neuroscience Gateway) and Citizen Science artifacts and
workflows. All credentials in this Compose stack are disposable local fixtures.

## Verification summary

The implementation was checked with:

- 217 Angular unit tests in headless Chrome, all passing.
- Angular production compilation, completed successfully.
- 6 Cypress axe accessibility scenarios, all passing.
- 3 focused landing-page functional scenarios, all passing.
- 7 Cypress local-stack functional and failure simulations, all passing.
- Docker health checks and Gateway/RabbitMQ stop-and-restart probes.
- Chrome screenshots and overflow measurements at all four requested sizes.

The production build retains pre-existing optimization warnings for
`crypto-js` and four Bootstrap selectors. These warnings do not prevent the
build but should be tracked separately from this UX work.

## Evidence

| Viewport | Before | After |
| --- | --- | --- |
| 1440x900 | [Desktop](evidence/before-desktop-1440x900.png) | [Desktop](evidence/after-desktop-1440x900.png) |
| 1024x768 | [Tablet](evidence/before-tablet-1024x768.png) | [Tablet](evidence/after-tablet-1024x768.png) |
| 390x844 | [Mobile](evidence/before-mobile-390x844.png) | [Mobile](evidence/after-mobile-390x844.png) |
| 320x700 | [Narrow mobile](evidence/before-mobile-320x700.png) | [Narrow mobile](evidence/after-mobile-320x700.png) |

## Remaining risks

- The simulator is deliberately not proof of live Globus authentication,
  Fabric identity handling, chaincode execution, or multi-organization network
  behavior.
- The Gateway health route confirms process availability but does not currently
  aggregate deep RabbitMQ availability into its response.
- Authenticated creation and editing workflows require a manual pass with a
  suitable local or staging identity.
- Production and development dependencies still have audit findings. Upgrade
  remediation should be isolated, reviewed, and tested rather than forced into
  this visual change.
- The final production-only audit passed the CI critical-severity threshold but
  reported 18 findings: 1 low, 3 moderate, and 14 high. Most high findings are
  associated with the current Angular 19 dependency line; the suggested forced
  fixes include breaking framework upgrades.
- An external accessibility review remains appropriate before making a legal
  compliance claim.
