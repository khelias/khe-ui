# ADR-002: Releases are published from a tag by trusted publishing, the first one by hand

- **Status:** Accepted (2026-10-17)
- **Related:** [estate ADR-014](https://github.com/khelias/khe-architecture/blob/main/decisions/014-shared-ui-packages.md), [estate ADR-007](https://github.com/khelias/khe-architecture/blob/main/decisions/007-automated-writers.md)

## Context

Estate ADR-014 puts `@khelias/ui` on npmjs, published from a GitHub-hosted
runner through npm trusted publishing with provenance and no stored token.
Trusted publishing exchanges the workflow's OIDC token for a short-lived
publish credential. It works only on GitHub-hosted runners, needs npm
11.5.1 or later and Node 22.14 or later, `id-token: write`, and a
`repository.url` in `package.json` that matches the repo exactly. The
trusted publisher is configured on the package's page, so the package has
to exist before a workflow can publish it.

## Decision

1. **`.github/workflows/release.yml` runs on a pushed tag `v*`.** Job
   `check` (read-only) runs `npm ci` and `npm run -s check`. Job `publish`
   needs it, runs in the GitHub environment `npm`, has only
   `id-token: write` and `contents: read`, fails unless the tag is `v`
   followed by the `package.json` version, and runs `npm publish`; npm adds
   the provenance attestation itself.
2. **The trusted publisher on npmjs names owner `khelias`, repo `khe-ui`,
   workflow `release.yml` and environment `npm`.** Publishing access is
   "Require two-factor authentication and disallow tokens", so no token can
   publish. npm matches the workflow file and the environment, not the ref,
   so the environment `npm` accepts deployments only from tags `v*`, and a
   tag ruleset lets only the repo owner create `v*` tags. The job that can
   mint the credential installs with `--ignore-scripts`.
3. **0.1.0 is published by hand** (`npm publish --access public` after
   `npm login`), because the package must exist first. Its tag `v0.1.0` is
   never pushed, or the workflow would try to publish it again; the first
   tagged release is 0.1.1 or later.
4. **Actions are pinned by digest**, as in every estate repo.

## Alternatives considered

- **An automation token in a repository secret:** a long-lived credential
  that can publish from anywhere, which ADR-014 rules out.
- **Publishing from a laptop for every release:** no provenance and no
  check run tied to the published code.
- **Releasing on every push to `main`:** a version is a decision; a tag
  makes it one.

## Consequences

- A release is: bump `version` in `package.json`, commit, tag `v<version>`,
  push the tag. A tag that does not match fails before anything is
  published.
- A bad release is not unpublished: it gets `npm deprecate` and a fixed
  release. No app moves until its own Renovate pull request is merged.
- The workflow is an automated writer in the estate's register
  ([estate ADR-007](https://github.com/khelias/khe-architecture/blob/main/decisions/007-automated-writers.md)).
