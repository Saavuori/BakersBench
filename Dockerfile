# syntax=docker/dockerfile:1
#
# Baker's Bench ships as static files, so the image is just a web server with
# the app in it. The first stage exists to make a broken build unpublishable:
# if the formula or packing tests fail, no image is produced.

# ── 1. Verify ────────────────────────────────────────────────────────────────
FROM node:26-alpine AS test

WORKDIR /app
COPY package.json ./
COPY js ./js
COPY tests ./tests
COPY tools ./tools
COPY recipes ./recipes

RUN node tools/build-recipes.mjs --check \
 && node --test \
 && node tools/check-links.mjs \
 && date -u +%Y-%m-%dT%H:%M:%SZ > /app/VERIFIED

# ── 2. Serve ─────────────────────────────────────────────────────────────────
# nginx-unprivileged already runs as a non-root user and listens on 8080, so
# there is no chown/pid juggling and no capabilities to drop afterwards.
FROM nginxinc/nginx-unprivileged:1.31-alpine AS runtime

LABEL org.opencontainers.image.title="Baker's Bench" \
      org.opencontainers.image.description="Bread formula and pan-fit calculator" \
      org.opencontainers.image.source="https://github.com/Saavuori/BakersBench" \
      org.opencontainers.image.documentation="https://github.com/Saavuori/BakersBench#readme" \
      org.opencontainers.image.licenses="MIT"

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

WORKDIR /usr/share/nginx/html
# Carrying the marker forward makes the test stage a hard build dependency —
# without it, BuildKit would prune the whole verification stage as unused.
COPY --from=test /app/VERIFIED ./.verified
COPY index.html styles.css ./
COPY js ./js

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
