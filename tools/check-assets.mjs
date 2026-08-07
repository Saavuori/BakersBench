#!/usr/bin/env node
/* Confirms index.html and every file it references agree with each other.
 *
 * The app has no bundler, so nothing would otherwise notice a renamed script or
 * an element id that the JavaScript still reaches for. This is the check a
 * build step would have given us for free.
 */

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

const html = read('index.html');
let failures = 0;
const fail = msg => { console.error(`  FAIL ${msg}`); failures++; };

/* ── 1. Referenced files exist ──────────────────────────────────────────── */
const refs = [
  ...html.matchAll(/<script[^>]+src="([^"]+)"/g),
  ...html.matchAll(/<link[^>]+href="([^"]+)"/g)
].map(m => m[1]).filter(src => !/^https?:/.test(src));

for (const ref of refs) {
  const clean = ref.split('?')[0];
  if (fs.existsSync(path.join(ROOT, clean))) console.log(`  ok   ${clean}`);
  else fail(`index.html references ${clean}, which does not exist`);
}

/* ── 2. Every js/ file is actually loaded ───────────────────────────────── */
for (const file of fs.readdirSync(path.join(ROOT, 'js'))) {
  if (!file.endsWith('.js')) continue;
  if (!refs.some(r => r.includes(file))) fail(`js/${file} is never loaded by index.html`);
}

/* ── 3. Every getElementById target exists in the markup ────────────────── */
const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
const scripts = refs.filter(r => r.endsWith('.js')).map(r => r.split('?')[0]);

for (const script of scripts) {
  const code = read(script);
  const wanted = new Set([
    ...[...code.matchAll(/getElementById\(\s*'([^']+)'\s*\)/g)].map(m => m[1]),
    // The app's own `$('x')` and `el('x')` helpers.
    ...[...code.matchAll(/(?:^|[^\w.])(?:\$|el)\(\s*'([^']+)'\s*\)/g)].map(m => m[1])
  ]);
  for (const id of wanted) {
    if (!ids.has(id)) fail(`${script} looks up #${id}, which is not in index.html`);
  }
}

/* ── 4. CSS custom properties used by JS are defined ────────────────────── */
const css = read('styles.css');
const declared = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]));
for (const script of scripts) {
  for (const m of read(script).matchAll(/var\((--[\w-]+)\)/g)) {
    if (!declared.has(m[1])) fail(`${script} uses ${m[1]}, which styles.css never defines`);
  }
}

console.log(
  failures
    ? `\n${failures} problem(s) found.`
    : `\nindex.html, ${scripts.length} scripts and styles.css all agree.`
);
process.exit(failures ? 1 : 0);
