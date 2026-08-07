# Development

## Getting it running

```bash
git clone https://github.com/Saavuori/BakersBench.git
cd BakersBench
./install.sh          # checks tools, runs tests, serves on :8080
```

Or without the installer:

```bash
python serve.py 5178
```

`serve.py` is `python -m http.server` with `Cache-Control: no-store` added.
Without that, editing `styles.css` and reloading keeps serving the old file, and
it looks like your change did nothing. That cost real debugging time once —
hence the script.

You need **Python 3** (or Docker) to serve, and **Node 20+** to run tests.
Neither is needed to *use* the app.

### Why not just open index.html?

You can, mostly. But `file://` behaves inconsistently across browsers for
multi-file apps, and some devtools features are disabled. Use the server.

---

## Tests

```bash
npm test                 # node --test "tests/*.test.mjs"
npm run test:watch
npm run check            # tests + citation checks
node tools/check-assets.mjs
node tools/check-links.mjs --network
```

238 checks, no dependencies, about half a second.

### How the harness works

The app ships as classic `<script>` tags with no module system, which Node cannot
`import`. `tests/harness.mjs` therefore evaluates the sources in a `vm` sandbox —
the same way a browser evaluates consecutive scripts — and hands back the
globals.

One wrinkle worth knowing: top-level `const` lives in a script's *lexical* scope,
not on the global object, so the harness concatenates the sources and closes the
bundle with an expression naming the bindings it wants. Evaluating the files
separately would leave every global undefined.

### What the tests protect

| File | What it holds |
|---|---|
| `formula.test.mjs` | The core invariant — flour and hydration survive every leavening. Linearity of scaling. Fidelity to the four converted video sources, to the gram. |
| `packing.test.mjs` | Footprint calibration points. Capacity answers. No overlaps, nothing off the pan, a bigger pan never holds fewer. |
| `data.test.mjs` | The recipe contract: what a well-formed recipe looks like, so a malformed one fails here rather than rendering "NaN g". |

The calibration cases in `packing.test.mjs` are the ones the model was *fitted*
against. They are not derived from the formula — they come from what bakers
report. Changing them needs justification.

---

## Adding a bread

Two edits, no plumbing:

1. An object in `RECIPES` in `js/recipes.js`
2. An entry in `ART` and one in `BOX` in `js/portraits.js`

`data.test.mjs` describes the recipe contract precisely and will tell you what
you missed. The short version:

```js
{
  id: 'kebab-case',
  name: 'Full name',            // hero heading
  short: 'Rail label',          // must stay short — the rail is horizontal
  unit: { one: 'loaf', many: 'loaves' },
  family: 'Lean · rustic',      // second word becomes the rail subtitle
  blurb: 'Two sentences on what makes this bread this bread.',
  links: [{ label, source, url, video?: true }],   // required — cite your source

  flours:  [{ name, pct }],     // must sum to 100
  liquids: [{ name, pct, water }],   // water: 1.0 water · 0.87 milk · 0.75 egg
  others:  [{ name, pct, kind, water? }],  // kind: salt | fat | sugar
  yeastPct: 0.6,                // ALWAYS the instant-yeast baseline

  defaultLeaven: 'instant',
  preferment: { levain: 0.20, poolish: 0.30, biga: 0.30 },

  shape: { type: 'round' | 'rod' | 'ring', spread?, arealDensity?, gap, canTouch },
  sizes: [{ id, label, g, length?, default? }],   // smallest first, one default
  quickCounts: [1, 2, 4],
  defaultCount: 1,              // optional — must be a count that fits

  schedule: { mix, bulk, shape, proof },   // minutes; any may be { direct, preferment }
  bake: { temp, time, stages: [{ label, min }], steam, internal }
}
```

### Rules that matter

- **`yeastPct` is always the instant-yeast figure.** Every other leavening is
  converted from it. Putting a fresh-yeast number here silently inflates every
  other option.
- **Percentages, not grams.** The app scales; the recipe describes ratios.
- **Cite the source, and write down any judgment call** in a comment next to the
  recipe. See the Jenny Can Cook entry for the pattern.
- **Check the default count fits.** `defaultCount` exists because several
  recipes used to open showing "Only 1 fit", which is a poor first impression on
  a card whose entire job is answering *will this fit*.

---

## House style

The code is written to be read by someone who bakes, not only by someone who
codes.

- **Comments explain why, never what.** If a constant looks arbitrary, say where
  it came from. `FLOUR_SPREAD = 2.05` is meaningless without the calibration note
  beside it.
- **Name things the way a baker would.** `levain`, `bulk`, `pan-up`, `crumb`.
  The domain has precise vocabulary; use it.
- **Pure maths stays pure.** `formula.js`, `packing.js` and `portraits.js` never
  touch the DOM. That is what makes them testable in Node and what keeps the
  models honest.
- **`recipes.js` is data.** No logic there, ever.
- **Copy is design material.** Errors say what happened and what to do. Buttons
  keep the same verb through a flow. No filler.

### CSS

- Design tokens at the top of `styles.css`; both themes defined there and nowhere
  else.
- Two accents with fixed meanings — `--ember` is heat, `--rye` is fermentation.
  Never swap them for variety.
- Watch specificity around `[hidden]`. A class-based `display` rule beats the
  UA's `[hidden] { display: none }`, which is why there is an explicit
  `!important` reset near the top. That bug shipped once.

---

## Debugging in the browser

Everything is on `window`, deliberately, so the console is a usable tool:

```js
state                         // current selection
model()                       // recipe, footprint, fit result, formula
Formula.compute({ recipe: RECIPES[0], leavenId: 'levain', pff: 0.2, totalDough: 900 })
Packing.fit({ pan: PANS[1], footprint, gap: 3, requested: 8 })
Timer.set(120, 'Test'); Timer.enterFull()
```

A quick sweep for regressions across the whole matrix:

```js
for (const r of RECIPES) for (const l of LEAVENS) {
  selectRecipe(r.id); state.leavenId = l.id; syncPff(); render();
  const m = model();
  console.assert(Math.abs(m.f.totalDough - m.size.g * state.count) < 1.5, r.id, l.id);
}
```

---

## Pull requests

CI runs the test suite on Node 20, 22 and 24, the asset and citation checks, and
a full Docker build that boots the container and asserts every file is served
with the right security headers.

Before opening one: `npm run check`, then look at the app in both themes and at
375 px wide. The checklist in the PR template covers the rest.
