# khe-ui

The shared site header and site footer of the KHE apps, published as
[`@khelias/ui`](https://www.npmjs.com/package/@khelias/ui). The header has
the KHE.ee mark, a rooms menu naming the room you are in and listing the
others, the app's name after a slash, an optional light/dark theme toggle
and an ET/EN language switcher; the footer has the page links with the
GitHub and LinkedIn marks and a line of text.

[khe.ee](https://khe.ee), [KHE Games](https://games.khe.ee) and the other
KHE apps are separate repos on separate stacks that share one family
chrome
([estate ADR-035](https://github.com/khelias/khe-architecture/blob/main/decisions/035-family-shell-and-design-check-with-its-exceptions.md)).
A header or footer built in each app drifts, and a fix reaches one copy at a
time, so the anatomy, sizes and states live here, and each app sets the
family colours through CSS custom properties and moves to a new release
when it chooses
([estate ADR-014](https://github.com/khelias/khe-architecture/blob/main/decisions/014-shared-ui-packages.md)).

## Install

```sh
npm install @khelias/ui
```

Load `@khelias/ui/site-header.css` once, then render the header with either
renderer.

## HTML string, for a page built without a framework

```js
import { renderSiteHeader } from '@khelias/ui/site-header';

const html = renderSiteHeader({
  brand: { href: 'https://khe.ee/', label: 'KHE home' },
  rooms: { current: 'games', locale: 'en' },
  context: { title: 'Smart Games' },
  locales: [{ code: 'et', label: 'ET' }, { code: 'en', label: 'EN' }],
  activeLocale: 'en',
  languageLabel: 'Language',
});
```

The page wires the `data-lang-option` buttons itself. The rooms menu needs no
script: it is a native popover. A page that switches language without
re-rendering calls `setRoomsLocale(document, locale)` from
`@khelias/ui/rooms`. Leave `rooms` out on the khe.ee front page.

## React

```jsx
import '@khelias/ui/site-header.css';
import { SiteHeader } from '@khelias/ui/react';

<SiteHeader
  brand={{ href: 'https://khe.ee/', label: 'KHE home' }}
  rooms={{ current: 'trips', locale, currentHref: '/' }}
  context={{ title: 'All trips' }}
  locales={[{ code: 'et', label: 'ET' }, { code: 'en', label: 'EN' }]}
  activeLocale={locale}
  languageLabel={t('language')}
  onLocaleChange={setLocale}
/>;
```

## Theme toggle

`themeToggle` adds a sun/moon button in front of the language switcher.
The visitor's choice overrides the system setting, is stored under a key
the app names, and is cleared when it equals the system again
([estate ADR-014](https://github.com/khelias/khe-architecture/blob/main/decisions/014-shared-ui-packages.md) point 6).
Put the pre-paint script in `<head>`, before the first stylesheet, so a
stored choice shows on first paint:

```js
import { themeInitScript } from '@khelias/ui/theme';

const head = `<script>${themeInitScript('my-site-theme')}</script>`;
```

On a page built as an HTML string, render the header with
`themeToggle: { label: 'Dark theme' }` and wire it in the browser:

```js
import { wireThemeToggle } from '@khelias/ui/theme';

wireThemeToggle({ storageKey: 'my-site-theme' });
```

In React the toggle is controlled, like the locale:

```jsx
import { SiteHeader, useThemeOverride } from '@khelias/ui/react';

const { dark, toggle } = useThemeOverride('my-site-theme');
<SiteHeader {...headerProps} themeToggle={{ label: t('darkTheme'), dark, onToggle: toggle }} />;
```

Style the page from `<html data-theme="light|dark">`, falling back to
`prefers-color-scheme` when it is absent.

## Demo line and product view

`demo: { label: 'Demo', note: '…' }` adds a line under the header on a demo;
`link: { href, label }` in it adds a link to the real site after the
sentence
([ADR-006](docs/adr/006-the-demo-line-links-the-real-site.md)).
A product page shows the KHE frame when the tab came from khe.ee, the games
hub or another page of its own origin outside the product, and keeps it in
that tab for 30 minutes; otherwise, and always as an installed app, it shows
its own header: the title, the toggle and the switcher
([estate ADR-035](https://github.com/khelias/khe-architecture/blob/main/decisions/035-family-shell-and-design-check-with-its-exceptions.md) point 11).
It passes `product: { root: '/my-app/' }` beside its `context` title, gives the footer a
`home: { label: 'KHE.ee', href: 'https://khe.ee/' }` link, and puts the
view script into `<head>` before the first stylesheet:

```js
import { viewInitScript } from '@khelias/ui/view';

const head = `<script>${viewInitScript('/my-app/')}</script>`;
```

## Footer

Load `@khelias/ui/site-footer.css`, then render with either renderer; the
app places the footer on its page.

```js
import { renderSiteFooter } from '@khelias/ui/site-footer';

const html = renderSiteFooter({
  label: 'Page links',
  links: [
    { label: 'GitHub', href: 'https://github.com/khelias', icon: 'github' },
    { label: 'Privacy', href: '/privacy' },
  ],
  lines: [{ text: 'Self-hosted in Estonia' }],
});
```

`<SiteFooter>` from `@khelias/ui/react` takes the same options as props.

## Theming

```css
.site-header {
  --khe-header-bg: #fffaf2;
  --khe-header-text: #1f2328;
  --khe-header-text-muted: #59606a;
}
```

The footer's `--khe-footer-*` properties go on `.site-footer`. Every
property and its default is at the top of
[`src/site-header.css`](src/site-header.css) and
[`src/site-footer.css`](src/site-footer.css).

## Design check

`npx khe-design-lint` checks an app's source against the family's design
rules and a baseline that only shrinks, configured in `khe-design-lint.json`;
it reads text, so a class built by string concatenation is not seen.

## Development

```sh
npm ci
npm run check
```

Commands, the markup contract and the release procedure are in
[AGENTS.md](AGENTS.md); the design decisions in [docs/adr/](docs/adr/).

MIT licence.
