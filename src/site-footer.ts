import { type SiteFooterBaseOptions, prepareFooter } from './core.js';
import { escapeHtml, iconHtml, indented, tag } from './html.js';

export type { Attrs, SiteFooterLine, SiteFooterLink, SiteFooterPartAttrs } from './core.js';

export interface SiteFooterOptions extends SiteFooterBaseOptions<string> {
  /** Put in front of every line, e.g. the indent of the line the footer replaces. */
  readonly indent?: string;
}

/** The KHE site footer as an HTML string, for pages built without a framework. */
export function renderSiteFooter(options: SiteFooterOptions): string {
  const { footer, nav, links, divider, lines } = prepareFooter(options);
  const html = [
    tag('footer', footer),
    `  ${tag('nav', nav)}`,
    ...links.flatMap((link, index) => [
      ...(index > 0 ? [`    ${tag('span', divider)}·</span>`] : []),
      `    ${tag('a', link.attrs)}${link.icon ? iconHtml(link.icon) : ''}${escapeHtml(link.label)}</a>`,
    ]),
    '  </nav>',
    ...lines.map((line) => `  ${tag('span', line.attrs)}${escapeHtml(line.text)}</span>`),
    '</footer>',
  ];
  return indented('site-footer', html, options.indent);
}
