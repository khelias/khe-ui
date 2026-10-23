import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { serializeBaseline } from '../src/design-lint/baseline.js';
import type { Rule } from '../src/design-lint/rules.js';
import { VERSION, main } from '../src/design-lint/run.js';
import { scanText } from '../src/design-lint/scan.js';

const rules = (text: string, path = 'a.tsx', content = false) => scanText(text, path, content).hits.map((hit) => hit.rule);

describe('the rules', () => {
  it.each<[Rule, string, string]>([
    ['gradient', 'a.css', 'background: linear-gradient(90deg, red, blue);'],
    ['gradient', 'a.css', 'background: repeating-radial-gradient(circle, red, blue);'],
    ['gradient', 'a.ts', "const bg = 'conic-gradient(red, blue)';"],
    ['gradient', 'a.tsx', '<div className="bg-gradient-to-br from-white" />'],
    ['gradient', 'a.tsx', '<div className="bg-linear-to-r" />'],
    ['gradient', 'a.tsx', '<div className="bg-radial" />'],
    ['gradient', 'a.tsx', '<div className="bg-conic-180" />'],
    ['blur', 'a.css', 'backdrop-filter: blur(8px);'],
    ['blur', 'a.ts', "const s = { backdropFilter: 'blur(4px)' };"],
    ['blur', 'a.css', 'filter: blur(2px);'],
    ['blur', 'a.css', '-webkit-backdrop-filter: blur(8px);'],
    ['blur', 'a.css', 'backdrop-filter: saturate(1.2);'],
    ['blur', 'a.ts', "const s = { filter: 'blur(4px)' };"],
    ['blur', 'a.tsx', '<div className="backdrop-blur" />'],
    ['blur', 'a.tsx', '<div className="backdrop-blur-md" />'],
    ['blur', 'a.tsx', '<div className="blur-xs" />'],
    ['shadow', 'a.css', 'box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);'],
    ['shadow', 'a.css', 'text-shadow: 0 0 4px #000;'],
    ['shadow', 'a.css', 'filter: drop-shadow(0 1px 1px black);'],
    ['shadow', 'a.ts', "const s = { boxShadow: '0 2px 8px black' };"],
    ['shadow', 'a.tsx', '<div className="shadow" />'],
    ['shadow', 'a.tsx', '<div className="hover:shadow-lg" />'],
    ['shadow', 'a.tsx', '<div className="shadow-2xs" />'],
    ['shadow', 'a.tsx', '<div className="shadow-[0_1px_2px_black]" />'],
    ['shadow', 'a.tsx', '<div className="inset-shadow-sm" />'],
    ['shadow', 'a.tsx', '<div className="text-shadow-md" />'],
    ['shadow', 'a.tsx', '<div className="drop-shadow-xl" />'],
    ['radius', 'a.tsx', '<div className="rounded-2xl" />'],
    ['radius', 'a.tsx', '<div className="rounded-t-3xl" />'],
    ['radius', 'a.tsx', '<div className="rounded-4xl" />'],
    ['radius', 'a.tsx', '<div className="rounded-[20px]" />'],
    ['radius', 'a.css', 'border-radius: 16px;'],
    ['radius', 'a.css', 'border-top-left-radius: 1.5rem;'],
    ['radius', 'a.ts', 'const s = { borderRadius: 24 };'],
    ['radius', 'a.ts', 'const s = { borderRadius: 24, padding: 8 };'],
    ['palette', 'a.tsx', '<div className="bg-violet-600" />'],
    ['palette', 'a.tsx', '<div className="dark:text-indigo-300/80" />'],
    ['palette', 'a.tsx', '<div className="from-purple-500" />'],
    ['palette', 'a.css', 'color: #7c3aed;'],
    ['palette', 'a.css', 'color: #7C3AED80;'],
    ['caps', 'a.tsx', '<span className="uppercase" />'],
    ['caps', 'a.css', 'text-transform: uppercase;'],
    ['caps', 'a.ts', "const s = { textTransform: 'uppercase' };"],
    ['tracking', 'a.tsx', '<span className="tracking-widest" />'],
    ['tracking', 'a.tsx', '<span className="tracking-[0.2em]" />'],
    ['tracking', 'a.css', 'letter-spacing: 0.12em;'],
    ['tracking', 'a.ts', 'const s = { letterSpacing: 2 };'],
    ['emoji', 'a.ts', "const title = 'Achievements \u{1F3C5}';"],
    ['emoji', 'a.ts', "const star = '⭐';"],
    ['emoji', 'a.ts', "const lives = '❤';"],
    ['dash', 'a.ts', "const note = 'one — two';"],
    ['dash', 'a.tsx', '<p>one — two</p>'],
  ])('counts %s in %s: %s', (rule, path, line) => {
    expect(rules(line, path)).toEqual([rule]);
  });

  it.each([
    ['a.css', 'box-shadow: none;'],
    ['a.css', 'box-shadow: 0 0 0 2px var(--focus);'],
    ['a.css', 'box-shadow: 0 0 0 1px #fff, 0 0 0 3px var(--ring);'],
    ['a.ts', "const s = { boxShadow: 'none' };"],
    ['a.tsx', '<div className="shadow-none" />'],
    ['a.tsx', '<button className="ring-2 ring-offset-2 focus-visible:ring" />'],
    ['a.tsx', '<div className="rounded-xl" />'],
    ['a.tsx', '<div className="rounded-full rounded-lg" />'],
    ['a.css', 'border-radius: 999px;'],
    ['a.css', 'border-radius: 9999px;'],
    ['a.css', 'border-radius: 50%;'],
    ['a.css', 'border-radius: 12px 12px 0 0;'],
    ['a.css', 'backdrop-filter: none;'],
    ['a.ts', "const s = { backdropFilter: 'none' };"],
    ['a.tsx', '<div className="blur-none backdrop-blur-none" />'],
    ['a.tsx', '<span className="tracking-normal tracking-tight" />'],
    ['a.css', 'letter-spacing: 0.02em;'],
    ['a.css', 'letter-spacing: -0.01em;'],
    ['a.css', 'color: #fafafa;'],
    ['a.css', 'color: #fff; background: #000;'],
    ['a.css', 'color: #121415;'],
    ['a.tsx', '<div className="bg-white text-black" />'],
    ['a.ts', 'input.blur();'],
    ['a.css', '100% { filter: blur(0); }'],
    ['a.css', 'backdrop-filter: blur(0px);'],
    ['a.ts', 'const s = { borderRadius: 8, padding: 24 };'],
    ['a.css', '/* opaque paper, one rule, no shadow */'],
    ['a.tsx', '// so the panel shadow clears the edge'],
    ['a.ts', "const open = `${label} \u2197`;"],
    ['a.ts', "const footer = '© KHE ™';"],
    ['a.ts', '// one — two'],
    ['a.css', '/* one — two */'],
    ['a.html', '<!-- one — two -->'],
    ['a.ts', "const cls = 'bg-' + hue + '-500';"],
  ])('passes %s: %s', (path, line) => {
    expect(rules(line, path)).toEqual([]);
  });

  it('counts each occurrence, and reads CRLF lines', () => {
    const scan = scanText('<div className="shadow-md uppercase shadow-lg" />\r\n<p>⭐</p>\r\n', 'a.tsx', false);
    expect(scan.hits.map((hit) => [hit.rule, hit.line])).toEqual([
      ['shadow', 1],
      ['shadow', 1],
      ['caps', 1],
      ['emoji', 2],
    ]);
    expect(scan.hits[3]!.text).toBe('<p>⭐</p>');
  });

  it('opens no comment at a glob inside a JSON string', () => {
    expect(rules('{ "glob": "src/*.ts",\n  "note": "one \u2014 two" }', 'a.json')).toEqual(['dash']);
  });

  it('skips the dash inside a comment that spans lines', () => {
    expect(rules('/*\n one — two\n*/\nconst a = "x — y";', 'a.ts')).toEqual(['dash']);
  });

  it('counts a word in a comment, which an allow comment lifts', () => {
    expect(rules('/* uppercase labels */', 'a.css')).toEqual(['caps']);
    expect(rules('/* uppercase labels */ /* design-lint-allow caps: names the rule it explains */', 'a.css')).toEqual([]);
  });

  it('lets content globs lift palette, emoji and dash only', () => {
    const line = '<p className="text-rose-500 shadow uppercase">⭐ one — two</p>';
    expect(rules(line, 'a.tsx', false).sort()).toEqual(['caps', 'dash', 'emoji', 'palette', 'shadow']);
    expect(rules(line, 'a.tsx', true).sort()).toEqual(['caps', 'shadow']);
  });

  it('honours an allow comment with a reason, for the rules it names', () => {
    const scan = scanText(
      '.menu { box-shadow: var(--menu-shadow); text-transform: uppercase; } /* design-lint-allow shadow: the one floating layer */',
      'a.css',
      false,
    );
    expect(scan.errors).toEqual([]);
    expect(scan.hits.map((hit) => hit.rule)).toEqual(['caps']);
    expect(rules('<div className="shadow-lg rounded-3xl" /> {/* design-lint-allow shadow, radius: a card the game draws */}')).toEqual([]);
  });

  it('refuses an allow comment without a reason, or for no rule, and still counts the line', () => {
    const empty = scanText('box-shadow: 0 1px 2px black; /* design-lint-allow shadow: */', 'a.css', false);
    expect(empty.errors).toEqual(['a.css:1 design-lint-allow shadow gives no reason']);
    expect(empty.hits.map((hit) => hit.rule)).toEqual(['shadow']);
    expect(scanText('a { } /* design-lint-allow glow: why */', 'a.css', false).errors).toEqual([
      'a.css:1 design-lint-allow names no rule glow',
    ]);
    expect(scanText('a { } /* design-lint-allow */', 'a.css', false).errors).toHaveLength(1);
  });
});

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function tree(files: Record<string, string>, config: object = { include: ['src/**'], baseline: 'baseline.json' }): string {
  const root = mkdtempSync(join(tmpdir(), 'design-lint-'));
  roots.push(root);
  write(root, { 'khe-design-lint.json': JSON.stringify(config), ...files });
  return root;
}

