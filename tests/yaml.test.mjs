/* The YAML subset reader.
 *
 * This is hand-written rather than a dependency, so it carries the burden of
 * proof. The important half of these tests is the rejection cases: the parser
 * must fail loudly on anything outside the documented subset rather than
 * guessing, because a silently mis-parsed recipe is a wrong formula.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, stringify, YamlError } from '../tools/yaml.mjs';

test('scalars', () => {
  assert.deepEqual(parse('a: hello'), { a: 'hello' });
  assert.deepEqual(parse('a: 42'), { a: 42 });
  assert.deepEqual(parse('a: 1.5'), { a: 1.5 });
  assert.deepEqual(parse('a: -0.25'), { a: -0.25 });
  assert.deepEqual(parse('a: true'), { a: true });
  assert.deepEqual(parse('a: false'), { a: false });
  assert.deepEqual(parse('a: null'), { a: null });
  assert.deepEqual(parse('a: ~'), { a: null });
  assert.deepEqual(parse('a:'), { a: null });
});

test('quoted scalars keep their type and content', () => {
  assert.deepEqual(parse(`a: '42'`), { a: '42' });
  assert.deepEqual(parse(`a: "42"`), { a: '42' });
  assert.deepEqual(parse(`a: 'it''s'`), { a: "it's" });
  assert.deepEqual(parse(`a: "line\\nbreak"`), { a: 'line\nbreak' });
  assert.deepEqual(parse(`a: 'true'`), { a: 'true' });
});

test('values may contain colons, so long as the first one delimits the key', () => {
  assert.deepEqual(parse('url: https://example.com/x'), { url: 'https://example.com/x' });
  assert.deepEqual(parse('temp: 245°C covered, then 220°C open'),
    { temp: '245°C covered, then 220°C open' });
});

test('unicode survives', () => {
  assert.deepEqual(parse('a: 96–99°C · bâtard'), { a: '96–99°C · bâtard' });
});

test('comments', () => {
  assert.deepEqual(parse('# lead\na: 1 # trailing\n# tail'), { a: 1 });
  assert.deepEqual(parse(`a: 'has # inside'`), { a: 'has # inside' });
  assert.deepEqual(parse('a: sharp#nospace'), { a: 'sharp#nospace' });
});

test('nested maps', () => {
  assert.deepEqual(parse(['a:', '  b:', '    c: 1', '  d: 2', 'e: 3'].join('\n')),
    { a: { b: { c: 1 }, d: 2 }, e: 3 });
});

test('sequences of scalars', () => {
  assert.deepEqual(parse(['a:', '  - 1', '  - two', '  - true'].join('\n')),
    { a: [1, 'two', true] });
});

test('flow sequences', () => {
  assert.deepEqual(parse('a: [1, 2, 3]'), { a: [1, 2, 3] });
  assert.deepEqual(parse('a: []'), { a: [] });
  assert.deepEqual(parse('a: [one, two]'), { a: ['one', 'two'] });
});

test('sequences of maps', () => {
  assert.deepEqual(
    parse(['items:', '  - name: a', '    pct: 1', '  - name: b', '    pct: 2'].join('\n')),
    { items: [{ name: 'a', pct: 1 }, { name: 'b', pct: 2 }] });
});

test('sequences of maps with nested blocks', () => {
  assert.deepEqual(
    parse(['items:', '  - name: a', '    deep:', '      x: 1', '  - name: b'].join('\n')),
    { items: [{ name: 'a', deep: { x: 1 } }, { name: 'b' }] });
});

test('block scalars', () => {
  assert.deepEqual(parse(['a: |', '  one', '  two'].join('\n')), { a: 'one\ntwo' });
  assert.deepEqual(parse(['a: >', '  one', '  two'].join('\n')), { a: 'one two' });
  assert.deepEqual(parse(['a: >', '  one', '  two', 'b: 1'].join('\n')), { a: 'one two', b: 1 });
});

/* ── Rejections: the part that matters ──────────────────────────────────── */

const REJECTS = [
  ['tabs for indentation', 'a:\n\tb: 1'],
  ['anchors', 'a: &anchor 1'],
  ['aliases', 'a: *anchor'],
  ['tags', 'a: !!str 1'],
  ['multiple documents', 'a: 1\n---\nb: 2'],
  ['duplicate keys', 'a: 1\na: 2'],
  ['unterminated single quote', `a: 'oops`],
  ['unterminated double quote', 'a: "oops'],
  ['unterminated flow sequence', 'a: [1, 2'],
  ['nested flow collections', 'a: [[1], [2]]'],
  ['a line that is not a pair', 'just a bare line'],
  ['a sequence item with no value', 'a:\n  -'],
  ['inconsistent indentation', 'a: 1\n   b: 2']
];

for (const [what, text] of REJECTS) {
  test(`rejects ${what}`, () => {
    assert.throws(() => parse(text), YamlError, `should have rejected: ${JSON.stringify(text)}`);
  });
}

/* ── Round trip ─────────────────────────────────────────────────────────── */

test('stringify then parse returns the same data', () => {
  const original = {
    id: 'boule',
    name: "Baker's boule",
    family: 'Lean · rustic',
    ratio: 76.8,
    enabled: true,
    missing: null,
    counts: [1, 2, 3],
    empty: [],
    nested: { a: { b: 'deep' } },
    items: [
      { name: 'Bread flour', pct: 85, water: 1 },
      { name: 'Whole wheat', pct: 15 }
    ],
    tricky: {
      colon: 'a: b',
      hash: 'x # y',
      numeric: '42',
      quoted: "it's",
      leading: '  padded  ',
      unicode: '96–99°C'
    }
  };
  assert.deepEqual(parse(stringify(original)), original);
});

test('stringify quotes anything that would otherwise change meaning', () => {
  const round = v => parse(stringify({ v })).v;
  for (const value of ['42', 'true', 'false', 'null', '~', '- dash', '#hash', 'a: b', '', 'yes ']) {
    assert.equal(round(value), value, `mangled: ${JSON.stringify(value)}`);
  }
});
