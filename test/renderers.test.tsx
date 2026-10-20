// @vitest-environment happy-dom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SiteHeader } from '../src/react.js';
import { type SiteHeaderOptions, renderSiteHeader } from '../src/site-header.js';
import { normalise, parse } from './dom.js';

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
  'theme toggle': { ...base, context: { title: 'Mängud' }, themeToggle: { label: 'Tume teema' } },
  'every attrs part': {
    ...base,
    themeToggle: { label: 'Dark "theme" & <more>' },
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
      theme: { 'data-i18n-aria': 'headerTheme' },
      switcher: { 'data-i18n-aria': 'headerLanguage' },
    },
  },
};

// The string renderer's toggle is never pressed; React's follows `dark`.
const react = ({ themeToggle, ...options }: SiteHeaderOptions) =>
  renderToStaticMarkup(<SiteHeader {...options} {...(themeToggle && { themeToggle: { ...themeToggle, dark: false, onToggle: () => {} } })} />);

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
    expect(html).toContain(
      '<button class="site-header__theme" type="button" aria-label="Dark &quot;theme&quot; &amp; &lt;more&gt;" aria-pressed="false" data-i18n-aria="headerTheme">',
    );
    expect(html).toContain('<svg class="site-header__theme-sun" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0"></path><path d="');
    expect(html).toContain('<svg class="site-header__theme-moon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="');
    expect(html).toContain('<div class="language-switcher" role="group" aria-label="Keel" data-i18n-aria="headerLanguage">');
    expect(html).toContain('<button type="button" data-lang-option="et" aria-pressed="true" title="Eesti">ET</button>');
    expect(html).toContain('<button type="button" data-lang-option="en" aria-pressed="false" data-x="&quot;q&quot;">EN</button>');
  });

  it('nests the parts as the contract says', () => {
    const doc = parse(renderSiteHeader(fixtures['kicker and title']!));
    expect(doc.querySelector('header.site-header > .site-header__inner > a.site-header__brand.brand-mark')).not.toBeNull();
    expect(doc.querySelector('.site-header__inner > div.site-header__context > span + strong')).not.toBeNull();
    expect(doc.querySelectorAll('.site-header__actions > div.language-switcher[role="group"] > button[type="button"]')).toHaveLength(2);
    expect(doc.querySelector('.site-header__theme')).toBeNull();
  });

  it('puts the theme toggle after the actions and before the switcher, holding sun then moon', () => {
    const doc = parse(renderSiteHeader(fixtures['theme toggle']!));
    const actions = [...doc.querySelector('.site-header__actions')!.children];
    expect(actions.map((child) => child.className)).toEqual(['site-header__theme', 'language-switcher']);
    const icons = [...doc.querySelectorAll('button.site-header__theme > svg')];
    expect(icons.map((svg) => svg.getAttribute('class'))).toEqual(['site-header__theme-sun', 'site-header__theme-moon']);
    expect(icons.every((svg) => svg.getAttribute('aria-hidden') === 'true' && svg.getAttribute('focusable') === 'false')).toBe(true);
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
    expect(() => renderSiteHeader({ ...base, attrs: { button: {} } as never })).toThrow(/unknown part button/);
  });

  it('refuses attrs.theme without a toggle, and names the toggle sets itself', () => {
    expect(() => renderSiteHeader({ ...base, attrs: { theme: { 'data-x': 'y' } } })).toThrow(/attrs.theme without themeToggle/);
    const themeToggle = { label: 'Dark theme' };
    expect(() => renderSiteHeader({ ...base, themeToggle, attrs: { theme: { 'aria-pressed': 'true' } } })).toThrow(/repeats aria-pressed/);
    expect(() => renderSiteHeader({ ...base, themeToggle, attrs: { theme: { 'aria-label': 'x' } } })).toThrow(/repeats aria-label/);
    expect(() => renderSiteHeader({ ...base, themeToggle, attrs: { theme: { onclick: 'x' } } })).toThrow(/only data-\*/);
  });

  it('refuses an unknown active locale and a javascript: link', () => {
    expect(() => renderSiteHeader({ ...base, activeLocale: 'fi' })).toThrow(/not one of the locales/);
    expect(() => renderSiteHeader({ ...base, locales: [...base.locales, { code: 'et', label: 'EE' }] })).toThrow(/same code/);
    expect(() => renderSiteHeader({ ...base, brand: { href: ' JavaScript:alert(1)', label: 'x' } })).toThrow(/javascript:/);
    expect(() => renderSiteHeader({ ...base, context: { title: 'x', href: 'java\tscript:alert(1)' } })).toThrow(/javascript:/);
  });
});
