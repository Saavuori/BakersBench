/* Baker's Bench — interface */

const S = 10;    // svg units per cm
const PAD = 26;  // svg units of breathing room around the pan

const $ = id => document.getElementById(id);

const state = {
  recipeId: 'burger-buns',
  sizeId: null,
  count: 8,
  leavenId: null,
  pff: 0.2,
  panId: 'half',
  customW: 46,
  customH: 33,
  letTouch: false,
  thicknessId: null,
  hydration: null,   // null = whatever the recipe says
  startTime: '08:00'
};

/* ── Helpers ─────────────────────────────────────────────────────────── */

const baseRecipe = () => RECIPES.find(r => r.id === state.recipeId);
const leaven = () => Formula.leavenById(state.leavenId);

/* Water carried by things you would never rescale to hit a hydration target —
   butter, egg, malt. Those are enrichments; their quantity is a recipe
   decision, not a lever. Only water and milk absorb the change. */
const STRUCTURAL = l => (l.water ?? 0) >= 0.85;

function waterSplit(r) {
  const sum = (arr, f = () => true) =>
    arr.filter(f).reduce((s, i) => s + i.pct * (i.water ?? 0), 0);
  const fixed = sum(r.others) + sum(r.liquids, l => !STRUCTURAL(l));
  return { fixed, flexible: sum(r.liquids, STRUCTURAL), total: fixed + sum(r.liquids, STRUCTURAL) };
}

/* Hydration a recipe can actually reach: it can never go below what its
   enrichments already carry. */
function hydrationRange(r) {
  const { fixed } = waterSplit(r);
  return { min: Math.max(45, Math.ceil(fixed) + 4), max: 95 };
}

/* The recipe as currently dialled in. Everything downstream uses this, so a
   hydration change flows into the formula AND the footprint — wetter dough
   genuinely spreads wider on the pan. */
function recipe() {
  const r = baseRecipe();
  if (state.hydration == null) return r;
  const { fixed, flexible } = waterSplit(r);
  const need = state.hydration - fixed;
  if (flexible <= 0 || need <= 0) return r;
  const k = need / flexible;
  return {
    ...r,
    liquids: r.liquids.map(l => STRUCTURAL(l) ? { ...l, pct: l.pct * k } : l)
  };
}

/* A "fit my pan" size has no fixed length or weight — the pan sets the length,
   and the weight falls out of it, since a given bread has a characteristic
   baked width. Everything downstream just sees a normal size object. */
function resolveSize(size, pan) {
  if (!size || !size.fitToPan) return size;
  const sh = recipe().shape;
  const u = Packing.usable(pan || currentPan());
  const L = Math.floor((u.round ? u.d : Math.max(u.w, u.h)) * 10) / 10;
  return {
    ...size,
    length: L,
    g: Math.round(sh.arealDensity * L * sh.targetWidth)
  };
}

function currentSize() {
  const r = recipe();
  if (!r.sizes.length) return null;
  const raw = r.sizes.find(s => s.id === state.sizeId)
    || r.sizes.find(s => s.default) || r.sizes[0];
  return resolveSize(raw);
}

function currentPan() {
  const p = PANS.find(x => x.id === state.panId) || PANS[1];
  if (p.custom) return { ...p, w: state.customW, h: state.customH, type: 'rect' };
  return p;
}

function currentThickness() {
  const t = recipe().shape.thicknesses;
  if (!t) return null;
  return t.find(x => x.id === state.thicknessId) || t.find(x => x.default) || t[0];
}

const g = n => Formula.weigh(n).toLocaleString('en-US');

/* "Euro oven tray — 44 × 37 cm" reads badly mid-sentence; keep just the name. */
const panLabel = p => p.name.split('—')[0].trim().toLowerCase();
const cm = n => (Math.round(n * 10) / 10).toFixed(1).replace(/\.0$/, '');

