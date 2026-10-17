import { type Pairs, type SiteHeaderBaseOptions, prepare } from './core.js';

export type { Attrs, SiteHeaderContext, SiteHeaderLocale, SiteHeaderPartAttrs } from './core.js';

export interface SiteHeaderOptions<Code extends string = string> extends SiteHeaderBaseOptions<string, Code> {
  /** Put in front of every line, e.g. the indent of the line the header replaces. */
  readonly indent?: string;
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' };

/** Escapes text and attribute values the way React does, so both renderers agree. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char);
}

function tag(name: string, pairs: Pairs = []): string {
  return `<${name}${pairs.map(([attr, value]) => ` ${attr}="${escapeHtml(value)}"`).join('')}>`;
}

/**
 * The KHE site header as an HTML string, for pages built without a framework.
 * It holds no behaviour: the page wires the `data-lang-option` buttons itself.
 */
export function renderSiteHeader<Code extends string>(options: SiteHeaderOptions<Code>): string {
  const { headerClass, brand, context, switcher, buttons } = prepare(options);
  const lines = [
    tag('header', [['class', headerClass]]),
    '  <div class="site-header__inner">',
    `    ${tag('a', brand)}`,
    '      <span>KHE</span><span class="brand-mark__suffix">.ee</span>',
    '    </a>',
    ...(context
      ? [
          `    ${tag(context.tag, context.attrs)}`,
          ...(context.kicker ? [`      ${tag('span', context.kicker.attrs)}${escapeHtml(context.kicker.node)}</span>`] : []),
          `      ${tag('strong', context.title.attrs)}${escapeHtml(context.title.node)}</strong>`,
          `    </${context.tag}>`,
        ]
      : []),
    '    <div class="site-header__actions">',
    `      ${tag('div', switcher)}`,
    ...buttons.map((button) => `        ${tag('button', button.attrs)}${escapeHtml(button.label)}</button>`),
    '      </div>',
    '    </div>',
    '  </div>',
    '</header>',
  ];
  const indent = options.indent ?? '';
  if (!/^[ \t]*$/.test(indent)) throw new TypeError('site-header: indent may hold only spaces and tabs');
  return lines.map((line) => indent + line).join('\n');
}
