# OSC-WebApp US-RSE 2026 UX evidence

## Purpose

This package records the product-quality work completed for the US-RSE 2026
talk. It is intended to support modest, reproducible claims about the current
OSC-WebApp prototype. It is not evidence of production adoption, a completed
AWS deployment, or a full Hyperledger Fabric transaction.

Evidence date: 2026-09-01

Feature branch: `feature/usrse26-product-quality`

Primary repository: `OSC-WebApp`

No changes were made to the supporting API, infrastructure, submission, or
chaincode repositories for this work. Those repositories were used read-only
to understand contracts and run the local integration harness.

## Product changes

- Reframed the home page around the researcher problem: preserving artifacts,
  workflows, contributors, organizations, revisions, and verifiable history.
- Explained the product boundary directly: metadata and fingerprints can be
  recorded as permissioned-ledger evidence while research files remain in
  their repositories or object stores.
- Added representative Neuroscience Gateway and Citizen Science artifacts,
  workflows, and provenance records for deterministic demonstrations.
- Reworked the artifact-history view into a readable version timeline with
  transaction, contributor, verification, and manifest evidence.
- Added explicit loading, empty, error, retry, and session-expiration states.
- Corrected session recovery so an expired login is cleared, explained, and
  returned to the originally requested local route after reauthentication.
- Replaced the home and sign-in hero artwork with a licensed stock photograph.
- Expanded automated accessibility coverage across public, authenticated,
  desktop, and mobile experiences.

## Claim-to-evidence matrix

| Claim suitable for the talk                                                                  | Evidence                                                                                                                                | Boundary                                                                                                                                   |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| OSC is presented as a research-software product centered on provenance, not generic storage. | `final/home-desktop-1440x900.png` and home component tests.                                                                             | This demonstrates the product narrative and interaction design, not researcher adoption.                                                   |
| Representative artifacts and workflows can be explored without a live backend.               | Deterministic NSG and Citizen Science Cypress fixtures plus the simulator profile.                                                      | Fixture records are explicitly synthetic and stable.                                                                                       |
| The UI can show a legible, versioned provenance history.                                     | `final/provenance-history-desktop-1440x900.png` and accessibility scenarios for history success, empty, failure, and retry.             | The history data in this evidence is deterministic; it is not read from a live Fabric ledger.                                              |
| The WebApp integrates with the real local API Gateway contract.                              | Gateway Compose profile creates organizations, a PI, and an artifact through the WebApp proxy and confirms persistence through the API. | This validates Gateway, PostgreSQL, and RabbitMQ connectivity. It does not prove peer endorsement or ledger commit.                        |
| The tested user journeys target WCAG 2.2 Level AA.                                           | Eight Cypress/axe scenarios covering home, navigation, sign-in, catalogs, details, history, failure states, and mobile layouts.         | Automated checks are regression evidence, not a legal accessibility certification or a substitute for manual assistive-technology testing. |
| Session expiration is handled intentionally.                                                 | Auth service, interceptor, guard, sign-in unit tests, and the expired-session accessibility journey.                                    | Real identity-provider timeout policy remains an environment concern.                                                                      |
| The experience is responsive at narrow and desktop viewports.                                | Final 390x844 and 1440x900 captures plus horizontal-overflow assertions.                                                                | The tested viewports are representative, not an exhaustive device matrix.                                                                  |

## Evidence index

### Historical baseline

- `baseline/home-desktop-1440x900.png`: the earlier landing-page treatment.
- `baseline/home-mobile-390x624.png`: the earlier mobile treatment. The original
  capture was 390x624, so the filename reports its actual dimensions.

These baseline images predate this feature branch and are retained as
historical comparison material. They are not regenerated by the current test.

### Reproducible final captures

- `final/home-desktop-1440x900.png`
- `final/home-mobile-390x844.png`
- `final/artifact-detail-desktop-1440x900.png`
- `final/workflow-detail-desktop-1440x900.png`
- `final/provenance-history-desktop-1440x900.png`

The final images are generated by
`cypress/e2e/evidence/ux-evidence.cy.ts` against deterministic fixtures. The
Chrome launch configuration fixes the outer window size so the viewport files
have the dimensions in their names. `SHA256SUMS.txt` records the evidence-file
digests used for review and presentation assembly.

## Validation record

The following checks passed on 2026-09-01:

