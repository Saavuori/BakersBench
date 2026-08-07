#!/usr/bin/env node
/* Verifies every recipe citation.
 *
 * Format checks always run and are fatal — a malformed URL is our bug.
 * Reachability checks only run with --network, and are advisory by default:
 * recipe sites rate-limit and go down, and that is not a reason to fail a build
 * on an unrelated pull request. Use --strict when you want it to be.
 *
 *   node tools/check-links.mjs
 *   node tools/check-links.mjs --network
 *   node tools/check-links.mjs --network --strict
 */

import { RECIPES } from '../tests/harness.mjs';

const args = new Set(process.argv.slice(2));
const useNetwork = args.has('--network');
const strict = args.has('--strict');

const links = RECIPES.flatMap(r => (r.links ?? []).map(l => ({ ...l, recipe: r.id })));

let formatErrors = 0;
const seen = new Map();

for (const link of links) {
  const where = `${link.recipe} → "${link.label}"`;
  let url;
  try {
    url = new URL(link.url);
  } catch {
    console.error(`  FAIL ${where}: not a URL (${link.url})`);
    formatErrors++;
    continue;
  }
  if (url.protocol !== 'https:') {
    console.error(`  FAIL ${where}: must be https (${link.url})`);
    formatErrors++;
  }
  if (!link.label?.trim() || !link.source?.trim()) {
    console.error(`  FAIL ${where}: needs both a label and a source`);
    formatErrors++;
  }
  const dupe = seen.get(link.url);
  if (dupe && dupe !== link.recipe) {
    console.log(`  note ${where}: same URL also cited by ${dupe}`);
  }
  seen.set(link.url, link.recipe);
}

console.log(`Checked ${links.length} citations across ${RECIPES.length} recipes.`);
if (formatErrors) {
  console.error(`${formatErrors} malformed citation(s).`);
  process.exit(1);
}
console.log('All citations are well-formed.');

if (!useNetwork) {
  console.log('Skipping reachability (pass --network to check it).');
  process.exit(0);
}

const UA = 'Mozilla/5.0 (compatible; BakersBenchLinkCheck/1.0; +https://github.com/Saavuori/BakersBench)';
let unreachable = 0;

for (const [url, recipe] of seen) {
  let status = 0;
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'user-agent': UA },
      signal: AbortSignal.timeout(20000)
    });
    status = res.status;
  } catch (err) {
    console.warn(`  WARN ${recipe}: ${url} — ${err.message}`);
    unreachable++;
    continue;
  }
  if (status >= 400) {
    console.warn(`  WARN ${recipe}: ${url} — HTTP ${status}`);
    unreachable++;
  } else {
    console.log(`  ok   ${status} ${url}`);
  }
}

if (unreachable) {
  console.warn(`${unreachable} citation(s) did not respond cleanly.`);
  if (strict) process.exit(1);
  console.warn('Advisory only — re-run with --strict to fail on this.');
}
