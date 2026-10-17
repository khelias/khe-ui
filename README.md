# khe-ui

The shared site header of the KHE apps, published as
[`@khelias/ui`](https://www.npmjs.com/package/@khelias/ui): the KHE.ee
mark, an optional kicker over a page title, and an ET/EN language switcher.

[khe.ee](https://khe.ee), [KHE Games](https://games.khe.ee) and the other
KHE apps are separate repos on separate stacks, each with its own palette.
They used to build this header four times, and fixes reached one copy at a
time. Now the anatomy, sizes and states live here, and each app sets its
colours through CSS custom properties and moves to a new release when it
chooses
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
  brand: { href: '/', label: 'KHE home' },
  context: { kicker: 'KHE Games', title: 'Games' },
  locales: [{ code: 'et', label: 'ET' }, { code: 'en', label: 'EN' }],
  activeLocale: 'en',
  languageLabel: 'Language',
});
```

The page wires the `data-lang-option` buttons itself.

## React

```jsx
import '@khelias/ui/site-header.css';
import { SiteHeader } from '@khelias/ui/react';

<SiteHeader
  brand={{ href: '/', label: 'KHE home' }}
  context={{ title: 'Trips' }}
  locales={[{ code: 'et', label: 'ET' }, { code: 'en', label: 'EN' }]}
  activeLocale={locale}
  languageLabel={t('language')}
  onLocaleChange={setLocale}
/>;
```

## Theming

```css
.site-header {
  --khe-header-bg: #fffaf2;
  --khe-header-text: #1f2328;
  --khe-header-text-muted: #59606a;
}
```

Every property and its default is at the top of
[`src/site-header.css`](src/site-header.css).

## Development

```sh
npm ci
npm run check
```

Commands, the markup contract and the release procedure are in
[AGENTS.md](AGENTS.md); the design decisions in [docs/adr/](docs/adr/).

MIT licence.
