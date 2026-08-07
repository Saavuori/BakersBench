# Security

## Threat model

Baker's Bench is a static client-side calculator. That shapes the whole picture:

- **No backend.** Nothing to authenticate against, no database, no API.
- **No user accounts, no personal data.** The only thing stored is a theme
  preference in `localStorage`.
- **No network requests at runtime.** No fonts, no CDNs, no analytics, no
  telemetry. Once the page has loaded, it never talks to anything again.
- **No runtime dependencies.** `dependencies` and `devDependencies` are both
  empty. Every line that executes was written in this repository.

The realistic risks are therefore: a compromised hosting environment, a malicious
pull request, or a supply-chain attack on CI. The controls below target those.

## Controls

**Content Security Policy.** `deploy/nginx.conf` sets
`default-src 'none'` with `script-src 'self'`, `connect-src 'none'`,
`form-action 'none'` and `base-uri 'none'`. There is no inline script and no
`eval` in the app, so the policy needs no unsafe directives. CI asserts the
headers are present on a running container — an unverified policy is not a
policy.

**Container.** The image runs as a non-root user on an unprivileged port.
Compose adds `read_only`, `cap_drop: ALL` and `no-new-privileges`.

**CI permissions.** Workflows declare least-privilege `permissions:` blocks.
The Pages deploy uses OIDC (`id-token: write`) rather than a long-lived token.
No workflow has write access to repository contents.

**Dependencies.** Dependabot watches the only supply chain that exists here —
GitHub Actions and the Docker base images.

**Data integrity.** Every recipe citation must be `https`, enforced by
`tools/check-links.mjs` in CI.

## Reporting a vulnerability

Please use **[GitHub Security Advisories](https://github.com/Saavuori/BakersBench/security/advisories/new)**
rather than a public issue.

Include what you can reproduce, the impact you think it has, and how you found
it. You will get an acknowledgement within a few days, and credit in the advisory
unless you would rather not have it.

If it turns out to be low severity or out of scope, that will be explained rather
than ignored.

## Out of scope

- The recipes being wrong. That is a [bug report](https://github.com/Saavuori/BakersBench/issues/new?template=bug.yml), and a welcome one — just not a security issue.
- Anything requiring an attacker to already control the user's browser or host.
- Missing headers on a deployment you configured yourself. The supplied nginx
  config sets them; other hosts are your own to harden.

## Supported versions

`main` is the supported version. There are no release branches — the app is one
static page and the fix is always to redeploy.