| Check                                                 | Result                                                                 |
| ----------------------------------------------------- | ---------------------------------------------------------------------- |
| Focused feature and authentication unit tests         | 61 of 61 passed                                                        |
| Full Angular unit suite                               | 220 of 220 passed                                                      |
| Landing-page Chrome journeys                          | 3 of 3 passed, including 320px overflow coverage                       |
| Cypress/axe accessibility journeys                    | 8 of 8 passed with WCAG 2.2 A/AA tags                                  |
| Evidence capture journeys                             | 3 of 3 passed; 5 final screenshots generated                           |
| Production Angular Docker build                       | Passed                                                                 |
| Deterministic simulator Compose profile               | Passed with 3 artifacts and 2 workflows across NSG and Citizen Science |
| Real API Gateway Compose profile                      | Passed with healthy WebApp, Gateway, PostgreSQL, and RabbitMQ services |
| New and substantially revised file lint/format checks | Passed                                                                 |
| Compose configuration validation                      | Passed for simulator and Gateway profiles                              |

The integration harness is owned by this repository at
`test-support/ui-stack`. It uses the fixed Compose project name
`osc-usrse26-ux`, localhost ports 18080, 13300, and 13310, and disposable local
credentials. PostgreSQL and RabbitMQ are not exposed to the host. The test
script removes the project and its volume after execution unless a maintainer
explicitly requests `-KeepRunning`.

Reproduce the two integration modes from this repository:

```powershell
.\test-support\ui-stack\Test-Usrse26Stack.ps1 -Mode simulator
.\test-support\ui-stack\Test-Usrse26Stack.ps1 -Mode gateway
```

The repository's supply-chain installation controls remain in force. Install
dependencies only through the reviewed secure-install wrapper:

```powershell
.\scripts\security\secure-install.ps1 -CI
```

Do not replace that command with an unreviewed `npm install`, `npm ci`, or
`npx` invocation.

## Known boundaries and follow-up work

- There are no production researchers, usage metrics, or adoption results yet.
  The talk should call OSC an experimental product prototype.
- No AWS, EKS, GitOps, production deployment, or cloud credential was used in
  this UX work. Cloud claims require evidence from the separate deployment
  workstream.
- The current infrastructure simulator has no artifact-history endpoint.
- The real API Gateway delegates history retrieval to the get-history worker,
  which is intentionally outside this UI-focused Compose harness.
- The Gateway profile validates API persistence and messaging connectivity. It
  does not run the Fabric peer, chaincode, endorsement, commit, or ledger query.
- Public organization-scoped catalog isolation is not established by the
  current Gateway contract.
- The Gateway returns 404 for some empty collections rather than a consistent
  empty array; the WebApp presents a resilient empty state, but the API contract
  should eventually be normalized.
- The repository-wide lint and formatting baseline is not clean: the broad
  commands report 1,086 pre-existing issues across mostly untouched files. New
  and substantially revised files in this feature pass focused ESLint and
  Prettier checks. A one-line isolation fix in a legacy history-detail test was
  intentionally kept narrow.
- Building the read-only API Gateway image reported 20 existing production
  dependency vulnerabilities: 1 low, 9 moderate, and 10 high. They were not
  introduced or changed by this WebApp branch and need a separate Gateway
  remediation review.
- Automated accessibility checks should be followed by keyboard, zoom,
  contrast, screen-reader, and user testing before any compliance statement.

## Safe language for the presentation

Use:

> We built and tested an experimental product experience that makes artifact
> and workflow provenance visible. Deterministic fixtures support repeatable UX
> and accessibility evidence, while a separate local profile validates the
> WebApp against the real API Gateway, PostgreSQL, and RabbitMQ contracts.

Avoid:

- "Researchers are using the platform in production."
- "The screenshots prove a blockchain transaction."
- "The local Gateway test is an end-to-end Fabric test."
- "The product is WCAG certified."
- "This work proves the AWS or EKS deployment."

## Image source

The home and sign-in experiences use
`src/assets/images/research-lab-microscopy-pexels-8940359.jpg`, derived from
[A Person in White Lab Gown Looking Through Microscope](https://www.pexels.com/photo/a-person-in-white-lab-gown-looking-through-microscope-8940359/)
by Thirdman on Pexels. The Pexels license permits free use and modification;
attribution is included here for traceability. License:
<https://www.pexels.com/license/>.

No AI-generated photograph is used by the revised home or sign-in hero.
