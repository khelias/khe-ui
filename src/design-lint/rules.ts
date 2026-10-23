import { TAILWIND_V3_HEX } from './tailwind-v3-hex.js';

export const RULES = ['gradient', 'blur', 'shadow', 'radius', 'palette', 'caps', 'tracking', 'emoji', 'dash'] as const;
export type Rule = (typeof RULES)[number];

/** The rules a `content` glob lifts: a room's own words and pictures, not its chrome. */
const CONTENT_RULES: ReadonlySet<Rule> = new Set<Rule>(['palette', 'emoji', 'dash']);

/** Every value of the family Colors table in khe-sites' DESIGN.md, both themes. */
const FAMILY_HEX: ReadonlySet<string> = new Set([
  '#fafafa', '#0b0d0d', '#ffffff', '#121615', '#eff1f1', '#0f1211', '#121415', '#eef1f0',
  '#363b3d', '#c4cac7', '#5f6567', '#8a928f', '#e3e5e5', '#232827', '#c3c7c7', '#3a413f',
  '#d7263d', '#fb4b57', '#246b5f', '#7fc8b8', '#b75a3a', '#d9764f', '#93411f', '#e8926a',
  '#1f5fa8', '#6fe3ff', '#e8eef6', '#060c1b', '#8a5a12', '#d9a441', '#6a3d8f', '#b59ad6',
  '#2f6b3a', '#7cc28a',
]);

// A `prose` matcher reads the line without its comments.
type Matcher = { re: RegExp; keep?: (match: RegExpExecArray) => boolean; prose?: boolean };

