// @vitest-environment happy-dom
import { StrictMode, act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SiteHeader, type SiteHeaderProps, useThemeOverride } from '../src/react.js';
import { parse, setSystem } from './dom.js';
import { APP_ACTION } from './selectors.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const props: SiteHeaderProps = {
  brand: { href: '/', label: 'KHE home' },
  locales: [
    { code: 'et', label: 'ET' },
    { code: 'en', label: 'EN' },
  ],
  activeLocale: 'en',
  languageLabel: 'Language',
  context: { title: 'Trips' },
};

let container: HTMLElement | undefined;
let unmount: (() => void) | undefined;

function mount(element: React.ReactElement) {
  container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  act(() => root.render(element));
  unmount = () => act(() => root.unmount());
  return container;
}

const button = (root: HTMLElement, code: string) => root.querySelector<HTMLButtonElement>(`button[data-lang-option="${code}"]`)!;

afterEach(() => {
  unmount?.();
  unmount = undefined;
  container?.remove();
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  setSystem('light');
});

const themeButton = (root: HTMLElement) => root.querySelector<HTMLButtonElement>('button.site-header__theme')!;

describe('SiteHeader', () => {
  it('calls onLocaleChange with the code, and not for the active locale', () => {
    const onLocaleChange = vi.fn();
    const root = mount(<SiteHeader {...props} onLocaleChange={onLocaleChange} />);
    act(() => button(root, 'en').click());
    expect(onLocaleChange).not.toHaveBeenCalled();
    act(() => button(root, 'et').click());
    expect(onLocaleChange).toHaveBeenCalledExactlyOnceWith('et');
  });

  it('follows the activeLocale the app passes back, under StrictMode', () => {
    function App() {
      const [locale, setLocale] = useState('en');
      return <SiteHeader {...props} activeLocale={locale} onLocaleChange={setLocale} />;
    }
    const root = mount(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    expect(root.querySelectorAll('header')).toHaveLength(1);
    act(() => button(root, 'et').click());
    expect(button(root, 'et').getAttribute('aria-pressed')).toBe('true');
    expect(button(root, 'en').getAttribute('aria-pressed')).toBe('false');
  });

  it('renders actions before the switcher, and a node as the title', () => {
    const html = renderToStaticMarkup(
      <SiteHeader {...props} context={{ title: <em>Rome</em> }} actions={<button type="button" className="add">+</button>} />,
    );
    expect(html).toContain('<strong class="site-header__title"><em>Rome</em></strong>');
    expect(html).toContain('<div class="site-header__actions"><button type="button" class="add">+</button><div class="language-switcher"');
  });

  it('puts attrs on the right element', () => {
    const root = mount(
      <SiteHeader
        {...props}
        locales={[
          { code: 'et', label: 'ET', attrs: { 'data-part': 'et' } },
          { code: 'en', label: 'EN' },
        ]}
        rooms={{ current: 'trips', locale: 'en' }}
        context={{ title: 'T', href: '/x' }}
        attrs={{
          brand: { 'data-part': 'brand' },
          rooms: { 'data-part': 'rooms' },
          title: { 'data-part': 'title' },
          switcher: { 'data-part': 'switcher' },
        }}
      />,
    );
    const part = (name: string) => root.querySelector(`[data-part="${name}"]`)!;
    expect(part('brand').matches('a.site-header__brand')).toBe(true);
    expect(part('rooms').matches('button.site-header__rooms')).toBe(true);
    expect(part('title').matches('a.site-header__title[href="/x"]')).toBe(true);
    expect(part('switcher').matches('div.language-switcher')).toBe(true);
    expect(part('et').matches('button[data-lang-option="et"]')).toBe(true);
    expect(button(root, 'en').hasAttribute('data-part')).toBe(false);
  });
});

describe('SiteHeader rooms menu', () => {
  it('renders a native popover without a React warning', () => {
    const error = vi.spyOn(console, 'error');
    try {
      const root = mount(
        <StrictMode>
          <SiteHeader {...props} rooms={{ current: 'trips', locale: 'en', currentHref: '/' }} />
        </StrictMode>,
      );
      const rooms = root.querySelector('button.site-header__rooms')!;
      expect(rooms.getAttribute('popovertarget')).toBe('khe-rooms');
      expect(rooms.getAttribute('type')).toBe('button');
      const menu = root.querySelector('nav.site-header__rooms-menu')!;
      expect(menu.id).toBe('khe-rooms');
      expect(menu.getAttribute('popover')).toBe('');
      expect(menu.getAttribute('aria-label')).toBe('Rooms');
      expect(error).not.toHaveBeenCalled();
    } finally {
      error.mockRestore();
    }
  });

  it('marks and checks the current room only', () => {
    const root = mount(<SiteHeader {...props} rooms={{ current: 'trips', locale: 'en', currentHref: '/' }} />);
    const items = [...root.querySelectorAll('a.site-header__room')];
    expect(items).toHaveLength(5);
    const current = items.filter((item) => item.getAttribute('aria-current') === 'true');
    expect(items.filter((item) => item.hasAttribute('aria-current'))).toEqual(current);
    expect(current.map((item) => item.getAttribute('data-khe-room'))).toEqual(['trips']);
    expect(items.filter((item) => item.querySelector('svg.site-header__room-check')).map((item) => item.getAttribute('data-khe-room'))).toEqual(['trips']);
    expect(current[0]!.getAttribute('href')).toBe('/');
    expect(current[0]!.hasAttribute('data-khe-room-own')).toBe(true);
  });
});

describe('SiteHeader theme toggle', () => {
  it('presses the toggle while dark shows and calls onToggle once per click', () => {
    const onToggle = vi.fn();
    const root = mount(<SiteHeader {...props} themeToggle={{ label: 'Dark theme', dark: true, onToggle }} />);
    expect(themeButton(root).getAttribute('aria-pressed')).toBe('true');
    expect(themeButton(root).getAttribute('aria-label')).toBe('Dark theme');
    act(() => themeButton(root).click());
    expect(onToggle).toHaveBeenCalledTimes(1);
    act(() => themeButton(root).click());
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  // happy-dom matches :has() with a combinator inside on any header, so this checks its argument.
  it('finds an action for the narrow rule that hides the title, and not the toggle or the switcher', () => {
    const found = (element: React.ReactElement) => [...parse(renderToStaticMarkup(element)).querySelectorAll(APP_ACTION)].map((node) => node.className);
    const themeToggle = { label: 'T', dark: false, onToggle: () => {} };
    expect(found(<SiteHeader {...props} themeToggle={themeToggle} actions={<button type="button" className="add">+</button>} />)).toEqual(['add']);
    expect(found(<SiteHeader {...props} themeToggle={themeToggle} />)).toEqual([]);
  });

  it('renders the toggle after the actions and before the switcher', () => {
    const html = renderToStaticMarkup(
      <SiteHeader {...props} actions={<button type="button" className="add">+</button>} themeToggle={{ label: 'T', dark: false, onToggle: () => {} }} />,
    );
    expect(html).toMatch(/<button type="button" class="add">\+<\/button><button class="site-header__theme"[^>]*aria-pressed="false">.*<\/button><div class="language-switcher"/);
  });

  it('wires the toggle to the stored override through useThemeOverride', () => {
    window.localStorage.setItem('khe-test-theme', 'dark');
    function App() {
      const { dark, toggle } = useThemeOverride('khe-test-theme');
      return <SiteHeader {...props} themeToggle={{ label: 'Dark theme', dark, onToggle: toggle }} />;
    }
    const root = mount(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    expect(themeButton(root).getAttribute('aria-pressed')).toBe('true');
    expect(document.documentElement.dataset.theme).toBe('dark');
    act(() => themeButton(root).click());
    expect(themeButton(root).getAttribute('aria-pressed')).toBe('false');
    expect(window.localStorage.getItem('khe-test-theme')).toBeNull();
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    act(() => setSystem('dark'));
    expect(themeButton(root).getAttribute('aria-pressed')).toBe('true');
    act(() => themeButton(root).click());
    expect(window.localStorage.getItem('khe-test-theme')).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(themeButton(root).getAttribute('aria-pressed')).toBe('false');
  });
});

describe('SiteHeader types', () => {
  it('narrows onLocaleChange to the app locale type', () => {
    type Locale = 'et' | 'en';
    const setLocale = (next: Locale) => next;
    const locales: { code: Locale; label: string }[] = [
      { code: 'et', label: 'ET' },
      { code: 'en', label: 'EN' },
    ];
    const html = renderToStaticMarkup(
      <SiteHeader brand={props.brand} locales={locales} activeLocale="et" languageLabel="Keel" onLocaleChange={setLocale} />,
    );
    expect(html).toContain('data-lang-option="et" aria-pressed="true"');
  });
});
