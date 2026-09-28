# Contributor Identity for the OSC-IS Demo

Status: proposal only. No account or authentication change is implemented here.

## Decision

Replace the temporary guest-session entry with a short, self-service account flow on the one OSC-IS portal. Registration asks for organization, display name, unique username within that organization, and a secret. Email is optional and never treated as proof of identity. The same person may register once in each organization; those are distinct accounts.

Use a password/passphrase of at least eight characters for reusable accounts. A four-digit PIN is too easy to guess. A six-digit PIN is acceptable only for a time-limited conference account with strict attempt throttling, lockout, and no long-term recovery promise. The simplest safe first release is username plus passphrase, not a recovery system built around unverified email.

## Provenance and ownership

- Show `display name (username)` on public artifact, workflow, and revision history views, labeled **self-declared contributor identity**. This is attribution, not identity verification or proof that an email address belongs to the person.
- Bind every create/update to the authenticated account ID and selected organization on the server. Never trust an organization, username, or display name sent in a mutation body.
- Store the username and account ID with the application record; write stable contributor attribution and the revision author through the existing Gateway-to-Fabric path. The Gateway must allowlist public history fields and omit secret, email, cookie, and session data.
- The owner may revise mutable artifact metadata and their workflows after confirmation, with revision comments and optimistic concurrency. Title and description remain immutable if that is the agreed product rule. Other users in the same organization may link a confirmed public artifact to a workflow but may not edit it.
- A display-name change must not rewrite old ledger history. Each historical snapshot keeps the attribution captured at that revision; the account page may show the current display name separately.

## Minimum server design

1. Add a run-scoped account table keyed by `(organization_id, normalized_username)`, with display name, password hash, status, timestamps, and per-account quotas. Store secrets with Argon2id or the repository's established password-hash service. Never store a plaintext PIN/password.
2. Add registration, sign-in, sign-out, and current-account endpoints. Authenticate with an HttpOnly, Secure, SameSite cookie; rotate the session on login; require CSRF and exact origin on mutations. Apply IP and account-based rate limits to registration and sign-in.
3. Keep the existing public read endpoints. Adapt the current `/api/v1/demo` mutation boundary to resolve the account from the server session and organization, preserving run limits and idempotency. Do not expose the regular product admin endpoint to conference signups.
4. Disable new accounts and mutations when the run is `READ_ONLY` or closed. Define account and session expiry with the conference retention policy. With no verified email, self-service recovery is deliberately unavailable; explain that before registration.
5. Migrate only if locally verified against current records and chaincode. Existing synthetic guest aliases remain historical facts; do not claim they are linked to new accounts.

## Acceptance before deployment

- Register and sign in to each organization, sign out/in, refresh, and see only owned edit controls.
- Confirm same-organization workflow linking and deny cross-organization linking or edits.
- Verify name/username attribution on artifact, workflow, and multiple revision snapshots in the real local Fabric network.
- Test duplicate usernames, weak secrets, brute-force throttling, session expiry, CSRF/origin rejection, quotas, and account disablement at `READ_ONLY`.
- Review the public response allowlists for email, password hash, session, original filename, and raw ledger leakage; perform a fresh local browser walkthrough before any AWS run.

No AWS deployment, admin-created real account, or production credential is required for the April visual comparison. Its `april-preview` account is local mock data only.
