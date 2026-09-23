/* A deliberately small YAML reader and writer.
 *
 * WHY NOT js-yaml: this project ships zero dependencies, and the recipe files
 * are ours — a documented subset is enough. The parser is therefore STRICT: it
 * throws on anything it does not understand rather than guessing. A loud error
 * on an unsupported construct is far safer than a silently mis-parsed recipe,
 * because a wrong number here means wasted flour.
 *
 * SUPPORTED
 *   # comments, whole-line or trailing
 *   key: value
 *   key:            (nested block on the following, more-indented lines)
 *   - item          (sequences, including sequences of maps)
 *   key: [1, 2, 3]  (flow sequences of scalars)
 *   key: |          (literal block scalar — newlines kept)
 *   key: >          (folded block scalar — newlines become spaces, a blank
 *                    line becomes a newline)
 *   Block scalar bodies are taken verbatim: a # or a quote in them is text.
 *   The trailing newline is never kept, so | and |- read the same.
 *   scalars: plain, 'single', "double", 123, 1.5, true, false, null, ~
 *
 * NOT SUPPORTED (throws)
 *   anchors & aliases, tags, multiple documents, flow maps, tabs for indent,
 *   complex keys, multi-line plain scalars
 */

const NUMBER = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][-+]?\d+)?$/;

class YamlError extends Error {
  constructor(message, line) {
    super(line ? `${message} (line ${line})` : message);
    this.name = 'YamlError';
    this.line = line;
  }
}

/* ── Scalars ──────────────────────────────────────────────────────────── */

