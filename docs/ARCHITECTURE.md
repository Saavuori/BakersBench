# Architecture

Two models carry this app. Everything else is presentation.

1. **The formula model** turns a recipe and a target dough weight into weighed
   ingredients, split across a preferment and a final dough.
2. **The footprint model** turns a dough weight into a physical size, then packs
   those sizes onto a pan.

They are independent — you could delete the pan diagram and the formulas would
be unaffected, and vice versa — but the hydration slider drives both, which is
what makes wetter dough visibly spread wider on the pan.

---

## Module map

```
index.html          Structure. Every element the app touches has an id.
styles.css          Design tokens, both themes, all layout.
js/
  recipes.js        DATA ONLY. Recipes, leavenings, pan sizes. No logic.
  formula.js        Baker's percentage maths. Pure; no DOM.
  packing.js        Footprint model and pan geometry. Pure; no DOM.
  portraits.js      Procedural SVG loaf portraits. Pure; returns strings.
  timer.js          Oven timer: state, alarm, three render surfaces.
  app.js            State, event wiring, and all DOM rendering.
tools/
  check-assets.mjs  Cross-checks index.html against the scripts and stylesheet.
  check-links.mjs   Validates every recipe citation.
tests/
  harness.mjs       Loads the browser sources into a Node vm sandbox.
  *.test.mjs        Formula invariants, packing geometry, data contracts.
```

The dependency direction is one-way: `app.js` knows about everything;
`formula.js`, `packing.js` and `portraits.js` know only about `recipes.js`;
`recipes.js` knows nothing. That is what lets the tests exercise the maths in
Node with no DOM at all.

Scripts are plain classic `<script>` tags, evaluated in order. There is no
module system and no build step — see
[the rationale](../README.md#no-dependencies-on-purpose).

---

## Formula

### The invariant

> Whichever leavening you choose, **total flour** and **total hydration** do not
> move.

A preferment is not added *on top of* the dough. Its flour and water are
**carved out** of the dough and moved into an earlier step. That is how a bakery
does it, and it is why these numbers disagree with common advice like *"swap one
packet of yeast for a cup of starter"* — that advice silently changes both your
flour weight and your hydration.

### Solving for flour

Baker's percentages are all relative to flour, so they sum to more than 100%.
Total flour falls out of that sum:

```
sumPct     = 100 (flour) + liquids + salt/fat/sugar + yeast
totalFlour = targetDough / (sumPct / 100)
```

Then every ingredient is `totalFlour × pct / 100`.

### Carving out the preferment

```
prefermentFlour = totalFlour × prefermentedFlour%
prefermentWater = prefermentFlour × prefermentHydration
finalDough      = everything else, minus exactly those two amounts
```

Preferment flour comes off the base flour first, spilling over pro rata if the
base runs out. Preferment water comes out of plain water first, then out of milk
or egg **scaled by their water content**, so that total hydration lands exactly
even in an enriched dough.

For a sourdough levain, the ripe seed starter is accounted for inside the build
rather than added on top: a 20% seed at 100% hydration contributes half its
weight as flour and half as water, and the build's flour and water are reduced to
match. The result is a standard 1:4:4 build that is also arithmetically exact.

### The correction pass

Swapping milk for water to hit a hydration target changes total *mass* even
though flour and hydration are preserved. That would leave the dough weight ~2%
under target on enriched recipes.

Because every output is linear in total flour, one correction pass is exact:

```
first     = build(targetDough)
corrected = build(targetDough × targetDough / first.totalDough)
```

Verified in `tests/formula.test.mjs` across every recipe × leavening: dough
weight lands within 0.5 g and hydration within 0.1 percentage points.

### Hydration as a control

The slider rescales only the **structural** liquids — water and milk (anything
at ≥ 85% water). Egg, butter and malt are enrichments whose quantity is a recipe
decision, so they hold and their water counts as fixed. That also bounds how low
a recipe can go: an enriched dough can never be drier than what its enrichments
already carry.

---

## Footprint

### Dough scales by volume, so width scales by cube root

```
diameter = k · mass^(1/3)
k        = 2.05 · (1 + (hydration − 0.65) · 0.55) · spread
```

Wetter dough relaxes outward; stiffer dough climbs. `spread` adjusts per bread —
enriched dough holds its ball (0.95), burger buns flatten and widen (1.05).

Calibrated against what bakers actually report, and it holds across a 20× weight
range:

| Piece | Model | Reality |
|---|---|---|
| 50 g dinner roll | 7.1 cm → **24 fill a half sheet** | 24 is the number bakers quote |
| 90 g burger bun | 9.6 cm | ~9–10 cm |
| 900 g boule | 21 cm | ~20–22 cm |

These are locked in `tests/packing.test.mjs`. If the constants drift, those tests
fail.

### Long shapes

A baguette's length is a shaping choice, not a consequence of weight, so rods use
an **areal density** (grams per cm² of footprint) instead:

```
width = mass / (arealDensity × length)
```

*Fit my pan* inverts that. Given a pan, the length is the usable dimension, and
since a baked baguette has a characteristic width whatever its length, the weight
follows:

```
length = usable pan dimension
weight = arealDensity × length × targetWidth
```

---

## Packing

Circles are packed twice — a square grid and staggered (hexagonal) rows — and
whichever holds more wins. Rectangles are tried in both orientations.

The staggered layout is worth a note, because it is where a bug hid for a while.
Both row types must share **one origin**, with offset rows shifted exactly half a
pitch. Centring each row independently looks correct but produces a quarter-pitch
offset, which drops the diagonal spacing from `p` to `0.9p` and makes pieces
overlap. `tests/packing.test.mjs` asserts no two pieces are ever closer than
`diameter + gap`.

A **1 cm margin** is kept at every pan edge, because sheet pans have sloped sides.

Nothing is allowed to overhang. When a piece cannot fit at all, the result
carries a `tooLong` report — by how much, and against which dimension — which the
UI uses to draw the piece hanging over the rim with the overhang measured.

---

## Rendering

`app.js` re-renders everything from state on any change. That is cheap enough
here and removes a whole class of stale-view bugs, with three deliberate
exceptions:

- **The portrait** only redraws when the recipe changes. It is filter-heavy, and
  redrawing it on every slider tick was visibly slow.
- **The bread rail** is built once, then only its `aria-selected` attributes are
  updated. Rebuilding its markup would reset `scrollLeft` and yank the rail back
  to the start mid-drag.
- **The timer** owns its own state and render loop, so a re-render of the page
  never disturbs a running countdown.

### The two kinds of picture

Deliberately not sharing a style, because they do different jobs:

- **The pan diagram** is a technical layout — flat, schematic, ember-on-steel.
  It is read for geometry, so it stays legible and abstract.
- **The portrait** is the loaf itself, in real bread colours that do **not**
  change with the page theme, because a photograph wouldn't either.

Portrait realism comes mostly from `feTurbulence` + `feDisplacementMap` warping
each silhouette, so no edge is ever a clean mathematical curve — that kills the
vector-clipart look more than any amount of added detail. A multiplied noise
layer gives oven-colour variance on top.

---

## Design system

Two accents, each with one job, never swapped:

| Token | Means |
|---|---|
| `--ember` | Heat. The oven, baked dough, the timer. |
| `--rye` | Fermentation. Preferments, wild yeast, elapsed time. |

So a sourdough formula sheet is visibly a different kind of document from a
straight-dough one, before you read a word of it.

Weights are set in a tabular monospace face throughout, because a baker's formula
sheet is an engineering document and the numbers are the content.