function dur(min) {
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${String(m).padStart(2, '0')}`;
}

function clockFrom(start, addMin) {
  const [hh, mm] = start.split(':').map(Number);
  const t = new Date(2000, 0, 1, hh || 0, mm || 0);
  t.setMinutes(t.getMinutes() + addMin);
  const day = t.getDate() - 1;
  const s = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
  return day > 0 ? `${s}⁺${day}` : s;
}

/* ── Control rendering ───────────────────────────────────────────────── */

/* Built once. Rebuilding it on every render would reset scrollLeft, so moving a
   slider would yank the rail back to the start mid-drag. */
function buildRail() {
  $('breadRail').innerHTML = RECIPES.map(r => `
    <button class="bread-tab" role="tab" data-id="${r.id}" aria-selected="false">
      <b>${r.short}</b><small>${r.family.split(' · ')[1] || r.family}</small>
    </button>`).join('');
}

function renderRail() {
  [...document.querySelectorAll('.bread-tab')].forEach(b =>
    b.setAttribute('aria-selected', String(b.dataset.id === state.recipeId)));
  updateRailFade();
}

/* Fade whichever edge has more tabs behind it, so the overflow reads as
   scrollable rather than as text running off a cliff. */
function updateRailFade() {
  const el = $('breadRail');
  const max = el.scrollWidth - el.clientWidth;
  el.dataset.fade = max <= 2 ? 'none'
    : el.scrollLeft <= 2 ? 'end'
      : el.scrollLeft >= max - 2 ? 'start' : 'both';
}

function renderSizes() {
  const r = recipe();
  const isSlab = r.shape.type === 'slab';
  $('sizeField').hidden = isSlab || !r.sizes.length;
  $('countField').hidden = isSlab;
  $('thicknessField').hidden = !isSlab;

  if (!isSlab && r.sizes.length) {
    const sz = currentSize();
    $('sizeSeg').innerHTML = r.sizes.map(raw => {
      const s = resolveSize(raw);
      return `<button role="radio" data-id="${s.id}" aria-checked="${s.id === sz.id}">
        ${s.label}<small>${s.g} g</small>
      </button>`;
    }).join('');

    const fp = footprintFor(sz);
    const pan = currentPan();
    const panSpec = pan.type === 'round' ? `${cm(pan.d)} cm round` : `${cm(pan.w)} × ${cm(pan.h)} cm`;
    $('sizeHint').textContent = sz.fitToPan
      ? `Shaped to ${cm(sz.length)} cm to use the full ${panSpec} pan — ` +
        `${sz.g} g each, about ${cm(fp.w)} cm wide baked.`
      : fp.kind === 'rect'
        ? (fp.tin
          ? `${cm(fp.l)} × ${cm(fp.w)} cm tin.`
          : `Shaped to ${cm(fp.l)} cm long — about ${cm(fp.w)} cm wide once baked.`)
        : fp.stretched
          ? `Stretched to ${cm(fp.d)} cm across.`
          : `About ${cm(fp.d)} cm across after proofing and oven spring.`;
  }

  if (isSlab) {
    const th = currentThickness();
    $('thicknessSeg').innerHTML = r.shape.thicknesses.map(t => `
      <button role="radio" data-id="${t.id}" aria-checked="${t.id === th.id}">
        ${t.label}<small>${t.note}</small>
      </button>`).join('');
  }

  $('quickCounts').innerHTML = r.quickCounts.map(n =>
    `<button data-n="${n}">${n}</button>`).join('');
  $('countInput').value = state.count;
  $('countMinus').disabled = state.count <= 1;
}

function renderLeavens() {
  $('leavenList').innerHTML = LEAVENS.map(l => `
    <button class="leaven" role="radio" data-id="${l.id}" data-accent="${l.accent}"
            aria-checked="${l.id === state.leavenId}">
      <span class="dot" aria-hidden="true"></span>
      <span><b>${l.name}</b><small>${l.desc}</small></span>
      <span class="tag">${l.tag}</span>
    </button>`).join('');

  const l = leaven();
  const isPre = l.kind === 'preferment';
  $('prefermentField').hidden = !isPre;
  if (isPre) {
    $('pffLabel').textContent = l.pffLabel;
    $('pffRange').min = l.pffRange[0];
    $('pffRange').max = l.pffRange[1];
    $('pffRange').value = Math.round(state.pff * 100);
    $('pffOut').textContent = `${Math.round(state.pff * 100)}%`;
    $('prefermentHint').textContent = l.hint;
  }
}

function renderHydration() {
  const base = baseRecipe();
  const stock = hydrationOf(base);
  const cur = state.hydration == null ? stock : state.hydration;
  const { min, max } = hydrationRange(base);
  const el = $('hydraRange');
  el.min = min; el.max = max; el.value = cur;
  $('hydraOut').textContent = `${Formula.round(cur, 1)}%`;
  $('hydraReset').hidden = state.hydration == null;

  const band = Formula.hydrationBand(cur);
  const delta = Formula.round(cur - stock, 1);
  $('hydraHint').textContent = state.hydration == null
    ? `${band.label} — as the recipe writes it. Move it and the dough weight, the ` +
      `formula and the pan footprint all follow.`
    : `${band.label}. ${delta > 0 ? '+' : ''}${delta}% against the recipe's ` +
      `${Formula.round(stock, 1)}%. ${delta > 0
        ? 'Wetter dough relaxes wider on the pan.'
        : 'Stiffer dough holds its shape and climbs instead.'}`;
}

function renderPanControls() {
  const pan = currentPan();
  $('panSelect').innerHTML = PANS.map(p =>
    `<option value="${p.id}" ${p.id === state.panId ? 'selected' : ''}>${p.name}</option>`).join('');
  $('customPanField').hidden = state.panId !== 'custom';
  /* Keep the boxes showing the real state, but never while they're being typed in. */
  if (document.activeElement !== $('panW')) $('panW').value = state.customW;
  if (document.activeElement !== $('panH')) $('panH').value = state.customH;

  const r = recipe();
  const wrap = $('touchSwitchWrap');
  wrap.hidden = !r.shape.canTouch;
  if (r.shape.canTouch) {
    $('touchSwitch').checked = state.letTouch;
    $('touchTitle').textContent = state.letTouch ? 'Sides will touch' : 'Keep them separate';
    $('touchHint').textContent = state.letTouch
      ? 'Pull-apart rolls with soft, pale sides'
      : `${cm(r.shape.gapWhenSeparate ?? r.shape.gap)} cm apart — crust all the way round`;
  }
  $('panSpec').textContent = pan.type === 'round'
    ? `${cm(pan.d)} cm round`
    : `${cm(pan.w)} × ${cm(pan.h)} cm`;
}

