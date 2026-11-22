// Writes the docstrings of the Python layer from the TSDoc comments of the TypeScript API (#29):
// one description of every function, written once in packages/ts/src, converted by the fixed
// rules of the Python layer (packages/python/src/symcrys/_convert.py): names camelCase →
// snake_case, an options object → keyword-only arguments, RangeError → SymcrysError,
// undefined/true/false → None/True/False. What exists only in Python (shapes and dtypes of the
// NumPy arrays) is added from packages/python/docstrings.json, the only hand-written part.
//
// Reads TypeDoc's JSON output (build/typedoc.json, `npm run docs:json`). Rewrites the docstring of
// every function and documented constant in symcrys/__init__.py (crystallographic API, index.ts)
// symcrys/magnetic.py (magnetic API, magnetic.ts) and symcrys/plane.py (plane API, plane.ts). With --check it changes nothing and fails
// if a docstring is missing or stale, or if a TSDoc comment converts to text that still holds a
// TypeScript name.
//
//   node scripts/python-docstrings.mjs [--check]

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');

const project = JSON.parse(readFileSync(path.join(root, 'build/typedoc.json'), 'utf8'));
const extras = JSON.parse(readFileSync(path.join(root, 'packages/python/docstrings.json'), 'utf8'));

const MODULES = [
  { ts: 'index', py: 'packages/python/src/symcrys/__init__.py', extras: extras.symcrys ?? {} },
  { ts: 'magnetic', py: 'packages/python/src/symcrys/magnetic.py', extras: extras['symcrys.magnetic'] ?? {} },
  { ts: 'plane', py: 'packages/python/src/symcrys/plane.py', extras: extras['symcrys.plane'] ?? {} },
];
const KIND = { variable: 32, function: 64, interface: 256, typeAlias: 2097152, reference: 4194304 };
const WIDTH = 100;

/** @typedef {any} Json A node of TypeDoc's JSON output. */
/** @typedef {{ ts: string, py: string, extras: Record<string, any> }} Module */

const snake = (/** @type {string} */ name) => name.replace(/(?<=[a-z0-9])([A-Z])/g, '_$1').toLowerCase();

// Every declaration by id, to follow a reference from a parameter to its options type.
const byId = new Map();
(function index(node) {
  if (node.id !== undefined) byId.set(node.id, node);
  for (const child of node.children ?? []) index(child);
  for (const sig of node.signatures ?? []) index(sig);
})(project);

/** @type {string[]} */
const problems = [];

// --- text ---------------------------------------------------------------------------------------

/** Converts the inside of a code span from TypeScript to Python. */
/** @param {string} code */
function codeToPython(code) {
  return (
    code
      .replace(/symcrys\/(magnetic|plane)/g, 'symcrys.$1')
      .replace(/\)\.([A-Za-z_]\w*)/g, (_, /** @type {string} */ key) => `)["${snake(key)}"]`)
      // camelCase names outside quoted strings: a string value goes to Python as it is.
      .replace(
        /('[^']*'|"[^"]*")|\b([a-z][a-z0-9]*(?:[A-Z][a-z0-9]*)+)\b/g,
        (/** @type {string} */ m, /** @type {string | undefined} */ quoted, /** @type {string} */ name) =>
          quoted ?? snake(name),
      )
      .replace(/\bundefined\b/g, 'None')
      .replace(/\btrue\b/g, 'True')
      .replace(/\bfalse\b/g, 'False')
      .replace(/\bRangeError\b/g, 'SymcrysError')
  );
}

/** Converts running text: the few TypeScript words that name something else in Python. */
/** @param {string} text */
function textToPython(text) {
  // \s+ also across a line break of the comment, so the phrase is found wherever the comment wraps.
  return text
    .replace(/\bThrows a(\s+)RangeError\b/g, 'Raises$1SymcrysError')
    .replace(/\bthrows a(\s+)RangeError\b/g, 'raises$1SymcrysError')
    .replace(/\bis a(\s+)RangeError\b/g, 'raises$1SymcrysError')
    .replace(/\bRangeError\b/g, 'SymcrysError')
    .replace(/\bReturns undefined\b/g, 'Returns None');
}

/** TypeDoc's comment parts as reStructuredText (double backticks for code). */
/**
 * @param {Json[] | undefined} parts
 * @param {string} where
 */
