#!/usr/bin/env node
/* recipes/*.yaml  ->  js/recipes.js
 *
 * The YAML files are the source of truth. This generates the JavaScript the
 * browser actually loads, because the app ships zero runtime dependencies and
 * makes no network requests — so it can neither parse YAML in the browser nor
 * fetch JSON at runtime, and it must still work opened straight from disk.
 *
 * The generated file IS committed. Running the build is a contributor step, not
 * a user step; `npm test` fails if the two have drifted.
 *
 *   node tools/build-recipes.mjs           write js/recipes.js
 *   node tools/build-recipes.mjs --check   exit 1 if it would change anything
 */

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { parse } from './yaml.mjs';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'recipes');
const OUT = path.join(ROOT, 'js', 'recipes.js');
const checkOnly = process.argv.includes('--check');

const problems = [];
const fail = (file, msg) => problems.push(`${file}: ${msg}`);

/* ── Read ─────────────────────────────────────────────────────────────── */

function load(file) {
  try {
    return parse(fs.readFileSync(path.join(SRC, file), 'utf8'));
  } catch (err) {
    fail(file, err.message);
    return null;
  }
}

const breadFiles = fs.readdirSync(SRC)
  .filter(f => f.endsWith('.yaml') && !f.startsWith('_'))
  .sort();

if (!breadFiles.length) {
  console.error(`No recipe files found in ${SRC}`);
  process.exit(1);
}

const breads = breadFiles.map(f => ({ file: f, data: load(f) })).filter(b => b.data);
const leavenDoc = load('_leavenings.yaml');
const panDoc = load('_pans.yaml');

/* ── Validate and map ─────────────────────────────────────────────────── */

const need = (file, obj, key) => {
  const value = key.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  if (value === undefined || value === null) fail(file, `missing required field: ${key}`);
  return value;
};

/** Drop undefined so the emitted object stays minimal and stable. */
const compact = obj => Object.fromEntries(
  Object.entries(obj).filter(([, v]) => v !== undefined && v !== null));

function toRecipe({ file, data }) {
  const id = need(file, data, 'id');
  if (id && `${id}.yaml` !== file) {
    fail(file, `id "${id}" does not match the filename (expected ${id}.yaml)`);
  }
  for (const key of ['name', 'short', 'family', 'blurb', 'unit.one', 'unit.many',
    'yeast.instant_pct', 'leavening.default', 'shape.type', 'counts.quick']) {
    need(file, data, key);
  }

  const flours = (data.flours ?? []).map(f => compact({ name: f.name, pct: f.pct }));
  const sum = flours.reduce((s, f) => s + f.pct, 0);
  if (Math.abs(sum - 100) > 0.01) fail(file, `flours must sum to 100%, got ${sum}`);

  const sizes = (data.sizes ?? []).map(s => compact({
    id: s.id, label: s.label, g: s.g,
    length: s.length,                    // rods: shaped length in cm
    fixedDiameter: s.fixed_diameter,     // stretched, not proofed (pizza)
    tinW: s.tin_w, tinH: s.tin_h,        // tinned loaves
    fitToPan: s.fit_to_pan || undefined,
    default: s.default || undefined
  }));
  if (sizes.filter(s => s.default).length !== 1) {
    fail(file, 'exactly one size must be marked `default: true`');
  }

  const sh = data.shape ?? {};
  const shape = compact({
    type: sh.type,
    spread: sh.spread,
    arealDensity: sh.areal_density,
    targetWidth: sh.target_width,
    holeRatio: sh.hole_ratio,
    gap: sh.gap,
    gapWhenSeparate: sh.gap_when_separate
  });
  // Booleans are carried through explicitly; `compact` would drop a false.
  shape.canTouch = sh.can_touch ?? false;
  if (sh.touch_default !== undefined && sh.touch_default !== null) {
    shape.touchDefault = sh.touch_default;
  }

  const bake = data.bake ?? {};
  if (!Array.isArray(bake.stages) || !bake.stages.length) {
    fail(file, 'bake.stages must list at least one timer stage');
  }

  return {
    order: data.order ?? 999,
    notes: data.notes ?? null,
    recipe: compact({
      id,
      name: data.name,
      short: data.short,
      unit: { one: data.unit?.one, many: data.unit?.many },
      family: data.family,
      blurb: data.blurb,
      links: (data.links ?? []).map(l => compact({
        label: l.label, source: l.source, url: l.url, video: l.video || undefined
      })),
      flours,
      liquids: (data.liquids ?? []).map(l => compact({
        name: l.name, pct: l.pct, water: l.water
      })),
      others: (data.others ?? []).map(o => compact({
        name: o.name, pct: o.pct, kind: o.kind, water: o.water
      })),
      yeastPct: data.yeast?.instant_pct,
      defaultLeaven: data.leavening?.default,
      preferment: data.leavening?.prefermented_flour ?? {},
      shape,
      sizes,
      quickCounts: data.counts?.quick ?? [],
      defaultCount: data.counts?.default,
      schedule: data.schedule ?? {},
      bake: compact({
        temp: bake.temp, time: bake.time,
        stages: (bake.stages ?? []).map(s => ({ label: s.label, min: s.min })),
        steam: bake.steam, internal: bake.internal, minutes: bake.minutes
      })
    })
  };
}

const entries = breads.map(toRecipe).sort((a, b) => a.order - b.order || 0);

const seen = new Set();
for (const e of entries) {
  if (seen.has(e.recipe.id)) fail('recipes/', `duplicate recipe id "${e.recipe.id}"`);
  seen.add(e.recipe.id);
}

