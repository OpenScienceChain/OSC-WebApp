# Unified OSC-IS Portal Handoff

Date: 2026-09-26. Worktree: `OSC-WebApp-old-portal-guest-20260926`. Branch: `feature/usrse26-old-portal-guest-20260926`. Starting WebApp commit: `56429d15cf13694b81851510f7c01f2fbcff6ceb`. The separate, newer UI worktree was preserved; none of its changes were merged into this baseline.

## What Changed

- Preserved the approved landing page, site navigation, record-oriented forms and detail views, and colorful version history. There is one visible portal at the familiar URLs. The old `/demo` browser URLs redirect to those URLs; `/api/v1/demo` remains the separate, bounded Gateway API namespace.
- Route matching uses the live authenticated state, not a `DEMO_MODE` build/runtime switch. An unsigned visitor browses the public guest projection and can start a 30-minute, organization-scoped session directly on the contribution form. A signed-in user follows the existing product catalog, detail, and guarded contribution routes. Product write guards and JWT-backed API endpoints were not relaxed.
- Guest contribution computes SHA-256 locally for one permitted file. The request sends only the fingerprint, byte count, extension, and bounded Gateway-supported metadata, never file bytes or the original filename. Guest artifact revisions require ownership and ledger confirmation; title and description remain immutable under the frozen contract. Workflow creation links 1-3 confirmed artifacts owned by the active guest session.
- Public detail and history display only the Gateway's safe public projection. A transaction is described as confirmed only for `SUCCESS` plus a transaction ID. The local `MOCK_PREVIEW` banner labels synthetic records and explicitly says no Fabric connection.
- The inherited form styles were made usable at phone width without changing their desktop layout. The linked-artifact chooser has a labeled accessible group.

## Local Verification

- Production Angular build passed. It retains the baseline `crypto-js` CommonJS warning and four skipped third-party CSS selector warnings.
- Focused ESLint passed for changed TypeScript and the Cypress spec. Focused Karma: 22/22 passed.
- Cypress against local mock: 5/5 passed. Coverage includes old home to catalog/detail/history, guest session and fingerprint submission, workflow linking, owned metadata revision, signed-in product catalog and guarded form selection, legacy bookmark redirect, axe checks, and phone-width overflow checks. Synthetic data and a test-only JWT are used; this does **not** prove real backend authorization, AWS deployment, or Fabric writes.

## Preview And Remaining Gates

- Leave `http://127.0.0.1:4303/` open for review. It proxies `/api/v1/demo` to the in-memory mock at `127.0.0.1:3001`. The worktree's ignored `src/assets/runtime-config.json` enables only `/api/v1` and the local mock banner; its tracked example is `scripts/demo/runtime-config.preview.json`.
- The previous 4302 preview and its 3000 mock were stopped by exact listener PID to avoid two visible site versions. Their files/worktree were not deleted. No unrelated Docker container was touched.
- Before release, run a separate review of API/privacy and auth boundaries, manual keyboard/screen-reader checks, integration against the frozen local Gateway contract, and a synthetic real-Fabric canary if approved. Do not present the in-memory mock's instant confirmation as deployed ledger evidence.
- Nothing was pushed or deployed. No AWS resources were created or changed.

## One-Portal Audit And Correction

The first frozen commit (`b0c0421`) still rendered a simplified guest-only catalog. The follow-up removed that visible divergence: both unsigned and signed-in users now render the original artifact catalog and workflow list components at `/list-artifacts` and `/list-workflows`. Those components select the public guest projection or product API at runtime; the artifact catalog keeps its original search and pagination in both states. The unused guest catalog component and its styles were removed. Guest record forms/details/history retain the approved old-portal layout but necessarily show only fields allowed by the frozen guest contract.

`angular.json` still builds one WebApp into `dist/osc-web-app` from `src/main.ts`; there is no guest build target, guest static origin, or separate release artifact. The mock API script and proxy configuration are local preview tools, not part of that browser bundle. `/demo` browser bookmarks are redirects into the familiar pages, not a second site. `/api/v1/demo` remains the Gateway's internal guest security boundary.

The correction passed a production build, focused ESLint, 31/31 Karma tests (including the original artifact catalog's search/pagination suite and guest source selection), and 5/5 Cypress scenarios against the 4303/3001 mock. Cypress asserted the same artifact search control for guest and signed-in catalog visits. This remains local synthetic UI evidence, not a real Gateway authorization or Fabric test. The 4303 preview has since been superseded by the Fabric-backed 18088 portal described below.

## September 28 Workflow Form Restoration

The rich workflow form was added by Fernando in WebApp commit `178b207` (April 2, 2026), not in March. Commit `0a20108` (April 27) completed its Gateway integration. The 2025 release `6158bda` remains the artifact-form and history visual baseline, but predates this workflow form. The separate old visual-only build is at `http://localhost:18090/`; it cannot submit to the current API. The current single local portal is `http://localhost:18088/` and uses the real Fabric test network.

The unsigned workflow route now restores authored title, description, keywords, submission comment, searchable confirmed-artifact selection, GitHub repository URL/description/commit, and optional root content entries. GitHub lookups fill public repository metadata when available; failed lookups permit manual entry. The Gateway demo workflow DTO validates and bounds these fields, while existing session, origin, CSRF, organization, ownership, quota, and idempotency checks remain intact. Public detail exposes an allowlisted repository summary but not repository content filenames. Product-authenticated workflow routes and contracts were not changed.

Local verification: Gateway contract suite 18/18; WebApp production build and focused ESLint; WebApp unit suite 227/227; Cypress old-portal guest suite 5/5 at desktop and phone widths. A real local Fabric submission confirmed artifact `13572cb1-cdf0-4d3b-85fb-a65722fbb4f3` (transaction `776a912bd54b269574ab08748db3871f6dfdb0b38cfb331baf453fe7a2f429d2`) and authored workflow `e4714892-2c95-41ae-8186-0f9519247cc5` (transaction `1d39a1bf3a1daf9efb209c8c48f041285c43eee4138f1c1590c111dd5de53054`). Public read returned its title, keywords, and repository after confirmation. These are synthetic local test-network records, not AWS or conference measurements. No AWS action was taken.

Still open for Fernando's UI review: replacing temporary guest sessions with a recoverable conference account/credential design; deciding whether workflow edits should be offered to those accounts; and finishing the landing page. Name or email supplied without verification cannot prove a contributor's real identity, and a short PIN needs rate limits and a deliberate recovery/expiry policy. The current live local app still says "Contribute as a guest". Do not claim account registration is implemented. No AWS release is authorized by this local work.
