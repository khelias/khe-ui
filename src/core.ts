/** Extra attributes for one part of a component, rendered after the part's own. */
export type Attrs = Readonly<Record<string, string>>;

export type Pairs = readonly (readonly [string, string])[];

/** An inline icon both renderers draw: the `svg`'s attributes and the `d` of each path. */
export interface Icon {
  readonly attrs: Pairs;
  readonly paths: readonly string[];
}

type Component = 'site-header' | 'site-footer';

// Names that mean the same in an HTML string and as a React prop, and are no event handler.
const ALLOWED_NAME = /^(?:data-[a-z0-9]+(?:-[a-z0-9]+)*|aria-[a-z]+|id|lang|dir|title|translate)$/;

/** A part's own attributes, then the checked `attrs` for it, which may not repeat an own name. */
function withAttrs(component: Component, part: string, own: Pairs, attrs: Attrs | undefined): Pairs {
  const extra = Object.entries(attrs ?? {}).map(([name, value]) => {
    if (!ALLOWED_NAME.test(name)) {
      throw new TypeError(`${component}: attrs.${part} has ${name}; only data-*, aria-*, id, lang, dir, title and translate are allowed`);
    }
    if (own.some(([ownName]) => ownName === name)) {
      throw new TypeError(`${component}: attrs.${part} repeats ${name}, which the part sets itself`);
    }
    if (typeof value !== 'string') {
      throw new TypeError(`${component}: attrs.${part}.${name} is not a string`);
    }
    return [name, value] as const;
  });
  return [...own, ...extra];
}

function checkedParts(component: Component, attrs: object, parts: readonly string[]): void {
  for (const part of Object.keys(attrs)) {
    if (!parts.includes(part)) throw new TypeError(`${component}: attrs has an unknown part ${part}`);
  }
}

// React 19's own test for a javascript: URL, so both renderers refuse the same hrefs.
const JAVASCRIPT_URL = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;

function checkedHref(component: Component, where: string, href: string): string {
  if (JAVASCRIPT_URL.test(href)) throw new TypeError(`${component}: the ${where} href is a javascript: URL`);
  return href;
}

/** Whether a kicker was given: something React renders as content, or a non-empty string. */
function hasContent<T>(value: T): value is Exclude<T, undefined | null | boolean | ''> {
  return value !== undefined && value !== null && typeof value !== 'boolean' && value !== '';
}

function icon(className: string, ...paths: string[]): Icon {
  return {
    attrs: [
      ['class', className],
      ['viewBox', '0 0 24 24'],
      ['aria-hidden', 'true'],
      ['focusable', 'false'],
    ],
    paths,
  };
}

// The toggle shows the theme a press leads to: the sun while dark shows, the moon while light does.
const SUN = icon(
  'site-header__theme-sun',
  'M8 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0',
  'M12 3v2M12 19v2M3 12h2M19 12h2M5.64 5.64l1.41 1.41M16.95 16.95l1.41 1.41M5.64 18.36l1.41-1.41M16.95 7.05l1.41-1.41',
);
const MOON = icon('site-header__theme-moon', 'M20 14.5A8 8 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z');

export interface SiteHeaderLocale<Code extends string = string> {
  /** Goes into `data-lang-option`. */
  readonly code: Code;
  /** The button's text, e.g. `ET`. */
  readonly label: string;
  /** Extra attributes for this locale's button. */
  readonly attrs?: Attrs;
}

export interface SiteHeaderContext<Node> {
  readonly kicker?: Node;
  readonly title: Node;
  /** Makes the context a link. */
  readonly href?: string;
}

export interface SiteHeaderPartAttrs {
  readonly brand?: Attrs;
  readonly context?: Attrs;
  readonly kicker?: Attrs;
  readonly title?: Attrs;
  readonly theme?: Attrs;
  readonly switcher?: Attrs;
}

/**
 * What both renderers take. `Node` is the type of kicker and title (a string, or a
 * React node); `Code` narrows the locale codes to the app's own type, e.g. `'et' | 'en'`.
 */
export interface SiteHeaderBaseOptions<Node, Code extends string = string> {
  /** The KHE.ee mark: where it leads and its accessible name. */
  readonly brand: { readonly href: string; readonly label: string };
  readonly context?: SiteHeaderContext<Node>;
  /** A light/dark toggle in front of the switcher; `label` is its accessible name, e.g. `Dark theme`. */
  readonly themeToggle?: { readonly label: string };
  readonly locales: readonly SiteHeaderLocale<Code>[];
  readonly activeLocale: Code;
  /** The switcher group's accessible name, e.g. `Keel`. */
  readonly languageLabel: string;
  /** Over a page laid out with `position: fixed`; see `--host-h` in the CSS. */
  readonly fixed?: boolean;
  readonly attrs?: SiteHeaderPartAttrs;
}

const HEADER_PARTS = ['brand', 'context', 'kicker', 'title', 'theme', 'switcher'] as const;

/**
 * The checked parts of the header, in contract order, that both renderers only lay
 * out. `dark` sets the toggle's `aria-pressed`. Throws on options that would render
 * a broken header, attrs of a toggle not rendered included.
 */
