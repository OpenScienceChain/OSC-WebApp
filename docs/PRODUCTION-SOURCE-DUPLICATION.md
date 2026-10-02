# Maintained source duplication

CI scans `src` and the production SSR entrypoint `server.ts` with pinned
`jscpd@5.2.1`. Tests, generated files, assets, dependencies, and build output
are outside the scan. The JSON report is saved at
`test-results/jscpd/jscpd-report.json` and included in CI's `webapp-evidence`
artifact.

The target is at most 3% duplicated lines. The initial scan has 133 clone
blocks, 4,691 duplicated lines, and 18.41% duplication across 120 source
files. CI uses `.jscpd-baseline.json` to allow only these existing clone
fingerprints and fails if any new clone appears. The current debt is concentrated
in create/update and guest forms, their component styles, guest detail styles,
and parallel demo services/models. Reduction should follow feature work in
those areas rather than changing them solely for this gate.

Run `npm run duplication:check` locally. When a reviewed refactor intentionally
changes clone fingerprints, inspect the JSON report and run
`npm run duplication:baseline`, then review the baseline diff. Do not refresh
the baseline merely to make a new clone pass.
