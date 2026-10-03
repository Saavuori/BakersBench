# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **The pan is always the euro oven tray (44 × 37 cm).** The baking-sheet picker
  and custom size inputs are gone; the pan card names the tray instead.
- **Baguettes are always shaped to fit the pan**, so the size picker is hidden
  for them. Three tray-length baguettes is the new default count — four do not
  fit on a euro tray at 4 cm apart.
- **Baguette opens by default**, and your selections — bread, count, leavening,
  prefermented flour, hydration, thickness, touching and start time — are
  remembered per bread in this browser.

### Fixed

- **The container stripped every inline style.** Its CSP (`style-src 'self'`)
  blocks `style=""` attributes, so served from Docker the schedule segments were
  all one width and every baker's-percentage bar was full. Values now go through
  the CSSOM, and `check-assets` fails on any `style=""` in the scripts.
- **"Fit my pan" failed its own pan on a round Dutch oven or stone**, reporting
  "0 cm too long". The length is now the longest rod that fits as a chord.
- **Overhangs could read as zero or negative**, and a too-wide piece was called
  "too long". The verdict now says which dimension fails, in the singular.
- **Custom pan sizes** are held to the inputs' own limits, so a half-typed
  value no longer draws a pan with negative area.
- **Poolish and biga totals left out their yeast**, so the preferment rows added
  up to more than the "Ripe" line and the dough weighed up to ~0.8 g over.
- **Recipe prose lost text after a `#`**, and paragraph breaks, in YAML block
  scalars; a quote wrapping onto the next line was rejected.
- **Baguettes laid front to back were drawn without scores.**
- **`install.sh`, `install.ps1` and `serve.py` only worked from the app folder**,
  `install.sh` printed "0 / all checks passed", and `install.ps1` crashed on
  Windows PowerShell when Docker was installed but not running.

## [1.0.0] — 2026-08-07

First public release.

### The app

- **Ten breads**, every formula traced to a published source and cited in-app:
  country boule, overnight no-knead loaf, faster no-knead, Italian no-knead,
  light rye bâtard, baguette, ciabatta, soft dinner rolls, burger buns and
  Neapolitan pizza.
- **Five leavenings** — sourdough levain, poolish, biga, instant yeast, active
  dry yeast — switchable on any bread, with total flour and total hydration
  preserved exactly.
- **Pan-fit diagram** with real geometry: grid and staggered circle packing,
  both rod orientations, overhang detection and measurement.
- **Live hydration control** that rescales structural liquids only, and flows
  into the pan footprint as well as the formula.
- **Fit my pan** sizing for baguettes — length from the pan, weight from length.
- **Schedule** with per-leavening timings and clock times from a chosen start.
- **Oven timer** with per-bake stage presets, a header pill, a fullscreen mode,
  and a synthesised alarm. Counts against a wall clock so background-tab
  throttling cannot make it drift.
- **Drawn portraits** — procedural SVG per bread, turbulence-warped.
- Light and dark themes, responsive to 375 px.

### Engineering

- 238-check test suite on Node's built-in runner. No test dependencies.
- Contract tests for the recipe data, so a malformed recipe fails in CI rather
  than rendering as `NaN g`.
- `tools/check-assets.mjs` cross-checks `index.html` against every script and
  stylesheet, replacing what a bundler would otherwise catch.
- `tools/check-links.mjs` validates every citation.
- CI on Node 20, 22 and 24, plus a Docker build that boots the container and
  asserts security headers and asset availability.
- Multi-stage Dockerfile where the test stage is a hard dependency of the image.
- GitHub Pages deployment, verified before publish.
- Zero runtime and zero build dependencies.

### Fixed during development

- **Staggered packing placed circles a quarter pitch apart instead of a half**,
  so pieces could overlap on the pan. Caught by the overlap test that was written
  before the bug was known. Both row types now share one origin.
- **Enriched doughs landed ~2% under the target weight** when a preferment was
  carved out, because swapping milk for water changes total mass. A linear
  correction pass makes it exact.
- **`[hidden]` was being overridden** by class-based `display` rules, leaving
  custom pan inputs visible when they should not be.
- **The bread rail reset its scroll position** on every re-render, yanking it
  back to the start mid-drag.
- **Several recipes opened on a count that did not fit**, showing a failure state
  on first view of a card whose entire job is answering *will this fit*.

[1.0.0]: https://github.com/Saavuori/BakersBench/releases/tag/v1.0.0
