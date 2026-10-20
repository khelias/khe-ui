// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderSiteHeader } from '../src/site-header.js';
import {
  applyThemeOverride,
  onSystemDarkChange,
  readThemeOverride,
  showsDark,
  systemDark,
  themeInitScript,
  toggledOverride,
  wireThemeToggle,
} from '../src/theme.js';
import { setSystem } from './dom.js';

const KEY = 'khe-theme';
const root = document.documentElement;

const header = () =>
  renderSiteHeader({
    brand: { href: '/', label: 'KHE home' },
    themeToggle: { label: 'Dark theme' },
    locales: [{ code: 'en', label: 'EN' }],
    activeLocale: 'en',
    languageLabel: 'Language',
  });
const toggle = () => document.querySelector<HTMLButtonElement>('.site-header__theme')!;

function blockStorage() {
  const spy = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
    throw new DOMException('blocked', 'SecurityError');
  });
  return () => spy.mockRestore();
}

let cleanup: (() => void) | undefined;

beforeEach(() => setSystem('light'));

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  vi.restoreAllMocks();
  window.localStorage.clear();
  root.removeAttribute('data-theme');
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('the theme rules', () => {
  it('follow the system with no override', () => {
    expect(showsDark(null, true)).toBe(true);
    expect(showsDark(null, false)).toBe(false);
  });

  it('let an override win over the system', () => {
    expect(showsDark('light', true)).toBe(false);
    expect(showsDark('dark', false)).toBe(true);
  });

  it('toggle to the opposite of what shows and store it', () => {
    const next = toggledOverride(null, false);
    expect(next).toBe('dark');
    applyThemeOverride(next, KEY);
    expect(readThemeOverride(KEY)).toBe('dark');
    expect(window.localStorage.getItem(KEY)).toBe('dark');
    expect(root.dataset.theme).toBe('dark');
    expect(toggledOverride(null, true)).toBe('light');
  });

  it('point the theme-color metas at the override, and back at their own', () => {
    document.head.innerHTML =
      '<meta name="theme-color" content="#f6f5f1" media="(prefers-color-scheme: light)">' +
      '<meta name="theme-color" content="#0b0d0d" media="(prefers-color-scheme: dark)">';
    const colours = () => [...document.querySelectorAll('meta[name="theme-color"]')].map((meta) => meta.getAttribute('content'));
    applyThemeOverride('dark', KEY);
    expect(colours()).toEqual(['#0b0d0d', '#0b0d0d']);
    applyThemeOverride('light', KEY);
    expect(colours()).toEqual(['#f6f5f1', '#f6f5f1']);
    applyThemeOverride(null, KEY);
    expect(colours()).toEqual(['#f6f5f1', '#0b0d0d']);
  });

  it('clear the override when the choice equals the system', () => {
    expect(toggledOverride('dark', false)).toBeNull();
    expect(toggledOverride('light', true)).toBeNull();
    applyThemeOverride('dark', KEY);
    applyThemeOverride(toggledOverride('dark', false), KEY);
    expect(readThemeOverride(KEY)).toBeNull();
    expect(window.localStorage.getItem(KEY)).toBeNull();
    expect(root.hasAttribute('data-theme')).toBe(false);
  });

  it('read a junk value and blocked storage as no override', () => {
    window.localStorage.setItem(KEY, 'blue');
    expect(readThemeOverride(KEY)).toBeNull();
    cleanup = blockStorage();
    expect(readThemeOverride(KEY)).toBeNull();
    expect(() => applyThemeOverride('dark', KEY)).not.toThrow();
    expect(root.dataset.theme).toBe('dark');
  });

  it('refuse a key a script could not hold as it is', () => {
    for (const key of ['', 'Theme', "x'+alert(1)+'", 'x</script>', '1theme', 'khe_theme']) {
      expect(() => readThemeOverride(key)).toThrow(TypeError);
      expect(() => themeInitScript(key)).toThrow(TypeError);
      expect(() => wireThemeToggle({ storageKey: key })).toThrow(TypeError);
    }
  });

  it('read the system setting each time and report its changes', () => {
    const listener = vi.fn();
    cleanup = onSystemDarkChange(listener);
    expect(systemDark()).toBe(false);
    setSystem('dark');
    expect(systemDark()).toBe(true);
    expect(listener).toHaveBeenLastCalledWith(true);
    cleanup();
    cleanup = undefined;
    setSystem('light');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('themeInitScript', () => {
  const run = () => new Function(themeInitScript(KEY))();

  it('sets data-theme from storage', () => {
    window.localStorage.setItem(KEY, 'dark');
    run();
    expect(root.dataset.theme).toBe('dark');
    window.localStorage.setItem(KEY, 'light');
    run();
    expect(root.dataset.theme).toBe('light');
  });

  it('ignores junk, an empty store and blocked storage', () => {
    window.localStorage.setItem(KEY, 'blue');
    run();
    expect(root.hasAttribute('data-theme')).toBe(false);
    window.localStorage.removeItem(KEY);
    run();
    expect(root.hasAttribute('data-theme')).toBe(false);
    cleanup = blockStorage();
    expect(run).not.toThrow();
    expect(root.hasAttribute('data-theme')).toBe(false);
  });
});

describe('wireThemeToggle', () => {
  it('touches nothing on a page without a toggle', () => {
    root.setAttribute('data-theme', 'dark');
    window.localStorage.setItem(KEY, 'light');
    document.head.innerHTML = '<meta name="theme-color" content="#0b0d0d" media="(prefers-color-scheme: light)">';
    cleanup = wireThemeToggle({ storageKey: KEY });
    expect(root.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem(KEY)).toBe('light');
    expect(document.head.innerHTML).toBe('<meta name="theme-color" content="#0b0d0d" media="(prefers-color-scheme: light)">');
  });

  it('applies the stored override and presses the toggle while dark shows', () => {
    window.localStorage.setItem(KEY, 'dark');
    document.body.innerHTML = header();
    expect(toggle().getAttribute('aria-pressed')).toBe('false');
    cleanup = wireThemeToggle({ storageKey: KEY });
    expect(root.dataset.theme).toBe('dark');
    expect(toggle().getAttribute('aria-pressed')).toBe('true');
  });

  it('stores and flips on a click, and clears a choice equal to the system', () => {
    document.body.innerHTML = header();
    cleanup = wireThemeToggle({ storageKey: KEY });
    expect(toggle().getAttribute('aria-pressed')).toBe('false');
    toggle().click();
    expect(window.localStorage.getItem(KEY)).toBe('dark');
    expect(root.dataset.theme).toBe('dark');
    expect(toggle().getAttribute('aria-pressed')).toBe('true');
    toggle().click();
    expect(window.localStorage.getItem(KEY)).toBeNull();
    expect(root.hasAttribute('data-theme')).toBe(false);
    expect(toggle().getAttribute('aria-pressed')).toBe('false');
  });

  it('follows a system change while the page is open and keeps the override', () => {
    document.body.innerHTML = header();
    cleanup = wireThemeToggle({ storageKey: KEY });
    setSystem('dark');
    expect(toggle().getAttribute('aria-pressed')).toBe('true');
    toggle().click();
    expect(window.localStorage.getItem(KEY)).toBe('light');
    setSystem('light');
    expect(window.localStorage.getItem(KEY)).toBe('light');
    expect(root.dataset.theme).toBe('light');
    expect(toggle().getAttribute('aria-pressed')).toBe('false');
  });

  it('still toggles the page when storage is blocked', () => {
    cleanup = blockStorage();
    document.body.innerHTML = header();
    const unwire = wireThemeToggle({ storageKey: KEY });
    toggle().click();
    expect(root.dataset.theme).toBe('dark');
    toggle().click();
    expect(root.hasAttribute('data-theme')).toBe(false);
    unwire();
  });

  it('wires a button once, however often it is called', () => {
    document.body.innerHTML = header();
    cleanup = wireThemeToggle({ storageKey: KEY });
    const again = wireThemeToggle({ storageKey: KEY });
    toggle().click();
    expect(root.dataset.theme).toBe('dark');
    again();
  });

  it('stops after the cleanup', () => {
    document.body.innerHTML = header();
    wireThemeToggle({ storageKey: KEY })();
    toggle().click();
    expect(root.hasAttribute('data-theme')).toBe(false);
    setSystem('dark');
    expect(toggle().getAttribute('aria-pressed')).toBe('false');
  });
});