/* ── Model ───────────────────────────────────────────────────────────── */

function hydrationOf(r) {
  const w = src => src.reduce((s, i) => s + i.pct * (i.water ?? 0), 0);
  return w(r.liquids) + w(r.others);
}

function footprintFor(size) {
  return Packing.pieceFootprint(recipe(), size, hydrationOf(recipe()));
}

function model() {
  const r = recipe();
  const pan = currentPan();
  const isSlab = r.shape.type === 'slab';

  let totalDough, size = null, footprint, gap = 0, count = state.count;

  if (isSlab) {
    const th = currentThickness();
    totalDough = Packing.slabWeight(pan, th.gPerCm2);
    footprint = { kind: 'slab' };
    count = 1;
  } else {
    size = currentSize();
    totalDough = size.g * count;
    footprint = footprintFor(size);
    gap = Packing.pieceGap(r, state.letTouch);
  }

  const fit = Packing.fit({ pan, footprint, gap, requested: count });
  const f = Formula.compute({
    recipe: r, leavenId: state.leavenId, pff: state.pff, totalDough
  });

  return { r, pan, size, footprint, gap, fit, f, isSlab, count };
}

/* ── Pan drawing ─────────────────────────────────────────────────────── */

function drawPan(m) {
  const { pan, fit, footprint, r } = m;
  const u = fit.usable;
  const isRound = pan.type === 'round';
  const panW = isRound ? pan.d : pan.w;
  const panH = isRound ? pan.d : pan.h;

  // Give a too-long piece room to visibly hang over the rim.
  const over = fit.tooLong ? Math.ceil(fit.tooLong.by * S / 2) + 14 : 0;
  const vbW = panW * S + PAD * 2 + over * 2;
  const vbH = panH * S + PAD * 2;
  const ox = PAD + over, oy = PAD;

  const svg = $('panSvg');
  svg.setAttribute('viewBox', `0 0 ${vbW} ${vbH}`);
  svg.style.maxWidth = `${Math.min(vbW * 1.15, 760)}px`;

  const toX = x => ox + (EDGE_MARGIN + x) * S;
  const toY = y => oy + (EDGE_MARGIN + y) * S;

  const defs = `
    <defs>
      <radialGradient id="dough" cx="36%" cy="32%" r="78%">
        <stop offset="0%"  stop-color="var(--crumb)"/>
        <stop offset="58%" stop-color="var(--ember)"/>
        <stop offset="100%" stop-color="var(--ember-2)"/>
      </radialGradient>
      <linearGradient id="steel" x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0%"   stop-color="var(--pan-face)"/>
        <stop offset="55%"  stop-color="var(--pan-face-2)"/>
        <stop offset="100%" stop-color="var(--pan-face)"/>
      </linearGradient>
    </defs>`;

  /* Pan body */
  let panEl;
  if (isRound) {
    const cx = ox + panW * S / 2, cy = oy + panH * S / 2;
    panEl =
      `<circle cx="${cx}" cy="${cy}" r="${panW * S / 2}" fill="url(#steel)"
               stroke="var(--pan-rim)" stroke-width="2.5"/>
       <circle cx="${cx}" cy="${cy}" r="${u.d * S / 2}" fill="none"
               stroke="var(--pan-rim)" stroke-width="1" stroke-dasharray="4 5" opacity=".5"/>`;
  } else {
    panEl =
      `<rect x="${ox}" y="${oy}" width="${panW * S}" height="${panH * S}" rx="${1.1 * S}"
             fill="url(#steel)" stroke="var(--pan-rim)" stroke-width="2.5"/>
       <rect x="${toX(0)}" y="${toY(0)}" width="${u.w * S}" height="${u.h * S}" rx="${0.6 * S}"
             fill="none" stroke="var(--pan-rim)" stroke-width="1"
             stroke-dasharray="4 5" opacity=".5"/>`;
  }

  /* Pieces */
  let pieces = '';

  if (footprint.kind === 'slab') {
    const inset = 0.25 * S;
    pieces = isRound
      ? `<circle class="piece" cx="${ox + panW * S / 2}" cy="${oy + panH * S / 2}"
                 r="${u.d * S / 2}" fill="url(#dough)"/>`
      : `<rect class="piece" x="${toX(0) + inset}" y="${toY(0) + inset}"
               width="${u.w * S - inset * 2}" height="${u.h * S - inset * 2}"
               rx="${0.5 * S}" fill="url(#dough)"/>`;
    // Dimples — the one detail that makes focaccia read as focaccia.
    const step = 3.4 * S;
    const cxR = ox + panW * S / 2, cyR = oy + panH * S / 2, rR = u.d * S / 2;
    let dots = '';
    for (let y = toY(0) + step * .7; y < toY(u.h) - step * .3; y += step)
      for (let x = toX(0) + step * .7; x < toX(u.w) - step * .3; x += step) {
        const jx = (Math.sin(x * 3.1 + y) * 0.35) * S;
        const jy = (Math.cos(y * 2.7 + x) * 0.35) * S;
        if (isRound && Math.hypot(x + jx - cxR, y + jy - cyR) > rR - 0.9 * S) continue;
        dots += `<circle cx="${x + jx}" cy="${y + jy}" r="${0.45 * S}"
                         fill="var(--ember-2)" opacity=".55"/>`;
      }
    pieces += `<g>${dots}</g>`;

  } else if (fit.pos.length) {
    fit.pos.slice(0, fit.shown).forEach((p, i) => {
      const delay = `${Math.min(i * 22, 420)}ms`;
      const x = toX(p.x), y = toY(p.y);

      if (footprint.kind === 'circle') {
        const rad = footprint.d * S / 2;
        let inner = '';
        if (footprint.d > 12 && !footprint.stretched) {
          inner = `<path d="M ${x - rad * .5} ${y - rad * .28} A ${rad * .95} ${rad * .95} 0 0 1 ${x + rad * .12} ${y - rad * .62}"
                         fill="none" stroke="var(--ember-2)" stroke-width="1.8"
                         stroke-linecap="round" opacity=".7"/>`;
        }
        pieces += `<g class="piece" style="animation-delay:${delay}">
          <circle cx="${x}" cy="${y}" r="${rad}" fill="url(#dough)"/>
          ${footprint.stretched ? '' : `<circle cx="${x}" cy="${y}" r="${footprint.shapedD * S / 2}"
                  fill="none" stroke="var(--ember-2)" stroke-width="1.4"
                  stroke-dasharray="3.5 4" opacity=".75"/>`}
          ${inner}</g>`;

      } else if (footprint.kind === 'ring') {
        const rad = footprint.d * S / 2;
        const hole = rad * (footprint.holeRatio ?? .3);
        pieces += `<g class="piece" style="animation-delay:${delay}">
          <path d="M ${x - rad} ${y} a ${rad} ${rad} 0 1 0 ${rad * 2} 0 a ${rad} ${rad} 0 1 0 ${-rad * 2} 0
                   M ${x - hole} ${y} a ${hole} ${hole} 0 1 1 ${hole * 2} 0 a ${hole} ${hole} 0 1 1 ${-hole * 2} 0"
                fill="url(#dough)" fill-rule="evenodd"/></g>`;

      } else { // rect — rods and tins
        const rot = p.rot || 0;
        const w = (rot ? footprint.w : footprint.l) * S;
        const h = (rot ? footprint.l : footprint.w) * S;
        const rx = footprint.tin ? 0.35 * S : Math.min(w, h) / 2;
        let slash = '';
        if (!footprint.tin && footprint.l > 20) {
          const n = Math.max(3, Math.round(footprint.l / 9));
          for (let k = 0; k < n; k++) {
            const t = (k + .5) / n;
            const cx0 = x - w / 2 + t * w, cy0 = y;
            slash += rot
              ? `<line x1="${x - h / 2 + t * 0}" y1="0" x2="0" y2="0" opacity="0"/>`
              : `<line x1="${cx0 - h * .18}" y1="${cy0 + h * .22}"
                       x2="${cx0 + h * .18}" y2="${cy0 - h * .22}"
                       stroke="var(--ember-2)" stroke-width="1.6"
                       stroke-linecap="round" opacity=".65"/>`;
          }
        }
        pieces += `<g class="piece" style="animation-delay:${delay}">
          <rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="${rx}"
                fill="${footprint.tin ? 'var(--panel-3)' : 'url(#dough)'}"
                stroke="${footprint.tin ? 'var(--pan-rim)' : 'none'}" stroke-width="2"/>
          ${footprint.tin ? `<rect x="${x - w / 2 + 0.5 * S}" y="${y - h / 2 + 0.5 * S}"
                width="${w - 1 * S}" height="${h - 1 * S}" rx="${0.2 * S}" fill="url(#dough)"/>` : ''}
          ${slash}</g>`;
      }
    });
  }

  /* The piece that does not fit, drawn hanging over the rim */
  let overhang = '';
  if (fit.tooLong) {
    const cx = ox + panW * S / 2, cy = oy + panH * S / 2;
    if (footprint.kind === 'rect') {
      const w = footprint.l * S, h = footprint.w * S;
      overhang = `
        <rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}"
              rx="${h / 2}" fill="var(--ember)" opacity=".16"/>
        <rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}"
              rx="${h / 2}" fill="none" stroke="var(--bad)" stroke-width="2"
              stroke-dasharray="7 5"/>
        <line x1="${cx - w / 2}" y1="${cy + h / 2 + 12}" x2="${ox}" y2="${cy + h / 2 + 12}"
              stroke="var(--bad)" stroke-width="1.6"/>
        <text class="svg-num" x="${(cx - w / 2 + ox) / 2}" y="${cy + h / 2 + 27}"
              fill="var(--bad)" font-size="11" text-anchor="middle"
              >${cm(fit.tooLong.by / 2)} cm over</text>`;
    } else {
      const rad = footprint.d * S / 2;
      overhang = `
        <circle cx="${cx}" cy="${cy}" r="${rad}" fill="var(--ember)" opacity=".16"/>
        <circle cx="${cx}" cy="${cy}" r="${rad}" fill="none" stroke="var(--bad)"
                stroke-width="2" stroke-dasharray="7 5"/>`;
    }
  }

  svg.innerHTML = defs + panEl + pieces + overhang;
  svg.querySelector('title')?.remove();
  const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
  title.textContent = fit.kind === 'slab'
    ? `${r.name} filling a ${$('panSpec').textContent} pan`
    : `${fit.shown} of ${fit.requested} ${r.unit.many} laid out on a ${$('panSpec').textContent} pan`;
  svg.prepend(title);
}

