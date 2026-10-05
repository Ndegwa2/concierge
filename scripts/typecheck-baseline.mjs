#!/usr/bin/env node
/**
 * Ratcheting type-check gate.
 *
 * The project was built for months with `tsc` never installed, so `strict` mode
 * reports a large backlog. Failing CI on the whole backlog would mean the gate
 * gets disabled on day one; instead we freeze the current count in
 * `typecheck-baseline.json` and fail only when it goes UP.
 *
 * Workflow:
 *   npm run typecheck            # see every error
 *   npm run typecheck:baseline   # CI gate: no NEW errors allowed
 *   node scripts/typecheck-baseline.mjs --update   # after fixing some, lower the bar
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const baselineFile = join(here, 'typecheck-baseline.json');
const shouldUpdate = process.argv.includes('--update');

function runTsc() {
  try {
    execFileSync('npx', ['tsc', '--noEmit', '-p', 'tsconfig.json'], {
      cwd: join(here, '..'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return '';
  } catch (error) {
    // tsc exits non-zero when it reports diagnostics; that is the normal path.
    return `${error.stdout ?? ''}${error.stderr ?? ''}`;
  }
}

const output = runTsc();
const errorLines = output.split('\n').filter((line) => / error TS\d+: /.test(line));
const count = errorLines.length;

const byFile = new Map();
for (const line of errorLines) {
  const file = line.split('(')[0];
  byFile.set(file, (byFile.get(file) ?? 0) + 1);
}

if (shouldUpdate || !existsSync(baselineFile)) {
  writeFileSync(
    baselineFile,
    `${JSON.stringify(
      {
        note: 'Pre-existing `tsc --strict` errors. Only ever lower this number.',
        updated: new Date().toISOString().slice(0, 10),
        maxErrors: count,
      },
      null,
      2
    )}\n`
  );
  console.log(`Baseline written: ${count} error(s).`);
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(baselineFile, 'utf8'));
const max = baseline.maxErrors ?? 0;

console.log(`TypeScript errors: ${count} (baseline ${max})`);

if (count > max) {
  console.error(`\n✖ ${count - max} NEW type error(s) introduced.\n`);
  const worst = [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  for (const [file, n] of worst) console.error(`  ${n.toString().padStart(4)}  ${file}`);
  console.error('\nFix them, or run `node scripts/typecheck-baseline.mjs --update` if intentional.');
  process.exit(1);
}

if (count < max) {
  console.log(`✔ ${max - count} error(s) fixed. Run with --update to lock in the improvement.`);
}
process.exit(0);
