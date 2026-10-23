import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { baselineAtHead, parseBaseline, serializeBaseline, totals, type Baseline, type Counts } from './baseline.js';
import { RULES, type Rule } from './rules.js';
import { CONFIG_EXAMPLE, listFiles, parseConfig, scanFile, type Hit } from './scan.js';

const USAGE = 'usage: khe-design-lint [--config <path>] [--root <dir>] [--write-baseline]';

export const VERSION: string = (
  JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as { version: string }
).version;

const OPTIONS = {
  config: { type: 'string' },
  root: { type: 'string' },
  'write-baseline': { type: 'boolean', default: false },
} as const;

const totalsLine = (files: Counts) =>
  `totals: ${Object.entries(totals(files))
    .map(([rule, n]) => `${rule} ${n}`)
    .join(', ')}`;

/** Runs the check, or with `--write-baseline` records the counts; returns the exit code. */
export function main(argv: string[], log: (line: string) => void, cwd = process.cwd()): number {
  let args;
  try {
    args = parseArgs({ args: argv, options: OPTIONS, strict: true }).values;
  } catch {
    log(USAGE);
    return 2;
  }
  const root = resolve(cwd, args.root ?? '.');
  const configPath = args.config === undefined ? resolve(root, 'khe-design-lint.json') : resolve(cwd, args.config);
  if (!existsSync(configPath)) {
    log(`khe-design-lint: no ${configPath}. Add one, for example:\n${CONFIG_EXAMPLE}`);
    return 1;
  }
  const config = parseConfig(readFileSync(configPath, 'utf8'));
  if (typeof config === 'string') {
    log(`khe-design-lint: ${configPath}: ${config}`);
    return 1;
  }
  const baselinePath = resolve(dirname(configPath), config.baseline);

  const counts: Counts = {};
  const hits = new Map<string, Hit[]>();
  const errors: string[] = [];
  for (const path of listFiles(root, config)) {
    const scan = scanFile(root, path, config);
    errors.push(...scan.errors);
    if (!scan.hits.length) continue;
    hits.set(path, scan.hits);
    const fileCounts: Partial<Record<Rule, number>> = {};
    for (const hit of scan.hits) fileCounts[hit.rule] = (fileCounts[hit.rule] ?? 0) + 1;
    counts[path] = fileCounts;
  }

  if (args['write-baseline']) {
    try {
      writeFileSync(baselinePath, serializeBaseline({ version: VERSION, files: counts }));
    } catch (error) {
      log(`khe-design-lint: cannot write ${baselinePath}: ${(error as Error).message}`);
      return 1;
    }
    log(`khe-design-lint: wrote ${relative(cwd, baselinePath) || baselinePath}`);
    errors.forEach((error) => log(error));
    log(totalsLine(counts));
    return errors.length ? 1 : 0;
  }

  let baseline: Baseline = { version: VERSION, files: {} };
  const hasBaseline = existsSync(baselinePath);
  if (hasBaseline) {
    const parsed = parseBaseline(readFileSync(baselinePath, 'utf8'));
    if (!parsed) {
      log(`khe-design-lint: ${baselinePath} is not a baseline; rewrite it with --write-baseline`);
      return 1;
    }
    baseline = parsed;
  } else {
    log(`khe-design-lint: no baseline at ${baselinePath}; write one with --write-baseline`);
  }

  const rose: string[] = [];
  const stale: string[] = [];
  for (const path of [...new Set([...Object.keys(counts), ...Object.keys(baseline.files)])].sort()) {
    for (const rule of RULES) {
      const now = counts[path]?.[rule] ?? 0;
      const was = baseline.files[path]?.[rule] ?? 0;
      if (now > was) {
        for (const hit of hits.get(path) ?? []) {
          if (hit.rule === rule) rose.push(`${path}:${hit.line} ${rule}  ${hit.text.slice(0, 160)}`);
        }
      } else if (now < was) {
        stale.push(`stale: ${path} ${rule} ${was} in the baseline, ${now} now`);
      }
    }
  }

  // Raising the baseline is caught against the committed one; a new lint version may raise it.
  // The version is this lint's, not the file's, so editing the file's version opens nothing.
  const raised: string[] = [];
  const fromRoot = relative(root, baselinePath);
  const insideRoot = !fromRoot.startsWith('..') && !isAbsolute(fromRoot);
  const head = insideRoot && hasBaseline ? baselineAtHead(baselinePath) : null;
  if (head && head.version === VERSION) {
    const was = totals(head.files);
    const now = totals(baseline.files);
    for (const rule of RULES) {
      if (now[rule] > was[rule]) raised.push(`raised: ${rule} ${now[rule]} in the baseline, ${was[rule]} at HEAD`);
    }
  }

  const problems = [...rose, ...stale, ...raised, ...errors];
  problems.forEach((line) => log(line));
  log(totalsLine(counts));
  if (rose.length) log('fix the new lines, or allow one with a comment: design-lint-allow <rule>: <reason>');
  if (stale.length) log('fewer hits than the baseline: record them with khe-design-lint --write-baseline');
  return problems.length ? 1 : 0;
}
