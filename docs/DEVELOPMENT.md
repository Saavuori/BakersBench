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
npm run build            # recipes/*.yaml -> js/recipes.js
npm test                 # node --test
npm run test:watch
npm run check            # tests + citation checks
node tools/check-assets.mjs
node tools/check-links.mjs --network
```

271 checks, no dependencies, about six tenths of a second.

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
| `generated.test.mjs` | `js/recipes.js` still matches `recipes/*.yaml`. |
| `yaml.test.mjs` | The YAML subset — especially that it rejects what it does not support. |

The calibration cases in `packing.test.mjs` are the ones the model was *fitted*
against. They are not derived from the formula — they come from what bakers
report. Changing them needs justification.

---

## Adding a bread

Bread data lives in [`recipes/*.yaml`](../recipes/README.md), one file per bread.
`js/recipes.js` is generated from it and committed; `npm test` fails if the two
drift.

```bash
# 1. edit or add recipes/<bread>.yaml
# 2. add a portrait to ART and BOX in js/portraits.js, keyed by the same id
npm run build
npm test
```

[`recipes/README.md`](../recipes/README.md) documents every field, the
water-content table, and the YAML subset the parser accepts. `tests/data.test.mjs`
enforces the contract and names exactly what is missing.

### Why the data is compiled rather than fetched

The app ships zero runtime dependencies and makes no network requests — the CSP
is `connect-src 'none'` and it must work opened straight from disk. It can
therefore neither parse YAML in the browser nor fetch JSON. Compiling at build
time keeps all of that and still lets recipes be edited as YAML.

The YAML reader (`tools/yaml.mjs`) is hand-written for the same zero-dependency
reason. It is deliberately strict: it throws on anything outside the documented
subset rather than guessing, because a silently mis-parsed recipe is a wrong
formula. `tests/yaml.test.mjs` covers the rejection cases as carefully as the
happy path.

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