/* ── Verdict copy ────────────────────────────────────────────────────── */

/* Largest alternative that is smaller than the current pick and still fits. */
function smallerSizeThatFits(m) {
  const r = m.r;
  if (!m.size || !r.sizes.length) return null;
  const cands = r.sizes
    .map(s => resolveSize(s, m.pan))
    .filter(s => s.g < m.size.g)
    .sort((a, b) => b.g - a.g);
  for (const s of cands) {
    const fp = Packing.pieceFootprint(r, s, hydrationOf(r));
    const res = Packing.fit({ pan: m.pan, footprint: fp, gap: m.gap, requested: m.count });
    if (res.fits) return { size: s, capacity: res.capacity };
  }
  return null;
}

function biggerPanThatFits(m) {
  const areaOf = p => p.type === 'round' ? Math.PI * (p.d / 2) ** 2 : p.w * p.h;
  const here = areaOf(m.pan);
  const bigger = PANS
    .filter(p => !p.custom && p.type === 'rect' && areaOf(p) > here)
    .sort((a, b) => areaOf(a) - areaOf(b));
  for (const p of bigger) {
    const res = Packing.fit({ pan: p, footprint: m.footprint, gap: m.gap, requested: m.count });
    if (res.fits) return p;
  }
  return null;
}

/* Only show swatches for what is actually on the pan right now. */
function renderLegend(m, trailing) {
  const { fit, footprint } = m;
  const items = [];
  if (fit.pos.length || footprint.kind === 'slab')
    items.push(`<span class="lg"><i class="sw sw-dough"></i>after proof &amp; oven spring</span>`);
  if (fit.pos.length && (footprint.kind === 'circle') && !footprint.stretched)
    items.push(`<span class="lg"><i class="sw sw-ghost"></i>as shaped</span>`);
  if (fit.tooLong)
    items.push(`<span class="lg"><i class="sw sw-over"></i>hangs over the rim</span>`);
  items.push(`<span class="lg lg-layout">${trailing}</span>`);
  $('panLegend').innerHTML = items.join('');
}

