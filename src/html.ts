import type { Icon, Pairs } from './core.js';

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' };

/** Escapes text and attribute values the way React does, so both renderers agree. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char);
}

export function tag(name: string, pairs: Pairs = []): string {
  return `<${name}${pairs.map(([attr, value]) => ` ${attr}="${escapeHtml(value)}"`).join('')}>`;
}

/** An icon on one line, closing tags written out as React writes them. */
export function iconHtml({ attrs, paths }: Icon): string {
  return `${tag('svg', attrs)}${paths.map((d) => `${tag('path', [['d', d]])}</path>`).join('')}</svg>`;
}

export function indented(component: string, lines: readonly string[], indent = ''): string {
  if (!/^[ \t]*$/.test(indent)) throw new TypeError(`${component}: indent may hold only spaces and tabs`);
  return lines.map((line) => indent + line).join('\n');
}
