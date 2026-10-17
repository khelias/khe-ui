import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../src/site-header.css', import.meta.url), 'utf8');
// The defaults block is the one that declares the font token.
const defaultsBlock = /\{([^}]*--khe-header-font:[^}]*)\}/.exec(css)?.[1] ?? '';
const defaults = new Map([...defaultsBlock.matchAll(/(--khe-header-[a-z-]+):\s*([^;]+);/g)].map(([, name, value]) => [name!, value!.trim()]));

type Rgba = [number, number, number, number];

function colour(name: string): Rgba {
  const value = defaults.get(name);
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

describe('site-header.css', () => {
  it('defines a default for every token it uses', () => {
    const used = new Set([...css.matchAll(/var\((--khe-header-[a-z-]+)/g)].map(([, name]) => name!));
    expect(used.size).toBeGreaterThan(20);
    expect([...used].filter((name) => !defaults.has(name))).toEqual([]);
  });

  it('gives the kicker at least 4.5:1 on the default background', () => {
    expect(contrast(colour('--khe-header-text-muted'), headerBg)).toBeGreaterThanOrEqual(4.5);
  });

  it('gives an inactive language button at least 4.5:1 on the default switcher', () => {
    const switcher = over(colour('--khe-header-switcher-bg'), headerBg);
    expect(contrast(colour('--khe-header-text-muted'), switcher)).toBeGreaterThanOrEqual(4.5);
  });

  it('defaults every weight to 600 and has no :root rule or font face', () => {
    const weights = [...defaults].filter(([name]) => name.endsWith('-weight'));
    expect(weights.length).toBeGreaterThanOrEqual(4);
    expect(weights.every(([, value]) => value === '600')).toBe(true);
    expect(css).not.toMatch(/:root|@font-face|@import/);
  });

  it('keeps hover states behind a fine pointer', () => {
    const outside = css.replace(/@media \(hover: hover\) and \(pointer: fine\) \{[\s\S]*?\n\}/g, '');
    expect(outside).not.toContain(':hover');
  });
});
