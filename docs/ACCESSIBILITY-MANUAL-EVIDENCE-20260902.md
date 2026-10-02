# OSC-WebApp accessibility evidence, 2026-09-02

## Result

The reviewed OSC-WebApp revision provides a credible accessibility baseline for
the representative product journeys tested here. Three localized defects were
found and corrected: inaccurate application-menu semantics, lost keyboard focus
after dismissing navigation disclosures, and missing level-one headings on
record-detail error states. The global keyboard focus treatment was also made
reliably visible on both light and dark surfaces.

The defensible statement for the US-RSE 2026 talk is:

> Automated and manual regression checks target WCAG 2.2 AA.

This review is not an accessibility certification, a legal compliance opinion,
or a comprehensive assistive-technology evaluation.

## Reviewed source

- Repository: `OSC-WebApp`
- Starting revision: `07e2a0faf0093fc7a25e8f628213a14e42038e4d`
- Starting branch: `feature/usrse26-product-quality`
- Review branch: `feature/usrse26-accessibility-evidence`
- Review date: 2026-09-02
- Manual browser: Chrome 152 through the Codex in-app browser on Windows
- Local preview: Angular development server with the deterministic OSC UI
  simulator from `OSC-IS-Infra`
- Dependency installation: repository secure-install wrapper with lifecycle
  scripts disabled by default, package blocklist scanning, registry signature
  verification, and reviewed rebuilds

No remote branch was changed, and nothing was pushed, merged, or deployed.

## Manual review

| Journey or property | Evidence and outcome |
| --- | --- |
| Home, desktop | One `main` and one `h1`; named primary navigation; logical headings and regions; deterministic demonstration data is identified; no page-level horizontal overflow at 1440 x 900. |
| Skip link | First Tab stop was `Skip to main content`; Enter moved focus to `#main-content`. |
| Primary navigation | Links and buttons were keyboard reachable. The contribution disclosure opened with Enter, both choices were reached sequentially with Tab, Escape returned focus to `Contribute`, and a second Escape on mobile returned focus to the navigation toggle. |
| Home, mobile | Navigation and content reflowed at 390 x 844 without page-level horizontal overflow. |
| Sign-in and expired session | The expired-session notice used a polite status. Username and password had programmatic labels. Blur exposed `aria-invalid=true`, `aria-describedby`, and matching inline errors. Credential-recovery instructions appeared as a polite status. |
| Artifact catalog | Search fields had associated labels; result count used a polite status; result, empty-search, error, and retry-recovery states remained understandable without color alone. |
| Artifact detail | Loaded metadata, blockchain evidence, organization, contributor, peer, transaction, and verification labels had a logical heading hierarchy. The mobile view at 390 x 844 had no page-level horizontal overflow. |
| Workflow catalog and detail | Loaded and error states exposed one `main`; loaded states exposed one descriptive `h1`; blockchain, repository, and related-artifact sections had named headings. |
| Service failure and recovery | Artifact and workflow failures used assertive alerts and visible text/icon cues. Retry restored deterministic results with a polite result-count status. Record-detail failures now retain an `h1`. |
| Provenance history | The authenticated deterministic history journey, empty state, outage state, desktop layout, and 390-pixel layout passed Cypress/axe. The existing 1440 x 900 history screenshot was manually inspected for visible hierarchy and reflow. Authentication was not recreated in the manual browser session. |
| 200% and 400% reflow | Because the in-app browser does not expose page-zoom control, equivalent CSS viewports of 640 and 320 pixels were used. Home, sign-in, both catalogs, and both record details showed no page-level horizontal overflow. This is reflow evidence, not proof of native browser zoom behavior. |
| Color and non-color cues | Key text pairs measured 5.56:1 to 11.77:1. Error, status, confirmed, pending, and verified states include text and/or icons in addition to color. |
| Keyboard focus | The replacement two-color indicator uses a white inner ring and dark navy outer ring. White-to-navy contrast is 11.77:1, so at least one ring remains visible against the reviewed light and dark surfaces. |
| Reduced motion | The stylesheet disables smooth scrolling and collapses animation and transition durations under `prefers-reduced-motion: reduce`. The review environment reported no active reduced-motion preference, so the enabled runtime state was not manually exercised. |

## Defects corrected

1. The contribution options were exposed with `role="menu"` and
   `role="menuitem"` without the arrow-key behavior required by the application
   menu pattern. They now use disclosure semantics with `aria-controls` and
   `aria-expanded`, preserving normal Tab navigation.
2. Escape previously removed the focused contribution option and closed the
   mobile navigation, leaving focus on `body`. Escape now closes the innermost
   disclosure first and returns focus to its trigger; a subsequent Escape closes
   mobile navigation and returns focus to the navigation toggle.
3. Artifact and workflow detail loading/error states had no level-one heading.
   Those state titles are now `h1` elements while successful records retain
   their existing record-title `h1`.
4. The former yellow-only focus outline measured 1.69:1 against white. The
   shared focus style now uses a two-color white/navy indicator that remains
   distinguishable on the reviewed light and dark backgrounds.

Focused unit and Cypress regression coverage was added for the disclosure,
focus-return, and record-error-heading behavior.

## Automated verification

| Check | Result |
| --- | --- |
| Supply-chain secure install | Passed: 1,324 lockfile packages scanned, 443 blocked package names checked, 1,324 registry signatures verified, 156 attestations verified, reviewed rebuilds completed, post-install scan passed. |
| Full Angular unit suite | 222 passed, 0 failed. Coverage: 85.87% statements, 67.07% branches, 86.24% functions, 87.53% lines. |
| Focused AppComponent suite | 18 passed, 0 failed. |
| Cypress/axe WCAG regression suite | 9 passed, 0 failed, including public, error, mobile, authenticated fixture, and provenance-history states. |
| Changed TypeScript lint | Passed. |
| Changed-file Prettier check | Passed. The repository-wide formatting check still reports pre-existing formatting differences outside this change. |
| Production Angular build | Passed. Existing warnings remain for the `crypto-js` CommonJS dependency and four third-party selector parse warnings. |

The Cypress/axe suite checks WCAG A/AA tags through WCAG 2.2 AA, but automated
rules cannot establish conformance by themselves.

## Assistive technology limitation

NVDA was not found in its standard installation paths, on `PATH`, in Windows
installed-application registry entries, or in Start Menu shortcuts. It was not
installed as part of this task. No NVDA or other screen-reader smoke test was
performed, so no claim about screen-reader interoperability should be made from
this evidence.

## Remaining gaps

- Run a short NVDA review from a clean test machine, prioritizing navigation,
  sign-in errors, record details, provenance history, and retry states.
- Repeat native 200% and 400% browser-zoom checks outside the in-app browser.
- Add a macOS VoiceOver/Safari pass and a Firefox keyboard pass before making a
  broader browser or assistive-technology statement.
- Conduct task-based usability sessions with researchers before claiming that
  the interface has been validated with its intended users.
- This review used deterministic local data and simulated failures; it does not
  establish production readiness or live researcher adoption.

## Handoff

The work is isolated on `feature/usrse26-accessibility-evidence` and is intended
for local review before integration. Review the three behavior changes, inspect
the screenshots and raw Cypress/unit logs under
`docs/evidence/accessibility-manual-20260902/`, then run the remaining NVDA and
native-zoom checks when those environments are available. Preserve the exact
safe claim above in presentation material.
