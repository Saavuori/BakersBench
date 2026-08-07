/* Baker's Bench — pan geometry
 *
 * Two questions, answered honestly:
 *   1. How big is one piece once it has proofed and sprung?
 *   2. How many of those actually fit on this pan?
 *
 * FOOTPRINT MODEL
 * Dough scales by volume, so a piece's width scales with the cube root of its
 * weight:  d = k · m^(1/3).  k is set by hydration — wetter dough relaxes
 * outward, stiffer dough climbs. Calibrated against known bakes:
 *   50 g dinner roll  → 7.3 cm   (24 fill a half sheet, which matches practice)
 *   90 g burger bun   → 9.2 cm
 *  900 g boule        → 21 cm
 * The model holds across a 20× weight range, which is the point of a cube root.
 *
 * PACKING
 * Circles get both a square grid and a staggered (hex) layout; whichever holds
 * more wins. Rods get tried in both orientations. Nothing is allowed to hang
 * over the rim.
 */

/* Calibration constant for the footprint model: centimetres per gram^(1/3) at
 * 65% hydration. It lives here rather than with the recipe data because it
 * describes the model, not any particular bread. */
const FLOUR_SPREAD = 2.05;

const Packing = (() => {

  const SQRT3_2 = Math.sqrt(3) / 2;

  /* ── Footprint of a single piece ──────────────────────────────────── */

  function pieceFootprint(recipe, size, hydrationPct, opts = {}) {
    const shape = recipe.shape;
    const h = hydrationPct / 100;

    if (shape.type === 'slab') return { kind: 'slab' };

    if (shape.type === 'tin') {
      return { kind: 'rect', l: size.tinW, w: size.tinH, tin: true };
    }

    if (shape.type === 'rod') {
      const l = size.length;
      const w = size.g / (shape.arealDensity * l);
      return { kind: 'rect', l, w, radius: w / 2 };
    }

    // round and ring
    if (size.fixedDiameter) {
      // Pizza is stretched to a size, not proofed to one.
      return { kind: 'circle', d: size.fixedDiameter, shapedD: size.fixedDiameter * 0.42, stretched: true };
    }
    const k = FLOUR_SPREAD * (1 + (h - 0.65) * 0.55) * (shape.spread ?? 1);
    const d = k * Math.cbrt(size.g);
    return {
      kind: shape.type === 'ring' ? 'ring' : 'circle',
      d,
      shapedD: d * 0.68,
      holeRatio: shape.holeRatio
    };
  }

  /* Gap the baker wants between pieces, in cm. */
  function pieceGap(recipe, letTouch) {
    const shape = recipe.shape;
    if (!shape.canTouch) return shape.gap ?? 3;
    return letTouch ? 0 : (shape.gapWhenSeparate ?? shape.gap ?? 3);
  }

  /* ── Usable area ──────────────────────────────────────────────────── */

  function usable(pan) {
    if (pan.type === 'round') {
      const d = pan.d - EDGE_MARGIN * 2;
      return { round: true, d, w: d, h: d, area: Math.PI * (d / 2) ** 2 };
    }
    const w = pan.w - EDGE_MARGIN * 2;
    const h = pan.h - EDGE_MARGIN * 2;
    return { round: false, w, h, area: w * h };
  }

  /* ── Circle packing ───────────────────────────────────────────────── */

  function circlesGrid(W, H, d, gap) {
    const p = d + gap;
    const cols = Math.floor((W + gap) / p);
    const rows = Math.floor((H + gap) / p);
    if (cols < 1 || rows < 1) return { count: 0, pos: [], layout: 'grid' };
    const usedW = cols * d + (cols - 1) * gap;
    const usedH = rows * d + (rows - 1) * gap;
    const ox = (W - usedW) / 2 + d / 2;
    const oy = (H - usedH) / 2 + d / 2;
    const pos = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        pos.push({ x: ox + c * p, y: oy + r * p });
    return { count: pos.length, pos, layout: 'grid', cols, rows };
  }

  function circlesStaggered(W, H, d, gap) {
    const p = d + gap;
    const rowPitch = p * SQRT3_2;
    if (H < d || W < d) return { count: 0, pos: [], layout: 'staggered' };

    const rows = Math.floor((H - d) / rowPitch) + 1;
    const full = Math.floor((W + gap) / p);
    const offset = Math.floor((W + gap - p / 2) / p);
    if (rows < 2 || full < 1 || offset < 1) return { count: 0, pos: [], layout: 'staggered' };

    /* Both row types share one origin, so an offset row sits exactly half a
       pitch from its neighbours. That half-pitch is what makes the diagonal
       spacing equal p; centring each row independently drops it to p/4 and the
       pieces overlap. */
    const spanFull = full * d + (full - 1) * gap;
    const spanOffset = p / 2 + offset * d + (offset - 1) * gap;
    const left = (W - Math.max(spanFull, spanOffset)) / 2;
    const top = (H - ((rows - 1) * rowPitch + d)) / 2;

    const pos = [];
    for (let r = 0; r < rows; r++) {
      const isOffset = r % 2 === 1;
      const n = isOffset ? offset : full;
      const x0 = left + (isOffset ? p / 2 : 0) + d / 2;
      for (let c = 0; c < n; c++) {
        pos.push({ x: x0 + c * p, y: top + d / 2 + r * rowPitch });
      }
    }
    return { count: pos.length, pos, layout: 'staggered', rows };
  }

  /* ── Rectangle packing ────────────────────────────────────────────── */

  function rectsGrid(W, H, pw, ph, gap, rot) {
    const cols = Math.floor((W + gap) / (pw + gap));
    const rows = Math.floor((H + gap) / (ph + gap));
    if (cols < 1 || rows < 1) return { count: 0, pos: [], layout: 'grid' };
    const usedW = cols * pw + (cols - 1) * gap;
    const usedH = rows * ph + (rows - 1) * gap;
    const ox = (W - usedW) / 2 + pw / 2;
    const oy = (H - usedH) / 2 + ph / 2;
    const pos = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        pos.push({ x: ox + c * (pw + gap), y: oy + r * (ph + gap), rot });
    return { count: pos.length, pos, layout: 'grid', cols, rows };
  }

  /* Keep only circles fully inside a round pan. */
  function clipToRound(res, D, d) {
    const R = D / 2, r = d / 2;
    const pos = res.pos.filter(p => Math.hypot(p.x - R, p.y - R) <= R - r + 0.001);
    return { ...res, pos, count: pos.length };
  }

  /* ── The main call ────────────────────────────────────────────────── */

  /**
   * @returns {object} capacity, the chosen layout, drawable positions, and
   *                   everything the verdict copy needs.
   */
  function fit({ pan, footprint, gap, requested }) {
    const u = usable(pan);

    if (footprint.kind === 'slab') {
      return {
        kind: 'slab', capacity: 1, requested: 1, fits: true,
        pos: [], usable: u, area: u.area
      };
    }

    let best = { count: 0, pos: [], layout: 'grid' };
    let tooLong = null;

    if (footprint.kind === 'circle' || footprint.kind === 'ring') {
      const d = footprint.d;
      if (u.round) {
        const g = circlesGrid(u.d, u.d, d, gap);
        const s = circlesStaggered(u.d, u.d, d, gap);
        const gc = clipToRound(g, u.d, d), sc = clipToRound(s, u.d, d);
        best = sc.count > gc.count ? sc : gc;
        if (best.count === 0 && d <= u.d + 0.001) {
          best = { count: 1, pos: [{ x: u.d / 2, y: u.d / 2 }], layout: 'single' };
        }
        if (d > u.d) tooLong = { by: d - u.d, dim: 'across', size: d, limit: u.d };
      } else {
        const g = circlesGrid(u.w, u.h, d, gap);
        const s = circlesStaggered(u.w, u.h, d, gap);
        best = s.count > g.count ? s : g;
        if (best.count === 0) {
          const limit = Math.max(u.w, u.h);
          tooLong = { by: d - Math.min(u.w, u.h), dim: 'across', size: d, limit: Math.min(u.w, u.h) };
        }
      }
    } else {
      const { l, w } = footprint;
      if (u.round) {
        // Rare (a bâtard in a Dutch oven). Fit one if the diagonal allows.
        const fitsOne = Math.hypot(l, w) <= u.d;
        best = fitsOne
          ? { count: 1, pos: [{ x: u.d / 2, y: u.d / 2, rot: 0 }], layout: 'single' }
          : { count: 0, pos: [], layout: 'grid' };
        if (!fitsOne) tooLong = { by: l - u.d, dim: 'long', size: l, limit: u.d };
      } else {
        const a = rectsGrid(u.w, u.h, l, w, gap, 0);   // length across the pan
        const b = rectsGrid(u.w, u.h, w, l, gap, 90);  // length front to back
        best = b.count > a.count ? b : a;
        if (best.count === 0) {
          const limit = Math.max(u.w, u.h);
          tooLong = { by: l - limit, dim: 'long', size: l, limit };
        }
      }
    }

    const capacity = best.count;
    const shown = Math.min(requested, capacity);
    const overflow = Math.max(0, requested - capacity);
    const pansNeeded = capacity > 0 ? Math.ceil(requested / capacity) : Infinity;

    return {
      kind: footprint.kind,
      capacity,
      requested,
      shown,
      overflow,
      pansNeeded,
      fits: overflow === 0 && capacity > 0,
      spare: Math.max(0, capacity - requested),
      layout: best.layout,
      pos: best.pos,
      cols: best.cols,
      rows: best.rows,
      tooLong,
      usable: u
    };
  }

  /* Dough weight for a pan-filling bread. */
  function slabWeight(pan, gPerCm2) {
    return usable(pan).area * gPerCm2;
  }

  return { pieceFootprint, pieceGap, fit, usable, slabWeight };
})();