const re = (pattern: RegExp, keep?: Matcher['keep']): Matcher => ({ re: pattern, ...(keep ? { keep } : {}) });
const prose = (matcher: Matcher): Matcher => ({ ...matcher, prose: true });
// A Tailwind class: a token in a class string, after any variant (`hover:`) or `!`.
// A class built by concatenation ('bg-' + hue + '-500') is not a token and is not seen.
const cls = (body: string, keep?: Matcher['keep']): Matcher =>
  re(new RegExp(String.raw`(?<=^|[\s"'${'`'}{(,:!])(?:${body})(?=$|[\s"'${'`'}}),;!])`, 'g'), keep);

const camel = (property: string) => property.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());

const QUOTED = String.raw`(?<q>['"${'`'}])(?<quoted>.*?)\k<q>`;
const declared = (names: string[], rest: string) =>
  new RegExp(String.raw`(?<![\w$-])(?:${names.join('|')})\s*:\s*(?:${QUOTED}|${rest})`, 'g');

/**
 * A declaration in CSS (`box-shadow: ...`) or a JS style object (`boxShadow: '...'`),
 * its value handed to `test`: a quoted string, the CSS up to `;`, `{` or `}`
 * (empty when the value continues on the next line), or a bare JS number or name.
 * A name the same in both (`filter`) has one pattern, so it counts once.
 */
const decl = (properties: string[], test: (value: string) => boolean): Matcher[] => {
  const camels = properties.map(camel).filter((name) => !properties.includes(name));
  const quotedOr = (rest: string) => (m: RegExpExecArray) =>
    test((m.groups!.quoted ?? m.groups![rest]!).split(/['"`]/)[0]!.replace(/!important/, '').trim());
  return [
    re(declared(properties, '(?<value>[^;{}]*)'), quotedOr('value')),
    ...(camels.length ? [re(declared(camels, String.raw`(?<bare>[^,}\s]+)`), quotedOr('bare'))] : []),
  ];
};

const ARBITRARY = String.raw`[\w\[\]().,%#/-]+`;
const SIDE = String.raw`(?:-(?:t|r|b|l|s|e|x|y|tl|tr|br|bl|ss|se|es|ee))?`;
const CORNERS = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'start-start', 'start-end', 'end-start', 'end-end'];
const HUES =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const RESET = /^(?:none|inherit|initial|unset|revert)$/;

// Commas inside rgb() or var() do not separate shadows.
function layers(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === ',' && depth === 0) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts.map((part) => part.trim());
}

const RING = /^(?:inset\s+)?0(?:px)?\s+0(?:px)?\s+0(?:px)?\s+[\d.]+(?:px|rem|em)\b/;

// Anything but `none` or a ring is a shadow, a value that cannot be read (var()) included.
const isShadow = (text: string) => !RESET.test(text) && text !== '0' && !layers(text).every((layer) => RING.test(layer));

const BLUR = /\bblur\(\s*(?!0(?:px)?\s*\))/;
// A backdrop filter is a translucent material whatever it does; a filter only when it blurs.
const isBackdrop = (text: string) => !RESET.test(text) && !/^blur\(\s*0(?:px)?\s*\)$/.test(text);

const length = (part: string): { n: number; unit: string } | null => {
  const match = /^(-?[\d.]+)(px|rem|em|%)?$/.exec(part);
  return match ? { n: Number(match[1]), unit: match[2] ?? 'px' } : null;
};

function radiusTooLarge(text: string): boolean {
  return text.split(/[\s/_]+/).some((part) => {
    const len = length(part);
    if (!len) return false;
    if (len.unit === '%') return len.n !== 0 && len.n !== 50;
    const px = len.unit === 'px' ? len.n : len.n * 16;
    return px > 12 && px !== 999 && px !== 9999;
  });
}

function trackingTooWide(text: string): boolean {
  const len = length(text.split(/[\s_]+/)[0] ?? '');
  if (!len || len.unit === '%') return false;
  return len.unit === 'px' ? len.n > 0.32 : len.n > 0.02;
}

const MATCHERS: Record<Rule, Matcher[]> = {
  gradient: [
    re(/(?<![\w-])(?:repeating-)?(?:linear|radial|conic)-gradient\(/g),
    cls(String.raw`bg-gradient-to-[trbl]{1,2}|bg-(?:linear|radial|conic)(?:-${ARBITRARY})?`),
  ],
  blur: [
    ...decl(['backdrop-filter', '-webkit-backdrop-filter'], isBackdrop),
    ...decl(['filter'], (text) => BLUR.test(text)),
    cls(String.raw`backdrop-blur(?:-(?!none\b)${ARBITRARY})?|blur-(?!none\b)${ARBITRARY}`),
  ],
  shadow: [
    ...decl(['box-shadow', 'text-shadow'], isShadow),
    re(/(?<![\w-])drop-shadow\(/g),
    cls(
      String.raw`shadow-(?:2xs|xs|sm|md|lg|xl|2xl|inner|\[[^\]\s]+\])|(?:inset-shadow|text-shadow)-(?!none\b)${ARBITRARY}|drop-shadow(?:-(?!none\b)${ARBITRARY})?`,
    ),
    // The bare class is also a word, and comments use it ("no shadow").
    prose(cls('shadow')),
  ],
  radius: [
    cls(String.raw`rounded${SIDE}-(?:2xl|3xl|4xl)`),
    cls(String.raw`rounded${SIDE}-\[([^\]\s]+)\]`, (m) => radiusTooLarge(m[1]!)),
    ...decl(['border-radius', ...CORNERS.map((corner) => `border-${corner}-radius`)], radiusTooLarge),
  ],
  palette: [
    cls(
      String.raw`(?:bg|text|border(?:-[trblxyse])?|ring(?:-offset)?|from|via|to|fill|stroke|outline|divide|decoration|accent|shadow|caret|placeholder)-(?:${HUES})-(?:50|[1-9]00|950)(?:/[\w.\[\]%]+)?`,
    ),
    re(/(?<![\w&])#([0-9a-fA-F]{6})(?:[0-9a-fA-F]{2})?(?![0-9a-fA-F])/g, (m) => {
      const hex = `#${m[1]!.toLowerCase()}`;
      return TAILWIND_V3_HEX.has(hex) && !FAMILY_HEX.has(hex);
    }),
  ],
  caps: [cls('uppercase')],
  tracking: [
    cls('tracking-(?:wide|wider|widest)'),
    cls(String.raw`tracking-\[([^\]\s]+)\]`, (m) => trackingTooWide(m[1]!)),
    ...decl(['letter-spacing'], trackingTooWide),
  ],
  // The copyright, registered and trade marks and the Arrows block are typography, not pictures.
  emoji: [re(/(?![\u00a9\u00ae\u2122\u2190-\u21ff])\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier}|\u200D\p{Extended_Pictographic}\uFE0F?)*/gu)],
  dash: [prose(re(/\u2014/g))],
};

/**
 * The rules one line breaks, once per occurrence. A matcher reads `code`, the
 * line with its comments, or if it is `prose`, `text`, the line without them.
 */
export function lineHits(code: string, text: string, content: boolean): Rule[] {
  const hits: Rule[] = [];
  for (const rule of RULES) {
    if (content && CONTENT_RULES.has(rule)) continue;
    for (const { re: pattern, keep, prose: readsText } of MATCHERS[rule]) {
      for (const match of (readsText ? text : code).matchAll(pattern)) if (!keep || keep(match)) hits.push(rule);
    }
  }
  return hits;
}
