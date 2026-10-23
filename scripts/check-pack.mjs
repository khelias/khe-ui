// Fails unless the package would ship exactly these files: a stale or missing
// build output must not reach the registry.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const expected = [
  'LICENSE',
  'README.md',
  'dist/core.d.ts',
  'dist/core.js',
  'dist/design-lint.d.ts',
  'dist/design-lint.js',
  'dist/design-lint/baseline.d.ts',
  'dist/design-lint/baseline.js',
  'dist/design-lint/rules.d.ts',
  'dist/design-lint/rules.js',
  'dist/design-lint/run.d.ts',
  'dist/design-lint/run.js',
  'dist/design-lint/scan.d.ts',
  'dist/design-lint/scan.js',
  'dist/design-lint/tailwind-v3-hex.d.ts',
  'dist/design-lint/tailwind-v3-hex.js',
  'dist/html.d.ts',
  'dist/html.js',
  'dist/react.d.ts',
  'dist/react.js',
  'dist/rooms.d.ts',
  'dist/rooms.js',
  'dist/site-footer.css',
  'dist/site-footer.d.ts',
  'dist/site-footer.js',
  'dist/site-header.css',
  'dist/site-header.d.ts',
  'dist/site-header.js',
  'dist/theme.d.ts',
  'dist/theme.js',
  'package.json',
];

const [pack] = JSON.parse(
  execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { encoding: 'utf8' }),
);
const actual = pack.files.map((file) => file.path).sort();
const missing = expected.filter((path) => !actual.includes(path));
const extra = actual.filter((path) => !expected.includes(path));

if (missing.length || extra.length) {
  if (missing.length) console.error(`check-pack: missing from the package: ${missing.join(', ')}`);
  if (extra.length) console.error(`check-pack: not expected in the package: ${extra.join(', ')}`);
  process.exit(1);
}

// khe-sites serves dist/theme.js and dist/rooms.js as they are, with no bundler to
// resolve an import. Comments survive the build, so a bare /import/ would trip on prose.
for (const name of ['theme.js', 'rooms.js']) {
  const source = readFileSync(new URL(`../dist/${name}`, import.meta.url), 'utf8');
  if (/^\s*import\b/m.test(source) || /\bimport\s*\(/.test(source) || /\bfrom\s*['"]/.test(source)) {
    console.error(`check-pack: dist/${name} imports something; it must stand alone`);
    process.exit(1);
  }
}

// npm runs a bin through its shebang; tsc keeps the line only while it is the first.
if (!readFileSync(new URL('../dist/design-lint.js', import.meta.url), 'utf8').startsWith('#!/usr/bin/env node\n')) {
  console.error('check-pack: dist/design-lint.js does not start with the node shebang');
  process.exit(1);
}
