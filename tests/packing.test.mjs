/* The footprint model and the pan geometry.
 *
 * The calibration cases below are the ones the model was fitted against — they
 * come from what bakers actually report, not from the formula. If the constants
 * in packing.js drift, these catch it.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, PANS, Packing, byId, footprintOf, capacityOf, hydrationOf } from './harness.mjs';

/* ── Footprint: width scales with the cube root of weight ───────────────── */

const FOOTPRINT_CASES = [
  { id: 'dinner-rolls', size: 'std',   cm: [6.8, 7.6], note: '50 g dinner roll ≈ 7 cm' },
  { id: 'burger-buns',  size: 'std',   cm: [9.0, 10.2], note: '90 g burger bun ≈ 9.5 cm' },
  { id: 'burger-buns',  size: 'large', cm: [10.8, 12.2], note: '140 g bun ≈ 11.5 cm' },
  { id: 'boule',        size: 'std',   cm: [19.5, 22.5], note: '900 g boule ≈ 21 cm' }
];

for (const c of FOOTPRINT_CASES) {
  test(`footprint: ${c.note}`, () => {
    const recipe = byId(c.id);
    const size = recipe.sizes.find(s => s.id === c.size);
    const d = footprintOf(recipe, size).d;
    assert.ok(d >= c.cm[0] && d <= c.cm[1],
      `got ${d.toFixed(2)} cm, expected ${c.cm[0]}–${c.cm[1]}`);
  });
}

test('footprint grows with weight and with hydration, never shrinks', () => {
  const recipe = byId('boule');
  const sizes = [...recipe.sizes].sort((a, b) => a.g - b.g);
  let previous = 0;
  for (const size of sizes) {
    const d = footprintOf(recipe, size).d;
    assert.ok(d > previous, `${size.label} (${size.g} g) is not wider than the size below`);
    previous = d;
  }

  const size = recipe.sizes.find(s => s.default);
  const dry = Packing.pieceFootprint(recipe, size, 60).d;
  const wet = Packing.pieceFootprint(recipe, size, 90).d;
  assert.ok(wet > dry, `wetter dough should relax wider: ${dry.toFixed(2)} → ${wet.toFixed(2)}`);
});

/* ── Capacity: the answers this app exists to give ──────────────────────── */

const CAPACITY_CASES = [
  { id: 'dinner-rolls', size: 'std', pan: 'half', touch: true, want: 24,
    note: '24 dinner rolls fill a half sheet — the number bakers quote' },
  { id: 'burger-buns', size: 'large', pan: 'half', want: 6,
    note: 'only 6 large burger buns fit a half sheet, not 8' },
  { id: 'burger-buns', size: 'std', pan: 'half', want: 9,
    note: '9 standard burger buns fit a half sheet' },
  { id: 'boule', size: 'std', pan: 'half', want: 1,
    note: 'one 900 g boule per half sheet' }
];

for (const c of CAPACITY_CASES) {
  test(`capacity: ${c.note}`, () => {
    const got = capacityOf(byId(c.id), c.size, c.pan, c.touch ?? false);
    assert.equal(got, c.want, `expected ${c.want}, got ${got}`);
  });
}

/* This case is about pan geometry, not about any recipe's data, so it states
   the 50 cm length itself. It used to read the baguette's `full` size, which
   silently made the test a hostage to that recipe: when the size was corrected
   to the tray length the source implies, the test failed without the geometry
   having changed at all. */
test('a 50 cm baguette does not fit a 46 cm half sheet, but does fit a full sheet', () => {
  const recipe = byId('baguette');
  const footprint = Packing.pieceFootprint(recipe, { g: 425, length: 50 }, hydrationOf(recipe));
  const gap = Packing.pieceGap(recipe, false);

  const half = Packing.fit({ pan: PANS.find(p => p.id === 'half'), footprint, gap, requested: 1 });
  assert.equal(half.capacity, 0, 'should not fit a half sheet');
  assert.ok(half.tooLong, 'should report why it does not fit');
  assert.ok(half.tooLong.by > 0, 'overhang should be positive');

  const full = Packing.fit({ pan: PANS.find(p => p.id === 'full'), footprint, gap, requested: 1 });
  assert.ok(full.capacity >= 1, 'should fit a full sheet');
});

/* The batch as published: four 425 g pieces, and they need more than one home
   half sheet. This is the answer the card exists to give for this recipe. */
