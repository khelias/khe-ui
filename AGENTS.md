# khe-ui

`@khelias/ui` on npmjs: the KHE site header with its rooms menu and theme
toggle, and the site footer, each as CSS custom properties, an HTML-string
renderer and a React component, plus framework-free theme and rooms
modules; shared by khe-sites,
khe-study, khe-ai-adventure and khe-trips. Shared UI packages between app repos are
allowed by
[estate ADR-014](https://github.com/khelias/khe-architecture/blob/main/decisions/014-shared-ui-packages.md):
presentation only, released with semver, pinned in each app, and never
automerged there.
[Estate ADR-017](https://github.com/khelias/khe-architecture/blob/main/decisions/017-shared-theme-toggle-and-footer.md)
puts the theme toggle, the theme rules and the footer here, and
[estate ADR-018](https://github.com/khelias/khe-architecture/blob/main/decisions/018-rooms-menu-in-the-shared-header.md)
the rooms menu, the room list and the room accents.

npm, Node 24 (`.nvmrc`, `engine-strict`), TypeScript 7 compiled by plain
`tsc`, Vitest with happy-dom for the tests that need a DOM. No runtime
dependencies; `react` ^19 is an optional peer dependency.

## Commands

- `npm run check` - typecheck, tests, build, and `scripts/check-pack.mjs`,
  which fails unless `npm pack` would ship exactly the expected files and
  `dist/theme.js` and `dist/rooms.js` import nothing
- `npm test` - the tests only
- `npm run build` - `dist/`: `tsc -p tsconfig.build.json` plus copies of
  `src/site-header.css` and `src/site-footer.css`; `prepack` runs it, so `npm pack` and `npm publish`
  always ship a fresh build

## Layout

- `src/site-header.css` - anatomy, sizes, states; the `--khe-header-*`
  defaults at the top
- `src/site-footer.css` - the footer's anatomy; the `--khe-footer-*`
  defaults at the top
- `src/site-header.ts` - `renderSiteHeader(options)`, no DOM
- `src/site-footer.ts` - `renderSiteFooter(options)`, no DOM
- `src/react.tsx` - `<SiteHeader>`, `<SiteFooter>` and
  `useThemeOverride(storageKey)`
- `src/theme.ts` - the theme rules (`readThemeOverride`,
  `applyThemeOverride`, `showsDark`, `toggledOverride`, `systemDark`,
  `onSystemDarkChange`), `themeInitScript(key)` for the inline pre-paint
  script and `wireThemeToggle` for a string-rendered header. Imports
  nothing and touches no DOM at load: khe-sites copies `dist/theme.js` as it
  is, and builds import it in Node
- `src/rooms.ts` - the rooms in order (`ROOM_IDS`, `ROOMS`, `ROOMS_LABEL`),
  `roomHref(room, locale)` with `?lang=`, and `setRoomsLocale(root,
  locale)`, which rewrites a rendered menu for a page that switches language
  without re-rendering. Imports nothing and touches no DOM at load, like
  `theme.ts`: khe-sites copies `dist/rooms.js` as it is
- `src/core.ts` - the option types, the shared `attrs` and `href` checks,
  the icons, and `prepareHeader()` and `prepareFooter()`, which check the
  options and return every part's attributes in contract order; the
  renderers only lay them out. Not an entry point
- `src/html.ts` - escaping and tag helpers of the string renderers. Not an
  entry point
- `test/` - parity of the two renderers, the markup contract, escaping,
  attrs, React behaviour, the theme rules, the rooms module, CSS tokens,
  specificity and contrast

## Markup contract

Both renderers write the same markup, attributes in this order, and the
parity test holds them to it. A change here is a change to both renderers,
the tests and the consumers' checks:

- `header.site-header`, plus `site-header--fixed` with `fixed`; no
  `aria-label`
- `div.site-header__inner`
- `a.site-header__brand.brand-mark` with `href`, `aria-label`, holding
  `<span>KHE</span><span class="brand-mark__suffix">.ee</span>`
- with `rooms`: `button.site-header__rooms` with `type="button"`,
  `popovertarget="khe-rooms"` (React writes `popoverTarget`) and
  `data-khe-room` (the current room), holding
  `span.site-header__rooms-name`, `span.site-header__sr` (", " and the
  list's name) and `svg.site-header__rooms-chevron`; then
  `nav.site-header__rooms-menu` with `id="khe-rooms"`, `popover=""` and
  `aria-label` ("Toad" / "Rooms"), holding a `ul` with one `li` per room in
  `ROOMS` order, each an `a.site-header__room` with `data-khe-room`, `href`
  (the room's address with `?lang=`, or `currentHref` as given, then
  `data-khe-room-own=""`) and, for the current room, `aria-current="true"`;
  it holds `span.site-header__room-dot` (`aria-hidden="true"`),
  `span.site-header__room-name`, `span.site-header__sr` (", "),
  `span.site-header__room-note`, and for the current room
  `svg.site-header__room-check`. No rooms parts without `rooms`
- `span.site-header__slash` with `aria-hidden="true"` holding `/`, only with
  both `rooms` and `context`
- with `context`: the title, a `strong.site-header__title`, or an
  `a.site-header__title` with `href` when `context.href` is given
- `div.site-header__actions`: the React `actions`, then with
  `themeToggle` the `button.site-header__theme` with `type="button"`,
  `aria-label` and `aria-pressed` (`"false"` from the string renderer, the
  `dark` prop from React), holding `svg.site-header__theme-sun` then
  `svg.site-header__theme-moon` (each `viewBox`, `aria-hidden="true"`,
  `focusable="false"`), then `div.language-switcher` with `role="group"`
  and `aria-label`, holding one `button` per locale with `type="button"`,
  `data-lang-option` and `aria-pressed`
- `attrs` adds attributes after each part's own: `brand`, `rooms` (the
  button, only with `rooms`), `title`, `theme` (only with `themeToggle`) and
  `switcher`, and each locale's `attrs` on its button. Only `data-*`, `aria-*`, `id`,
  `lang`, `dir`, `title` and `translate`, never one the part sets itself

The footer, `footer.site-footer`:

- `nav` with `aria-label` (`label`), holding each link as an `a` with
  `href`; a link with `icon` (`github` or `linkedin`) has
  `svg.site-footer__icon` (`viewBox`, `aria-hidden="true"`,
  `focusable="false"`) before its label; between links a
  `span.site-footer__divider` with `aria-hidden="true"` holding `·`
- then each line as `span.site-footer__line`
- `attrs` on `footer` and `nav`, and `attrs` on each link and line, under
  the same rules as the header's

The class names are shared with khe-trips' `DESIGN.md` and khe-sites'
`check.mjs`: renaming one breaks them. `site-header__sr` is the package's
own visually hidden class.

## Tokens

Every colour, border, radius, font family, width and weight is a
`--khe-header-*` property. The defaults (khe.ee's former dark teal, weights
600) sit on `:where(.site-header, .language-switcher:not(.site-header *))`,
so they cost no specificity and a value an app sets on `.site-header`
reaches the switcher inside it. Apps set their palette on `.site-header`
(and on a standalone `.language-switcher`), never on `:root`. The package
loads no fonts. Its `:root` selectors pick the theme toggle's icon from
`<html data-theme>` or the system setting, so the icon is right before any
script runs, and set the dark values of the five room dots
(`--khe-header-room-<id>`) under `:root[data-theme="dark"]` and the dark
media query, wrapped whole in `:where()` so an app's value on
`.site-header` still wins; nothing else is set there
([docs/adr/004](docs/adr/004-rooms-menu-as-a-native-popover.md) point 4).
The menu has `--khe-header-menu-bg`, `-border`, `-shadow` and
`-current-bg`; its names use `--khe-header-text`, its notes
`--khe-header-text-muted`. The header fills its container; a page that
puts it inside a padded container makes it full-bleed itself. Muted text,
inactive-button and menu text contrast stay at 4.5:1 or more against the
defaults, and every dot at 3:1 on the family paper and surface of its theme
(tests read them from the CSS); a new property needs a default and is used
through `var()` only. The toggle uses the switcher's tokens.

The menu opens in the top layer at `position: fixed`, just below the header
(the heights `--host-h` defaults to, or `--host-h` itself with `fixed`), at
the inner row's start, or under the button where anchor positioning works.
Without the Popover API the button, the list and the slash are hidden. When
the row is short of room the title ellipsizes and at 360px and below hides,
then the room name ellipsizes; the mark, toggle and switcher never shrink.

The footer's colours, font, sizes and weight are `--khe-footer-*`
properties with defaults on `:where(.site-footer)` matching the header's
(text 4.5:1 or more on the header's default ground, a test checks). Apps
set them on `.site-footer` and place the footer themselves: the package
sets no margin or padding on it.

The package carries the anatomy; apart from the room dots its defaults are
not the KHE family's values. The dots are the room accents of khe-sites'
`DESIGN.md` in both themes, which khe-sites' check compares; each consumer
sets the other family values from `DESIGN.md` on `.site-header`
([estate ADR-018](https://github.com/khelias/khe-architecture/blob/main/decisions/018-rooms-menu-in-the-shared-header.md)).

The decisions behind this shape: [docs/adr/001](docs/adr/001-light-dom-markup-and-custom-properties.md)
and, for the rooms menu, the theme toggle and the footer,
[docs/adr/004](docs/adr/004-rooms-menu-as-a-native-popover.md).

## Release

[docs/adr/002](docs/adr/002-release-through-trusted-publishing.md). In
short: bump `version` in `package.json` (0.x until all four apps run the
package, then 1.0.0), commit, `git tag v<version>`, push the commit and the
tag. `release.yml` checks, refuses a tag that does not match the version,
and publishes through npm trusted publishing (environment `npm`, no token,
provenance added by npm); a prerelease such as `v0.2.0-rc.1` goes to the
`next` dist-tag, not `latest`. 0.1.0 was published by hand and its tag is
never pushed.

Automated writers
([estate ADR-007](https://github.com/khelias/khe-architecture/blob/main/decisions/007-automated-writers.md)):
Renovate automerges this repo's own npm patch and minor updates of stable
packages, 0.x patches of devDependencies, GitHub Actions minor and patch
updates, digests, pins and lock file maintenance (`renovate.json`); the way
back is to revert its commit on `main`. `release.yml` publishes the tagged
version of `@khelias/ui`; the way back from a bad release is `npm deprecate`
on that version and a fixed release, and nothing reaches an app before that
app merges its own update, because no consumer automerges this package. A
new automated writer joins the estate's writer register in khe-meta in the
same change.

## Rules

1. **Presentation only.** No app state, no data fetching, no runtime or
   business logic (estate ADR-014). The stored theme choice and its DOM
   functions are presentation
   ([estate ADR-017](https://github.com/khelias/khe-architecture/blob/main/decisions/017-shared-theme-toggle-and-footer.md)),
   and so is the room list
   ([estate ADR-018](https://github.com/khelias/khe-architecture/blob/main/decisions/018-rooms-menu-in-the-shared-header.md)).
2. **No runtime dependencies.** React stays an optional peer dependency.
3. **A public repo and a public package.** Nothing identifying, no house
   data.
