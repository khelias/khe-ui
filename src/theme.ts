// The family theme rule (estate ADR-017): a page follows the system setting, and a
// manual override lives on <html data-theme> and in localStorage under the consumer's
// key. Imports nothing and touches no DOM at load, so a build can import it in Node
// and khe-sites can serve dist/theme.js as it is.

/** A stored choice that overrides the system theme; `null` follows the system. */
export type ThemeOverride = 'light' | 'dark' | null;

const DARK_QUERY = '(prefers-color-scheme: dark)';
// Keeps each theme-color meta's own content while an override points it elsewhere.
const OWN_COLOR = 'data-khe-theme-color';

// Validated so themeInitScript can put the key into a script without escaping.
function checkedKey(key: string): string {
  if (!/^[a-z][a-z0-9-]*$/.test(key)) throw new TypeError(`theme: storage key ${key} is not lower-case letters, digits and hyphens`);
  return key;
}

/** The stored override; a value other than `light` or `dark`, or blocked storage, reads as none. */
export function readThemeOverride(storageKey: string): ThemeOverride {
  const key = checkedKey(storageKey);
  try {
    const stored = window.localStorage.getItem(key);
    return stored === 'light' || stored === 'dark' ? stored : null;
  } catch {
    return null;
  }
}

/**
 * Puts the override on `<html data-theme>`, in storage and on the theme-color metas,
 * or clears all three so the system setting decides again. An override points every
 * `meta[name="theme-color"][media]` at the content of the one for that scheme.
 */
export function applyThemeOverride(override: ThemeOverride, storageKey: string): void {
  const key = checkedKey(storageKey);
  const root = document.documentElement;
  if (override) root.setAttribute('data-theme', override);
  else root.removeAttribute('data-theme');
  try {
    if (override) window.localStorage.setItem(key, override);
    else window.localStorage.removeItem(key);
  } catch {
    // Blocked storage: the choice holds for this page only.
  }

  const metas = [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"][media]')];
  for (const meta of metas) {
    if (!meta.hasAttribute(OWN_COLOR)) meta.setAttribute(OWN_COLOR, meta.getAttribute('content') ?? '');
  }
  const forScheme = override && metas.find((meta) => meta.getAttribute('media')!.replace(/\s+/g, '') === `(prefers-color-scheme:${override})`);
  for (const meta of metas) {
    meta.setAttribute('content', (forScheme || meta).getAttribute(OWN_COLOR)!);
  }
}

/** Whether the page shows dark: the override, else the system setting. */
export function showsDark(override: ThemeOverride, systemDark: boolean): boolean {
  return override ? override === 'dark' : systemDark;
}

/** The override after the toggle: the opposite of what shows, or none when that equals the system. */
export function toggledOverride(override: ThemeOverride, systemDark: boolean): ThemeOverride {
  const nextDark = !showsDark(override, systemDark);
  return nextDark === systemDark ? null : nextDark ? 'dark' : 'light';
}

/** Whether the system setting is dark, read now. */
export function systemDark(): boolean {
  return window.matchMedia(DARK_QUERY).matches;
}

/** Calls `listener` when the system setting changes; returns the unsubscribe. */
export function onSystemDarkChange(listener: (dark: boolean) => void): () => void {
  const query = window.matchMedia(DARK_QUERY);
  const onChange = (event: MediaQueryListEvent) => listener(event.matches);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/**
 * The script for an inline `<script>` in `<head>`, before the first stylesheet: it
 * applies a stored override before first paint. Self-contained; it needs nothing
 * else from this module.
 */
export function themeInitScript(storageKey: string): string {
  const key = checkedKey(storageKey);
  return `try{var t=localStorage.getItem('${key}');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}`;
}

// A button wired twice would toggle twice per press, which looks like no toggle at all.
const wired = new WeakSet<Element>();

/**
 * Wires the theme toggle of a header rendered as an HTML string. Without a
 * `.site-header__theme` button on the page, or with every one already wired, it
 * touches nothing. Returns the cleanup.
 */
export function wireThemeToggle({ storageKey }: { readonly storageKey: string }): () => void {
  checkedKey(storageKey);
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('.site-header__theme')].filter((button) => !wired.has(button));
  if (buttons.length === 0) return () => {};

  let override = readThemeOverride(storageKey);
  const sync = () => {
    const pressed = String(showsDark(override, systemDark()));
    for (const button of buttons) button.setAttribute('aria-pressed', pressed);
  };
  const toggle = () => {
    override = toggledOverride(override, systemDark());
    applyThemeOverride(override, storageKey);
    sync();
  };

  applyThemeOverride(override, storageKey);
  sync();
  for (const button of buttons) {
    wired.add(button);
    button.addEventListener('click', toggle);
  }
  const unsubscribe = onSystemDarkChange(sync);
  return () => {
    for (const button of buttons) {
      wired.delete(button);
      button.removeEventListener('click', toggle);
    }
    unsubscribe();
  };
}
