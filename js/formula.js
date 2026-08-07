/* Baker's Bench — formula maths
 *
 * The rule everything here obeys: whichever leavening you pick, TOTAL FLOUR and
 * TOTAL HYDRATION stay exactly where the recipe put them. A preferment does not
 * get added on top of the dough — its flour and water are carved out of the
 * dough and moved into an earlier step.
 *
 * That is how a bakery does it, and it is why the numbers here disagree with
 * blog advice like "swap one packet of yeast for a cup of starter".
 */

const Formula = (() => {

  const round = (n, dp = 0) => {
    const f = Math.pow(10, dp);
    return Math.round(n * f) / f;
  };

  /* Weigh to sensible precision: big amounts to the gram, tiny ones to 0.1 g. */
  const weigh = g => (g >= 20 ? round(g, 0) : g >= 1 ? round(g, 1) : round(g, 2));

  function leavenById(id) {
    return LEAVENS.find(l => l.id === id) || LEAVENS.find(l => l.id === 'instant');
  }

  /**
   * @param {object} o
   * @param {object} o.recipe
   * @param {string} o.leavenId
   * @param {number} o.pff        prefermented flour, as a fraction of total flour
   * @param {number} o.totalDough target total dough weight in grams
   */
  function compute({ recipe, leavenId, pff, totalDough }) {
    /* Everything downstream is linear in total flour, so one correction pass
       lands the dough weight exactly. The pass is needed because carving a
       preferment out of an enriched dough swaps some milk for plain water,
       which shifts total mass even though flour and hydration hold. */
    const first = build({ recipe, leavenId, pff, totalDough });
    if (Math.abs(first.totalDough - totalDough) < 0.05) return first;
    const corrected = build({
      recipe, leavenId, pff,
      totalDough: totalDough * (totalDough / first.totalDough)
    });
    corrected.targetDough = totalDough;
    return corrected;
  }

  function build({ recipe, leavenId, pff, totalDough }) {
    const leaven = leavenById(leavenId);
    const isPre = leaven.kind === 'preferment';

    /* ── 1. Effective yeast percentage ───────────────────────────────── */
    let yeastPct = 0;
    let yeastName = '';
    if (!isPre) {
      yeastPct = recipe.yeastPct * leaven.yeastFactor;
      yeastName = leaven.name;
    } else if (leaven.prefermentYeastPct) {
      // A trace of yeast, dosed against the preferment's flour only.
      yeastPct = pff * leaven.prefermentYeastPct;
      yeastName = 'Instant yeast';
    }

    /* ── 2. Total flour from the sum of all percentages ───────────────── */
    const flourPct = recipe.flours.reduce((s, f) => s + f.pct, 0);       // 100
    const liquidPct = recipe.liquids.reduce((s, l) => s + l.pct, 0);
    const otherPct = recipe.others.reduce((s, o) => s + o.pct, 0);
    const sumPct = flourPct + liquidPct + otherPct + yeastPct;

    const F = totalDough / (sumPct / 100);

    /* ── 3. Water accounting ─────────────────────────────────────────── */
    const waterFrom = src => src.reduce((s, i) => s + i.pct * (i.water ?? 0), 0);
    const totalWaterPct = waterFrom(recipe.liquids) + waterFrom(recipe.others);
    const addedWaterPct = recipe.liquids
      .filter(l => (l.water ?? 0) === 1)
      .reduce((s, l) => s + l.pct, 0);
    const enrichedWater = round(totalWaterPct - addedWaterPct, 1);

    /* ── 4. Carve out the preferment ─────────────────────────────────── */
    let preferment = null;
    const flourRows = recipe.flours.map(f => ({
      name: f.name, pct: f.pct, total: F * f.pct / 100, pre: 0
    }));
    const liquidRows = recipe.liquids.map(l => ({
      name: l.name, pct: l.pct, water: l.water ?? 0, total: F * l.pct / 100, pre: 0
    }));

    const warnings = [];

    if (isPre && pff > 0) {
      const preFlour = F * pff;
      const preWater = preFlour * leaven.hydration;

      /* Preferment flour comes off the base flour first — that is how a levain
         or biga is actually built — spilling over pro rata if it runs out. */
      let need = preFlour;
      for (const row of flourRows) {
        if (need <= 0) break;
        const take = Math.min(row.total, need);
        row.pre += take;
        need -= take;
      }

      /* Preferment water comes off plain water first, then other liquids,
         scaled by their water content so total hydration lands exactly. */
      const order = [...liquidRows].sort((a, b) => b.water - a.water);
      let needW = preWater;
      for (const row of order) {
        if (needW <= 0.001) break;
        if (row.water <= 0) continue;
        const availableWater = (row.total - row.pre) * row.water;
        const takeWater = Math.min(availableWater, needW);
        row.pre += takeWater / row.water;
        needW -= takeWater;
      }
      if (needW > 0.5) {
        warnings.push(
          `This dough has less free water than a ${round(pff * 100)}% preferment needs. ` +
          `Lower the prefermented flour, or build a stiffer preferment.`
        );
      }
      if (order.some(r => r.water > 0 && r.water < 1 && r.pre > 0)) {
        warnings.push(
          `Preferment water is taken out of the ${order.find(r => r.water < 1 && r.pre > 0).name.toLowerCase()}, ` +
          `so hydration stays on target.`
        );
      }

      const seedG = leaven.seedRatio ? (preFlour + preWater) * leaven.seedRatio : 0;
      const seedFlour = seedG / 2;   // ripe starter kept at 100% hydration
      const seedWater = seedG / 2;

      preferment = {
        id: leaven.id,
        name: leaven.name,
        shortName: leaven.shortName || leaven.name,
        hydration: leaven.hydration,
        buildMinutes: leaven.buildMinutes,
        rows: [],
        total: preFlour + preWater,
        prefermentedFlourPct: pff * 100
      };

      flourRows.forEach(r => {
        if (r.pre <= 0) return;
        const g = r.pre - (seedFlour * (r.pre / preFlour));
        preferment.rows.push({ name: r.name, g, pctOfFlour: r.pre / F * 100, kind: 'flour' });
      });
      preferment.rows.push({
        name: 'Water', g: preWater - seedWater,
        pctOfFlour: preWater / F * 100, kind: 'water'
      });
      if (seedG > 0) {
        preferment.rows.push({
          name: 'Ripe starter', g: seedG, pctOfFlour: seedG / F * 100, kind: 'seed'
        });
      }
      if (leaven.prefermentYeastPct) {
        preferment.rows.push({
          name: 'Instant yeast', g: F * yeastPct / 100,
          pctOfFlour: yeastPct, kind: 'yeast'
        });
      }
    }

    /* ── 5. Final dough ──────────────────────────────────────────────── */
    const finalRows = [];
    flourRows.forEach(r => {
      const g = r.total - r.pre;
      if (g > 0.05) finalRows.push({ name: r.name, g, pctOfFlour: r.pct, kind: 'flour', barPct: r.pct });
    });
    liquidRows.forEach(r => {
      const g = r.total - r.pre;
      if (g > 0.05) finalRows.push({ name: r.name, g, pctOfFlour: r.pct, kind: 'water', barPct: r.pct });
    });
    if (preferment) {
      finalRows.push({
        name: `Ripe ${preferment.shortName}, all of it`, g: preferment.total,
        pctOfFlour: preferment.total / F * 100, kind: 'preferment',
        barPct: preferment.total / F * 100
      });
    }
    recipe.others.forEach(o => {
      finalRows.push({
        name: o.name, g: F * o.pct / 100, pctOfFlour: o.pct,
        kind: o.kind, barPct: o.pct
      });
    });
    if (!isPre && yeastPct > 0) {
      finalRows.push({ name: yeastName, g: F * yeastPct / 100, pctOfFlour: yeastPct, kind: 'yeast', barPct: yeastPct });
    }

    /* ── 6. Schedule ─────────────────────────────────────────────────── */
    const s = recipe.schedule;
    const ff = leaven.fermentFactor;
    /* A step may be a flat number, or split by leavening kind for recipes whose
       straight-dough version leans on a very long bulk (see the baguette). */
    const span = v => (typeof v === 'number' ? v : v[leaven.kind] ?? v.direct);
    const steps = [];
    if (preferment) {
      steps.push({
        label: leaven.id === 'levain' ? 'Build levain' : `Ripen ${leaven.name.toLowerCase()}`,
        minutes: leaven.buildMinutes, kind: 'ferment'
      });
    }
    steps.push({ label: 'Mix', minutes: span(s.mix), kind: 'work' });
    steps.push({ label: 'Bulk', minutes: Math.round(span(s.bulk) * ff), kind: 'ferment' });
    steps.push({ label: 'Shape', minutes: span(s.shape), kind: 'work' });
    steps.push({ label: 'Final proof', minutes: Math.round(span(s.proof) * ff), kind: 'ferment' });
    steps.push({ label: 'Bake', minutes: recipe.bake.minutes || 30, kind: 'bake' });

    const totalMinutes = steps.reduce((a, b) => a + b.minutes, 0);

    /* ── 7. Out ──────────────────────────────────────────────────────── */
    const actual = finalRows.reduce((a, r) => a + r.g, 0);

    return {
      leaven, preferment, finalRows, warnings, steps, totalMinutes,
      totalFlour: F,
      totalDough: actual,
      hydration: totalWaterPct,
      addedWaterPct,
      enrichedWater,
      isEnriched: enrichedWater > 0.5,
      saltPct: recipe.others.filter(o => o.kind === 'salt').reduce((a, o) => a + o.pct, 0),
      yeastPct
    };
  }

  /* Where a hydration number sits, in words a baker would use. */
  function hydrationBand(h) {
    if (h < 58) return { label: 'Very low', note: 'Stiff dough — bagels and pretzels live here. Expect to work for it.' };
    if (h < 66) return { label: 'Low', note: 'Firm dough. Easy to shape, tight even crumb.' };
    if (h < 73) return { label: 'Standard', note: 'The comfortable middle. Forgiving to handle.' };
    if (h < 80) return { label: 'High', note: 'Open crumb, slack dough. Wet hands, and fold rather than knead.' };
    if (h < 88) return { label: 'Very high', note: 'Bench scraper territory. Shape fast and gently.' };
    return { label: 'Extreme', note: 'Nearly a batter. Bake it in a pan or it will pancake.' };
  }

  return { compute, hydrationBand, weigh, round, leavenById };
})();
