# USRSE 2026 UX validation stack

This WebApp-owned harness validates two different claims without using cloud or production credentials.

## Modes

- `simulator`: serves deterministic Neuroscience Gateway and Citizen Science artifacts and workflows. Use it for repeatable visual, state, and accessibility evidence.
- `gateway`: builds the real local `OSC-APIGateway`, PostgreSQL, and RabbitMQ, then creates disposable organizations, a PI, and one artifact through HTTP contracts. Use it to validate integration, not ledger completion.

The project name is always `osc-usrse26-ux`. It binds only localhost ports `18080` (WebApp), `13300` (Gateway), and `13310` (simulator). PostgreSQL and RabbitMQ are not exposed to the host. Teardown removes only this project and its disposable volume.

```powershell
.\test-support\ui-stack\Test-Usrse26Stack.ps1 -Mode simulator
.\test-support\ui-stack\Test-Usrse26Stack.ps1 -Mode gateway
```

Use `-KeepRunning` to inspect the stack at `http://127.0.0.1:18080/`, then remove it with:

```powershell
docker compose --project-name osc-usrse26-ux --file test-support/ui-stack/compose.yaml --profile simulator down --volumes
```

When this repository is checked out outside the normal OSC-IS sibling layout, pass `-OscIsRoot C:\path\to\OSC-IS`.

## Honest boundary

The current Infra simulator has no artifact-history endpoint. The real Gateway delegates history to `OSC-Artifact-Submission`'s get-history worker, which is intentionally outside this UI-focused harness. Deterministic Cypress fixtures validate the history presentation. Neither mode proves a Fabric commit, peer endorsement, or end-to-end ledger history.
