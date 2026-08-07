# Deployment

The app is static files. Anything that serves HTML can host it, and there is
nothing to build first.

---

## Docker

```bash
docker compose up --build          # http://localhost:8080
```

or

```bash
docker build -t bakers-bench .
docker run --rm -p 8080:8080 bakers-bench
```

### What the image does

Two stages:

1. **`test`** — `node:22-alpine`, runs the full test suite and the citation
   check. A marker file it writes is copied into the runtime stage, which makes
   the tests a hard build dependency rather than a stage BuildKit can prune. A
   failing formula therefore cannot become an image.
2. **`runtime`** — `nginxinc/nginx-unprivileged`, which already runs as a
   non-root user on port 8080. No chown juggling, no capabilities to drop after
   the fact.

### Hardening

The Compose file runs it read-only, with all capabilities dropped,
`no-new-privileges`, and tmpfs mounts for the few paths nginx needs to write.

`deploy/nginx.conf` sets a deliberately strict CSP:

```
default-src 'none'; script-src 'self'; style-src 'self';
img-src 'self' data:; connect-src 'none'; form-action 'none'; base-uri 'none'
```

The app makes **no network requests at runtime** — no fonts, no CDNs, no
analytics, no telemetry. If a future change needs an external resource, that
policy is the first thing to revisit, and the honest answer is usually to inline
the resource instead.

CI asserts these headers are actually present on a running container, because a
policy you never verify is a policy you do not have.

---

## GitHub Pages

Deploys automatically from `main` via `.github/workflows/pages.yml`.

The workflow verifies before it publishes — tests, asset check, citation check —
then assembles a `site/` directory containing only what the app needs, stamps the
commit into an HTML comment, and uploads it.

`.nojekyll` is written into the artifact. Without it, Pages runs the upload
through Jekyll, which ignores directories it considers special and would quietly
drop files.

### One-time repository setup

Settings → Pages → **Source: GitHub Actions**. No branch to pick; the workflow
supplies the artifact.

Live at <https://saavuori.github.io/BakersBench/>.

---

## Any other static host

Upload `index.html`, `styles.css` and `js/`. That is the whole app.

```bash
# Netlify
netlify deploy --prod --dir .

# Cloudflare Pages
wrangler pages deploy .

# S3
aws s3 sync . s3://your-bucket --exclude "*" \
  --include "index.html" --include "styles.css" --include "js/*"
```

No environment variables, no secrets, no backend, no database. There is nothing
to configure and nothing to leak.

---

## Verifying a deployment

```bash
curl -sSI https://your-host/ | grep -i content-security-policy

for f in / /styles.css /js/app.js /js/recipes.js /js/formula.js \
         /js/packing.js /js/portraits.js /js/timer.js; do
  printf '%s %s\n' "$(curl -s -o /dev/null -w '%{http_code}' "https://your-host$f")" "$f"
done
```

All eight should return 200. If `index.html` loads but the page is unstyled or
inert, one of the seven asset paths is wrong — which is exactly the failure
`tools/check-assets.mjs` catches before it ships.

---

## Rollback

The image is immutable and the site is static, so rollback is redeploying the
previous commit:

```bash
git revert <sha> && git push        # Pages redeploys from main
```

or re-run an older successful **Deploy to GitHub Pages** run from the Actions tab.
