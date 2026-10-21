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

const games = { current: 'games', locale: 'et' } as const;

const fixtures: Record<string, SiteHeaderOptions> = {
  'no rooms (landing)': base,
  'title only': { ...base, context: { title: 'Mängud' } },
  'rooms only': { ...base, rooms: games },
  'rooms and a title': { ...base, rooms: games, context: { title: 'Tarkade Mängud' } },
  'rooms and a linked title': { ...base, rooms: games, context: { title: 'Tarkade Mängud', href: '/study/?lang=et' } },
  'currentHref relative': { ...base, activeLocale: 'en', rooms: { current: 'trips', locale: 'en', currentHref: '/' }, context: { title: 'All trips' } },
  'no context, fixed, English': { ...base, activeLocale: 'en', fixed: true, rooms: { current: 'house', locale: 'en' } },
  'escaped text': {
    ...base,
    brand: { href: '/?a=1&b="2"', label: 'Home & <away>' },
    languageLabel: `Lang "x" & 'y'`,
    locales: [
      { code: 'et', label: '<ET>' },
      { code: 'en', label: 'E&N' },
    ],
    rooms: games,
    context: { title: 'Say "hi" <script>' },
  },
  'theme toggle': { ...base, context: { title: 'Mängud' }, themeToggle: { label: 'Tume teema' } },
  'every attrs part': {
    ...base,
    themeToggle: { label: 'Dark "theme" & <more>' },
    locales: [
      { code: 'et', label: 'ET', attrs: { title: 'Eesti' } },
      { code: 'en', label: 'EN', attrs: { 'data-x': '"q"' } },
    ],
    rooms: { current: 'server', locale: 'et' },
    context: { title: 'Otsus', href: '/architecture/' },
    attrs: {
      brand: { 'data-link': 'home', 'data-i18n-aria': 'headerHomeLanding' },
      rooms: { 'data-i18n-aria': 'headerRooms' },
      title: { 'data-i18n': 'headerDecision', lang: 'en' },
      theme: { 'data-i18n-aria': 'headerTheme' },
      switcher: { 'data-i18n-aria': 'headerLanguage' },
    },
  },
};

