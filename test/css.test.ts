import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ROOM_IDS } from '../src/rooms.js';

const read = (name: string) => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');
const css = read('site-header.css');
const footerCss = read('site-footer.css');

const declarations = (body: string) =>
  new Map([...body.matchAll(/(--[a-z-]+):\s*([^;]+);/g)].map(([, name, value]) => [name!, value!.trim()]));

// The defaults block is the one that declares the font token.
function defaultsOf(source: string, prefix: string): Map<string, string> {
  const block = new RegExp(`\\{([^}]*${prefix}font:[^}]*)\\}`).exec(source)?.[1] ?? '';
  return new Map([...declarations(block)].filter(([name]) => name.startsWith(prefix)));
}
const defaults = defaultsOf(css, '--khe-header-');
const footerDefaults = defaultsOf(footerCss, '--khe-footer-');

// Every rule as its selector and body, comments dropped, media query wrappers skipped.
const rules = (source: string) =>
  [...source.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
    selector: selector!.trim(),
    body: body!,
  }));

type Rgba = [number, number, number, number];

function colour(name: string, from: ReadonlyMap<string, string> = defaults): Rgba {
  const value = from.get(name);
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value ?? '');
  if (hex) return [parseInt(hex[1]!, 16), parseInt(hex[2]!, 16), parseInt(hex[3]!, 16), 1];
  const rgba = /^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/.exec(value ?? '');
  if (rgba) return [Number(rgba[1]), Number(rgba[2]), Number(rgba[3]), Number(rgba[4])];
  throw new Error(`${name} is not a hex or rgba colour: ${value}`);
}

function over([r, g, b, a]: Rgba, [br, bg, bb]: Rgba): Rgba {
  return [r * a + br * (1 - a), g * a + bg * (1 - a), b * a + bb * (1 - a), 1];
}

function luminance([r, g, b]: Rgba): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: Rgba, b: Rgba): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
}

// The header's translucent background over a page of the same colour, as on khe.ee.
const [bgR, bgG, bgB] = colour('--khe-header-bg');
const headerBg: Rgba = [bgR, bgG, bgB, 1];