function renderVerdict(m) {
  const { fit, r, size, isSlab, count, pan } = m;
  const el = $('verdict');
  const spec = pan.type === 'round' ? `${cm(pan.d)} cm round` : `${cm(pan.w)} × ${cm(pan.h)} cm`;
  const nounFor = n => n === 1 ? r.unit.one : r.unit.many;
  const noun = nounFor(count);
  /* "fit my pan" is a mode, not a size name — say the length instead. And only
     bare adjectives take "size": "at 30 cm size" and "at large tin size" don't. */
  const sizeWord = !size ? ''
    : size.fitToPan ? `${cm(size.length)} cm`
    : /\d|tin|batch/i.test(size.label) ? size.label.toLowerCase()
    : `${size.label.toLowerCase()} size`;

  if (isSlab) {
    el.dataset.state = 'ok';
    $('verdictLine').textContent = `${g(m.f.totalDough)} g of dough fills this pan`;
    $('verdictSub').textContent =
      `${currentThickness().label.toLowerCase()} — ${currentThickness().note}. ` +
      `${spec}, minus a ${EDGE_MARGIN} cm margin all round.`;
    renderLegend(m, `${Math.round(fit.usable.area).toLocaleString('en-US')} cm² of pan` +
      ` · ${currentThickness().gPerCm2} g/cm²`);
    return;
  }

  if (fit.tooLong) {
    el.dataset.state = 'bad';
    const isRod = m.footprint.kind === 'rect';
    $('verdictLine').textContent = isRod
      ? `A ${cm(m.footprint.l)} cm ${noun} is too long for this pan`
      : `One ${cm(m.footprint.d)} cm ${noun} is wider than this pan`;
    const bigger = biggerPanThatFits(m);
    $('verdictSub').textContent =
      `Usable space is ${cm(fit.tooLong.limit)} cm, so it is ${cm(fit.tooLong.by)} cm too long — ` +
      `${cm(fit.tooLong.by / 2)} cm over each end. ` +
      (bigger ? `Shape it shorter, or move to a ${panLabel(bigger)}.` : `Shape it shorter.`);
    renderLegend(m, isRod
      ? `${cm(m.footprint.l)} cm long · pan takes ${cm(fit.tooLong.limit)} cm`
      : `${cm(m.footprint.d)} cm across · pan takes ${cm(fit.tooLong.limit)} cm`);
    return;
  }

  const layoutWord = fit.layout === 'staggered' ? 'staggered rows'
    : fit.cols && fit.rows ? `${fit.cols} × ${fit.rows}` : 'one per pan';
  renderLegend(m, `${layoutWord} · ${m.gap === 0 ? 'sides touching' : cm(m.gap) + ' cm apart'}`);

  if (fit.fits) {
    el.dataset.state = 'ok';
    $('verdictLine').textContent = count === 1
      ? (fit.spare === 0 ? `It fits — and that fills the pan` : `It fits`)
      : (fit.spare === 0 ? `All ${count} fit — the pan is full` : `All ${count} fit`);
    $('verdictSub').textContent = fit.spare === 0
      ? `Exactly ${fit.capacity} ${nounFor(fit.capacity)} at ${sizeWord} on a ${spec} pan.`
      : `This pan holds ${fit.capacity} at ${sizeWord}, so there's room for ${fit.spare} more.`;
    return;
  }

  el.dataset.state = 'tight';
  $('verdictLine').textContent = fit.capacity === 0
    ? `None fit at this size`
    : `Only ${fit.capacity} fit`;

  /* Offer the two most useful ways out, not every one that exists. */
  const alt = smallerSizeThatFits(m);
  const bigger = biggerPanThatFits(m);
  const fixes = [];
  if (alt) fixes.push(alt.size.fitToPan
    ? `let the pan set the size (${alt.size.g} g each)`
    : `drop to ${alt.size.label.toLowerCase()} (${alt.size.g} g)`);
  if (r.shape.canTouch && !state.letTouch) {
    const touching = Packing.fit({
      pan: m.pan, footprint: m.footprint, gap: 0, requested: count
    });
    if (touching.fits) fixes.push(`let them touch`);
  }
  if (bigger) fixes.push(`move to a ${panLabel(bigger)}`);

  $('verdictSub').textContent =
    `You asked for ${count}. Bake the other ${fit.overflow} on a second pan` +
    (fixes.length
      ? ` — or ${fixes.slice(0, 2).join(', or ')}, and all ${count} fit on one.`
      : ` (${fit.pansNeeded} pans in total).`);
}

