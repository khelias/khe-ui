import { type SiteHeaderBaseOptions, prepareHeader } from './core.js';
import { escapeHtml, iconHtml, indented, tag } from './html.js';

export type { Attrs, SiteHeaderContext, SiteHeaderLocale, SiteHeaderPartAttrs } from './core.js';
export { escapeHtml } from './html.js';

export interface SiteHeaderOptions<Code extends string = string> extends SiteHeaderBaseOptions<string, Code> {
  /** Put in front of every line, e.g. the indent of the line the header replaces. */
  readonly indent?: string;
}

/**
 * The KHE site header as an HTML string, for pages built without a framework.
 * It holds no behaviour: the page wires the `data-lang-option` buttons itself, and
 * the theme toggle through `wireThemeToggle` from `@khelias/ui/theme`.
 */
export function renderSiteHeader<Code extends string>(options: SiteHeaderOptions<Code>): string {
  const { headerClass, brand, context, theme, switcher, buttons } = prepareHeader(options);
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
    ...(theme ? [`      ${tag('button', theme.attrs)}`, ...theme.icons.map((icon) => `        ${iconHtml(icon)}`), '      </button>'] : []),
    `      ${tag('div', switcher)}`,
    ...buttons.map((button) => `        ${tag('button', button.attrs)}${escapeHtml(button.label)}</button>`),
    '      </div>',
    '    </div>',
    '  </div>',
    '</header>',
  ];
  return indented('site-header', lines, options.indent);
}
