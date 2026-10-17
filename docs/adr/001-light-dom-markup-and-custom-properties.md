# ADR-001: The header is light-DOM markup from two renderers, styled through custom properties

- **Status:** Accepted (2026-10-17)
- **Related:** [estate ADR-014](https://github.com/khelias/khe-architecture/blob/main/decisions/014-shared-ui-packages.md)

## Context

Four repos render the KHE site header: `khe-sites` (plain HTML built by Node
scripts, no bundler, no framework), and `khe-study`, `khe-ai-adventure` and
`khe-trips` (React with Vite; study on Tailwind). Each keeps its own palette
and its own locale state: khe-sites rewrites the page through
`site-locale.js`, the apps keep the locale in a store, `localStorage` and the
URL. khe-sites and khe-trips already share the class names `.site-header*`,
`.brand-mark*` and `.language-switcher`; trips' `DESIGN.md` and khe-sites'
`check.mjs` refer to them. Both sites serve a CSP that allows same-origin
scripts and styles only.

## Decision

1. **Light-DOM markup**, the same in every consumer: the contract in
   `AGENTS.md`, with the class names above unchanged.
2. **Two renderers of that markup:** `renderSiteHeader(options)` in
   `@khelias/ui/site-header` returns an HTML string and needs no DOM, for
   khe-sites' build; `<SiteHeader>` in `@khelias/ui/react` takes the same
   options as props. A test renders both from the same fixtures and
   compares the markup.
3. **No custom element.** The header is in the HTML before any script runs.
4. **Styling through `--khe-header-*` custom properties** in
   `@khelias/ui/site-header.css`. The package owns anatomy, sizes and
   states; every colour, border, radius, font family, width and weight is a
   property with khe.ee's values as defaults. An app sets its own on
   `.site-header`, never on `:root`. The package loads no fonts.
5. **Locale state stays in the app.** The string renderer has no behaviour;
   the React component is controlled (`activeLocale` in,
   `onLocaleChange(code)` out).
6. **Extra attributes per part** (`attrs`, and `attrs` on each locale for
   its button) carry what a consumer's own scripts need, limited to
   `data-*`, `aria-*`, `id`, `lang`, `dir`, `title` and `translate`, and
   never one the header sets itself.

## Alternatives considered

- **A custom element with shadow DOM:** the header would appear only after
  its script runs, khe-sites would need a client script it does not have,
  and each app's palette would have to cross the shadow boundary anyway.
- **A React component only:** khe-sites has no React and no bundler.
- **Per-app class names or a CSS-in-JS theme object:** breaks the names two
  repos and their checks already use, and ties styling to one stack.

## Consequences

- A change to the markup changes both renderers and the parity test in the
  same commit.
- An app that needs a value the properties do not cover asks for a new
  property in a release rather than overriding the package's selectors.
- The CSP needs nothing: each app bundles or copies the CSS and the code.
