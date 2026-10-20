// @vitest-environment happy-dom
import { StrictMode, act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SiteHeader, type SiteHeaderProps, useThemeOverride } from '../src/react.js';
import { setSystem } from './dom.js';

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

  it('renders actions before the switcher, and nodes as kicker and title', () => {
    const html = renderToStaticMarkup(
      <SiteHeader
        {...props}
        context={{ kicker: <button type="button">Home</button>, title: <em>Rome</em> }}
        actions={<button type="button" className="add">+</button>}
      />,
    );
    expect(html).toContain('<span><button type="button">Home</button></span><strong><em>Rome</em></strong>');
    expect(renderToStaticMarkup(<SiteHeader {...props} context={{ kicker: true, title: 'T' }} />)).not.toContain('<span></span>');
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
        context={{ kicker: 'K', title: 'T', href: '/x' }}
        attrs={{
          brand: { 'data-part': 'brand' },
          context: { 'data-part': 'context' },
          kicker: { 'data-part': 'kicker' },
          title: { 'data-part': 'title' },
          switcher: { 'data-part': 'switcher' },
        }}
      />,
    );
    const part = (name: string) => root.querySelector(`[data-part="${name}"]`)!;
    expect(part('brand').matches('a.site-header__brand')).toBe(true);
    expect(part('context').matches('a.site-header__context')).toBe(true);
    expect(part('kicker').matches('.site-header__context > span')).toBe(true);
    expect(part('title').matches('.site-header__context > strong')).toBe(true);
    expect(part('switcher').matches('div.language-switcher')).toBe(true);
    expect(part('et').matches('button[data-lang-option="et"]')).toBe(true);
    expect(button(root, 'en').hasAttribute('data-part')).toBe(false);
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
