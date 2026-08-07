/* The generated file must match its source.
 *
 * `js/recipes.js` is generated from `recipes/*.yaml` and committed, because the
 * browser loads it directly. That means it can drift — someone edits the JS by
 * hand, or edits the YAML and forgets to rebuild. Either way the app and its
 * source of truth quietly disagree.
 *
 * This test is the thing that stops that happening.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, RECIPES } from './harness.mjs';
import { parse } from '../tools/yaml.mjs';

test('js/recipes.js is up to date with recipes/*.yaml', () => {
  try {
    execFileSync(process.execPath, [path.join(ROOT, 'tools', 'build-recipes.mjs'), '--check'], {
      cwd: ROOT, stdio: 'pipe'
    });
  } catch (err) {
    const detail = `${err.stdout ?? ''}${err.stderr ?? ''}`.trim();
    assert.fail(
      'js/recipes.js does not match recipes/*.yaml. Run `npm run build`.\n' + detail);
  }
});

test('js/recipes.js is marked as generated', () => {
  const head = fs.readFileSync(path.join(ROOT, 'js', 'recipes.js'), 'utf8').slice(0, 400);
  assert.match(head, /GENERATED FILE/, 'the banner warning people not to edit it is missing');
  assert.match(head, /recipes\/\*\.yaml/, 'the banner should say where it comes from');
});

test('every bread in the app has a YAML file, and vice versa', () => {
  const dir = path.join(ROOT, 'recipes');
  const fromYaml = fs.readdirSync(dir)
    .filter(f => f.endsWith('.yaml') && !f.startsWith('_'))
    .map(f => f.replace(/\.yaml$/, ''))
    .sort();
  // Array.from: RECIPES comes from the vm sandbox, so arrays derived from it
  // carry that realm's Array prototype and strict deepEqual refuses them.
  const fromApp = Array.from(RECIPES, r => r.id).sort();
  assert.deepEqual(fromApp, fromYaml);
});

test('each recipe file is named after the id it declares', () => {
  const dir = path.join(ROOT, 'recipes');
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.yaml') && !f.startsWith('_'))) {
    const doc = parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    assert.equal(`${doc.id}.yaml`, file, `${file} declares id "${doc.id}"`);
  }
});

test('recipe order is explicit and unique, so the rail order is not accidental', () => {
  const dir = path.join(ROOT, 'recipes');
  const orders = fs.readdirSync(dir)
    .filter(f => f.endsWith('.yaml') && !f.startsWith('_'))
    .map(f => {
      const doc = parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      assert.equal(typeof doc.order, 'number', `${f} has no numeric \`order\``);
      return doc.order;
    });
  assert.equal(new Set(orders).size, orders.length, 'two recipes share the same `order`');
});

test('the app shows breads in the order the YAML asks for', () => {
  const dir = path.join(ROOT, 'recipes');
  const wanted = fs.readdirSync(dir)
    .filter(f => f.endsWith('.yaml') && !f.startsWith('_'))
    .map(f => parse(fs.readFileSync(path.join(dir, f), 'utf8')))
    .sort((a, b) => a.order - b.order)
    .map(d => d.id);
  assert.deepEqual(Array.from(RECIPES, r => r.id), wanted);
});

test('recipe files carry no tab characters', () => {
  const dir = path.join(ROOT, 'recipes');
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.yaml'))) {
    const text = fs.readFileSync(path.join(dir, file), 'utf8');
    assert.ok(!text.includes('\t'), `${file} contains a tab; YAML indentation must be spaces`);
  }
});
