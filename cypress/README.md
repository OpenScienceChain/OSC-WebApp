# Local end-to-end sessions

The preferred automated path uses dedicated test-user credentials supplied as
Cypress environment variables. For exploratory tests that should reuse a human
session, Cypress can accept the JWT from a current local OSC-IS login without
storing a password or committing a token.

1. Sign in to the local WebApp normally.
2. In that local page's developer console, read the token from
   `JSON.parse(localStorage.getItem('tokenData')).token`.
3. Set it only for the current PowerShell process:

   ```powershell
   $env:CYPRESS_AUTH_TOKEN = Read-Host 'Paste the temporary OSC-IS token'
   npm run cypress:open:session
   ```

4. Clear the process variable when finished:

   ```powershell
   Remove-Item Env:CYPRESS_AUTH_TOKEN
   ```

The support hook validates that the value is a non-expired JWT and writes its
token plus expiration metadata to the application origin before Angular starts.
The Gateway's two-hour maximum still applies. Never put a real token in
`cypress.config.ts`, `cypress.env.json`, shell scripts, screenshots, or CI logs.