/* ── Formula tables ──────────────────────────────────────────────────── */

function tableRows(rows, maxPct) {
  return rows.map(r => `
    <tr>
      <td>${r.name}</td>
      <td class="g">${g(r.g)} g</td>
      <td class="p">${Formula.round(r.pctOfFlour, r.pctOfFlour < 1 ? 2 : 1)}%</td>
      <td class="bar"><div class="bar-track">
        <div class="bar-fill" data-kind="${r.kind}"
             style="width:${Math.min(100, (r.pctOfFlour / maxPct) * 100)}%"></div>
      </div></td>
    </tr>`).join('');
}

function renderFormula(m) {
  const { f } = m;
  const maxPct = 100;
  let html = '';

  if (f.preferment) {
    const p = f.preferment;
    html += `
      <div class="f-block" data-kind="preferment">
        <div class="f-head">
          <span class="step-n">1</span>
          <h3>${p.name}</h3>
          <span class="when">${dur(p.buildMinutes)} ahead · ${Formula.round(p.hydration * 100)}% hydration</span>
        </div>
        <table class="f">
          <thead><tr><th>Ingredient</th><th>Weight</th><th>Baker's %</th><th></th></tr></thead>
          <tbody>
            ${tableRows(p.rows, maxPct)}
            <tr class="f-total"><td>Ripe ${p.shortName}</td>
              <td class="g">${g(p.total)} g</td><td class="p"></td><td></td></tr>
          </tbody>
        </table>
        <p class="f-note">
          ${Formula.round(p.prefermentedFlourPct, 0)}% of the total flour ferments here first.
          Its flour and water are taken out of the final dough below, so total flour and
          hydration land exactly where the recipe wants them.
        </p>
      </div>`;
  }

  html += `
    <div class="f-block" data-kind="final">
      <div class="f-head">
        <span class="step-n">${f.preferment ? 2 : 1}</span>
        <h3>Final dough</h3>
        <span class="when">${m.isSlab ? 'one pan' : `${m.count} × ${m.size.g} g`}</span>
      </div>
      <table class="f">
        <thead><tr><th>Ingredient</th><th>Weight</th><th>Baker's %</th><th></th></tr></thead>
        <tbody>
          ${tableRows(f.finalRows, maxPct)}
          <tr class="f-total"><td>Total dough</td>
            <td class="g">${g(f.totalDough)} g</td><td class="p"></td><td></td></tr>
        </tbody>
      </table>
      ${f.warnings.map(w => `<p class="f-note warn">${w}</p>`).join('')}
    </div>`;

  $('formulaTables').innerHTML = html;
  $('statDough').textContent = `${g(f.totalDough)} g`;
  $('statFlour').textContent = `${g(f.totalFlour)} g`;

  renderDial(f);
}

