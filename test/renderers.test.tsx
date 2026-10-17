// @vitest-environment happy-dom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SiteHeader, type SiteHeaderProps } from '../src/react.js';
import { type SiteHeaderOptions, renderSiteHeader } from '../src/site-header.js';

const base = {
  brand: { href: '/?lang=et', label: 'KHE avaleht' },
  locales: [
    { code: 'et', label: 'ET' },
    { code: 'en', label: 'EN' },
  ],
  activeLocale: 'et',
  languageLabel: 'Keel',
} satisfies SiteHeaderOptions;

const fixtures: Record<string, SiteHeaderOptions> = {
  'title only': { ...base, context: { title: 'Mängud' } },
  'kicker and title': { ...base, context: { kicker: 'KHE Games', title: 'Mängud' } },
  'context link': { ...base, context: { kicker: 'Arhitektuur', title: 'Otsus', href: '/architecture/?lang=et' } },
  'no context, fixed, English': { ...base, activeLocale: 'en', fixed: true },
  'escaped text': {
    ...base,
    brand: { href: '/?a=1&b="2"', label: 'Home & <away>' },
    languageLabel: `Lang "x" & 'y'`,
    locales: [
      { code: 'et', label: '<ET>' },
      { code: 'en', label: 'E&N' },
    ],
    context: { kicker: `Tom & Jerry's <b>`, title: 'Say "hi" <script>' },
  },
  'every attrs part': {
    ...base,
    locales: [
      { code: 'et', label: 'ET', attrs: { title: 'Eesti' } },
      { code: 'en', label: 'EN', attrs: { 'data-x': '"q"' } },
    ],
    context: { kicker: 'Arhitektuur', title: 'Otsus', href: '/architecture/' },
    attrs: {
      brand: { 'data-link': 'home', 'data-i18n-aria': 'headerHomeLanding' },
      context: { 'data-link': 'architecture' },
      kicker: { 'data-i18n': 'headerArchitecture' },
      title: { 'data-i18n': 'headerDecision', lang: 'en' },
      switcher: { 'data-i18n-aria': 'headerLanguage' },
    },
  },
};

// The string renderer indents; React writes no whitespace between tags.
const normalise = (html: string) => html.replace(/>\s+</g, '><').trim();
const react = (props: SiteHeaderProps) => renderToStaticMarkup(<SiteHeader {...props} />);
const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html');

describe('both renderers', () => {
  it.each(Object.entries(fixtures))('give the same markup: %s', (_, options) => {
    expect(normalise(renderSiteHeader(options))).toBe(react(options));
  });
});

