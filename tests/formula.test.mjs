/* The invariant this whole app rests on:
 *
 *   Whichever leavening you choose, TOTAL FLOUR and TOTAL HYDRATION do not move.
 *
 * A preferment is carved out of the dough, not added on top of it. If these
 * tests fail, the formulas are lying to bakers.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, LEAVENS, Formula, byId } from './harness.mjs';

const TARGET = 1200;

const pffFor = (recipe, leaven) =>
  leaven.kind === 'preferment' ? (recipe.preferment[leaven.id] ?? 0.3) : 0;

/** Rebuild total flour from the two steps the baker actually weighs. */
function reconstruct(recipe, result) {
  let flour = 0, water = 0;

  if (result.preferment) {
    for (const row of result.preferment.rows) {
      if (row.kind === 'flour') flour += row.g;
      if (row.kind === 'water') water += row.g;
      // A ripe 100%-hydration starter is half flour, half water.
      if (row.kind === 'seed') { flour += row.g / 2; water += row.g / 2; }
    }
  }

  for (const row of result.finalRows) {
    if (row.kind === 'flour') flour += row.g;
    const source = [...recipe.liquids, ...recipe.others].find(i => i.name === row.name);
    if (source) water += row.g * (source.water ?? 0);
  }
  return { flour, water };
}

for (const recipe of RECIPES) {
  for (const leaven of LEAVENS) {
    const label = `${recipe.id} + ${leaven.id}`;

    test(`${label}: flour and hydration survive the leavening choice`, () => {
      const pff = pffFor(recipe, leaven);
      const out = Formula.compute({
        recipe, leavenId: leaven.id, pff, totalDough: TARGET
      });
      const seen = reconstruct(recipe, out);

      assert.ok(
        Math.abs(seen.flour - out.totalFlour) < 0.5,
        `flour drifted: reported ${out.totalFlour.toFixed(2)}, weighed ${seen.flour.toFixed(2)}`
      );
      assert.ok(
        Math.abs((seen.water / seen.flour) * 100 - out.hydration) < 0.1,
        `hydration drifted: reported ${out.hydration.toFixed(2)}%, ` +
        `weighed ${((seen.water / seen.flour) * 100).toFixed(2)}%`
      );
    });

    test(`${label}: hits the requested dough weight`, () => {
      const out = Formula.compute({
        recipe, leavenId: leaven.id, pff: pffFor(recipe, leaven), totalDough: TARGET
      });
      assert.ok(
        Math.abs(out.totalDough - TARGET) < 0.5,
        `asked for ${TARGET} g, got ${out.totalDough.toFixed(2)} g`
      );
    });

    test(`${label}: never asks for a negative weight`, () => {
      const out = Formula.compute({
        recipe, leavenId: leaven.id, pff: pffFor(recipe, leaven), totalDough: TARGET
      });
      for (const row of out.finalRows) {
        assert.ok(row.g >= 0, `final dough "${row.name}" is ${row.g.toFixed(2)} g`);
      }
      for (const row of out.preferment?.rows ?? []) {
        assert.ok(row.g >= 0, `preferment "${row.name}" is ${row.g.toFixed(2)} g`);
      }
    });
  }
}

test('scaling is linear — doubling the dough doubles every ingredient', () => {
  const recipe = byId('boule');
  const one = Formula.compute({ recipe, leavenId: 'levain', pff: 0.2, totalDough: 900 });
  const two = Formula.compute({ recipe, leavenId: 'levain', pff: 0.2, totalDough: 1800 });
  one.finalRows.forEach((row, i) => {
    assert.ok(
      Math.abs(two.finalRows[i].g - row.g * 2) < 0.5,
      `${row.name}: ${row.g.toFixed(2)} → ${two.finalRows[i].g.toFixed(2)}`
    );
  });
});

test('more prefermented flour moves flour into the preferment, not into the total', () => {
  const recipe = byId('boule');
  const small = Formula.compute({ recipe, leavenId: 'levain', pff: 0.10, totalDough: 1000 });
  const large = Formula.compute({ recipe, leavenId: 'levain', pff: 0.35, totalDough: 1000 });

  assert.ok(large.preferment.total > small.preferment.total, 'levain should grow');
  assert.ok(
    Math.abs(large.totalFlour - small.totalFlour) < 1,
    'total flour must not change with prefermented flour'
  );
  assert.ok(
    Math.abs(large.hydration - small.hydration) < 0.1,
    'hydration must not change with prefermented flour'
  );
});

/* ── Fidelity to the published sources ──────────────────────────────────── */

const SOURCE_CASES = [
  {
    id: 'baguette', dough: 1698, leaven: 'instant',
    note: 'Mr Baguette — 950 g flour, 730 g water, 16 g salt, 2 g yeast',
    expect: { flour: 950, water: 730, salt: 16, yeast: 2 }
  },
  {
    id: 'overnight-loaf', dough: 548, leaven: 'instant',
    note: 'Food Language — 320 g flour, 220 g water, 6 g salt, 2 g dry yeast',
    expect: { flour: 320, water: 220, salt: 6, yeast: 2 }
  },
  {
    id: 'emma-no-knead', dough: 732, leaven: 'instant',
    note: "Emma's Goodies — 420 g flour, 300 g water, 8 g salt, 3.5 g yeast",
    expect: { flour: 420, water: 300, salt: 8, yeast: 3.5 }
  },
  {
    id: 'jenny-no-knead', dough: 795, leaven: 'instant',
    note: 'Jenny Can Cook — 355 g water, 6 g salt, 1 g yeast (flour by dense scoop)',
    expect: { flour: 433, water: 355, salt: 6, yeast: 1 }
  }
];

for (const c of SOURCE_CASES) {
  test(`${c.id}: reproduces its source — ${c.note}`, () => {
    const out = Formula.compute({
      recipe: byId(c.id), leavenId: c.leaven, pff: 0, totalDough: c.dough
    });
    const grams = kind => out.finalRows
      .filter(r => r.kind === kind)
      .reduce((sum, r) => sum + r.g, 0);

    assert.ok(Math.abs(grams('flour') - c.expect.flour) < 2, `flour ${grams('flour').toFixed(1)}`);
    assert.ok(Math.abs(grams('water') - c.expect.water) < 2, `water ${grams('water').toFixed(1)}`);
    assert.ok(Math.abs(grams('salt') - c.expect.salt) < 0.5, `salt ${grams('salt').toFixed(2)}`);
    assert.ok(Math.abs(grams('yeast') - c.expect.yeast) < 0.5, `yeast ${grams('yeast').toFixed(2)}`);
  });
}

test('hydration bands are continuous and ordered', () => {
  const seen = [];
  for (let h = 45; h <= 100; h += 0.5) {
    const band = Formula.hydrationBand(h);
    assert.ok(band.label && band.note, `no band at ${h}%`);
    if (seen.at(-1) !== band.label) seen.push(band.label);
  }
  assert.deepEqual(seen, ['Very low', 'Low', 'Standard', 'High', 'Very high', 'Extreme']);
});