function renderDial(f) {
  const h = f.hydration;
  const lo = 50, hi = 95;
  const t = Math.max(0, Math.min(1, (h - lo) / (hi - lo)));
  const a0 = Math.PI * 0.86, a1 = Math.PI * 0.14;   // left to right, over the top
  const ang = a0 + (a1 - a0) * t;
  const cx = 60, cy = 62, rad = 44;

  const pt = a => `${cx + Math.cos(a) * rad} ${cy - Math.sin(a) * rad}`;
  const arc = (from, to, color, w, op = 1) =>
    `<path d="M ${pt(from)} A ${rad} ${rad} 0 0 1 ${pt(to)}" fill="none"
           stroke="${color}" stroke-width="${w}" stroke-linecap="round" opacity="${op}"/>`;

  const band = Formula.hydrationBand(h);

  $('hydraDial').innerHTML =
    arc(a0, a1, 'var(--line)', 7) +
    arc(a0, ang, 'var(--ember)', 7) +
    `<circle cx="${cx + Math.cos(ang) * rad}" cy="${cy - Math.sin(ang) * rad}" r="5.5"
             fill="var(--ember)" stroke="var(--panel-2)" stroke-width="2.5"/>` +
    `<text class="svg-num" x="${cx + Math.cos(a0) * rad}" y="${cy - Math.sin(a0) * rad + 15}"
           fill="var(--text-3)" font-size="9" text-anchor="middle">${lo}</text>` +
    `<text class="svg-num" x="${cx + Math.cos(a1) * rad}" y="${cy - Math.sin(a1) * rad + 15}"
           fill="var(--text-3)" font-size="9" text-anchor="middle">${hi}</text>`;

  $('hydraValue').textContent = `${Formula.round(h, 1)}%`;
  $('hydraBand').textContent = band.label + ' hydration';
  $('hydraNote').textContent = f.isEnriched
    ? `${band.note} ${f.addedWaterPct}% is added liquid; the milk, egg and butter carry ` +
      `another ${f.enrichedWater}%.`
    : band.note;
}

/* ── Schedule ────────────────────────────────────────────────────────── */

function renderSchedule(m) {
  const { f, r } = m;
  const total = f.totalMinutes;

  /* Bar and captions share the flex ratio, so they track each other wherever
     the captions have room. Only segments with room to spare carry a label. */
  const bar = f.steps.map(s =>
    `<div class="tl-seg" data-kind="${s.kind}" style="--w:${s.minutes}">
       ${s.minutes / total > 0.17 ? s.label : ''}
     </div>`).join('');

  /* Each caption grows by the same ratio as its bar segment above, so the two
     rows read as one chart. A minimum width keeps the short steps legible —
     "Mix" is 2% of a sourdough day and would otherwise be a sliver. */
  let acc = 0;
  const items = f.steps.map(s => {
    const at = clockFrom(state.startTime, acc);
    acc += s.minutes;
    return `<div class="tl-item" data-kind="${s.kind}" style="--w:${s.minutes}"
                 title="${s.label} — ${dur(s.minutes)}, from ${at}">
      <span class="t">${at}</span>
      <span class="l">${s.label}</span>
      <span class="d">${dur(s.minutes)}</span>
    </div>`;
  }).join('');

  $('timeline').innerHTML =
    `<div class="tl-bar">${bar}</div>
     <div class="tl-list">${items}</div>
     <div class="tl-finish">
       <span class="t">${clockFrom(state.startTime, acc)}</span>
       <span class="l">Out of the oven</span>
       <span class="d">${dur(total)} in total</span>
     </div>`;

  $('statTotalTime').textContent = dur(total);

  Timer.setStages(r.bake.stages);

  $('bakeBox').innerHTML = `
    <div><dt>Oven</dt><dd><strong>${r.bake.temp}</strong></dd></div>
    <div><dt>Time</dt><dd>${r.bake.time}</dd></div>
    <div><dt>Steam</dt><dd>${r.bake.steam}</dd></div>
    <div><dt>Done at</dt><dd>${r.bake.internal}</dd></div>`;
}

/* ── Render ──────────────────────────────────────────────────────────── */

const ICON = {
  video: `<svg class="kind" viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 7.2a2.6 2.6 0 0 0-1.8-1.8C18.1 5 12 5 12 5s-6.1 0-7.8.4A2.6 2.6 0 0 0 2.4 7.2 27 27 0 0 0 2 12a27 27 0 0 0 .4 4.8 2.6 2.6 0 0 0 1.8 1.8C5.9 19 12 19 12 19s6.1 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.8A27 27 0 0 0 22 12a27 27 0 0 0-.4-4.8ZM10 15.2V8.8L15.5 12Z"/></svg>`,
  page: `<svg class="kind" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h7v7h-2V6.4l-8.3 8.3-1.4-1.4L17.6 5H14Zm-9 2h5v2H6v11h11v-4h2v6H4V5Z"/></svg>`
};