// The string renderer's toggle is never pressed; React's follows `dark`. React's server
// renderer spells the attribute as the prop, and HTML reads attribute names in any case.
const react = ({ themeToggle, ...options }: SiteHeaderOptions) =>
  renderToStaticMarkup(
    <SiteHeader {...options} {...(themeToggle && { themeToggle: { ...themeToggle, dark: false, onToggle: () => {} } })} />,
  ).replace(/ popoverTarget="/g, ' popovertarget="');

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
    expect(html).toContain(
      '<button class="site-header__rooms" type="button" popovertarget="khe-rooms" data-khe-room="server" data-i18n-aria="headerRooms">' +
        '<span class="site-header__rooms-name">Koduserver</span><span class="site-header__sr">, Toad</span>' +
        '<svg class="site-header__rooms-chevron" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 9l6 6 6-6"></path></svg></button>',
    );
    expect(html).toContain('<nav class="site-header__rooms-menu" id="khe-rooms" popover="" aria-label="Toad">');
    expect(html).toContain(
      '<li><a class="site-header__room" data-khe-room="home" href="https://khe.ee/?lang=et"><span class="site-header__room-dot" aria-hidden="true"></span>' +
        '<span class="site-header__room-name">Kodu</span><span class="site-header__sr">, </span><span class="site-header__room-note">Avaleht</span></a></li>',
    );
    expect(html).toContain(
      '<a class="site-header__room" data-khe-room="server" href="https://khe.ee/architecture/?lang=et" aria-current="true">',
    );
    expect(html).toContain('<span class="site-header__slash" aria-hidden="true">/</span>');
    expect(html).toContain('<a class="site-header__title" href="/architecture/" data-i18n="headerDecision" lang="en">Otsus</a>');
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
    const doc = parse(renderSiteHeader(fixtures['rooms and a title']!));
    const inner = [...doc.querySelector('.site-header__inner')!.children].map((child) => `${child.localName}.${child.className}`);
    expect(inner).toEqual([
      'a.site-header__brand brand-mark',
      'button.site-header__rooms',
      'nav.site-header__rooms-menu',
      'span.site-header__slash',
      'strong.site-header__title',
      'div.site-header__actions',
    ]);
    expect(doc.querySelectorAll('nav.site-header__rooms-menu > ul > li > a.site-header__room')).toHaveLength(5);
    expect(doc.querySelector('.site-header__rooms > .site-header__rooms-name + .site-header__sr + svg.site-header__rooms-chevron')).not.toBeNull();
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
    expect(html).toContain('<strong class="site-header__title">Say &quot;hi&quot; &lt;script&gt;</strong>');
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

  it('makes the title a link only with an href', () => {
    expect(renderSiteHeader(fixtures['rooms and a title']!)).toContain('<strong class="site-header__title">Tarkade Mängud</strong>');
    expect(renderSiteHeader(fixtures['rooms and a linked title']!)).toContain('<a class="site-header__title" href="/study/?lang=et">Tarkade Mängud</a>');
  });

  it('puts the slash only between a room and a title, and draws no kicker', () => {
    const slash = (options: SiteHeaderOptions) => parse(renderSiteHeader(options)).querySelector('.site-header__slash');
    expect(slash(fixtures['rooms and a title']!)).not.toBeNull();
    expect(slash(fixtures['rooms only']!)).toBeNull();
    expect(slash(fixtures['title only']!)).toBeNull();
    expect(slash(fixtures['no rooms (landing)']!)).toBeNull();
    for (const options of Object.values(fixtures)) expect(renderSiteHeader(options)).not.toMatch(/kicker|site-header__context/);
  });

  it('shows no rooms button or list without rooms', () => {
    const doc = parse(renderSiteHeader(fixtures['no rooms (landing)']!));
    expect(doc.querySelector('.site-header__rooms, .site-header__rooms-menu, [popover]')).toBeNull();
  });

  it('lists every room in order, with the current one marked and checked', () => {
    const doc = parse(renderSiteHeader(fixtures['rooms and a title']!));
    const items = [...doc.querySelectorAll('a.site-header__room')];
    expect(items.map((item) => item.getAttribute('data-khe-room'))).toEqual(['home', 'games', 'house', 'trips', 'server']);
    expect(items.map((item) => item.getAttribute('href'))).toEqual([
      'https://khe.ee/?lang=et',
      'https://games.khe.ee/?lang=et',
      'https://khe.ee/ha/?lang=et',
      'https://khe.ee/trips/?lang=et',
      'https://khe.ee/architecture/?lang=et',
    ]);
    expect(items.filter((item) => item.hasAttribute('aria-current')).map((item) => item.getAttribute('data-khe-room'))).toEqual(['games']);
    expect(items.filter((item) => item.querySelector('svg.site-header__room-check')).map((item) => item.getAttribute('data-khe-room'))).toEqual(['games']);
    expect(doc.querySelector('.site-header__rooms')!.textContent).toBe('Mängud, Toad');
    expect(items[0]!.textContent).toBe('Kodu, Avaleht');
  });

  it('names the rooms in the rooms locale, not the switcher', () => {
    const doc = parse(renderSiteHeader({ ...base, rooms: { current: 'house', locale: 'en' } }));
    expect(doc.querySelector('.site-header__rooms')!.textContent).toBe('Home automation, Rooms');
    expect(doc.querySelector('.site-header__rooms-menu')!.getAttribute('aria-label')).toBe('Rooms');
    expect(doc.querySelector('a.site-header__room')!.getAttribute('href')).toBe('https://khe.ee/?lang=en');
  });

  it('gives the current room the currentHref as given, and marks it as the app\'s own', () => {
    const doc = parse(renderSiteHeader(fixtures['currentHref relative']!));
    const trips = doc.querySelector('a[data-khe-room="trips"]')!;
    expect(trips.getAttribute('href')).toBe('/');
    expect(trips.hasAttribute('data-khe-room-own')).toBe(true);
    expect(doc.querySelectorAll('[data-khe-room-own]')).toHaveLength(1);
    expect(doc.querySelector('a[data-khe-room="home"]')!.getAttribute('href')).toBe('https://khe.ee/?lang=en');
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
    expect(() => renderSiteHeader({ ...base, rooms: { ...games, currentHref: 'javascript:alert(1)' } })).toThrow(/javascript:/);
  });

  it('refuses an unknown room or locale, and attrs.rooms without rooms', () => {
    expect(() => renderSiteHeader({ ...base, rooms: { current: 'attic' as never, locale: 'et' } })).toThrow(/unknown room attic/);
    expect(() => renderSiteHeader({ ...base, rooms: { current: 'games', locale: 'fi' as never } })).toThrow(/unknown locale fi/);
    expect(() => renderSiteHeader({ ...base, attrs: { rooms: { 'data-x': 'y' } } })).toThrow(/attrs.rooms without rooms/);
    expect(() => renderSiteHeader({ ...base, rooms: games, attrs: { rooms: { popovertarget: 'x' } } })).toThrow(/only data-\*/);
    expect(() => renderSiteHeader({ ...base, rooms: games, attrs: { rooms: { 'data-khe-room': 'x' } } })).toThrow(/repeats data-khe-room/);
    expect(() => renderSiteHeader({ ...base, attrs: { kicker: {} } as never })).toThrow(/unknown part kicker/);
    expect(() => renderSiteHeader({ ...base, attrs: { context: {} } as never })).toThrow(/unknown part context/);
  });
});
