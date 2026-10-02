import { readFile, writeFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import eslint from 'eslint';

const { ESLint } = eslint;
const baselinePath = resolve('.eslint-baseline.json');
const update = process.argv.slice(2).includes('--update-baseline');
const results = await new ESLint().lintFiles([
  'src/**/*.ts',
  'cypress/**/*.ts',
]);

if (results.length === 0) {
  throw new Error('No source files were linted');
}

const current = {};
for (const result of results) {
  const errors = result.messages.filter((message) => message.severity === 2);
  if (errors.length === 0) continue;

  const file = relative(process.cwd(), result.filePath).split(sep).join('/');
  current[file] = {};
  for (const error of errors) {
    const rule = error.ruleId ?? 'fatal';
    current[file][rule] = (current[file][rule] ?? 0) + 1;
  }
  current[file] = Object.fromEntries(
    Object.entries(current[file]).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );
}

if (update) {
  const errors = Object.fromEntries(
    Object.entries(current).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );
  await writeFile(
    baselinePath,
    `${JSON.stringify({ version: 1, errors }, null, 2)}\n`,
  );
  console.log(`Recorded ${Object.keys(errors).length} legacy lint files`);
  process.exit(0);
}

const baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
if (baseline.version !== 1 || typeof baseline.errors !== 'object') {
  throw new Error('Unsupported ESLint baseline format');
}

const regressions = [];
for (const [file, rules] of Object.entries(current)) {
  for (const [rule, count] of Object.entries(rules)) {
    const allowed = baseline.errors[file]?.[rule] ?? 0;
    if (count > allowed) {
      regressions.push(
        `${file} ${rule}: ${count} errors (baseline ${allowed})`,
      );
    }
  }
}

if (regressions.length > 0) {
  console.error(`Legacy ESLint baseline exceeded:\n${regressions.join('\n')}`);
  process.exit(1);
}

const total = Object.values(current).reduce(
  (sum, rules) => sum + Object.values(rules).reduce((a, b) => a + b, 0),
  0,
);
console.log(
  `ESLint baseline passed: ${total} existing errors in ${Object.keys(current).length} files`,
);