function unquote(raw, lineNo) {
  const quote = raw[0];
  if (raw.length < 2 || raw.at(-1) !== quote) {
    throw new YamlError(`unterminated ${quote === '"' ? 'double' : 'single'} quote`, lineNo);
  }
  const body = raw.slice(1, -1);
  if (quote === "'") return body.replace(/''/g, "'");
  return body.replace(/\\(["\\/nrt])/g, (_, c) =>
    ({ '"': '"', '\\': '\\', '/': '/', n: '\n', r: '\r', t: '\t' }[c]));
}

function scalar(raw, lineNo) {
  const text = raw.trim();
  if (text === '' || text === '~' || text === 'null') return null;
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (text[0] === '"' || text[0] === "'") return unquote(text, lineNo);
  if (text[0] === '&' || text[0] === '*' || text[0] === '!') {
    throw new YamlError(`anchors, aliases and tags are not supported: ${text}`, lineNo);
  }
  if (NUMBER.test(text)) return Number(text);
  return text;
}

/** Flow sequence: [a, b, c]. Scalars only — no nested flow collections. */
function flowSequence(raw, lineNo) {
  const inner = raw.slice(1, -1).trim();
  if (inner === '') return [];
  if (inner.includes('[') || inner.includes('{')) {
    throw new YamlError('nested flow collections are not supported', lineNo);
  }
  return inner.split(',').map(part => scalar(part, lineNo));
}

/* Strip a trailing comment, leaving quoted content alone.
 *
 * A quote only opens a quoted scalar when it starts one — otherwise the
 * apostrophe in a plain scalar like `Baker's boule` would look like an
 * unterminated string. */
function stripComment(line, lineNo) {
  const opensScalar = i => i === 0 || /[\s:\-[,]/.test(line[i - 1]);
  let quote = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      // '' is an escaped apostrophe inside a single-quoted scalar.
      if (c === quote) {
        if (quote === "'" && line[i + 1] === "'") { i++; continue; }
        quote = null;
      } else if (c === '\\' && quote === '"') {
        i++;
      }
    } else if ((c === '"' || c === "'") && opensScalar(i)) {
      quote = c;
    } else if (c === '#' && (i === 0 || /\s/.test(line[i - 1]))) {
      return line.slice(0, i).trimEnd();
    }
  }
  if (quote) throw new YamlError('unterminated quote', lineNo);
  return line.trimEnd();
}

/* ── Parser ───────────────────────────────────────────────────────────── */

export function parse(text) {
  if (text.includes('\n---')) throw new YamlError('multiple documents are not supported');

  const raw = text.split(/\r?\n/);
  const lines = [];
  const noTabs = i => {
    if (/^\s*\t/.test(raw[i])) throw new YamlError('tabs cannot be used for indentation', i + 1);
  };
  for (let i = 0; i < raw.length; i++) {
    noTabs(i);
    const stripped = stripComment(raw[i], i + 1);
    if (stripped.trim() === '' || stripped.trim() === '---') continue;
    const line = { indent: stripped.match(/^ */)[0].length, text: stripped.trim(), lineNo: i + 1 };
    lines.push(line);

    /* A block scalar's body is prose, not YAML. Take it raw, before comment
       stripping, so "tin #2" keeps its "#2", an apostrophe cannot open a
       quote, and the blank lines between paragraphs survive. */
    if (/^(?:- )?[^:]+:\s+[|>]-?$/.test(line.text)) {
      const keyIndent = line.indent + (line.text.startsWith('- ') ? 2 : 0);
      const body = [];
      while (i + 1 < raw.length &&
             (raw[i + 1].trim() === '' || raw[i + 1].match(/^ */)[0].length > keyIndent)) {
        i++;
        noTabs(i);
        body.push(raw[i]);
      }
      line.block = body;
    }
  }

  if (!lines.length) return {};
  const [value, next] = parseBlock(lines, 0, lines[0].indent);
  if (next < lines.length) throw new YamlError('unexpected content', lines[next].lineNo);
  return value;
}

function parseBlock(lines, i, indent) {
  return lines[i].text.startsWith('- ') || lines[i].text === '-'
    ? parseSequence(lines, i, indent)
    : parseMap(lines, i, indent);
}

function parseMap(lines, i, indent) {
  const out = {};
  while (i < lines.length && lines[i].indent >= indent) {
    const line = lines[i];
    if (line.indent > indent) throw new YamlError('unexpected indentation', line.lineNo);
    if (line.text.startsWith('- ')) throw new YamlError('unexpected sequence item', line.lineNo);

    const split = line.text.match(/^([^:]+):(?:\s+(.*))?$/);
    if (!split) throw new YamlError(`expected "key: value", got: ${line.text}`, line.lineNo);

    const key = split[1].trim();
    const rest = (split[2] ?? '').trim();
    if (key in out) throw new YamlError(`duplicate key "${key}"`, line.lineNo);

    if (rest === '|' || rest === '>' || rest === '|-' || rest === '>-') {
      out[key] = blockScalar(line.block ?? [], rest, line.lineNo);
      i++;
    } else if (rest === '') {
      // Either a nested block, or an explicitly empty value.
      if (i + 1 < lines.length && lines[i + 1].indent > indent) {
        const [value, next] = parseBlock(lines, i + 1, lines[i + 1].indent);
        out[key] = value;
        i = next;
      } else {
        out[key] = null;
        i++;
      }
    } else if (rest.startsWith('[')) {
      if (!rest.endsWith(']')) throw new YamlError('unterminated flow sequence', line.lineNo);
      out[key] = flowSequence(rest, line.lineNo);
      i++;
    } else {
      out[key] = scalar(rest, line.lineNo);
      i++;
    }
  }
  return [out, i];
}

function parseSequence(lines, i, indent) {
  const out = [];
  while (i < lines.length && lines[i].indent >= indent) {
    const line = lines[i];
    if (line.indent > indent) throw new YamlError('unexpected indentation', line.lineNo);
    if (!line.text.startsWith('- ') && line.text !== '-') {
      throw new YamlError(`expected a sequence item, got: ${line.text}`, line.lineNo);
    }

    const rest = line.text === '-' ? '' : line.text.slice(2).trim();

    if (rest === '') {
      if (i + 1 >= lines.length || lines[i + 1].indent <= indent) {
        throw new YamlError('sequence item has no value', line.lineNo);
      }
      const [value, next] = parseBlock(lines, i + 1, lines[i + 1].indent);
      out.push(value);
      i = next;
      continue;
    }

    if (rest.startsWith('[')) {
      out.push(flowSequence(rest, line.lineNo));
      i++;
      continue;
    }

    // "- key: value" opens a map whose remaining keys are indented to line up
    // with the text after the dash.
    if (/^[^:]+:(\s|$)/.test(rest)) {
      const inner = indent + 2;
      const synthetic = [{ ...line, indent: inner, text: rest }];
      let j = i + 1;
      while (j < lines.length && lines[j].indent > indent) { synthetic.push(lines[j]); j++; }
      const [value, consumed] = parseMap(synthetic, 0, inner);
      if (consumed !== synthetic.length) {
        throw new YamlError('could not parse sequence item', line.lineNo);
      }
      out.push(value);
      i = j;
      continue;
    }

    out.push(scalar(rest, line.lineNo));
    i++;
  }
  return [out, i];
}

function blockScalar(body, style, lineNo) {
  const rows = [...body];
  while (rows.length && rows.at(-1).trim() === '') rows.pop();
  if (!rows.length) return '';

  /* The first line sets the indentation; deeper lines keep their extra. */
  const indent = rows.find(r => r.trim() !== '').match(/^ */)[0].length;
  const text = rows.map((r, n) => {
    if (r.trim() === '') return '';
    if (r.match(/^ */)[0].length < indent) {
      throw new YamlError('block scalar line is indented less than its first line', lineNo + n + 1);
    }
    return r.slice(indent).trimEnd();
  });

  if (style.startsWith('|')) return text.join('\n');
  let out = '';
  for (const r of text) {
    if (r === '') out += '\n';
    else out += (out && !out.endsWith('\n') ? ' ' : '') + r;
  }
  return out;
}

/* ── Writer ───────────────────────────────────────────────────────────── */

const NEEDS_QUOTES = /^\s|\s$|^[-?:,[\]{}#&*!|>'"%@`]|:\s|\s#|^$|^(true|false|null|~)$/i;

function writeScalar(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  const text = String(value);
  if (NEEDS_QUOTES.test(text) || NUMBER.test(text)) {
    return `'${text.replace(/'/g, "''")}'`;
  }
  return text;
}

const isScalar = v => v === null || typeof v !== 'object';

/** Serialise a plain object to the same subset `parse` accepts. */
export function stringify(value, indent = 0) {
  const pad = ' '.repeat(indent);
  const out = [];

  if (Array.isArray(value)) {
    if (!value.length) return `${pad}[]`;
    for (const item of value) {
      if (isScalar(item)) {
        out.push(`${pad}- ${writeScalar(item)}`);
      } else {
        const block = stringify(item, indent + 2);
        out.push(`${pad}- ${block.slice(indent + 2)}`);
      }
    }
    return out.join('\n');
  }

  for (const [key, item] of Object.entries(value)) {
    if (item === undefined) continue;
    if (isScalar(item)) {
      out.push(`${pad}${key}: ${writeScalar(item)}`);
    } else if (Array.isArray(item) && item.every(isScalar) && item.length) {
      out.push(`${pad}${key}: [${item.map(writeScalar).join(', ')}]`);
    } else if (Array.isArray(item) && !item.length) {
      out.push(`${pad}${key}: []`);
    } else {
      out.push(`${pad}${key}:`);
      out.push(stringify(item, indent + 2));
    }
  }
  return out.join('\n');
}

export { YamlError };
