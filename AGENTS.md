# khe-ui

`@khelias/ui` on npmjs: the KHE site header as CSS custom properties, an
HTML-string renderer and a React component, shared by khe-sites, khe-study,
khe-ai-adventure and khe-trips. Shared UI packages between app repos are
allowed by
[estate ADR-014](https://github.com/khelias/khe-architecture/blob/main/decisions/014-shared-ui-packages.md):
presentation only, released with semver, pinned in each app, and never
automerged there.

npm, Node 24 (`.nvmrc`, `engine-strict`), TypeScript 7 compiled by plain
`tsc`, Vitest with happy-dom for the tests that need a DOM. No runtime
dependencies; `react` ^19 is an optional peer dependency.

## Commands

- `npm run check` - typecheck, tests, build, and `scripts/check-pack.mjs`,
  which fails unless `npm pack` would ship exactly the expected files
- `npm test` - the tests only
- `npm run build` - `dist/`: `tsc -p tsconfig.build.json` plus a copy of
  `src/site-header.css`; `prepack` runs it, so `npm pack` and `npm publish`
  always ship a fresh build

## Layout

- `src/site-header.css` - anatomy, sizes, states; the `--khe-header-*`
  defaults at the top
- `src/site-header.ts` - `renderSiteHeader(options)`, no DOM
- `src/react.tsx` - `<SiteHeader>`
- `src/core.ts` - the option types and `prepare()`, which checks the
  options and returns every part's attributes in contract order; both
  renderers only lay them out. Not an entry point
- `test/` - parity of the two renderers, the markup contract, escaping,
  attrs, React behaviour, CSS tokens and contrast

## Markup contract

Both renderers write the same markup, attributes in this order, and the
parity test holds them to it. A change here is a change to both renderers,
the tests and the consumers' checks:

- `header.site-header`, plus `site-header--fixed` with `fixed`; no
  `aria-label`
- `div.site-header__inner`
- `a.site-header__brand.brand-mark` with `href`, `aria-label`, holding
  `<span>KHE</span><span class="brand-mark__suffix">.ee</span>`
- `.site-header__context`: a `div`, or an `a` when `context.href` is given;
  a kicker `span` only when a kicker is given, then the title `strong`. No
  context element without `context`
- `div.site-header__actions`: the React `actions`, then
  `div.language-switcher` with `role="group"` and `aria-label`, holding one
  `button` per locale with `type="button"`, `data-lang-option` and
  `aria-pressed`
- `attrs` adds attributes after each part's own: `brand`, `context`,
  `kicker`, `title` and `switcher`, and each locale's `attrs` on its
  button. Only `data-*`, `aria-*`, `id`, `lang`, `dir`, `title` and
  `translate`, never one the part sets itself

The class names are shared with khe-trips' `DESIGN.md` and khe-sites'
`check.mjs`: renaming one breaks them.

## Tokens

Every colour, border, radius, font family, width and weight is a
`--khe-header-*` property, and so is whether the kicker shows at 520px and
below (`--khe-header-kicker-narrow-display`, for an app whose kicker is a
control). The defaults (khe.ee's dark teal, weights 600)
sit on `:where(.site-header, .language-switcher:not(.site-header *))`, so
they cost no specificity and a value an app sets on `.site-header` reaches
the switcher inside it. Apps set their palette on `.site-header` (and on a
standalone `.language-switcher`), never on `:root`. The package loads no
fonts and has no `:root` rule. The header fills its container; a page that
puts it inside a padded container makes it full-bleed itself. Kicker and
inactive-button contrast stay at 4.5:1 or more against the defaults (a
test reads them from the CSS); a new property needs a default and is used
through `var()` only.

The decisions behind this shape: [docs/adr/001](docs/adr/001-light-dom-markup-and-custom-properties.md).

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
   business logic (estate ADR-014).
2. **No runtime dependencies.** React stays an optional peer dependency.
3. **A public repo and a public package.** Nothing identifying, no house
   data.
