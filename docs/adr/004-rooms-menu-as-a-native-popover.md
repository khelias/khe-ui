# ADR-004: The rooms menu is a native popover with its room data in a standalone module; the package sets the dark dot values

- **Status:** Accepted (2026-10-20)
- **Supersedes:** [ADR-003](003-theme-toggle-and-footer.md)
- **Related:** [ADR-001](001-light-dom-markup-and-custom-properties.md), [estate ADR-018](https://github.com/khelias/khe-architecture/blob/main/decisions/018-rooms-menu-in-the-shared-header.md)

## Context

Estate ADR-018 replaces the header's kicker with a rooms menu: a button
with the current room's name opens a list of every room, each with its
accent as a dot, and the room data and the five accents in both themes
live in this package. The menu is the first header part that opens and
closes. ADR-001 point 5 keeps the string renderer free of behaviour and the
React component controlled, and khe-sites serves the package's built
files without a bundler.

ADR-003 point 4 says the theme toggle's icon selectors are the package's
only `:root` rules and set no property. The dark dot values have to follow
`<html data-theme>` and the system setting the same way, so they break
that sentence. ADR-003 is Accepted, so this ADR replaces it and restates
the points that stand.

## Decision

1. **The toggle is a header part.** `themeToggle: { label }` adds
   `button.site-header__theme` after the React `actions` and before the
   language switcher, with its own `attrs` part. It is named for a state,
   "Dark theme", and `aria-pressed` is true while dark shows. Its icon
   shows the theme a press leads to: a sun while dark shows, a moon while
   light does.
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
4. **What follows the theme in CSS reads `<html data-theme>`, else
   `prefers-color-scheme`,** so it is right on a static page before any
   script runs. The toggle icon's selectors set no property. The five dot
   properties (`--khe-header-room-<id>`) get their dark values under
   `:root[data-theme="dark"]` and the dark media query, wrapped in
   `:where()` so a consumer's value on `.site-header` still wins. No other
   property is set under `:root`.
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
8. **The rooms list is native Popover API markup:** a `button` with
   `popovertarget` and a `nav` with `popover`. The browser opens and closes
   it, moves focus back to the button on Escape and closes it on a click
   outside, so the string renderer stays free of behaviour and React needs
   no state. The items are plain links in a list, not `role="menu"`.
9. **The room data is the standalone module `@khelias/ui/rooms`:** the
   rooms in order, their names and notes in Estonian and English, their
   public addresses, and `setRoomsLocale` for a page that switches
   language without re-rendering. It imports nothing and touches no DOM at
   load, so khe-sites can serve `dist/rooms.js` as it serves
   `dist/theme.js`.
10. **The kicker leaves the header.** The room button names the room and
    an app's name follows it after a slash, so the kicker has nothing left
    to say. Removing it breaks the options and the markup, hence 0.3.0.

## Alternatives considered

- **A disclosure button with `aria-expanded` and a script:** the string
  renderer would need behaviour, or every page a script of its own.
- **`role="menu"` with arrow keys:** for application menus of commands,
  not a list of links, and it needs a script.
- **A `<details>` element:** no light dismiss and no top layer, so the
  list would be clipped by the header and stay open on a click outside.
- **The room data in `core.ts`:** khe-sites could not serve it without a
  bundler, and `site-locale.js` would copy the names.
- **Dark dots set by each app:** every app would carry all five accents in
  both themes only for the dots (estate ADR-018 point 4).
- **A theme custom element:** rejected for the header in ADR-001, and it
  would still need the inline script for first paint.
- **A blocking external init file in `<head>`:** one more request before
  first paint on every page.
- **The toggle icon from `aria-pressed`:** a static page renders the
  button unpressed, so the icon would be wrong until the script runs.
- **The footer's rules inside `site-header.css`:** an app without a footer
  would load them.

## Consequences

- A browser without the Popover API gets no button, no slash and no list;
  the mark still leads home.
- One header per page: the list's `id` is fixed.
- A page with the toggle needs the inline script and either
  `wireThemeToggle` or `useThemeOverride`; without them the button does
  nothing and the icon still matches what shows.
- `dist/theme.js` and `dist/rooms.js` must stay free of imports;
  `check-pack.mjs` fails the build otherwise.
- A content security policy without `'unsafe-inline'` still needs the
  pre-paint script's hash, which changes with the key.
