import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (name: string) => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');
const css = read('site-header.css');
const footerCss = read('site-footer.css');

// The defaults block is the one that declares the font token.
function defaultsOf(source: string, prefix: string): Map<string, string> {
  const block = new RegExp(`\\{([^}]*${prefix}font:[^}]*)\\}`).exec(source)?.[1] ?? '';
  return new Map([...block.matchAll(new RegExp(`(${prefix}[a-z-]+):\\s*([^;]+);`, 'g'))].map(([, name, value]) => [name!, value!.trim()]));
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

function colour(name: string, from = defaults): Rgba {
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

describe('site-header.css', () => {
  it('defines a default for every token it uses', () => {
    const used = new Set([...css.matchAll(/var\((--khe-header-[a-z-]+)/g)].map(([, name]) => name!));
    expect(used.size).toBeGreaterThan(20);
    expect([...used].filter((name) => !defaults.has(name))).toEqual([]);
  });

  it('gives the kicker at least 4.5:1 on the default background', () => {
    expect(contrast(colour('--khe-header-text-muted'), headerBg)).toBeGreaterThanOrEqual(4.5);
  });

  it('gives an inactive language button and the theme toggle at least 4.5:1 on the default switcher', () => {
    const switcher = over(colour('--khe-header-switcher-bg'), headerBg);
    expect(contrast(colour('--khe-header-text-muted'), switcher)).toBeGreaterThanOrEqual(4.5);
  });

  it('defaults every weight to 600 and has no font face', () => {
    const weights = [...defaults].filter(([name]) => name.endsWith('-weight'));
    expect(weights.length).toBeGreaterThanOrEqual(4);
    expect(weights.every(([, value]) => value === '600')).toBe(true);
    expect(css).not.toMatch(/@font-face|@import/);
  });

  it('reads :root only to pick the theme icon, and sets no property there', () => {
    const rooted = rules(css).filter((rule) => rule.selector.includes(':root'));
    expect(rooted.length).toBeGreaterThanOrEqual(2);
    for (const rule of rooted) {
      for (const selector of rule.selector.split(',')) expect(selector.trim()).toMatch(/\.site-header__theme-(?:sun|moon)$/);
      expect(rule.body).not.toContain('--');
    }
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
