# ADR-003: The theme toggle is a header part with a framework-free behaviour module; the footer is a second component

- **Status:** Superseded (2026-10-20)
- **Superseded by:** [ADR-004](004-rooms-menu-as-a-native-popover.md)
- **Related:** [estate ADR-017](https://github.com/khelias/khe-architecture/blob/main/decisions/017-shared-theme-toggle-and-footer.md), [ADR-001](001-light-dom-markup-and-custom-properties.md)

## Context

Estate ADR-017 moves the light/dark override and the site footer into this
package. The override is the first behaviour the package carries: it reads
and writes storage, sets `data-theme` on `<html>` and must take effect
before first paint. Its consumers differ as the header's do: khe-sites
builds plain HTML with Node and serves its scripts without a bundler, and
khe-trips renders React and keeps its own key so stored choices survive.
ADR-001 Decision 5 keeps state in the app: the string renderer has no
behaviour and the React component is controlled.

## Decision

1. **The toggle is a header part.** `themeToggle: { label }` adds
   `button.site-header__theme` after the React `actions` and before the
   language switcher, with its own `attrs` part. It is named for a state,
   "Dark theme", and `aria-pressed` is true while dark shows. Its icon shows
   the theme a press leads to: a sun while dark shows, a moon while light
   does.
2. **The renderers stay as ADR-001 has them.** The string renderer writes
   the button with `aria-pressed="false"` and no behaviour. The React
   component is controlled: `themeToggle` takes `dark` and `onToggle`, and
   `useThemeOverride(storageKey)` is the hook an app may use to supply
   them.
3. **The behaviour is a separate framework-free module,** `@khelias/ui/theme`:
   the rules, `wireThemeToggle` for a string-rendered header, and
   `themeInitScript(key)`. It imports nothing and touches no DOM at load, so
   a page can serve its built file as it is and a build can import it in
   Node.
4. **The icon follows `<html data-theme>`, else `prefers-color-scheme`, in
   CSS,** so it is right on a static page before any script runs. These
   selectors are the package's only `:root` rules and set no property.
5. **The pre-paint script is inline,** a string each consumer's build puts
   into `<head>` before the first stylesheet. The storage key is the
   consumer's, limited to lower-case letters, digits and hyphens so the
   script needs no escaping.
6. **The theme-color metas carry no package colours:** an override points
   each `meta[name="theme-color"][media]` at the content of the one for its
   scheme, and clearing it restores each meta's own.
7. **The footer is a second component on ADR-001's pattern:**
   `renderSiteFooter` and `<SiteFooter>` with a parity test, its own
   stylesheet `@khelias/ui/site-footer.css` and `--khe-footer-*`
   properties. The app passes the links, the lines and the nav's name; the
   package draws the GitHub and LinkedIn marks and places nothing. An
   internal link such as Privacy stays text: the marks name outside brands,
   and a generic icon on it would read as a security claim.

## Alternatives considered

- **A theme custom element:** rejected for the header in ADR-001, and it
  would still need the inline script for first paint.
- **A blocking external init file in `<head>`:** one more request before
  first paint on every page.
- **The icon from `aria-pressed`:** a static page renders the button
  unpressed, so the icon would be wrong until the script runs.
- **The footer's rules inside `site-header.css`:** an app without a footer
  would load them.

## Consequences

- A page with the toggle needs the inline script and either
  `wireThemeToggle` or `useThemeOverride`; without them the button does
  nothing and the icon still matches what shows.
- A content security policy without `'unsafe-inline'` needs the script's
  hash, which changes with the key.
- `dist/theme.js` must stay free of imports; `check-pack.mjs` fails the
  build otherwise.
