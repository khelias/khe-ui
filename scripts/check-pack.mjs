// Fails unless the package would ship exactly these files: a stale or missing
// build output must not reach the registry.
import { execFileSync } from 'node:child_process';

const expected = [
  'LICENSE',
  'README.md',
  'dist/core.d.ts',
  'dist/core.js',
  'dist/react.d.ts',
  'dist/react.js',
  'dist/site-header.css',
  'dist/site-header.d.ts',
  'dist/site-header.js',
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
