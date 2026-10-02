# Legacy ESLint baseline

CI lints every changed TypeScript source file without exceptions. The separate
`npm run lint:baseline` check runs ESLint across all `src` and `cypress`
TypeScript files and rejects any increase in error count for a file and rule,
including a new rule or file. The baseline records 61 existing errors across 18
untouched files after the October 2026 formatting reconciliation. It does not
disable any ESLint rule.

Most debt is formatting (`prettier/prettier`, 49 errors). The remainder is eight
`no-unused-expressions`, two `no-empty-object-type`, and two `no-unused-vars`
errors. Fix these in scoped follow-up changes. Reductions pass automatically;
after reviewing them, run
`node scripts/quality/check-eslint-baseline.mjs --update-baseline` to remove
stale allowances. Never expand the baseline to accommodate a new error.
