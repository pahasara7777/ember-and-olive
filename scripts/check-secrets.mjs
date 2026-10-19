#!/usr/bin/env node
// Usage:
//   node scripts/check-secrets.mjs            scan every tracked file
//   node scripts/check-secrets.mjs --staged   scan what is about to be committed (pre-commit hook)
//   node scripts/check-secrets.mjs --history  scan every line ever added in any commit
// Exits 1 if anything looks like a secret. Findings show a masked preview, never the secret.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { SKIP_FILES, isForbiddenFile, scanLine } from './secret-patterns.mjs';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 });
const mode = process.argv[2] ?? '--tree';
const findings = [];
const report = (where, hit) => findings.push(`${where}: ${hit.rule} [${hit.preview}]`);

if (mode === '--history') {
  let commit = '';
  let file = '';
  for (const line of git('log', '--all', '-p', '-U0', '--no-color', '--format=@@commit %H').split('\n')) {
    if (line.startsWith('@@commit ')) commit = line.slice(9, 16);
    else if (line.startsWith('+++ b/')) file = line.slice(6);
    else if (line.startsWith('+') && !line.startsWith('+++') && !SKIP_FILES.test(file)) {
      for (const hit of scanLine(line.slice(1), file)) report(`${commit} ${file}`, hit);
    }
  }
  const everFiles = new Set(git('log', '--all', '--name-only', '--format=').split('\n').filter(Boolean));
  for (const f of everFiles) if (isForbiddenFile(f)) findings.push(`history: forbidden file was committed at some point: ${f}`);
} else {
  const staged = mode === '--staged';
  const files = (staged ? git('diff', '--cached', '--name-only', '--diff-filter=ACM') : git('ls-files')).split('\n').filter(Boolean);
  for (const f of files) {
    if (isForbiddenFile(f)) findings.push(`${f}: environment files must not be committed`);
    if (SKIP_FILES.test(f)) continue;
    let text;
    try {
      text = staged ? git('show', `:${f}`) : readFileSync(f, 'utf8');
    } catch {
      continue;
    }
    text.split('\n').forEach((line, i) => scanLine(line, f).forEach((hit) => report(`${f}:${i + 1}`, hit)));
  }
}

if (findings.length) {
  console.error(`Possible secrets found (${mode}):\n${findings.map((f) => `  - ${f}`).join('\n')}`);
  process.exit(1);
}
console.log(`No secrets found (${mode}).`);
