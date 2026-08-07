# Sources

Every formula in this app traces to a published recipe. Nothing is invented.

The percentages here are *converted* — normalised into baker's percentages
against total flour — so they will not look identical to the source's own
wording. Where a source was ambiguous, the judgment call is written down below
and in a comment next to the recipe. Those are the entries worth arguing with.

All URLs are validated in CI by `tools/check-links.mjs`.

---

## Per recipe

| Bread | Source |
|---|---|
| Country boule | [Beginner's Sourdough Bread — The Perfect Loaf](https://www.theperfectloaf.com/beginners-sourdough-bread/) |
| Overnight no-knead loaf | [The new perfect recipe for overnight bread — Food Language](https://www.youtube.com/watch?v=5iIJY5THCOU) · [printable](https://food-language.com/recipes/amazing-overnight-fermentation-bread/) |
| Faster no-knead bread | [Faster No Knead Bread — Jenny Can Cook](https://www.youtube.com/watch?v=I0t8ZAhb8lQ) · [written](https://www.jennycancook.com/recipes/faster-no-knead-bread/) |
| Italian no-knead bread | [3 Ingredient Italian No Knead Bread — Emma's Goodies](https://www.youtube.com/watch?v=3xtj9X1jDc0) · [written](https://www.emmafontanella.com/the-easiest-no-knead-bread) |
| Light rye bâtard | [Sourdough Rye Bread — The Pantry Mama](https://pantrymama.com/sourdough-rye-bread-recipe/) · [90% rye — The Perfect Loaf](https://www.theperfectloaf.com/sourdough-90-rye-bread-recipe/) |
| Baguette | [The 5 minute baguette — Mr Baguette](https://www.youtube.com/watch?v=Z-husjZkxHw) · [Classic Baguettes — King Arthur](https://www.kingarthurbaking.com/recipes/classic-baguettes-recipe) |
| Ciabatta | [Rustic Italian Ciabatta — King Arthur](https://www.kingarthurbaking.com/recipes/rustic-italian-ciabatta-recipe) · [professional formula](https://www.kingarthurbaking.com/pro/formulas/ciabatta) |
| Soft dinner rolls | [Soft Dinner Rolls — King Arthur](https://www.kingarthurbaking.com/recipes/soft-dinner-rolls-recipe) |
| Burger buns | [Beautiful Burger Buns — King Arthur](https://www.kingarthurbaking.com/recipes/beautiful-burger-buns-recipe) |
| Neapolitan pizza | [Neapolitan-Style Pizza Crust — King Arthur](https://www.kingarthurbaking.com/recipes/neapolitan-style-pizza-crust-recipe) |

---

## Video sources, converted

Four recipes come from videos. Their weights were read off the description or the
channel's own written recipe, then converted.

### Mr Baguette — "The 5 minute baguette"

950 g flour · 730 g water · 16 g salt · 2 g yeast → **76.8% hydration, 1.7% salt,
0.21% yeast**, four baguettes per batch.

The very low yeast is bought with an 8–10 hour bulk, which is why this recipe's
schedule looks nothing like the King Arthur poolish version also linked above.
Both are good; they are different methods.

### Food Language — overnight bread

320 g flour · 220 g water · 6 g salt · 2 g dry yeast → **68.8% hydration, 1.9%
salt, 0.63% yeast**.

The batch is **divided into four** ~137 g loaves, not baked as one — a detail
that only appears in the printable recipe, not the video description. Timings
also come from the printable version: 30 min rest, fold, 30 min rest, fold, 12 h+
in the fridge, 30 min back to room temperature, divide, 10 min bench rest, shape,
30 min final proof, then 20 min covered at 230 °C and 10 min open at 200 °C.

The video offers 3 g fresh yeast as an alternative; the dry figure is what this
formula is built on.

### Emma's Goodies — "3 Ingredient Italian No Knead Bread"

420 g flour · 300 g water · 8 g kosher salt · 3.5 g yeast → **71.4% hydration,
1.9% salt, 0.83% yeast**.

Her written recipe carries grams throughout, so no conversion was needed. She
gives two methods; this uses the zero-effort six-hour dose. The stretch-and-fold
version doubles the yeast to 7 g.

### Jenny Can Cook — "Faster No Knead Bread" ⚠️

3 cups flour · 1½ cups (355 g) water · 1 tsp (6 g) salt · ¼ tsp (1 g) yeast.

**This is the one judgment call in the library.** Her page puts 3 cups of flour
at 360–390 g. Against 355 g of water that computes to **93–99% hydration** — and
"it won't hold a shape" is the single most common complaint on that recipe.
A baker in the wild put it plainly: *at 120 g per cup, the dough is almost at 100%
hydration.*

Publishing that literally would reproduce a known flaw. This entry instead
assumes a denser scoop (~433 g) for **82% hydration**, which is how the loaf
actually behaves for people who succeed with it.

If your cup weighs differently, drag the hydration slider — that is exactly what
it is there for.

---

## Technique and reference

These informed the models rather than any single recipe.

**Baker's percentages**
- [Introduction to Baker's Percentages — The Perfect Loaf](https://www.theperfectloaf.com/reference/introduction-to-bakers-percentages/) — how total dough weight relates to the sum of percentages, and the convention for handling levain
- [Baker's Percentage — King Arthur (professional)](https://www.kingarthurbaking.com/pro/reference/bakers-percentage)

**Piece weights and pan capacity**
- [Dough weights for common bread shapes — The Pantry Mama](https://pantrymama.com/dough-weights-for-common-bread-shapes/) — piece weights for boules, buns, rolls and pizza
- [How to convert a bread recipe into rolls — King Arthur](https://www.kingarthurbaking.com/blog/2021/05/28/how-to-convert-bread-recipe-into-rolls) and [Big batch dinner rolls](https://www.kingarthurbaking.com/blog/2011/11/18/big-batch-yeast-rolls-baking-buns-for-a-crowd) — the source of the "24 rolls fill a half sheet" calibration point
- [Perfect baguette dough weight](https://flavor365.com/perfect-baguette-dough-weight-a-baker-s-handbook/) — 340–350 g at 55–65 cm for a traditional baguette
- [Sheet pan sizes guide — Ochef](https://ochef.com/guide/standard-sheet-pan-sizes-and-dimensions/) — full 18×26″, half 18×13″, quarter 13×9″

**Leavening conversion**
- [Converting between sourdough and yeast — Breadtopia](https://breadtopia.com/faq/how-to-convert-recipes-between-sourdough-and-yeast/)
- [How to convert any yeast recipe to sourdough — The Pantry Mama](https://pantrymama.com/how-to-convert-any-yeast-recipe-to-sourdough/)

Both describe the common shortcut. This app does the flour/water adjustment
properly instead — see [Architecture](ARCHITECTURE.md#carving-out-the-preferment).

**Fermentation and bake**
- [Bulk fermentation guide — The Perfect Loaf](https://www.theperfectloaf.com/guides/the-ultimate-guide-to-bread-dough-bulk-fermentation/) and [King Arthur](https://www.kingarthurbaking.com/blog/2019/07/22/bulk-fermentation) — 3–5 h at room temperature, which sets the sourdough time multiplier
- [Sourdough times and temperatures — ThermoWorks](https://blog.thermoworks.com/sourdough-bread-times-and-temperatures/) — oven temperatures and internal doneness targets

---

## Attribution

The recipes belong to the bakers who published them. This app cites and links to
every one, converts their numbers into a common notation, and sends you to the
original for the method. It is not a substitute for reading the source — the
technique is where the bread actually comes from.

If you are one of these authors and want a citation changed or removed, open an
issue and it will be handled promptly.
