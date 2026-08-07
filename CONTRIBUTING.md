# Contributing

The most valuable contribution to this project is **a recipe with a citation**.
The second most valuable is **a correction to a number that is wrong**.

## Before you start

```bash
git clone https://github.com/Saavuori/BakersBench.git
cd BakersBench
npm test          # 271 checks, no install step, ~0.6s
python serve.py 5178
```

There is nothing to install — no `npm install`, no framework. The only build
step is `npm run build`, which compiles `recipes/*.yaml` into `js/recipes.js`,
and you only need it after changing recipe data.
See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for the detail.

---

## Adding a bread

Two files: a YAML file in [`recipes/`](recipes/README.md), and a portrait in
`js/portraits.js`. Then `npm run build` to regenerate `js/recipes.js`.

**Never edit `js/recipes.js` by hand** — it is generated, a test will catch it,
and your change would be lost on the next rebuild.

[`recipes/README.md`](recipes/README.md) is the full field reference, and
`tests/data.test.mjs` will tell you precisely what is missing.

**The one rule that is not negotiable: cite your source.** Every formula in this
library links to a published recipe. A bread with no citation will not be merged,
however good it is — the whole premise is that these numbers are traceable.

### Converting a source

Sources come in three shapes, in descending order of ease:

1. **Grams already** — convert straight to percentages against total flour.
2. **A video description with weights** — same, but check the channel's written
   recipe too; it often carries detail the description omits. The Food Language
   entry makes four loaves, a fact that only appears in the printable version.
3. **Cup measures** — the hard case. Flour is ±20% by volume depending on how it
   is scooped, so *state your assumption in a comment* and sanity-check the
   resulting hydration. If it lands somewhere implausible, that is a signal, not
   a rounding error. The Jenny Can Cook entry is the worked example.

### When a source is ambiguous

Write the judgment call down, next to the recipe, in a comment. Say what the
source claims, why it is doubtful, what you did instead, and how the user can
override it. Silently "fixing" a published recipe is worse than reproducing it —
what is not acceptable is doing either without saying so.

---

## Changing the maths

`formula.js` and `packing.js` are covered by tests that encode real-world
calibration. If you change a constant, a calibration case will fail. That is the
test working.

Justify the change against evidence — a source, a measurement, a bake — not
against making a test pass. If the new value is right, update the calibration
case *and say why in the PR*.

New behaviour needs a test that fails without your change.

---

## Style

Match the surrounding code; it is consistent on purpose.

- Comments explain **why**, never what.
- Domain vocabulary over generic naming: `levain`, `bulk`, `crumb`, `pan-up`.
- `formula.js`, `packing.js` and `portraits.js` never touch the DOM.
- `recipes.js` holds data and no logic.
- Copy says what happened and what to do next. No filler, no apologies.

---

## Pull requests

Fill in the template. It asks for the things that are genuinely hard to
reconstruct later — mainly *why*, and *what the source said*.

CI runs on Node 20, 22 and 24, plus a Docker build that boots the container and
checks it serves every file with the right headers. Everything CI runs, you can
run locally with `npm run check`.

Before you open it, look at the app in both themes and at 375 px wide. Most
regressions in this project have been layout ones.

---

## Reporting a wrong number

This is a bug report worth writing carefully, because it is the kind this project
most wants to receive. Include:

- Bread, size, leavening, pan, count
- What the app said
- What you expected, **and the source that says so**

A link to a published recipe that disagrees with us is the strongest possible bug
report.

---

## Code of conduct

Be decent. Assume the other person is trying to make good bread.

Disagreements about numbers get settled by citing sources, not by volume.
