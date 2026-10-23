import { globSync, readFileSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';
import { lineHits, RULES, type Rule } from './rules.js';

export interface Config {
  include: string[];
  exclude: string[];
  content: string[];
  baseline: string;
}

export interface Hit {
  rule: Rule;
  line: number;
  text: string;
}

export interface FileScan {
  hits: Hit[];
  errors: string[];
}

export const CONFIG_EXAMPLE = '{ "include": ["src/**"], "content": [], "baseline": "khe-design-lint-baseline.json" }';

const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

/** The config's fields checked, or the reason it is unusable. */
export function parseConfig(text: string): Config | string {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    return `not JSON: ${(error as Error).message}`;
  }
  if (typeof raw !== 'object' || raw === null) return 'not a JSON object';
  const { include, exclude = [], content = [], baseline } = raw as Record<string, unknown>;
  if (!strings(include) || include.length === 0) return '"include" must list at least one glob';
  if (!strings(exclude)) return '"exclude" must be a list of globs';
  if (!strings(content)) return '"content" must be a list of globs';
  if (typeof baseline !== 'string' || baseline === '') return '"baseline" must be a path';
  return { include, exclude, content, baseline };
}

const ALWAYS_OUT = ['**/node_modules/**', '**/dist/**', '**/output/**'];
const TEST_PATH = /(?:^|\/)(?:__tests__|__snapshots__|tests?|e2e)\/|\.(?:test|spec)\.[^/]+$/;
const TEXT = /\.(?:css|scss|sass|less|html?|svg|[cm]?[jt]sx?|json|vue|svelte|astro)$/;
const CODE = /\.(?:[cm]?[jt]sx?|vue|svelte|astro|scss|sass|less)$/;
// JSON is all strings: a glob such as "src/*.ts" opens no comment there.
const QUOTED = /\.(?:[cm]?[jt]sx?|vue|svelte|astro|scss|sass|less|json)$/;

const matches = (path: string, globs: string[]) => globs.some((glob) => posix.matchesGlob(path, glob));

/** The files under `root` the config takes in, as sorted posix paths relative to it; hidden paths stay out. */
export function listFiles(root: string, config: Config): string[] {
  return globSync(config.include, { cwd: root, exclude: [...ALWAYS_OUT, ...config.exclude], withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(root, join(entry.parentPath, entry.name)).split(sep).join('/'))
    .filter((path) => TEXT.test(path) && !TEST_PATH.test(path))
    .sort();
}

// The closer of the comment a line ends inside, carried to the next line.
interface CommentState {
  end: '' | '*/' | '-->';
}

// Strings are tracked only in code and JSON, where a quote opens one; in CSS and
// markup an apostrophe is text. `//` opens a comment only in code.
function withoutComments(line: string, state: CommentState, quoted: boolean, code: boolean): string {
  let out = '';
  let quote = '';
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (state.end) {
      if (line.startsWith(state.end, i)) {
        i += state.end.length - 1;
        state.end = '';
      }
    } else if (quote) {
      out += c;
      if (c === '\\') out += line[++i] ?? '';
      else if (c === quote) quote = '';
    } else if (quoted && (c === '"' || c === "'" || c === '`')) {
      quote = c;
      out += c;
    } else if (line.startsWith('/*', i)) {
      state.end = '*/';
      i++;
    } else if (line.startsWith('<!--', i)) {
      state.end = '-->';
      i += 3;
    } else if (code && line.startsWith('//', i) && line[i - 1] !== ':') {
      break;
    } else {
      out += c;
    }
  }
  return out;
}

const ALLOW = 'design-lint-allow';
const ALLOW_FORM = /^\s+([a-z]+(?:\s*,\s*[a-z]+)*)\s*:(.*)$/;

/** Every hit in one file's text, and every allow comment it cannot honour. */
export function scanText(text: string, path: string, content: boolean): FileScan {
  const hits: Hit[] = [];
  const errors: string[] = [];
  const state: CommentState = { end: '' };
  const code = CODE.test(path);
  const quoted = QUOTED.test(path);
  text.split(/\r?\n/).forEach((line, index) => {
    const prose = withoutComments(line, state, quoted, code);
    const at = line.indexOf(ALLOW);
    const allowed = new Set<string>();
    if (at >= 0) {
      const form = ALLOW_FORM.exec(line.slice(at + ALLOW.length));
      const reason = form?.[2]!.replace(/[\s*/}>-]+$/, '').trim();
      const rules = form?.[1]!.split(/\s*,\s*/) ?? [];
      const unknown = rules.filter((rule) => !(RULES as readonly string[]).includes(rule));
      if (!form) errors.push(`${path}:${index + 1} write ${ALLOW} <rule>: <reason>`);
      else if (unknown.length) errors.push(`${path}:${index + 1} ${ALLOW} names no rule ${unknown.join(', ')}`);
      else if (!reason) errors.push(`${path}:${index + 1} ${ALLOW} ${rules.join(', ')} gives no reason`);
      else rules.forEach((rule) => allowed.add(rule));
    }
    const codeText = at >= 0 ? line.slice(0, at) : line;
    for (const rule of lineHits(codeText, prose, content)) {
      if (!allowed.has(rule)) hits.push({ rule, line: index + 1, text: line.trim() });
    }
  });
  return { hits, errors };
}

export function scanFile(root: string, path: string, config: Config): FileScan {
  return scanText(readFileSync(join(root, path), 'utf8'), path, matches(path, config.content));
}
