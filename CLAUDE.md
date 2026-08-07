# CLAUDE.md

Guidance for Claude Code (and any other agent) working in this repository.

---

## What this is

**Baker's Bench** — a bread formula and pan-fit calculator. You pick a bread, how
many you want, and what leavens it; it gives you an exact formula, a schedule, an
oven timer, and a straight answer about whether the result fits your tin.

Live at <https://saavuori.github.io/BakersBench/>.

Two models carry the app; everything else is presentation:

1. **The formula model** (`js/formula.js`) — baker's percentages. Its invariant:
   *whichever leavening you pick, total flour and total hydration do not move.*
   A preferment is carved out of the dough, not added on top.
2. **The footprint model** (`js/packing.js`) — dough width scales with the cube
   root of weight, adjusted for hydration; pieces are then packed onto a pan with
   real geometry.

`docs/ARCHITECTURE.md` has the full detail. Read it before changing either.

---

## The two rules that matter most

**1. Never edit `js/recipes.js`.** It is generated. Edit `recipes/*.yaml` and run
`npm run build`. A test fails if the two drift, so a hand-edit will be caught —
but it will also be lost the next time anyone rebuilds.

**2. Every formula must cite a published source.** No invented numbers. If a
source is ambiguous, write the judgment call down in the recipe's `notes:` field
rather than quietly picking something. See `recipes/jenny-no-knead.yaml` for the
worked example.

---

## Working with recipes

Everything about a bread lives in one YAML file:

```bash
recipes/boule.yaml          # one file per bread, named after its `id`
recipes/_leavenings.yaml    # shared: the leavening options
recipes/_pans.yaml          # shared: the pans
```

**`recipes/README.md` is the full field reference.** Read it before adding or
changing a bread — it documents every field, the water-content table, and the
YAML subset the parser accepts.

### The loop

```bash
# edit recipes/<bread>.yaml
npm run build     # regenerate js/recipes.js
npm test          # 271 checks
```

### Adding a bread

1. Copy the closest existing `recipes/*.yaml`, rename it to match its new `id`.
2. Add a portrait to `ART` and `BOX` in `js/portraits.js`, keyed by the same id.
3. `npm run build && npm test`.

`tests/data.test.mjs` enforces the recipe contract and will name exactly what is
missing. Trust it over your memory of the schema.

### Removing a bread

Delete the `.yaml`, delete its portrait from `js/portraits.js`, `npm run build`.

### Common mistakes

- **`yeast.instant_pct` is always the instant-yeast figure.** Every other
  leavening converts from it. An active-dry number here silently inflates the
  rest.
- **Flours must sum to exactly 100.** The build refuses otherwise.
- **`prefermented_flour` is a share of total flour**, not a weight of starter.
- **Check the default count fits.** Set `counts.default` if the natural pick
  would open on "Only 1 fit" — a card whose job is answering *will this fit*
  should not greet you with a failure.
- **Rods need `length`; pizza needs `fixed_diameter`.** Without it the size is
  derived from weight, which for a stretched pizza is badly wrong. This has been
  a real bug once.

---

## Commands

```bash
npm run build        # recipes/*.yaml -> js/recipes.js
npm run build:check  # fail if the generated file is stale
npm test             # 271 checks, no install step, ~0.6s
npm run check        # build check + tests + asset check + citation check
npm start            # serve on http://localhost:5178

python serve.py 8080 # same server, explicit port
./install.sh         # checks the toolchain, runs tests, then serves
docker compose up --build
```

There is **no `npm install`.** `dependencies` and `devDependencies` are both
empty and should stay that way — see below.

---

## Repository map

```
index.html            Structure. Every element the app touches has an id.
styles.css            Design tokens, both themes, all layout.
recipes/*.yaml        SOURCE OF TRUTH for all bread data.
js/
  recipes.js          GENERATED from recipes/. Do not edit.
  formula.js          Baker's percentage maths. Pure; no DOM.
  packing.js          Footprint model and pan geometry. Pure; no DOM.
  portraits.js        Procedural SVG loaf portraits. Pure; returns strings.
  timer.js            Oven timer: state, alarm, three render surfaces.
  app.js              State, event wiring, all DOM rendering.
tools/
  build-recipes.mjs   YAML -> js/recipes.js
  yaml.mjs            Small strict YAML subset reader/writer
  check-assets.mjs    Cross-checks index.html against scripts and styles
  check-links.mjs     Validates every recipe citation
tests/*.test.mjs      Formula invariants, packing geometry, data contracts
docs/                 Architecture, sources, development, deployment
```

