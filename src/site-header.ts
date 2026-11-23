import { type SiteHeaderBaseOptions, prepareHeader } from './core.js';
import { escapeHtml, iconHtml, indented, tag } from './html.js';

export type { Attrs, SiteHeaderContext, SiteHeaderDemo, SiteHeaderLocale, SiteHeaderPartAttrs, SiteHeaderProduct, SiteHeaderRooms } from './core.js';
export { escapeHtml } from './html.js';

export interface SiteHeaderOptions<Code extends string = string> extends SiteHeaderBaseOptions<string, Code> {
  /** Put in front of every line, e.g. the indent of the line the header replaces. */
  readonly indent?: string;
}

/**
 * The KHE site header as an HTML string, for pages built without a framework.
 * It holds no behaviour: the page wires the `data-lang-option` buttons itself, and
 * the theme toggle through `wireThemeToggle` from `@khelias/ui/theme`; the rooms menu
 * is a native popover.
 */
export function renderSiteHeader<Code extends string>(options: SiteHeaderOptions<Code>): string {
  const { header, brand, rooms, slash, title, theme, switcher, demo, buttons } = prepareHeader(options);
  const link = demo?.link ? ` ${tag('a', demo.link.attrs)}${escapeHtml(demo.link.text)}</a>` : '';
  const lines = [
    tag('header', header),
    '  <div class="site-header__inner">',
    `    ${tag('a', brand)}`,
    '      <span>KHE</span><span class="brand-mark__suffix">.ee</span>',
    '    </a>',
    ...(rooms
      ? [
          `    ${tag('button', rooms.button)}<span class="site-header__rooms-name">${escapeHtml(rooms.name)}</span>` +
            `${iconHtml(rooms.chevron)}</button>`,
          `    ${tag('nav', rooms.menu)}`,
          '      <ul>',
          ...rooms.items.map(
            (item) =>
              `        <li class="site-header__rooms-item">${tag('a', item.attrs)}<span class="site-header__room-dot" aria-hidden="true"></span>` +
              `<span class="site-header__room-name">${escapeHtml(item.name)}</span>` +
              `<span class="site-header__room-note">${escapeHtml(item.note)}</span>${item.check ? iconHtml(item.check) : ''}</a></li>`,
          ),
          '      </ul>',
          '    </nav>',
        ]
      : []),
    ...(slash ? [`    ${tag('span', slash)}/</span>`] : []),
    ...(title ? [`    ${tag(title.tag, title.attrs)}${escapeHtml(title.node)}</${title.tag}>`] : []),
    '    <div class="site-header__actions">',
    ...(theme ? [`      ${tag('button', theme.attrs)}`, `        ${iconHtml(theme.icon)}`, '      </button>'] : []),
    `      ${tag('div', switcher)}`,
    ...buttons.map((button) => `        ${tag('button', button.attrs)}${escapeHtml(button.label)}</button>`),
    '      </div>',
    '    </div>',
    '  </div>',
    ...(demo
      ? [
          `  ${tag('p', demo.line)}`,
          '    <span class="site-header__demo-inner">',
          `      ${tag('strong', demo.label.attrs)}${escapeHtml(demo.label.text)}</strong>`,
          '      <span class="site-header__demo-body">',
          `        ${tag('span', demo.text.attrs)}${escapeHtml(demo.text.text)}</span>${link}`,
          '      </span>',
          '    </span>',
          '  </p>',
        ]
      : []),
    '</header>',
  ];
  return indented('site-header', lines, options.indent);
}