const leavenings = (leavenDoc?.leavenings ?? []).map(l => compact({
  id: l.id, name: l.name, shortName: l.short_name, tag: l.tag, accent: l.accent,
  desc: l.desc, kind: l.kind,
  hydration: l.hydration, seedRatio: l.seed_ratio,
  prefermentYeastPct: l.preferment_yeast_pct, buildMinutes: l.build_minutes,
  yeastFactor: l.yeast_factor, fermentFactor: l.ferment_factor,
  pffRange: l.pff_range, pffLabel: l.pff_label, hint: l.hint
}));
if (!leavenings.length) fail('_leavenings.yaml', 'no leavenings defined');

const pans = (panDoc?.pans ?? []).map(p => compact({
  id: p.id, name: p.name, w: p.w, h: p.h, d: p.d, type: p.type,
  default: p.default || undefined, custom: p.custom || undefined
}));
if (!pans.length) fail('_pans.yaml', 'no pans defined');
const edgeMargin = panDoc?.edge_margin;
if (typeof edgeMargin !== 'number') fail('_pans.yaml', 'edge_margin must be a number');

/* Cross-reference: a recipe cannot default to a leavening that does not exist. */
const leavenIds = new Set(leavenings.map(l => l.id));
for (const e of entries) {
  if (!leavenIds.has(e.recipe.defaultLeaven)) {
    fail(`${e.recipe.id}.yaml`, `unknown leavening "${e.recipe.defaultLeaven}"`);
  }
  for (const l of leavenings.filter(x => x.kind === 'preferment')) {
    if (typeof e.recipe.preferment[l.id] !== 'number') {
      fail(`${e.recipe.id}.yaml`, `leavening.prefermented_flour is missing "${l.id}"`);
    }
  }
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n`);
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  process.exit(1);
}

/* ── Emit ─────────────────────────────────────────────────────────────── */

/** Deterministic JS literal. Objects stay on one line until they get long. */
function js(value, indent = 0) {
  const pad = ' '.repeat(indent);
  if (value === null) return 'null';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'string') return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

  if (Array.isArray(value)) {
    if (!value.length) return '[]';
    const flat = `[${value.map(v => js(v, 0)).join(', ')}]`;
    if (flat.length + indent <= 78 && !flat.includes('\n')) return flat;
    return `[\n${value.map(v => `${pad}  ${js(v, indent + 2)}`).join(',\n')}\n${pad}]`;
  }

  const parts = Object.entries(value).map(([k, v]) => `${key(k)}: ${js(v, indent + 2)}`);
  const flat = `{ ${parts.join(', ')} }`;
  if (flat.length + indent <= 78 && !flat.includes('\n')) return flat;
  const deep = Object.entries(value)
    .map(([k, v]) => `${pad}  ${key(k)}: ${js(v, indent + 2)}`);
  return `{\n${deep.join(',\n')}\n${pad}}`;
}

const key = k => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : `'${k}'`);

const banner = `/* GENERATED FILE — DO NOT EDIT.
 *
 * Built from recipes/*.yaml by tools/build-recipes.mjs.
 * Edit the YAML and run: npm run build
 *
 * Why generate: the app ships zero runtime dependencies and makes no network
 * requests, so it cannot parse YAML in the browser or fetch JSON at runtime.
 * The YAML is the human-facing source of truth; this is the machine-facing
 * artifact the browser loads. \`npm test\` fails if they drift apart.
 *
 * Percentages throughout are baker's percentages: every ingredient is a share
 * of total flour, so the flours always add up to 100.
 */`;

const lines = [banner, ''];

lines.push('const RECIPES = [');
entries.forEach((e, i) => {
  lines.push(`  /* ── ${i + 1}. ${e.recipe.name} ─${'─'.repeat(Math.max(0, 46 - e.recipe.name.length))} */`);
  if (e.notes) {
    lines.push('  /*');
    for (const line of String(e.notes).trimEnd().split('\n')) {
      lines.push(`   * ${line}`.trimEnd());
    }
    lines.push('   */');
  }
  lines.push(`  ${js(e.recipe, 2)}${i === entries.length - 1 ? '' : ','}`);
  lines.push('');
});
lines.push('];');
lines.push('');

lines.push('/* Leavening options offered for every bread. `yeastFactor` converts from the');
lines.push(' * recipe\'s instant-yeast baseline; `fermentFactor` scales bulk and proof. */');
lines.push(`const LEAVENS = ${js(leavenings, 0)};`);
lines.push('');

lines.push('/* Pans offered in the pan-fit card. Dimensions in centimetres. */');
lines.push(`const PANS = ${js(pans, 0)};`);
lines.push('');
lines.push('/* Clearance kept at every pan edge, because sheet pans have sloped sides. */');
lines.push(`const EDGE_MARGIN = ${edgeMargin};`);
lines.push('');

const output = lines.join('\n');
const existing = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;

if (checkOnly) {
  if (existing !== output) {
    console.error('js/recipes.js is out of date with recipes/*.yaml.');
    console.error('Run: npm run build');
    process.exit(1);
  }
  console.log(`js/recipes.js is up to date (${entries.length} recipes).`);
  process.exit(0);
}

fs.writeFileSync(OUT, output, 'utf8');
console.log(
  `Built js/recipes.js from ${entries.length} recipes, ` +
  `${leavenings.length} leavenings, ${pans.length} pans.`);
