# April 2026 Portal Comparison

- Source: Fernando Garzon's WebApp commit `a3c9f79` (April 28, 2026, "workflow feature complete"). The preview builds that commit without redesigning it.
- Local URL: `http://localhost:18090/`.
- Local mock sign-in: username `april-preview`, password `Preview-2026!`.
- Useful routes: `/list-artifacts`, `/contribute`, `/create-workflow`, `/list-workflows`, and `/artifacts/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/history`.
- The mock contains two synthetic artifacts, one synthetic workflow, and three synthetic artifact snapshots. Its transaction IDs begin with `MOCK-`. Creating or editing a record here changes only in-memory mock data; a container restart resets it. This preview does **not** reach Fabric or AWS.
- The current implementation at `http://localhost:18088/` is separate and does reach the local Gateway and Fabric test network. Its guest sessions expire after 30 minutes.

The reference preview is intentionally local. Never deploy its mock authentication or synthetic history as a real service.
