import { type SiteHeaderBaseOptions, prepareHeader } from './core.js';
import { escapeHtml, iconHtml, indented, tag } from './html.js';

export type { Attrs, SiteHeaderContext, SiteHeaderLocale, SiteHeaderPartAttrs, SiteHeaderRooms } from './core.js';
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
  const { headerClass, brand, rooms, slash, title, theme, switcher, buttons } = prepareHeader(options);
  const lines = [
    tag('header', [['class', headerClass]]),
    '  <div class="site-header__inner">',
    `    ${tag('a', brand)}`,
    '      <span>KHE</span><span class="brand-mark__suffix">.ee</span>',
    '    </a>',
    ...(rooms
      ? [
          `    ${tag('button', rooms.button)}<span class="site-header__rooms-name">${escapeHtml(rooms.name)}</span>` +
            `<span class="site-header__sr">${escapeHtml(rooms.label)}</span>${iconHtml(rooms.chevron)}</button>`,
          `    ${tag('nav', rooms.menu)}`,
          '      <ul>',
          ...rooms.items.map(
            (item) =>
              `        <li>${tag('a', item.attrs)}<span class="site-header__room-dot" aria-hidden="true"></span>` +
              `<span class="site-header__room-name">${escapeHtml(item.name)}</span><span class="site-header__sr">, </span>` +
              `<span class="site-header__room-note">${escapeHtml(item.note)}</span>${item.check ? iconHtml(item.check) : ''}</a></li>`,
          ),
          '      </ul>',
          '    </nav>',
        ]
      : []),
    ...(slash ? [`    ${tag('span', slash)}/</span>`] : []),
    ...(title ? [`    ${tag(title.tag, title.attrs)}${escapeHtml(title.node)}</${title.tag}>`] : []),
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