function write(root: string, files: Record<string, string>) {
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
}

function run(root: string, ...args: string[]) {
  const lines: string[] = [];
  const code = main(['--root', root, ...args], (line) => lines.push(line), root);
  return { code, out: lines.join('\n') };
}

const baseline = (root: string) => JSON.parse(readFileSync(join(root, 'baseline.json'), 'utf8')) as { version: string; files: object };

// Committed as a user the workspace's personal-data scan allows, and without signing,
// so it runs on a runner that has no git identity.
function git(root: string, ...args: string[]) {
  execFileSync(
    'git',
    ['-C', root, '-c', 'user.name=test', '-c', 'user.email=test@example.com', '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', ...args],
    { stdio: 'ignore' },
  );
}
const commit = (root: string) => {
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'test');
};

describe('the check', () => {
  it('says what to add when the config is missing', () => {
    const root = mkdtempSync(join(tmpdir(), 'design-lint-'));
    roots.push(root);
    const { code, out } = run(root);
    expect(code).toBe(1);
    expect(out).toContain('"include"');
  });

  it('refuses an unknown flag', () => {
    expect(run(tree({}), '--fix').code).toBe(2);
  });

  it('writes a sorted baseline, skipping tests, excluded and always-out files, and then passes', () => {
    const root = tree(
      {
        'src/b.css': 'a { box-shadow: 0 1px 2px black; text-transform: uppercase; }',
        'src/a.tsx': '<div className="rounded-2xl" />',
        'src/a.test.tsx': '<div className="rounded-2xl" />',
        'src/__tests__/x.ts': "'⭐'",
        'src/node_modules/x/a.css': 'a { box-shadow: 0 1px black; }',
        'src/dist/a.css': 'a { box-shadow: 0 1px black; }',
        'src/vendor.min.css': 'a{box-shadow:0 1px black}',
        'src/logo.png': '⭐',
        'other/c.css': 'a { box-shadow: 0 1px black; }',
      },
      { include: ['src/**'], exclude: ['**/*.min.css'], baseline: 'baseline.json' },
    );
    expect(run(root, '--write-baseline').code).toBe(0);
    const text = readFileSync(join(root, 'baseline.json'), 'utf8');
    expect(text).toBe(
      serializeBaseline({ version: VERSION, files: { 'src/a.tsx': { radius: 1 }, 'src/b.css': { shadow: 1, caps: 1 } } }),
    );
    expect(text.indexOf('"caps"')).toBeLessThan(text.indexOf('"shadow"'));
    expect(text.indexOf('src/a.tsx')).toBeLessThan(text.indexOf('src/b.css'));
    const { code, out } = run(root);
    expect(code).toBe(0);
    expect(out).toContain('totals: gradient 0, blur 0, shadow 1, radius 1, palette 0, caps 1');
  });

  it('fails on a count above the baseline and prints that rule\'s lines', () => {
    const root = tree({ 'src/a.css': 'a { box-shadow: 0 1px black; }\n' });
    run(root, '--write-baseline');
    write(root, { 'src/a.css': 'a { box-shadow: 0 1px black; }\nb { text-transform: uppercase; box-shadow: 0 2px red; }\n' });
    const { code, out } = run(root);
    expect(code).toBe(1);
    expect(out).toContain('src/a.css:1 shadow  a { box-shadow: 0 1px black; }');
    expect(out).toContain('src/a.css:2 shadow  b { text-transform: uppercase; box-shadow: 0 2px red; }');
    expect(out).toContain('src/a.css:2 caps');
  });

  it('fails on a count below the baseline until it is rewritten', () => {
    const root = tree({ 'src/a.css': 'a { box-shadow: 0 1px black; }\nb { box-shadow: 0 2px black; }\n' });
    run(root, '--write-baseline');
    write(root, { 'src/a.css': 'a { box-shadow: 0 1px black; }\n' });
    const { code, out } = run(root);
    expect(code).toBe(1);
    expect(out).toContain('stale: src/a.css shadow 2 in the baseline, 1 now');
    run(root, '--write-baseline');
    expect(run(root).code).toBe(0);
  });

  it('drops a deleted file from the baseline', () => {
    const root = tree({ 'src/a.css': 'a { box-shadow: 0 1px black; }', 'src/b.css': 'b { text-transform: uppercase; }' });
    run(root, '--write-baseline');
    rmSync(join(root, 'src/b.css'));
    expect(run(root).out).toContain('stale: src/b.css caps 1 in the baseline, 0 now');
    run(root, '--write-baseline');
    expect(baseline(root).files).toEqual({ 'src/a.css': { shadow: 1 } });
    expect(run(root).code).toBe(0);
  });

  it('refuses a baseline whose counts are not whole numbers', () => {
    const root = tree({ 'src/a.css': 'a { box-shadow: 0 1px black; }', 'baseline.json': '{ "version": "0.4.0", "files": { "src/a.css": { "shadow": "1" } } }' });
    const { code, out } = run(root);
    expect(code).toBe(1);
    expect(out).toContain('is not a baseline');
  });

  it('says so when it cannot write the baseline', () => {
    const root = tree({ 'src/a.css': 'a { }' }, { include: ['src/**'], baseline: 'missing/baseline.json' });
    const { code, out } = run(root, '--write-baseline');
    expect(code).toBe(1);
    expect(out).toContain('cannot write');
  });

  it('works outside git', () => {
    const root = tree({ 'src/a.css': 'a { box-shadow: 0 1px black; }' });
    run(root, '--write-baseline');
    expect(run(root).code).toBe(0);
  });

  describe('in git', () => {
    const repo = (files: Record<string, string>) => {
      const root = tree(files);
      git(root, 'init', '-q', '-b', 'main');
      return root;
    };

    it('fails when the baseline is raised against HEAD', () => {
      const root = repo({ 'src/a.css': 'a { box-shadow: 0 1px black; }' });
      run(root, '--write-baseline');
      commit(root);
      write(root, { 'src/a.css': 'a { box-shadow: 0 1px black; }\nb { box-shadow: 0 2px black; }' });
      run(root, '--write-baseline');
      const { code, out } = run(root);
      expect(code).toBe(1);
      expect(out).toContain('raised: shadow 2 in the baseline, 1 at HEAD');
    });

    it('allows a first baseline when HEAD has none', () => {
      const root = repo({ 'src/a.css': 'a { box-shadow: 0 1px black; }' });
      commit(root);
      run(root, '--write-baseline');
      expect(run(root).code).toBe(0);
    });

    it('allows a raise when HEAD has another lint version', () => {
      const root = repo({ 'src/a.css': 'a { box-shadow: 0 1px black; }\nb { box-shadow: 0 2px black; }' });
      write(root, { 'baseline.json': serializeBaseline({ version: '0.0.1', files: { 'src/a.css': { shadow: 1 } } }) });
      commit(root);
      run(root, '--write-baseline');
      expect(baseline(root).version).toBe(VERSION);
      expect(run(root).code).toBe(0);
    });

    it('keeps the raise check when the baseline file names another version', () => {
      const root = repo({ 'src/a.css': 'a { box-shadow: 0 1px black; }' });
      run(root, '--write-baseline');
      commit(root);
      write(root, {
        'src/a.css': 'a { box-shadow: 0 1px black; }\nb { box-shadow: 0 2px black; }',
        'baseline.json': serializeBaseline({ version: '0.0.1', files: { 'src/a.css': { shadow: 2 } } }),
      });
      const { code, out } = run(root);
      expect(code).toBe(1);
      expect(out).toContain('raised: shadow 2 in the baseline, 1 at HEAD');
    });

    it('takes a renamed file under its new name once the baseline is rewritten', () => {
      const root = repo({ 'src/a.css': 'a { box-shadow: 0 1px black; }' });
      run(root, '--write-baseline');
      commit(root);
      renameSync(join(root, 'src/a.css'), join(root, 'src/b.css'));
      const before = run(root);
      expect(before.code).toBe(1);
      expect(before.out).toContain('src/b.css:1 shadow');
      expect(before.out).toContain('stale: src/a.css shadow 1 in the baseline, 0 now');
      run(root, '--write-baseline');
      expect(baseline(root).files).toEqual({ 'src/b.css': { shadow: 1 } });
      expect(run(root).code).toBe(0);
    });

    it('skips the HEAD comparison for a baseline outside the root', () => {
      const root = repo({ 'src/a.css': 'a { box-shadow: 0 1px black; }' });
      const elsewhere = mkdtempSync(join(tmpdir(), 'design-lint-config-'));
      roots.push(elsewhere);
      write(elsewhere, { 'repo.json': JSON.stringify({ include: ['src/**'], baseline: 'repo-baseline.json' }) });
      const config = join(elsewhere, 'repo.json');
      expect(run(root, '--config', config, '--write-baseline').code).toBe(0);
      expect(JSON.parse(readFileSync(join(elsewhere, 'repo-baseline.json'), 'utf8')).files).toEqual({ 'src/a.css': { shadow: 1 } });
      expect(run(root, '--config', config).code).toBe(0);
    });
  });
});