const LITERAL_COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|color-mix)\(/i;

const ROOM_DOTS = ROOM_IDS.map((id) => `--khe-header-room-${id}`);
const DARK_DOT_SELECTORS = [':where(:root[data-theme="dark"] .site-header)', ':where(:root:not([data-theme="light"]) .site-header)'];
const darkDotRules = rules(css).filter((rule) => DARK_DOT_SELECTORS.includes(rule.selector));

// The family paper and surface of each theme, from khe-sites' DESIGN.md: the grounds
// a consumer puts the menu on.
const FAMILY_GROUNDS = {
  light: { paper: '#fafafa', surface: '#ffffff' },
  dark: { paper: '#0b0d0d', surface: '#121615' },
};

// Specificity as one number (ids, then classes, attributes and pseudo-classes, then
// types); :where() and its argument count nothing.
function specificity(selector: string): number {
  let rest = '';
  for (let i = 0; i < selector.length; i++) {
    if (!selector.startsWith(':where(', i)) {
      rest += selector[i];
      continue;
    }
    let depth = 0;
    for (i += ':where'.length; i < selector.length; i++) {
      if (selector[i] === '(') depth++;
      else if (selector[i] === ')' && --depth === 0) break;
    }
  }
  const flat = rest.replace(/\[[^\]]*\]/g, '.a').replace(/:not\(|\)/g, ' ');
  const count = (pattern: RegExp) => (flat.match(pattern) ?? []).length;
  return count(/#[\w-]+/g) * 10000 + count(/\.[\w-]+|:(?!:)[\w-]+/g) * 100 + count(/(?:^|[\s>+~])[a-z][\w-]*/gi);
}

describe('site-header.css', () => {
  it('defines a default for every token it uses', () => {
    const used = new Set([...css.matchAll(/var\((--khe-header-[a-z-]+)/g)].map(([, name]) => name!));
    expect(used.size).toBeGreaterThan(20);
    expect([...used].filter((name) => !defaults.has(name))).toEqual([]);
  });

  it('gives muted text at least 4.5:1 on the default background', () => {
    expect(contrast(colour('--khe-header-text-muted'), headerBg)).toBeGreaterThanOrEqual(4.5);
  });

  it('gives an inactive language button and the theme toggle at least 4.5:1 on the default switcher', () => {
    const switcher = over(colour('--khe-header-switcher-bg'), headerBg);
    expect(contrast(colour('--khe-header-text-muted'), switcher)).toBeGreaterThanOrEqual(4.5);
  });

  it('defaults every weight to 600 and has no font face', () => {
    const weights = [...defaults].filter(([name]) => name.endsWith('-weight'));
    expect(weights.length).toBeGreaterThanOrEqual(3);
    expect(weights.every(([, value]) => value === '600')).toBe(true);
    expect(css).not.toMatch(/@font-face|@import/);
  });

  it('reads :root only for the theme icon and the dark dots, and sets only the five dots there', () => {
    const rooted = rules(css).filter((rule) => rule.selector.includes(':root'));
    expect(rooted.length).toBeGreaterThanOrEqual(6);
    for (const rule of rooted) {
      if (DARK_DOT_SELECTORS.includes(rule.selector)) {
        expect([...declarations(rule.body).keys()].sort()).toEqual([...ROOM_DOTS].sort());
        expect(rule.body.replace(/--khe-header-room-[a-z]+:\s*#[0-9a-f]{6};/g, '').trim()).toBe('');
        continue;
      }
      for (const selector of rule.selector.split(',')) expect(selector.trim()).toMatch(/\.site-header__theme-(?:sun|moon)$/);
      expect(rule.body).not.toContain('--');
    }
    expect(darkDotRules).toHaveLength(2);
    expect(css).toMatch(/@media \(prefers-color-scheme: dark\) \{\s*:where\(:root:not\(\[data-theme="light"\]\) \.site-header\)/);
  });

  it('gives both dark dot rules the same values', () => {
    const [byAttribute, bySystem] = darkDotRules.map((rule) => declarations(rule.body));
    expect(bySystem).toEqual(byAttribute);
  });

  it('lets a value an app sets on .site-header beat the dark dots and the defaults', () => {
    const app = specificity('.site-header');
    expect(app).toBe(100);
    for (const selector of DARK_DOT_SELECTORS) expect(specificity(selector)).toBeLessThan(app);
    expect(specificity(':where(.site-header, .language-switcher:not(.site-header *))')).toBe(0);
    expect(specificity(':root[data-theme="dark"] .site-header__theme-sun')).toBe(300);
  });

  it('colours the dot of every room', () => {
    for (const id of ROOM_IDS) {
      const dot = rules(css).find((rule) => rule.selector === `.site-header__room[data-khe-room="${id}"] > .site-header__room-dot`);
      expect(dot?.body, id).toContain(`var(--khe-header-room-${id})`);
    }
  });

  it('has the menu tokens and the light dots in the defaults block', () => {
    for (const name of ['--khe-header-menu-bg', '--khe-header-menu-border', '--khe-header-menu-shadow', '--khe-header-menu-current-bg', ...ROOM_DOTS]) {
      expect(defaults.has(name), name).toBe(true);
    }
  });

  it('gives room names and notes at least 4.5:1 on the default menu ground', () => {
    const menu = colour('--khe-header-menu-bg');
    expect(menu[3]).toBe(1);
    expect(contrast(colour('--khe-header-text'), menu)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colour('--khe-header-text-muted'), menu)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colour('--khe-header-text-muted'), over(colour('--khe-header-menu-current-bg'), menu))).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ['light', () => defaults],
    ['dark', () => declarations(darkDotRules[0]!.body)],
  ] as const)('gives every %s dot at least 3:1 on the family paper and surface', (theme, values) => {
    const grounds = new Map(Object.entries(FAMILY_GROUNDS[theme]));
    for (const dot of ROOM_DOTS) {
      for (const ground of ['paper', 'surface']) {
        expect(contrast(colour(dot, values()), colour(ground, grounds)), `${dot} on ${theme} ${ground}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('hides the button, the list and the slash without the Popover API', () => {
    const block = /@supports not selector\(:popover-open\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    const [rule] = rules(block);
    expect(rule!.selector.split(',').map((selector) => selector.trim())).toEqual([
      '.site-header__rooms',
      '.site-header__rooms-menu',
      '.site-header__slash',
    ]);
    expect(rule!.body.trim()).toBe('display: none;');
  });

  it('keeps every room item a 44px target', () => {
    const item = rules(css).find((rule) => rule.selector === '.site-header__room');
    expect(item!.body).toMatch(/min-height: 2\.75rem;/);
  });

  it('has no kicker any more', () => {
    expect(css).not.toMatch(/kicker|site-header__context/);
  });

  it('colours the theme toggle with header tokens only', () => {
    const toggle = rules(css).filter((rule) => rule.selector.includes('site-header__theme'));
    expect(toggle.length).toBeGreaterThanOrEqual(6);
    for (const { body } of toggle) {
      expect(body).not.toMatch(LITERAL_COLOUR);
      for (const [, name] of body.matchAll(/var\((--[a-z-]+)/g)) expect(name).toMatch(/^--khe-header-/);
    }
  });

});

describe('site-footer.css', () => {
  it('uses its tokens through var() only, each with a default', () => {
    const used = new Set([...footerCss.matchAll(/var\((--[a-z-]+)/g)].map(([, name]) => name!));
    expect(used.size).toBeGreaterThanOrEqual(6);
    expect([...used].filter((name) => !footerDefaults.has(name))).toEqual([]);
    const outsideDefaults = rules(footerCss).filter((rule) => !rule.body.includes('--khe-footer-font:'));
    for (const { body } of outsideDefaults) {
      expect(body).not.toMatch(LITERAL_COLOUR);
      expect(body).not.toMatch(/(?:font-family|font-weight|font-size):(?!\s*var\()/);
    }
  });

  it('matches the header defaults and gives the text at least 4.5:1 on the header ground', () => {
    expect(footerDefaults.get('--khe-footer-text')).toBe(defaults.get('--khe-header-text-muted'));
    expect(footerDefaults.get('--khe-footer-text-hover')).toBe(defaults.get('--khe-header-text'));
    expect(contrast(colour('--khe-footer-text', footerDefaults), headerBg)).toBeGreaterThanOrEqual(4.5);
  });

  it('sets no margin or padding on the footer itself, and has no :root rule or font face', () => {
    const own = rules(footerCss).filter((rule) => rule.selector === '.site-footer');
    expect(own).toHaveLength(1);
    expect(own[0]!.body).not.toMatch(/margin|padding/);
    expect(footerCss).not.toMatch(/:root|@font-face|@import/);
  });

});

describe.each([
  ['site-header.css', css],
  ['site-footer.css', footerCss],
])('%s', (_, source) => {
  it('keeps hover states behind a fine pointer', () => {
    const outside = source.replace(/@media \(hover: hover\) and \(pointer: fine\) \{[\s\S]*?\n\}/g, '');
    expect(outside).not.toContain(':hover');
  });
});