let heroShowing = null;

function renderHero() {
  const r = baseRecipe();
  if (heroShowing === r.id) return;   // the portrait is filter-heavy; draw once
  heroShowing = r.id;
  $('recipeName').textContent = r.name;
  $('recipeFamily').textContent = r.family;
  $('recipeBlurb').textContent = r.blurb;
  $('portrait').innerHTML = Portraits.render(r.id);
  $('recipeLinks').innerHTML = (r.links || []).map(l => `
    <li><a href="${l.url}" target="_blank" rel="noopener noreferrer">
      ${l.video ? ICON.video : ICON.page}
      <span>${l.label}</span><span class="src">${l.source}</span>
    </a></li>`).join('');
}

function render() {
  const r = recipe();
  renderHero();
  renderRail();
  renderHydration();
  renderSizes();
  renderLeavens();
  renderPanControls();

  const m = model();
  drawPan(m);
  renderVerdict(m);
  renderFormula(m);
  renderSchedule(m);
}

/* ── Recipe switching ────────────────────────────────────────────────── */

function selectRecipe(id) {
  state.recipeId = id;
  const r = recipe();
  state.sizeId = (r.sizes.find(s => s.default) || r.sizes[0] || {}).id ?? null;
  state.thicknessId = r.shape.thicknesses
    ? (r.shape.thicknesses.find(t => t.default) || r.shape.thicknesses[0]).id : null;
  /* Land on a count that actually fits, so the first thing you see isn't a
     failure. Recipes that bake one big loaf at a time say so explicitly. */
  state.count = r.defaultCount ?? r.quickCounts[Math.min(1, r.quickCounts.length - 1)];
  state.leavenId = r.defaultLeaven;
  state.letTouch = !!r.shape.touchDefault;
  state.hydration = null;   // back to whatever the recipe says
  syncPff();
  render();
}

function syncPff() {
  const l = leaven();
  if (l.kind !== 'preferment') return;
  const p = recipe().preferment[l.id] ?? 0.25;
  state.pff = Math.max(l.pffRange[0] / 100, Math.min(l.pffRange[1] / 100, p));
}

/* ── Events ──────────────────────────────────────────────────────────── */

function setCount(n) {
  state.count = Math.max(1, Math.min(200, n | 0));
  render();
}

$('breadRail').addEventListener('click', e => {
  const b = e.target.closest('.bread-tab');
  if (b) selectRecipe(b.dataset.id);
});

$('sizeSeg').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (b) { state.sizeId = b.dataset.id; render(); }
});

$('thicknessSeg').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (b) { state.thicknessId = b.dataset.id; render(); }
});

$('quickCounts').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (b) setCount(+b.dataset.n);
});

$('countMinus').addEventListener('click', () => setCount(state.count - 1));
$('countPlus').addEventListener('click', () => setCount(state.count + 1));
$('countInput').addEventListener('input', e => {
  const v = parseInt(e.target.value, 10);
  if (!isNaN(v) && v > 0) { state.count = Math.min(200, v); render(); }
});

$('leavenList').addEventListener('click', e => {
  const b = e.target.closest('.leaven');
  if (!b) return;
  state.leavenId = b.dataset.id;
  syncPff();
  render();
});

$('hydraRange').addEventListener('input', e => {
  state.hydration = +e.target.value;
  render();
});
$('hydraReset').addEventListener('click', () => { state.hydration = null; render(); });

$('pffRange').addEventListener('input', e => {
  state.pff = +e.target.value / 100;
  $('pffOut').textContent = `${e.target.value}%`;
  render();
});

$('panSelect').addEventListener('change', e => { state.panId = e.target.value; render(); });
$('panW').addEventListener('input', e => { state.customW = +e.target.value || 46; render(); });
$('panH').addEventListener('input', e => { state.customH = +e.target.value || 33; render(); });

$('touchSwitch').addEventListener('change', e => { state.letTouch = e.target.checked; render(); });
$('startTime').addEventListener('input', e => { state.startTime = e.target.value || '08:00'; render(); });

/* Theme */
const root = document.documentElement;
function setTheme(t) {
  root.dataset.theme = t;
  $('themeLabel').textContent = t === 'dark' ? 'Night' : 'Day';
  try { localStorage.setItem('bakers-bench-theme', t); } catch (_) {}
}
$('themeToggle').addEventListener('click', () =>
  setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));

try {
  const saved = localStorage.getItem('bakers-bench-theme');
  if (saved) setTheme(saved);
  else setTheme(window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
} catch (_) { setTheme('dark'); }

$('breadRail').addEventListener('scroll', updateRailFade, { passive: true });
window.addEventListener('resize', updateRailFade);

/* Go */
Timer.init();
buildRail();
selectRecipe('burger-buns');
state.count = 8;
render();