Dependency direction is one-way: `app.js` knows everything; `formula.js`,
`packing.js` and `portraits.js` know only `recipes.js`; `recipes.js` knows
nothing. That is what lets the maths be tested in Node with no DOM.

---

## Constraints to respect

These are deliberate. Do not quietly trade them away.

**Zero dependencies, runtime and build.** No framework, no bundler, nothing in
`node_modules`. Tests use Node's built-in runner; the YAML parser is hand-written
for the same reason. If you find yourself wanting a package, that is a design
conversation, not a `npm install`.

**No network at runtime.** No fonts, no CDNs, no analytics. The CSP is
`connect-src 'none'` and CI asserts it on a running container. This is why
recipes are compiled to JS rather than fetched as JSON.

**It must work opened straight from disk.** No build step required to *use* the
app — only to change recipe data.

**Pure maths stays pure.** `formula.js`, `packing.js` and `portraits.js` never
touch the DOM.

---

## House style

- **Comments explain why, never what.** If a constant looks arbitrary, say where
  it came from. `FLOUR_SPREAD = 2.05` is meaningless without its calibration note.
- **Use the domain vocabulary**: `levain`, `bulk`, `crumb`, `pan-up`, `bâtard`.
- **`recipes.js` is data.** No logic, ever. (It is generated anyway.)
- **Copy is design material.** Errors say what happened and what to do next.
  Buttons keep the same verb through a flow. No filler, no apologies.
- **Two accents with fixed meanings**: `--ember` is heat, `--rye` is
  fermentation. Never swap them for variety.
- Watch CSS specificity around `[hidden]` — a class-based `display` rule beats
  the UA default, which is why there is an explicit reset near the top of
  `styles.css`. That bug shipped once.

---

## Testing

`npm test` runs 271 checks in about 0.6 s with no install step.

| File | Protects |
|---|---|
| `formula.test.mjs` | The core invariant across every recipe × leavening. Scaling linearity. Fidelity to the four converted video sources, to the gram. |
| `packing.test.mjs` | Footprint calibration points, capacity answers, no overlaps, nothing off the pan. |
| `data.test.mjs` | The recipe contract — a malformed recipe fails here, not as "NaN g" in the UI. |
| `generated.test.mjs` | `js/recipes.js` matches `recipes/*.yaml`. |
| `yaml.test.mjs` | The YAML subset, especially that it *rejects* what it does not support. |

The calibration cases in `packing.test.mjs` were fitted against what bakers
actually report, not derived from the formula. **If one fails, that is the test
working.** Justify a change against evidence — a source, a measurement, a bake —
and say why in the PR. Never adjust a calibration case just to make a build green.

`tests/harness.mjs` loads the browser sources into a `vm` sandbox. Two things to
know: top-level `const` lives in a script's lexical scope, so the harness
concatenates the sources and closes with an expression naming the bindings; and
values from the sandbox carry that realm's prototypes, so `assert.deepEqual` on
an array derived from `RECIPES` needs `Array.from` first.

---

## Verifying in the browser

The dev server sends `Cache-Control: no-store` for exactly this reason — edit,
reload, see the change. If a change appears not to take effect, suspect a cached
asset before suspecting your code.

Everything is on `window`, deliberately:

```js
state                 // current selection
model()               // recipe, footprint, fit result, formula
Formula.compute({ recipe: RECIPES[0], leavenId: 'levain', pff: 0.2, totalDough: 900 })
Timer.set(120, 'Test'); Timer.enterFull()
```

A sweep across the whole matrix, which is how most regressions here get caught:

```js
for (const r of RECIPES) for (const l of LEAVENS) {
  selectRecipe(r.id); state.leavenId = l.id; syncPff(); render();
  const m = model();
  console.assert(Math.abs(m.f.totalDough - m.size.g * state.count) < 1.5, r.id, l.id);
}
```

Check both themes and 375 px width before calling a UI change done. Most
regressions in this project have been layout ones.

---

## Before opening a PR

```bash
npm run check
```

CI runs the same checks on Node 20, 22 and 24, plus a Docker build that boots the
container and asserts security headers and asset availability. `main` deploys to
GitHub Pages automatically after the same verification.