function render(parts, where) {
  let out = '';
  for (const part of parts ?? []) {
    if (part.kind === 'text') out += textToPython(part.text);
    else if (part.kind === 'code') {
      const inner = part.text.replace(/^`+|`+$/g, '');
      out += '``' + codeToPython(inner) + '``';
    } else if (part.kind === 'inline-tag') out += '``' + codeToPython(part.text) + '``';
    else problems.push(`${where}: unknown comment part ${part.kind}`);
  }
  // A Python string literal: no backslash (an escape), no triple quote (the end of the docstring).
  if (/\\|"""/.test(out)) problems.push(`${where}: backslash or triple quote in the text`);
  // In running text these are TypeScript values; written as code, they are converted.
  if (/\b(true|false|undefined)\b/.test(out.replace(/``[^`]*``/g, ''))) {
    problems.push(`${where}: true, false or undefined outside code`);
  }
  // reStructuredText would read |…| as a substitution.
  if (/\|/.test(out.replace(/``[^`]*``/g, '')))
    problems.push(`${where}: '|' outside code (a substitution in reStructuredText)`);
  // A TypeScript name left in a code span is a conversion this script does not know.
  for (const m of out.matchAll(/``([^`]*)``/g)) {
    if (/\b[a-z][a-z0-9]*[A-Z]\w*/.test(m[1]) || /\.ts\b/.test(m[1])) {
      problems.push(`${where}: TypeScript name left in \`\`${m[1]}\`\``);
    }
  }
  // Paragraphs stay apart; the lines within one are joined.
  return out
    .split(/\n[ \t]*\n/)
    .map((para) =>
      para
        .replace(/\s*\n\s*/g, ' ')
        .replace(/ {2,}/g, ' ')
        .trim(),
    )
    .filter(Boolean)
    .join('\n\n');
}

/** Wraps text of one or more paragraphs (separated by blank lines). */
/**
 * @param {string} text
 * @param {string} indent
 */
function wrapParagraphs(text, indent, first = 0) {
  /** @type {string[]} */
  const lines = [];
  text.split('\n\n').forEach((para, i) => {
    if (i) lines.push('');
    lines.push(...wrap(para, indent, i === 0 ? first : 0));
  });
  return lines;
}

/** Wraps a paragraph to WIDTH at the given indent; the first line has `first` columns less. */
/**
 * @param {string} text
 * @param {string} indent
 */
function wrap(text, indent, first = 0) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const room = WIDTH - indent.length - (lines.length === 0 ? first : 0);
    if (line && line.length + 1 + w.length > room) {
      lines.push(indent + line);
      line = w;
    } else line = line ? `${line} ${w}` : w;
  }
  if (line) lines.push(indent + line);
  return lines;
}

// --- parameters -----------------------------------------------------------------------------------

/** The documented properties of an options type (an interface, or an intersection of them). */
/**
 * @param {Json} type
 * @param {string} where
 * @returns {{ name: string, doc: string }[]}
 */
function optionProperties(type, where) {
  if (!type) return [];
  if (type.type === 'intersection') return type.types.flatMap((/** @type {Json} */ t) => optionProperties(t, where));
  if (type.type === 'reference' && typeof type.target === 'number') {
    const decl = byId.get(type.target);
    if (!decl) return [];
    if (decl.kind === KIND.typeAlias) return optionProperties(decl.type, where);
    if (decl.kind === KIND.interface) {
      const own = (decl.children ?? []).map((/** @type {Json} */ p) => ({
        name: p.name,
        doc: render(p.comment?.summary, `${where}.${p.name}`),
      }));
      const inherited = (decl.extendedTypes ?? []).flatMap((/** @type {Json} */ t) => optionProperties(t, where));
      const names = new Set(own.map((/** @type {{ name: string }} */ p) => p.name));
      return [...inherited.filter((/** @type {{ name: string }} */ p) => !names.has(p.name)), ...own];
    }
  }
  return [];
}

const isOptions = (/** @type {Json} */ param) => param.flags?.isOptional && /Options$/.test(param.type?.name ?? '');

// --- docstrings -----------------------------------------------------------------------------------

/**
 * @param {Json} decl
 * @param {any} extra
 * @param {string} where
 * @param {string} indent
 */
function functionDocstring(decl, extra, where, indent) {
  const sig = decl.signatures[0];
  const summary = render(sig.comment?.summary, where);
  if (!summary) problems.push(`${where}: no TSDoc comment`);
  const params = [];
  for (const p of sig.parameters ?? []) {
    if (isOptions(p)) {
      for (const o of optionProperties(p.type, where)) params.push({ name: snake(o.name), doc: o.doc, keyword: true });
    } else {
      const doc = render(p.comment?.summary, `${where}(${p.name})`);
      if (doc) params.push({ name: snake(p.name), doc });
    }
  }
  const lines = [];
  lines.push(...wrapParagraphs(summary, indent, 3).map((l) => l.slice(indent.length)));
  if (params.length) {
    lines.push('', 'Parameters', '----------');
    for (const p of params) {
      lines.push(p.keyword ? `${p.name} : keyword-only, optional` : p.name);
      if (p.doc) lines.push(...wrapParagraphs(p.doc, indent + '    ').map((l) => l.slice(indent.length)));
    }
  }
  if (extra) {
    if (typeof extra !== 'object' || !extra.type || !extra.doc)
      problems.push(`${where}: docstrings.json needs {type, doc}`);
    lines.push('', 'Returns', '-------', extra.type);
    lines.push(...wrap(extra.doc, indent + '    ').map((l) => l.slice(indent.length)));
  }
  return lines;
}

/**
 * @param {Json} decl
 * @param {any} extra
 * @param {string} where
 */
function variableDocstring(decl, extra, where) {
  const text = render(decl.comment?.summary, where);
  if (!text) problems.push(`${where}: no TSDoc comment`);
  const lines = wrapParagraphs(text, '', 3);
  if (extra) lines.push('', ...wrap(extra, ''));
  return lines;
}

/** A docstring as source lines at the given indent, in triple double quotes. */
/**
 * @param {string[]} lines
 * @param {string} indent
 */
function quote(lines, indent) {
  const body = lines.map((/** @type {string} */ l) => (l ? indent + l : ''));
  if (body.length === 1 && body[0].length + 6 <= WIDTH) return [`${indent}"""${lines[0]}"""`];
  return [`${indent}"""${lines[0]}`, ...body.slice(1), `${indent}"""`];
}

// --- the Python sources -----------------------------------------------------------------------------

/** End (exclusive) of the docstring or statement starting at line i, or i if none is there. */
/**
 * @param {string[]} src
 * @param {number} i
 */
function docstringEnd(src, i) {
  const line = src[i]?.trim() ?? '';
  if (/^([rRuU]+"""|''')/.test(line)) throw new Error(`line ${i + 1}: write a docstring as plain """…"""`);
  if (!line.startsWith('"""')) return i;
  if (line.length > 3 && line.endsWith('"""') && line !== '"""') return i + 1;
  let j = i + 1;
  while (j < src.length && !src[j].trim().endsWith('"""')) j++;
  return j + 1;
}

/** Index of the line after a statement that starts at line i (brackets balanced). */
/**
 * @param {string[]} src
 * @param {number} i
 */
function statementEnd(src, i) {
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    for (const ch of src[j].replace(/#.*$/, '').replace(/"[^"]*"|'[^']*'/g, '')) {
      if ('([{'.includes(ch)) depth++;
      if (')]}'.includes(ch)) depth--;
    }
    if (depth <= 0 && !src[j].trimEnd().endsWith('\\')) return j + 1;
  }
  throw new Error(`unbalanced statement at line ${i + 1}`);
}

/** @param {Module} module */
function update(module) {
  const file = path.join(root, module.py);
  const original = readFileSync(file, 'utf8');
  const src = original.split('\n');
  const tsModule = project.children.find((/** @type {Json} */ m) => m.name === module.ts);
  const stale = [];
  const extrasUsed = new Set();

  for (const child of tsModule.children) {
    // An export that the other entry point exports too is a reference to the same declaration.
    const decl = child.kind === KIND.reference ? { ...byId.get(child.target), name: child.name } : child;
    const where = `${module.ts}.${decl.name}`;
    if (decl.kind === KIND.function) {
      const py = snake(decl.name);
      const extra = module.extras[py];
      if (extra) extrasUsed.add(py);
      const def = src.findIndex((l) => l.startsWith(`def ${py}(`));
      if (def < 0) {
        problems.push(`${where}: no function ${py} in ${module.py}`);
        continue;
      }
      // The body starts after the line on which the signature closes (brackets balanced).
      const body = statementEnd(src, def);
      const want = quote(functionDocstring(decl, extra, where, '    '), '    ');
      const end = docstringEnd(src, body);
      if (src.slice(body, end).join('\n') !== want.join('\n')) stale.push(py);
      src.splice(body, end - body, ...want);
    } else if (decl.kind === KIND.variable) {
      const extra = module.extras[decl.name];
      if (extra) extrasUsed.add(decl.name);
      const at = src.findIndex((l) => l.startsWith(`${decl.name}:`) || l.startsWith(`${decl.name} =`));
      if (at < 0) {
        problems.push(`${where}: no constant ${decl.name} in ${module.py}`);
        continue;
      }
      const after = statementEnd(src, at);
      const want = quote(variableDocstring(decl, extra, where), '');
      const end = docstringEnd(src, after);
      if (src.slice(after, end).join('\n') !== want.join('\n')) stale.push(decl.name);
      src.splice(after, end - after, ...want);
    }
  }
  for (const name of Object.keys(module.extras)) {
    if (!extrasUsed.has(name))
      problems.push(`packages/python/docstrings.json: ${name} is not an export of ${module.ts}`);
  }
  const updated = src.join('\n');
  if (check) {
    for (const name of stale) problems.push(`${module.py}: docstring of ${name} is missing or stale`);
  } else if (updated !== original) {
    writeFileSync(file, updated);
    console.log(`python-docstrings: ${module.py}: ${stale.length} docstring(s) written (${stale.join(', ')})`);
  }
}

for (const module of MODULES) update(module);

if (problems.length) {
  for (const p of problems) console.error(`python-docstrings: ${p}`);
  if (check) console.error('python-docstrings: run `npm run docs:python` and commit the result');
  process.exit(1);
}
if (check) console.log('python-docstrings: all docstrings are current');
