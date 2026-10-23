# ADR-005: The design check ships as a node-only bin beside the browser code, reading git through `git show`

- **Status:** Accepted (2026-10-23)
- **Related:** [ADR-001](001-light-dom-markup-and-custom-properties.md), [ADR-002](002-release-through-trusted-publishing.md), [estate ADR-021](https://github.com/khelias/khe-architecture/blob/main/decisions/021-family-shell-and-design-check.md), [estate ADR-014](https://github.com/khelias/khe-architecture/blob/main/decisions/014-shared-ui-packages.md)

## Context

Estate ADR-021 point 8 puts a design check in this package: every web app
runs it in its lint, it counts presentation tells per file against a
baseline the app commits, and the baseline only shrinks. Until now the
package held browser code only: CSS, string renderers, React components
and two modules khe-sites serves as they are. The check reads files and a
git history, so it needs Node, and it has to stay out of every browser
bundle and out of the standalone modules.

## Decision

1. **`khe-design-lint` is a `bin`, not an export.** `src/design-lint.ts`
   is the entry, with the node shebang as its first line and a reference
   to the node types (the build sets `types: []`); its parts live in
   `src/design-lint/`. No browser entry imports it, and `package.json`
   `exports` does not list it, so no bundler reaches it.
   `scripts/check-pack.mjs` lists every emitted file and checks the
   shebang.
2. **Node built-ins only.** The file walk and glob matching
   (`fs.globSync`, `path.matchesGlob`), the flags (`util.parseArgs`) and
   git all come from Node 24, so the package keeps no runtime dependency
   (Rule 2).
3. **The baseline at `HEAD` is read with `git show HEAD:./<file>`**, run
   from the baseline's directory, and only when that file lies under
   `--root` in a git work tree. Raising a rule's total over it fails unless
   `HEAD` has no baseline or one from another lint version. Outside git, or
   with a baseline outside the root, the comparison is skipped and the
   counts are checked against the file alone, which is what CI sees anyway:
   there `HEAD` already holds the branch's baseline.
4. **The rules live in code, one list of matchers per rule,** with the
   Tailwind v3 default hex values generated once from `tailwindcss` into
   `src/design-lint/tailwind-v3-hex.ts` and the family colours copied from
   khe-sites' `DESIGN.md`. A rule change is a release, and the baseline
   records the lint version that wrote it.

## Alternatives considered

- **A second package, `@khelias/design-lint`:** a second trusted publisher
  and a first version published by hand (ADR-002 point 3), for a tool every
  app already gets with the header.
- **An export the apps call from their own script:** each app would carry
  the same wrapper, and the check would sit one import away from browser
  code.
- **Reading git through a library:** a runtime dependency for one
  `git show`.

## Consequences

- `npm run check` builds and packs the bin with the rest; a missing or
  stale file fails it.
- The browser entries and `dist/theme.js` and `dist/rooms.js` are
  unchanged; the check-pack rule that they import nothing still holds.
- An app needs `git` on its path for the `HEAD` comparison; without it the
  comparison is skipped, as outside a git tree.
- The check reads source text, line by line: a class built by string
  concatenation is not seen, and composition stays a matter for review.