describe('renderSiteHeader', () => {
  it('keeps the attribute order of the contract', () => {
    const html = renderSiteHeader(fixtures['every attrs part']!);
    expect(html).toContain('<header class="site-header">');
    expect(html).toContain(
      '<a class="site-header__brand brand-mark" href="/?lang=et" aria-label="KHE avaleht" data-link="home" data-i18n-aria="headerHomeLanding">',
    );
    expect(html).toContain('<span>KHE</span><span class="brand-mark__suffix">.ee</span>');
    expect(html).toContain('<a class="site-header__context" href="/architecture/" data-link="architecture">');
    expect(html).toContain('<span data-i18n="headerArchitecture">Arhitektuur</span>');
    expect(html).toContain('<strong data-i18n="headerDecision" lang="en">Otsus</strong>');
    expect(html).toContain('<div class="language-switcher" role="group" aria-label="Keel" data-i18n-aria="headerLanguage">');
    expect(html).toContain('<button type="button" data-lang-option="et" aria-pressed="true" title="Eesti">ET</button>');
    expect(html).toContain('<button type="button" data-lang-option="en" aria-pressed="false" data-x="&quot;q&quot;">EN</button>');
  });

  it('nests the parts as the contract says', () => {
    const doc = parse(renderSiteHeader(fixtures['kicker and title']!));
    expect(doc.querySelector('header.site-header > .site-header__inner > a.site-header__brand.brand-mark')).not.toBeNull();
    expect(doc.querySelector('.site-header__inner > div.site-header__context > span + strong')).not.toBeNull();
    expect(doc.querySelectorAll('.site-header__actions > div.language-switcher[role="group"] > button[type="button"]')).toHaveLength(2);
  });

  it('escapes & < > " in text and attributes', () => {
    const html = renderSiteHeader(fixtures['escaped text']!);
    expect(html).toContain('href="/?a=1&amp;b=&quot;2&quot;"');
    expect(html).toContain('aria-label="Home &amp; &lt;away&gt;"');
    expect(html).toContain('aria-label="Lang &quot;x&quot; &amp; &#x27;y&#x27;"');
    expect(html).toContain('<span>Tom &amp; Jerry&#x27;s &lt;b&gt;</span>');
    expect(html).toContain('<strong>Say &quot;hi&quot; &lt;script&gt;</strong>');
    expect(html).toContain('>&lt;ET&gt;</button>');
    expect(html).toContain('>E&amp;N</button>');
    expect(html).not.toMatch(/<(b|script)>/);
  });

  it('puts no aria-label on the header', () => {
    for (const options of Object.values(fixtures)) {
      expect(parse(renderSiteHeader(options)).querySelector('header')!.hasAttribute('aria-label')).toBe(false);
    }
  });

  it('presses the button of the active locale only', () => {
    const pressed = (activeLocale: string) =>
      [...parse(renderSiteHeader({ ...base, activeLocale })).querySelectorAll('button')].map((button) => button.getAttribute('aria-pressed'));
    expect(pressed('et')).toEqual(['true', 'false']);
    expect(pressed('en')).toEqual(['false', 'true']);
  });

  it('makes the context a link only with an href', () => {
    expect(renderSiteHeader(fixtures['title only']!)).toContain('<div class="site-header__context">');
    expect(renderSiteHeader(fixtures['context link']!)).toContain('<a class="site-header__context" href="/architecture/?lang=et">');
  });

  it('renders a kicker only when one is given', () => {
    expect(parse(renderSiteHeader(fixtures['title only']!)).querySelector('.site-header__context > span')).toBeNull();
    expect(parse(renderSiteHeader({ ...base, context: { kicker: '', title: 'x' } })).querySelector('.site-header__context > span')).toBeNull();
    expect(parse(renderSiteHeader(fixtures['kicker and title']!)).querySelector('.site-header__context > span')!.textContent).toBe('KHE Games');
  });

  it('marks a fixed header with the modifier', () => {
    expect(renderSiteHeader(fixtures['no context, fixed, English']!)).toMatch(/^<header class="site-header site-header--fixed">/);
  });

  it('indents every line', () => {
    const lines = renderSiteHeader({ ...base, indent: '    ' }).split('\n');
    expect(lines.every((line) => line.startsWith('    <') || line.startsWith('      '))).toBe(true);
    expect(lines[0]).toBe('    <header class="site-header">');
    expect(() => renderSiteHeader({ ...base, indent: '<b>' })).toThrow(/only spaces and tabs/);
  });

  it('refuses attrs that would replace its own or add behaviour', () => {
    expect(() => renderSiteHeader({ ...base, attrs: { brand: { 'aria-label': 'x' } } })).toThrow(/repeats aria-label/);
    expect(() => renderSiteHeader({ ...base, attrs: { switcher: { role: 'x' } } })).toThrow(/only data-\*/);
    expect(() => renderSiteHeader({ ...base, locales: [{ code: 'et', label: 'ET', attrs: { onclick: 'x' } }] })).toThrow(/onclick/);
    expect(() => renderSiteHeader({ ...base, locales: [{ code: 'et', label: 'ET', attrs: { 'aria-pressed': 'x' } }] })).toThrow(/repeats aria-pressed/);
    expect(() => renderSiteHeader({ ...base, attrs: { title: { 'data-a"b': 'x' } } })).toThrow(/only data-\*/);
    expect(() => renderSiteHeader({ ...base, attrs: { brnd: {} } as never })).toThrow(/unknown part brnd/);
  });

  it('refuses an unknown active locale and a javascript: link', () => {
    expect(() => renderSiteHeader({ ...base, activeLocale: 'fi' })).toThrow(/not one of the locales/);
    expect(() => renderSiteHeader({ ...base, locales: [...base.locales, { code: 'et', label: 'EE' }] })).toThrow(/same code/);
    expect(() => renderSiteHeader({ ...base, brand: { href: ' JavaScript:alert(1)', label: 'x' } })).toThrow(/javascript:/);
    expect(() => renderSiteHeader({ ...base, context: { title: 'x', href: 'java\tscript:alert(1)' } })).toThrow(/javascript:/);
  });
});
