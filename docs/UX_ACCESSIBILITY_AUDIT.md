# OSC WebApp UX and Accessibility Audit

**Recorded:** July 31, 2026  
**Scope:** Public landing page, global navigation, sign-in, catalog entry
points, responsive behavior, and representative application states.

## Baseline Evidence

- Chrome screenshots captured at 1440x900, 1024x768, 390x844, and 320x700.
- Lighthouse accessibility score: 95/100.
- Automated failure: insufficient foreground/background color contrast.
- Existing Angular test baseline: 230 passing tests.
- Existing public landing Cypress baseline: 3 passing tests.

Automated results are an engineering signal, not a claim of legal
conformance. Keyboard, zoom, screen-reader, and cognitive usability checks
remain necessary.

## Priority Findings

### P0 - Accessibility and interaction

1. The contribution menu opens only on pointer hover. Its trigger is an anchor
   without a destination, keyboard state, or `aria-expanded` contract.
2. There is no skip link, and focus treatment is inconsistent. The sign-in
   stylesheet explicitly removes the input outline without an equivalent
   visible replacement.
3. Sign-in inputs rely on placeholders instead of persistent labels. Errors
   are not associated with their fields or announced as live status.
4. Search fields in the artifact catalog lack labels. Pagination arrows and
   the active page do not expose meaningful accessible names or current state.
5. Landing-page text and the secondary hero action fail automated contrast
   checks over portions of the image.
6. Catalog subscriptions do not expose an error state. A failed request can
   leave a user with indefinite loading text and no recovery action.

### P1 - Product orientation and visual quality

1. The header offers only Contribute and Sign In. It does not orient users to
   artifacts, workflows, provenance, or their current location.
2. The 235x50 navigation logo is displayed beyond a useful size on high-density
   screens. A sharper approved 485x104 lockup exists in the official
   `OpenScienceChain/REHS2024` repository.
3. The browser tab still uses the Angular favicon and the generic
   `OSCWebApp` title.
4. The hero is visually busy and includes synthetic glowing workflow symbols.
   Text competes with the image and the actual OSC product is not visible.
5. The landing page reads as a separate campaign page. Its typography,
   spacing, controls, and status language do not match the catalog pages.
6. Mobile navigation is compressed into very small text instead of using a
   deliberate menu pattern with stable touch targets.

### P2 - Maintainability and resilience

1. Global typography and icon resources are loaded more than once, including
   external CDNs that weaken offline behavior.
2. Shared colors, focus styles, content widths, and control sizing are repeated
   rather than expressed as a small application design system.
3. Loading, empty, failure, unauthorized, and offline states have no shared
   presentation or test contract.

## Redesign Direction

- Treat the landing page as the front door to the working application, with
  direct routes to artifacts, workflows, contribution, and provenance.
- Use a calm scientific editorial style: white and deep navy foundations,
  teal for actions and state, and a restrained green verification accent.
- Replace the current hero with a high-resolution research scene that leaves
  clean text space and does not contain fake interface graphics.
- Add a product-oriented proof band that shows the actual artifact record and
  provenance flow rather than relying only on explanatory copy.
- Replace hover-only navigation with semantic buttons, keyboard behavior,
  visible focus, a responsive menu, and current-route indicators.
- Establish WCAG 2.2 AA as the engineering target, with axe automation plus a
  documented manual test matrix.

## Acceptance Signals

- Zero serious or critical axe violations on the maintained public routes and
  simulated loading, empty, error, and expired-session states.
- Full keyboard access to navigation, menus, forms, and recovery actions.
- No horizontal overflow or overlap at the four target viewports and 200% zoom.
- Stable, explicit loading, empty, failure, and offline experiences.
- A credential-free local Docker environment exercises WebApp, Gateway,
  PostgreSQL, RabbitMQ, and deterministic downstream simulations.
