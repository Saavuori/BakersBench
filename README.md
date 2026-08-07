<div align="center">

# Baker's Bench

**Scale any bread formula by baker's percentages, and find out what actually fits your pan.**

[![CI](https://github.com/Saavuori/BakersBench/actions/workflows/ci.yml/badge.svg)](https://github.com/Saavuori/BakersBench/actions/workflows/ci.yml)
[![Pages](https://github.com/Saavuori/BakersBench/actions/workflows/pages.yml/badge.svg)](https://github.com/Saavuori/BakersBench/actions/workflows/pages.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Dependencies](https://img.shields.io/badge/runtime%20dependencies-0-brightgreen.svg)](#no-dependencies-on-purpose)

**[Open the app →](https://saavuori.github.io/BakersBench/)**

</div>

---

Pick a bread. Pick how many you want. Pick what leavens it. You get an exact
formula, a schedule, an oven timer, and a straight answer about whether it fits
your tin.

## What it answers

> **"If I want 8 large burger buns, will they fit on one sheet?"**
> No — 6 fit on a half sheet. Drop to standard size (90 g) and all 8 fit, or move
> to a full sheet, which takes 15.

> **"What changes if I use sourdough instead of yeast?"**
> The formula splits into a levain build and a final dough, the commercial yeast
> disappears, and the schedule roughly doubles. Total flour and total hydration
> do not move — see [why that matters](docs/ARCHITECTURE.md#formula).

> **"How long should I shape my baguettes?"**
> Pick *Fit my pan*: 44 cm on a half sheet, which makes each one 277 g, and three
> fit. Change the pan and the length, weight and count all re-derive.

> **"What if I push the hydration up?"**
> Move the slider. The water rescales, the formula re-solves at the same dough
> weight, and the pan diagram widens — because wetter dough genuinely relaxes
> flatter, and the footprint model knows that.

## Quick start

```bash
git clone https://github.com/Saavuori/BakersBench.git
cd BakersBench
./install.sh
```

<details>
<summary>Windows</summary>

```powershell
git clone https://github.com/Saavuori/BakersBench.git
cd BakersBench
.\install.ps1
```
</details>

The installer checks your toolchain, runs the test suite, and serves the app at
<http://localhost:8080>. It refuses to start if the formula tests fail — bad
maths here means wasted flour.

### Docker

```bash
docker compose up --build
```

The image build runs the test suite in its first stage, so a failing formula
never becomes a published image. Full detail in
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

### No install at all

The app is static HTML, CSS and JavaScript. Any web server works:

```bash
python serve.py 8080
```

## Ten breads

| | Bread | Leavening it defaults to |
|---|---|---|
| 🥖 | Country boule | Sourdough levain |
| 🥖 | Overnight no-knead loaf | Instant yeast |
| 🥖 | Faster no-knead bread | Instant yeast |
| 🥖 | Italian no-knead bread | Instant yeast |
| 🥖 | Light rye bâtard | Sourdough levain |
| 🥖 | Baguette | Instant yeast |
| 🥖 | Ciabatta | Biga |
| 🥐 | Soft dinner rolls | Instant yeast |
| 🍔 | Burger buns | Instant yeast |
| 🍕 | Neapolitan pizza | Instant yeast |

Any bread can be switched between sourdough levain, poolish, biga, instant yeast
and active dry yeast. Every formula traces to a published source —
[all of them are cited](docs/SOURCES.md), including the two places where a source
was ambiguous and a judgment call had to be made.

## What makes it more than a spreadsheet

- **A pan diagram that does real geometry.** Circles are packed as both a square
  grid and staggered rows, whichever holds more; rods are tried in both
  orientations; nothing is allowed to overhang. A 50 cm baguette on a 46 cm half
  sheet is drawn hanging over both ends, with the overhang measured.
- **Preferments carved out, not bolted on.** Choosing a levain moves flour and
  water out of the final dough into an earlier step, so your total flour and
  hydration land exactly where the recipe intended.
- **An oven timer with the bake's own stages.** One tap for "Lid on 20 min".
  Counts against a wall clock so a background tab cannot make it drift, with a
  synthesised alarm, a header pill, and a fullscreen mode.
- **Drawn portraits, not stock photos.** Each loaf is procedural SVG, warped by
  turbulence so no edge is a clean mathematical curve.

## Documentation

| | |
|---|---|
| [Architecture](docs/ARCHITECTURE.md) | The two models — baker's percentages and the footprint/packing maths |
| [Sources](docs/SOURCES.md) | Every citation, and the judgment calls behind two of them |
| [Development](docs/DEVELOPMENT.md) | Running it, testing it, the house style |
| [Deployment](docs/DEPLOYMENT.md) | Docker, GitHub Pages, and any static host |
| [Contributing](CONTRIBUTING.md) | How to add a bread |
| [Security](SECURITY.md) | Threat model and reporting |

## No dependencies, on purpose

There is no build step, no bundler, no framework, and nothing in
`node_modules` — `dependencies` and `devDependencies` are both empty. The tests
run on Node's built-in runner; the app runs on the browser's built-in everything.

That is a deliberate trade. It costs some ergonomics and buys a supply chain of
zero, an app that will still open in ten years, and a codebase where every line
that executes is one somebody here wrote.

## Limits worth knowing

- Footprints are a model, not a measurement. Shaping tension and proof time move
  the real number by a centimetre either way. A result within one piece of your
  target really means "it depends on your shaping".
- Fermentation times assume roughly 22–24 °C. A cold kitchen stretches all of them.
- Starter is assumed to be at 100% hydration.

## Licence

[MIT](LICENSE). The recipes themselves belong to the bakers who published them
and are credited in [docs/SOURCES.md](docs/SOURCES.md); what is licensed here is
the software.