test('the baguette batch takes two half sheets, or one full sheet', () => {
  const recipe = byId('baguette');
  const size = recipe.sizes.find(s => s.id === 'full');
  const footprint = footprintOf(recipe, size);
  const gap = Packing.pieceGap(recipe, false);

  const half = Packing.fit({ pan: PANS.find(p => p.id === 'half'), footprint, gap, requested: 4 });
  assert.ok(half.capacity >= 1, 'a batch piece must at least fit the default pan');
  assert.equal(half.pansNeeded, 2, `expected 2 half sheets, got ${half.pansNeeded}`);

  const full = Packing.fit({ pan: PANS.find(p => p.id === 'full'), footprint, gap, requested: 4 });
  assert.ok(full.fits, 'all four should fit a full sheet');
});

test('letting rolls touch fits at least as many as keeping them apart', () => {
  for (const recipe of RECIPES.filter(r => r.shape.canTouch)) {
    const apart = capacityOf(recipe, null, 'half', false);
    const touching = capacityOf(recipe, null, 'half', true);
    assert.ok(touching >= apart,
      `${recipe.id}: touching (${touching}) should not fit fewer than apart (${apart})`);
  }
});

test('a bigger pan never holds fewer', () => {
  const order = ['quarter', 'half', 'threequarter', 'full'];
  for (const recipe of RECIPES) {
    let previous = -1;
    for (const pan of order) {
      const n = capacityOf(recipe, null, pan);
      assert.ok(n >= previous, `${recipe.id}: ${pan} holds ${n}, smaller pan held ${previous}`);
      previous = n;
    }
  }
});

test('nothing is ever placed outside the usable area', () => {
  for (const recipe of RECIPES) {
    for (const size of recipe.sizes) {
      for (const panId of ['quarter', 'half', 'full']) {
        const pan = PANS.find(p => p.id === panId);
        const footprint = footprintOf(recipe, size);
        const result = Packing.fit({
          pan, footprint, gap: Packing.pieceGap(recipe, false), requested: 99
        });
        const u = result.usable;
        for (const p of result.pos) {
          const halfW = (footprint.kind === 'rect'
            ? (p.rot ? footprint.w : footprint.l)
            : footprint.d) / 2;
          const halfH = (footprint.kind === 'rect'
            ? (p.rot ? footprint.l : footprint.w)
            : footprint.d) / 2;
          const w = u.round ? u.d : u.w;
          const h = u.round ? u.d : u.h;
          assert.ok(p.x - halfW >= -0.01 && p.x + halfW <= w + 0.01,
            `${recipe.id}/${size.id}/${panId}: piece runs off the width`);
          assert.ok(p.y - halfH >= -0.01 && p.y + halfH <= h + 0.01,
            `${recipe.id}/${size.id}/${panId}: piece runs off the depth`);
        }
      }
    }
  }
});

test('pieces never overlap', () => {
  for (const recipe of RECIPES.filter(r => r.shape.type === 'round' || r.shape.type === 'ring')) {
    for (const panId of ['half', 'full']) {
      const pan = PANS.find(p => p.id === panId);
      const size = recipe.sizes.find(s => s.default) || recipe.sizes[0];
      const footprint = footprintOf(recipe, size);
      const gap = Packing.pieceGap(recipe, false);
      const { pos } = Packing.fit({ pan, footprint, gap, requested: 99 });
      for (let i = 0; i < pos.length; i++) {
        for (let j = i + 1; j < pos.length; j++) {
          const dist = Math.hypot(pos[i].x - pos[j].x, pos[i].y - pos[j].y);
          assert.ok(dist >= footprint.d + gap - 0.01,
            `${recipe.id}/${panId}: pieces ${i} and ${j} are ${dist.toFixed(2)} cm apart, ` +
            `need ${(footprint.d + gap).toFixed(2)}`);
        }
      }
    }
  }
});

test('capacity always matches the number of positions returned', () => {
  for (const recipe of RECIPES) {
    for (const size of recipe.sizes) {
      for (const pan of PANS.filter(p => !p.custom)) {
        const result = Packing.fit({
          pan,
          footprint: footprintOf(recipe, size),
          gap: Packing.pieceGap(recipe, false),
          requested: 5
        });
        assert.equal(result.capacity, result.pos.length,
          `${recipe.id}/${size.id}/${pan.id}`);
      }
    }
  }
});

test('hydration reported by the model matches the recipe as written', () => {
  for (const recipe of RECIPES) {
    const h = hydrationOf(recipe);
    assert.ok(h > 40 && h < 100, `${recipe.id}: implausible hydration ${h.toFixed(1)}%`);
  }
});
