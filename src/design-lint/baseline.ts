import { execFileSync } from 'node:child_process';
import { basename, dirname } from 'node:path';
import { RULES, type Rule } from './rules.js';

export type Counts = Record<string, Partial<Record<Rule, number>>>;

export interface Baseline {
  version: string;
  files: Counts;
}

/** Keys sorted at both levels and zero counts left out, so a rewrite with no change is no diff. */
export function serializeBaseline(baseline: Baseline): string {
  const files: Counts = {};
  for (const path of Object.keys(baseline.files).sort()) {
    const counts: Partial<Record<Rule, number>> = {};
    for (const rule of Object.keys(baseline.files[path]!).sort() as Rule[]) {
      const n = baseline.files[path]![rule];
      if (n) counts[rule] = n;
    }
    if (Object.keys(counts).length) files[path] = counts;
  }
  return `${JSON.stringify({ version: baseline.version, files }, null, 2)}\n`;
}

export function parseBaseline(text: string): Baseline | null {
  try {
    const raw = JSON.parse(text) as Partial<Baseline>;
    if (typeof raw.version !== 'string' || typeof raw.files !== 'object' || raw.files === null) return null;
    const counts = Object.values(raw.files).flatMap((file) => (typeof file === 'object' && file ? Object.values(file) : [NaN]));
    if (!counts.every((n) => Number.isInteger(n) && n > 0)) return null;
    return { version: raw.version, files: raw.files };
  } catch {
    return null;
  }
}

export function totals(files: Counts): Record<Rule, number> {
  const sums = Object.fromEntries(RULES.map((rule) => [rule, 0])) as Record<Rule, number>;
  for (const counts of Object.values(files)) {
    for (const rule of RULES) sums[rule] += counts[rule] ?? 0;
  }
  return sums;
}

/**
 * The baseline as committed at `HEAD`, or `null` when there is none: no git, no
 * work tree, no commit, or no readable file there.
 */
export function baselineAtHead(path: string): Baseline | null {
  try {
    const text = execFileSync('git', ['-C', dirname(path), 'show', `HEAD:./${basename(path)}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return parseBaseline(text);
  } catch {
    return null;
  }
}
