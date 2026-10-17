/** Extra attributes for one part of the header, rendered after the part's own. */
export type Attrs = Readonly<Record<string, string>>;

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
  readonly locales: readonly SiteHeaderLocale<Code>[];
  readonly activeLocale: Code;
  /** The switcher group's accessible name, e.g. `Keel`. */
  readonly languageLabel: string;
  /** Over a page laid out with `position: fixed`; see `--host-h` in the CSS. */
  readonly fixed?: boolean;
  readonly attrs?: SiteHeaderPartAttrs;
}

export type Pairs = readonly (readonly [string, string])[];

// Names that mean the same in an HTML string and as a React prop, and are no event handler.
const ALLOWED_NAME = /^(?:data-[a-z0-9]+(?:-[a-z0-9]+)*|aria-[a-z]+|id|lang|dir|title|translate)$/;

// Allowed names a part sets itself, so an `attrs` entry may not repeat them.
const RESERVED: Record<keyof SiteHeaderPartAttrs | 'button', readonly string[]> = {
  brand: ['aria-label'],
  context: [],
  kicker: [],
  title: [],
  switcher: ['aria-label'],
  button: ['data-lang-option', 'aria-pressed'],
};

function checkedAttrs(part: keyof typeof RESERVED, attrs: Attrs | undefined): Pairs {
  return Object.entries(attrs ?? {}).map(([name, value]) => {
    if (!ALLOWED_NAME.test(name)) {
      throw new TypeError(`site-header: attrs.${part} has ${name}; only data-*, aria-*, id, lang, dir, title and translate are allowed`);
    }
    if (RESERVED[part].includes(name)) {
      throw new TypeError(`site-header: attrs.${part} repeats ${name}, which the header sets itself`);
    }
    if (typeof value !== 'string') {
      throw new TypeError(`site-header: attrs.${part}.${name} is not a string`);
    }
    return [name, value] as const;
  });
}

// React 19's own test for a javascript: URL, so both renderers refuse the same hrefs.
const JAVASCRIPT_URL = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;

function checkedHref(where: string, href: string): string {
  if (JAVASCRIPT_URL.test(href)) throw new TypeError(`site-header: the ${where} href is a javascript: URL`);
  return href;
}

/** Whether a kicker was given: something React renders as content, or a non-empty string. */
function hasContent<T>(value: T): value is Exclude<T, undefined | null | boolean | ''> {
  return value !== undefined && value !== null && typeof value !== 'boolean' && value !== '';
}

/**
 * The checked parts, in contract order, that both renderers only lay out. Throws on
 * options that would render a broken header, attrs of parts not rendered included.
 */
export function prepare<Node, Code extends string>(options: SiteHeaderBaseOptions<Node, Code>) {
  const { brand, context, locales, activeLocale, languageLabel, fixed, attrs = {} } = options;
  if (locales.length === 0) throw new TypeError('site-header: locales is empty');
  if (new Set(locales.map((locale) => locale.code)).size !== locales.length) {
    throw new TypeError('site-header: two locales have the same code');
  }
  if (!locales.some((locale) => locale.code === activeLocale)) {
    throw new TypeError(`site-header: activeLocale ${activeLocale} is not one of the locales`);
  }
  for (const part of Object.keys(attrs)) {
    if (!Object.hasOwn(RESERVED, part) || part === 'button') throw new TypeError(`site-header: attrs has an unknown part ${part}`);
  }
  const kicker = checkedAttrs('kicker', attrs.kicker);
  const title = checkedAttrs('title', attrs.title);
  const contextAttrs = checkedAttrs('context', attrs.context);
  const contextHref = context?.href === undefined ? [] : [['href', checkedHref('context', context.href)] as const];

  return {
    headerClass: fixed ? 'site-header site-header--fixed' : 'site-header',
    brand: [
      ['class', 'site-header__brand brand-mark'],
      ['href', checkedHref('brand', brand.href)],
      ['aria-label', brand.label],
      ...checkedAttrs('brand', attrs.brand),
    ] as Pairs,
    context: context && {
      tag: contextHref.length ? ('a' as const) : ('div' as const),
      attrs: [['class', 'site-header__context'], ...contextHref, ...contextAttrs] as Pairs,
      kicker: hasContent(context.kicker) ? { node: context.kicker, attrs: kicker } : undefined,
      title: { node: context.title, attrs: title },
    },
    switcher: [
      ['class', 'language-switcher'],
      ['role', 'group'],
      ['aria-label', languageLabel],
      ...checkedAttrs('switcher', attrs.switcher),
    ] as Pairs,
    buttons: locales.map(({ code, label, attrs: extra }) => ({
      code,
      label,
      attrs: [
        ['type', 'button'],
        ['data-lang-option', code],
        ['aria-pressed', String(code === activeLocale)],
        ...checkedAttrs('button', extra),
      ] as Pairs,
    })),
  };
}