export function prepareHeader<Node, Code extends string>(options: SiteHeaderBaseOptions<Node, Code>, dark = false) {
  const { brand, context, themeToggle, locales, activeLocale, languageLabel, fixed, attrs = {} } = options;
  if (locales.length === 0) throw new TypeError('site-header: locales is empty');
  if (new Set(locales.map((locale) => locale.code)).size !== locales.length) {
    throw new TypeError('site-header: two locales have the same code');
  }
  if (!locales.some((locale) => locale.code === activeLocale)) {
    throw new TypeError(`site-header: activeLocale ${activeLocale} is not one of the locales`);
  }
  checkedParts('site-header', attrs, HEADER_PARTS);
  if (attrs.theme && !themeToggle) throw new TypeError('site-header: attrs.theme without themeToggle');
  const part = (name: string, own: Pairs, extra: Attrs | undefined) => withAttrs('site-header', name, own, extra);
  const contextHref: Pairs = context?.href === undefined ? [] : [['href', checkedHref('site-header', 'context', context.href)]];
  // Checked even without a context, so a bad name fails on every page, not only some.
  const contextAttrs = part('context', [['class', 'site-header__context'], ...contextHref], attrs.context);
  const kicker = part('kicker', [], attrs.kicker);
  const title = part('title', [], attrs.title);

  return {
    headerClass: fixed ? 'site-header site-header--fixed' : 'site-header',
    brand: part(
      'brand',
      [
        ['class', 'site-header__brand brand-mark'],
        ['href', checkedHref('site-header', 'brand', brand.href)],
        ['aria-label', brand.label],
      ],
      attrs.brand,
    ),
    context: context && {
      tag: contextHref.length ? ('a' as const) : ('div' as const),
      attrs: contextAttrs,
      kicker: hasContent(context.kicker) ? { node: context.kicker, attrs: kicker } : undefined,
      title: { node: context.title, attrs: title },
    },
    theme: themeToggle && {
      attrs: part(
        'theme',
        [
          ['class', 'site-header__theme'],
          ['type', 'button'],
          ['aria-label', themeToggle.label],
          ['aria-pressed', String(dark)],
        ],
        attrs.theme,
      ),
      icons: [SUN, MOON] as const,
    },
    switcher: part(
      'switcher',
      [
        ['class', 'language-switcher'],
        ['role', 'group'],
        ['aria-label', languageLabel],
      ],
      attrs.switcher,
    ),
    buttons: locales.map(({ code, label, attrs: extra }) => ({
      code,
      label,
      attrs: part(
        'button',
        [
          ['type', 'button'],
          ['data-lang-option', code],
          ['aria-pressed', String(code === activeLocale)],
        ],
        extra,
      ),
    })),
  };
}

// Simple Icons' GitHub and LinkedIn marks (CC0), as khe.ee has shown them.
const FOOTER_ICONS = {
  github: icon(
    'site-footer__icon',
    'M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z',
  ),
  linkedin: icon(
    'site-footer__icon',
    'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  ),
} as const;

export interface SiteFooterLink<Node> {
  readonly label: Node;
  readonly href: string;
  /** A built-in brand mark in front of the label. */
  readonly icon?: keyof typeof FOOTER_ICONS;
  readonly attrs?: Attrs;
}

export interface SiteFooterLine<Node> {
  readonly text: Node;
  readonly attrs?: Attrs;
}

export interface SiteFooterPartAttrs {
  readonly footer?: Attrs;
  readonly nav?: Attrs;
}

/** What both footer renderers take. `Node` is the type of link labels and lines. */
export interface SiteFooterBaseOptions<Node> {
  /** The link list's accessible name, e.g. `Page links`. */
  readonly label: string;
  /** In order; at least one. */
  readonly links: readonly SiteFooterLink<Node>[];
  /** Lines of text under the links, e.g. where the site is hosted. */
  readonly lines?: readonly SiteFooterLine<Node>[];
  readonly attrs?: SiteFooterPartAttrs;
}

const FOOTER_PARTS = ['footer', 'nav'] as const;

/** The checked parts of the footer, in contract order, that both renderers only lay out. */
export function prepareFooter<Node>(options: SiteFooterBaseOptions<Node>) {
  const { label, links, lines = [], attrs = {} } = options;
  if (links.length === 0) throw new TypeError('site-footer: links is empty');
  checkedParts('site-footer', attrs, FOOTER_PARTS);
  const part = (name: string, own: Pairs, extra: Attrs | undefined) => withAttrs('site-footer', name, own, extra);

  return {
    footer: part('footer', [['class', 'site-footer']], attrs.footer),
    nav: part('nav', [['aria-label', label]], attrs.nav),
    links: links.map((link, index) => {
      if (link.icon !== undefined && !Object.hasOwn(FOOTER_ICONS, link.icon)) throw new TypeError(`site-footer: unknown icon ${link.icon}`);
      return {
        label: link.label,
        attrs: part('link', [['href', checkedHref('site-footer', `links[${index}]`, link.href)]], link.attrs),
        icon: link.icon === undefined ? undefined : FOOTER_ICONS[link.icon],
      };
    }),
    // Hidden from assistive technology, which lists the links anyway.
    divider: [
      ['class', 'site-footer__divider'],
      ['aria-hidden', 'true'],
    ] as Pairs,
    lines: lines.map((line) => ({
      text: line.text,
      attrs: part('line', [['class', 'site-footer__line']], line.attrs),
    })),
  };
}
