/* Contract tests for the recipe library.
 *
 * `js/recipes.js` is the only file most contributors will touch. These tests
 * describe exactly what a well-formed recipe looks like, so a malformed one
 * fails here with a useful message instead of rendering as "NaN g" in the UI.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, LEAVENS, PANS, Portraits, EDGE_MARGIN } from './harness.mjs';

test('recipe ids are unique', () => {
  const ids = RECIPES.map(r => r.id);
  assert.equal(new Set(ids).size, ids.length, `duplicate id in [${ids}]`);
});

for (const r of RECIPES) {
  test(`${r.id}: is a well-formed recipe`, () => {
    for (const field of ['name', 'short', 'family', 'blurb', 'defaultLeaven']) {
      assert.ok(typeof r[field] === 'string' && r[field].length, `missing ${field}`);
    }
    assert.ok(r.unit?.one && r.unit?.many, 'needs singular and plural unit names');
    assert.ok(LEAVENS.some(l => l.id === r.defaultLeaven), `unknown leavening ${r.defaultLeaven}`);

    const flourTotal = r.flours.reduce((s, f) => s + f.pct, 0);
    assert.ok(Math.abs(flourTotal - 100) < 0.01,
      `flours must sum to 100%, got ${flourTotal}`);

    assert.ok(r.liquids.length, 'needs at least one liquid');
    for (const i of [...r.liquids, ...r.others]) {
      assert.ok(typeof i.name === 'string' && i.name.length, 'ingredient needs a name');
      assert.ok(i.pct > 0, `${i.name}: percentage must be positive`);
      const w = i.water ?? 0;
      assert.ok(w >= 0 && w <= 1, `${i.name}: water content ${w} out of range`);
    }
    assert.ok(r.others.some(o => o.kind === 'salt'), 'needs salt');
    assert.ok(r.yeastPct > 0, 'needs a positive instant-yeast baseline');

    assert.ok(r.sizes.length, 'needs at least one size');
    assert.equal(r.sizes.filter(s => s.default).length, 1, 'needs exactly one default size');
    assert.equal(new Set(r.sizes.map(s => s.id)).size, r.sizes.length, 'duplicate size id');

    assert.ok(r.quickCounts.length, 'needs quick counts');
    for (const n of r.quickCounts) assert.ok(Number.isInteger(n) && n > 0, `bad count ${n}`);
  });

  test(`${r.id}: sizes are internally consistent`, () => {
    for (const s of r.sizes) {
      if (s.fitToPan) {
        assert.ok(r.shape.targetWidth > 0, 'fitToPan needs shape.targetWidth');
        assert.ok(r.shape.arealDensity > 0, 'fitToPan needs shape.arealDensity');
        continue;
      }
      assert.ok(s.g > 0, `${s.label}: weight must be positive`);
      if (r.shape.type === 'rod') {
        assert.ok(s.length > 0, `${s.label}: a rod needs a length`);
      }
    }
    const fixed = r.sizes.filter(s => !s.fitToPan);
    for (let i = 1; i < fixed.length; i++) {
      assert.ok(fixed[i].g > fixed[i - 1].g,
        `sizes should be listed smallest first: ${fixed[i - 1].label} → ${fixed[i].label}`);
    }
  });

  test(`${r.id}: has a bake spec with timer stages`, () => {
    for (const field of ['temp', 'time', 'steam', 'internal']) {
      assert.ok(typeof r.bake[field] === 'string' && r.bake[field].length, `bake.${field} missing`);
    }
    assert.ok(Array.isArray(r.bake.stages) && r.bake.stages.length, 'needs bake.stages');
    for (const s of r.bake.stages) {
      assert.ok(typeof s.label === 'string' && s.label.length, 'stage needs a label');
      assert.ok(s.min > 0 && s.min <= 120, `stage "${s.label}": ${s.min} min out of range`);
    }
  });

  test(`${r.id}: has a schedule`, () => {
    const span = v => (typeof v === 'number' ? v : v.direct);
    for (const step of ['mix', 'bulk', 'shape', 'proof']) {
      assert.ok(span(r.schedule[step]) > 0, `schedule.${step} must be positive`);
    }
  });

  test(`${r.id}: has a portrait`, () => {
    assert.ok(Portraits.has(r.id), 'no portrait registered');
    const svg = Portraits.render(r.id);
    assert.ok(svg.startsWith('<svg') && svg.trimEnd().endsWith('</svg>'), 'portrait is not an svg');
    assert.ok(!/undefined|NaN/.test(svg), 'portrait markup contains undefined or NaN');
  });

  test(`${r.id}: cites its sources`, () => {
    assert.ok(Array.isArray(r.links) && r.links.length, 'every recipe must cite a source');
    for (const l of r.links) {
      assert.ok(l.label && l.source, 'link needs a label and a source');
      assert.match(l.url, /^https:\/\/[\w.-]+\/\S*$/, `insecure or malformed url: ${l.url}`);
    }
  });
}

test('leavenings are well-formed', () => {
  assert.equal(new Set(LEAVENS.map(l => l.id)).size, LEAVENS.length, 'duplicate leavening id');
  for (const l of LEAVENS) {
    assert.ok(l.name && l.desc && l.tag, `${l.id}: missing copy`);
    assert.ok(['rye', 'ember'].includes(l.accent), `${l.id}: unknown accent ${l.accent}`);
    assert.ok(l.fermentFactor > 0, `${l.id}: bad fermentFactor`);
    if (l.kind === 'preferment') {
      assert.ok(l.hydration > 0 && l.hydration <= 1.5, `${l.id}: bad preferment hydration`);
      assert.ok(l.buildMinutes > 0, `${l.id}: needs buildMinutes`);
      assert.ok(l.pffRange?.length === 2 && l.pffRange[0] < l.pffRange[1], `${l.id}: bad pffRange`);
    } else {
      assert.ok(l.yeastFactor > 0, `${l.id}: needs a yeastFactor`);
    }
  }
});

test('every recipe offers a preferment percentage for every preferment', () => {
  for (const r of RECIPES) {
    for (const l of LEAVENS.filter(x => x.kind === 'preferment')) {
      const pff = r.preferment[l.id];
      assert.ok(pff > 0 && pff < 1, `${r.id}/${l.id}: prefermented flour ${pff} out of range`);
      assert.ok(pff * 100 >= l.pffRange[0] && pff * 100 <= l.pffRange[1],
        `${r.id}/${l.id}: ${(pff * 100).toFixed(0)}% is outside the slider range ` +
        `${l.pffRange[0]}–${l.pffRange[1]}%`);
    }
  }
});

test('pans are well-formed and the usable area is smaller than the pan', () => {
  assert.equal(new Set(PANS.map(p => p.id)).size, PANS.length, 'duplicate pan id');
  assert.ok(EDGE_MARGIN > 0, 'edge margin must be positive');
  for (const p of PANS) {
    assert.ok(p.name?.length, `${p.id}: needs a name`);
    if (p.type === 'round') {
      assert.ok(p.d > EDGE_MARGIN * 2, `${p.id}: round pan too small for the margin`);
    } else {
      assert.ok(p.w > EDGE_MARGIN * 2 && p.h > EDGE_MARGIN * 2,
        `${p.id}: pan too small for the margin`);
    }
  }
  assert.equal(PANS.filter(p => p.default).length, 1, 'needs exactly one default pan');
  assert.equal(PANS.filter(p => p.custom).length, 1, 'needs exactly one custom pan');
});

test('no two pans share the same dimensions', () => {
  const seen = new Map();
  for (const p of PANS.filter(x => !x.custom)) {
    const key = p.type === 'round' ? `r${p.d}` : `${p.w}x${p.h}`;
    assert.ok(!seen.has(key), `${p.id} duplicates ${seen.get(key)} (${key})`);
    seen.set(key, p.id);
  }
});
