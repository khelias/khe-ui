import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ROOM_IDS } from '../src/rooms.js';
import { ACTION_HIDES_TITLE, TITLE_WITHOUT_ACTION } from './selectors.js';

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
/** The body of the top-level @media block with this exact query. */
const mediaBlock = (query: string) => new RegExp(`@media \\(${query.replace(/[()]/g, '\\$&')}\\) \\{([\\s\\S]*?)\\n\\}`).exec(css)?.[1] ?? '';

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

const HOME_HIDDEN = ':root:not([data-khe-view="product"]) .site-footer__home,\n:root:not([data-khe-view="product"]) .site-footer__home + .site-footer__divider';

const LITERAL_COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|color-mix)\(/i;

const ROOM_DOTS = ROOM_IDS.map((id) => `--khe-header-room-${id}`);
const DARK_DOT_SELECTORS = [':where(:root[data-theme="dark"] .site-header)', ':where(:root:not([data-theme="light"]) .site-header)'];
const darkDotRules = rules(css).filter((rule) => DARK_DOT_SELECTORS.includes(rule.selector));

// The family paper and surface of each theme, from khe-sites' DESIGN.md: the grounds
// a consumer puts the menu on.
const FAMILY_GROUNDS = {
  light: { paper: '#f6f6f2', surface: '#ffffff' },
  dark: { paper: '#0c0e0f', surface: '#15181a' },
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

  it('reads :root only for the theme icon, the dark dots and the view, and sets only the room dots there', () => {
    const rooted = rules(css).filter((rule) => rule.selector.includes(':root'));
    expect(rooted.length).toBeGreaterThanOrEqual(6);
    for (const rule of rooted) {
      if (rule.selector.includes('data-khe-view')) {
        expect(rule.body).not.toContain('--');
        const names = [...rule.body.matchAll(/([a-z-]+):/g)].map(([, name]) => name ?? '');
        expect(names).not.toHaveLength(0);
        expect(names.every((name) => /^(?:display|font-size|min-width|justify-content|margin-inline)$/.test(name))).toBe(true);
        continue;
      }
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

  // khe-sites' privacy pages put a dash before every li in main.
  it('keeps a page\'s own li rules, element or class scoped, out of the list', () => {
    const all = rules(css);
    const item = all.find((rule) => rule.selector === '.site-header__rooms-menu .site-header__rooms-item');
    expect(specificity(item!.selector)).toBeGreaterThan(specificity('.prose main li'));
    expect(item!.body).toMatch(/display: block;[\s\S]*margin: 0;[\s\S]*padding: 0;/);
    const marks = all.find((rule) => rule.selector.startsWith('.site-header__rooms-menu .site-header__rooms-item::before'));
    expect(marks!.selector.split(',').map((selector) => selector.trim())).toEqual([
      '.site-header__rooms-menu .site-header__rooms-item::before',
      '.site-header__rooms-menu .site-header__rooms-item::after',
    ]);
    expect(specificity('.site-header__rooms-menu .site-header__rooms-item::before')).toBeGreaterThan(specificity('.privacy-page main li::before'));
    expect(marks!.body.trim()).toBe('content: none;');
    const list = all.find((rule) => rule.selector === '.site-header__rooms-menu ul');
    expect(list!.body).toMatch(/margin: 0;[\s\S]*padding: 0;[\s\S]*list-style: none;/);
  });

  it('hides the title and the slash beside an app\'s action at 520px and below', () => {
    const block = mediaBlock('max-width: 520px');
    const rule = rules(block).find((candidate) => candidate.selector.includes(':has(.site-header__actions'));
    expect(rule!.selector).toBe(ACTION_HIDES_TITLE);
    expect(rule!.body.trim()).toBe('display: none;');
  });

  it('hides the room\'s name beside an app\'s title above 360px and up to 520px, and keeps the button 44px', () => {
    const block = mediaBlock('360px < width <= 520px');
    expect(rules(block).map((rule) => [rule.selector, rule.body.trim()])).toEqual([
      [`${TITLE_WITHOUT_ACTION} .site-header__rooms-name`, 'display: none;'],
      [`${TITLE_WITHOUT_ACTION} .site-header__rooms`, 'min-width: 2.75rem;\n    justify-content: center;\n    margin-inline: -0.5rem -0.875rem;'],
    ]);
    expect(rules(css).find((rule) => rule.selector === '.site-header__rooms')!.body).toMatch(/min-height: 2\.75rem;/);
    const narrowest = mediaBlock('max-width: 360px');
    expect(rules(narrowest).map((rule) => [rule.selector, rule.body.trim()])).toEqual([
      [':where(:root:not([data-khe-view="product"])) :is(.site-header__title, .site-header__slash)', 'display: none;'],
    ]);
  });

  it('keeps every room item a 44px target', () => {
    const item = rules(css).find((rule) => rule.selector === '.site-header__room');
    expect(item!.body).toMatch(/min-height: 2\.75rem;/);
  });

  it('gives the demo line\'s label and sentence at least 4.5:1 on its default ground', () => {
    const ground = over(colour('--khe-header-demo-bg'), headerBg);
    expect(contrast(colour('--khe-header-text'), ground)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colour('--khe-header-text-muted'), ground)).toBeGreaterThanOrEqual(4.5);
    const line = rules(css).find((rule) => rule.selector === '.site-header__demo');
    expect(line!.body).toMatch(/min-height: 2\.25rem;[\s\S]*padding: 0\.5rem 0;[\s\S]*border-top: 1px solid var\(--khe-header-border\);[\s\S]*background: var\(--khe-header-demo-bg\);/);
    expect(line!.body).toMatch(/font-size: 0\.8125rem;/);
    const body = (selector: string, from = css) => rules(from).find((rule) => rule.selector === selector)!.body;
    expect(body('.site-header__demo-inner')).toMatch(/gap: 0\.625rem;/);
    expect(body('.site-header__demo-label')).toMatch(/flex-shrink: 0;[\s\S]*color: var\(--khe-header-text\);[\s\S]*font-weight: var\(--khe-header-title-weight\);/);
    expect(body('.site-header__demo-body')).toMatch(/min-width: 0;/);
    expect(body('.site-header__demo-text')).toMatch(/color: var\(--khe-header-text-muted\);/);
    // The link reads like the label's colour, underlined, and wraps whole.
    expect(body('.site-header__demo-link')).toMatch(/color: var\(--khe-header-text\);[\s\S]*text-decoration: underline;[\s\S]*white-space: nowrap;/);
    expect(rules(css).find((rule) => rule.selector.includes('.site-header__demo-link:focus-visible'))!.body).toMatch(/outline: 2px solid var\(--khe-header-focus\);/);
    // The line's gutters are the row's, at both widths.
    const narrow = mediaBlock('max-width: 520px');
    const padding = (selector: string, from: string) => /padding: ([^;]+);/.exec(body(selector, from))![1]!.match(/max\([^()]*\([^()]*\)\)/g);
    expect(padding('.site-header__demo-inner', css)).toEqual(padding('.site-header__inner', css));
    expect(padding('.site-header__demo-inner', narrow)).toEqual(padding('.site-header__inner', narrow));
  });

  it('hides the mark, the rooms, the slash and the demo line in the product view, and keeps the title', () => {
    const view = rules(css).filter((rule) => rule.selector.includes('[data-khe-view="product"]') && !rule.selector.includes(':not('));
    const hidden = view.find((rule) => rule.body.trim() === 'display: none;');
    expect(hidden!.selector).toBe(
      ':root[data-khe-view="product"] :is(.site-header__brand, .site-header__rooms, .site-header__rooms-menu, .site-header__slash, .site-header__demo)',
    );
    expect(view.find((rule) => rule.selector === ':root[data-khe-view="product"] .site-header__title')!.body.trim()).toBe('font-size: 1.0625rem;');
    // The narrow rules that hide the title make room for the mark and the room, so the frame alone has them.
    const narrow = mediaBlock('max-width: 360px');
    expect(rules(narrow).map((rule) => rule.selector)).toEqual([':where(:root:not([data-khe-view="product"])) :is(.site-header__title, .site-header__slash)']);
    expect(ACTION_HIDES_TITLE.startsWith(':where(:root:not([data-khe-view="product"])) ')).toBe(true);
    expect(specificity(hidden!.selector)).toBeGreaterThan(specificity('.site-header__rooms'));
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

  it('sets no margin or padding on the footer itself, and has no :root rule but the view\'s, nor a font face', () => {
    const own = rules(footerCss).filter((rule) => rule.selector === '.site-footer');
    expect(own).toHaveLength(1);
    expect(own[0]!.body).not.toMatch(/margin|padding/);
    expect(footerCss).not.toMatch(/@font-face|@import/);
    expect(rules(footerCss).filter((rule) => rule.selector.includes(':root')).map((rule) => rule.selector)).toEqual([HOME_HIDDEN]);
  });

  it('shows the home link and the divider after it in the product view only, over the link rule', () => {
    const rule = rules(footerCss).find((candidate) => candidate.selector === HOME_HIDDEN);
    expect(rule!.body.trim()).toBe('display: none;');
    for (const selector of HOME_HIDDEN.split(',')) expect(specificity(selector.trim())).toBeGreaterThan(specificity('.site-footer nav a'));
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
