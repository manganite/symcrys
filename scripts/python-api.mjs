// Writes the Python layer from the TypeScript API (#29, #99; #121 step 12a): the modules
// symcrys/__init__.py (index.ts), symcrys/magnetic.py (magnetic.ts) and symcrys/plane.py (plane.ts),
// each in full: the signatures, the bodies, the docstrings, a TypedDict for every record a function
// returns, and `__all__`. One description of every export, its TSDoc comment, converted by the fixed
// rules of the Python layer (CLAUDE.md, "The Python API follows the TypeScript API by fixed rules"):
// names camelCase → snake_case, an options object → keyword-only arguments, RangeError →
// SymcrysError, undefined/null/true/false → None/None/True/False. What the TypeScript types do not
// say (dtypes of arrays, int or float, the module docstrings) is in packages/python/api.json; the
// shapes and dtypes written into the Returns sections are in packages/python/docstrings.json.
//
// Reads TypeDoc's JSON output (build/typedoc.json, written by `npm run docs:check` and
// `npm run docs:python`) and the built library (packages/ts/dist) for the values of literal types.
// With --check it changes nothing and fails if a module is not what it would write.
//
//   node scripts/python-api.mjs [--check]

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');

const project = JSON.parse(readFileSync(path.join(root, 'build/typedoc.json'), 'utf8'));
const extras = JSON.parse(readFileSync(path.join(root, 'packages/python/docstrings.json'), 'utf8'));
const api = JSON.parse(readFileSync(path.join(root, 'packages/python/api.json'), 'utf8'));

const KIND = {
  module: 2,
  variable: 32,
  function: 64,
  interface: 256,
  typeLiteral: 65536,
  typeAlias: 2097152,
  reference: 4194304,
};
const WIDTH = 100;

/** The entries of api.json that the modules used: one that is not used is reported. */
const used = new Set();

/** @typedef {any} Json A node of TypeDoc's JSON output. */

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
      .replace(/\bnull\b/g, 'None')
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
  if (/\b(true|false|undefined|null)\b/.test(out.replace(/``[^`]*``/g, ''))) {
    problems.push(`${where}: true, false, undefined or null outside code`);
  }
  // reStructuredText would read |…| as a substitution.
  if (/\|/.test(out.replace(/``[^`]*``/g, '')))
    problems.push(`${where}: '|' outside code (a substitution in reStructuredText)`);
  // A TypeScript name left in a code span is a conversion this script does not know; an object
  // literal is TypeScript too (shorthand `{ a, b }`, or an argument of a call): Python writes a dict
  // or passes keyword arguments.
  for (const m of out.matchAll(/``([^`]*)``/g)) {
    if (/\b[a-z][a-z0-9]*[A-Z]\w*/.test(m[1]) || /\.ts\b/.test(m[1])) {
      problems.push(`${where}: TypeScript name left in \`\`${m[1]}\`\``);
    } else if (/\w\(.*\{/.test(m[1]) || /\{\s*[a-z_]\w*\s*(,\s*[a-z_]\w*\s*)*\}/.test(m[1])) {
      problems.push(`${where}: TypeScript object literal left in \`\`${m[1]}\`\``);
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

/** An options object: an optional parameter of a type named …Options, or an intersection of them. */
const isOptionsType = (/** @type {Json} */ type) =>
  type?.type === 'intersection' ? type.types.every(isOptionsType) : /Options$/.test(type?.name ?? '');
const isOptions = (/** @type {Json} */ param) => param.flags?.isOptional && isOptionsType(param.type);

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
  for (const [i, p] of (sig.parameters ?? []).entries()) {
    const alts = objectAlternatives(decl, i, where);
    if (isOptions(p)) {
      for (const o of optionProperties(p.type, where)) params.push({ name: snake(o.name), doc: o.doc, keyword: true });
    } else if (alts) {
      // An object parameter: its fields, documented by their TSDoc.
      for (const f of objectFields(alts)) params.push({ name: snake(f.name), doc: f.doc, keyword: !f.required });
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

// --- types ----------------------------------------------------------------------------------------
//
// A TypeScript type is read into a small description (IR):
//   { k: 'str', lits?: string[], alias?: string }  a string, or a union of string literals
//   { k: 'num', int?: boolean }                     a number
//   { k: 'bool' } / { k: 'undef' }
//   { k: 'arr', of: IR, shape?: number[] }         an array (a tuple has a shape)
//   { k: 'rec', name?: string, fields: Field[] }   an object with named fields
//   { k: 'map', of: IR }                           an object with arbitrary keys (Record<…>)
//   { k: 'union', of: IR[] }
// A record with a name becomes a TypedDict of that name.

/** @typedef {{ name: string, optional: boolean, ir: any, doc: string }} Field */

const decl = (/** @type {number} */ id) => byId.get(id);

/**
 * @param {Json} t
 * @param {string} where
 * @returns {any}
 */
function read(t, where) {
  if (!t) throw new Error(`${where}: no type`);
  switch (t.type) {
    case 'intrinsic':
      if (t.name === 'string') return { k: 'str' };
      if (t.name === 'number') return { k: 'num' };
      if (t.name === 'boolean') return { k: 'bool' };
      if (t.name === 'undefined') return { k: 'undef' };
      throw new Error(`${where}: intrinsic ${t.name}`);
    case 'literal':
      if (typeof t.value === 'string') return { k: 'str', lits: [t.value] };
      if (typeof t.value === 'number') return { k: 'num', int: Number.isInteger(t.value) };
      throw new Error(`${where}: literal ${t.value}`);
    case 'predicate':
      return { k: 'bool' };
    case 'typeOperator':
      if (t.operator === 'readonly') return read(t.target, where);
      if (t.operator === 'keyof') return { k: 'str' };
      throw new Error(`${where}: operator ${t.operator}`);
    case 'array':
      return { k: 'arr', of: read(t.elementType, where) };
    case 'tuple': {
      const els = (t.elements ?? []).map((/** @type {Json} */ e) => read(e, where));
      // A tuple of one kind of element: numbers, strings, or equal arrays.
      const of = unite(els);
      if (of.k === 'union') throw new Error(`${where}: a tuple of mixed elements`);
      const inner = of.k === 'arr' && of.shape ? of.shape : [];
      return { k: 'arr', of: of.k === 'arr' ? of.of : of, shape: [els.length, ...inner] };
    }
    case 'union':
      return unite(t.types.map((/** @type {Json} */ u) => read(u, where)));
    case 'intersection': {
      const parts = t.types.map((/** @type {Json} */ u) => read(u, where));
      if (!parts.every((/** @type {any} */ p) => p.k === 'rec'))
        throw new Error(`${where}: intersection of non-records`);
      return { k: 'rec', fields: mergeFields(parts.flatMap((/** @type {any} */ p) => p.fields)) };
    }
    case 'reflection':
      return readDeclaration(t.declaration, where);
    case 'reference':
      return readReference(t, where);
    default:
      throw new Error(`${where}: type ${t.type}`);
  }
}

/**
 * A union of types: of string literals one string type, of numbers one number type.
 * @param {any[]} of
 * @returns {any}
 */
function unite(of) {
  of = of.flatMap((u) => (u.k === 'union' ? u.of : [u]));
  if (of.every((u) => u.k === 'str' && u.lits)) return { k: 'str', lits: [...new Set(of.flatMap((u) => u.lits))] };
  if (of.every((u) => u.k === 'str')) return { k: 'str' };
  if (of.every((u) => u.k === 'num')) return { k: 'num', int: of.every((u) => u.int) };
  return { k: 'union', of };
}

/** @param {Field[]} fields */
function mergeFields(fields) {
  const out = new Map();
  for (const f of fields) out.set(f.name, f);
  return [...out.values()];
}

/**
 * @param {Json} d
 * @param {string} where
 * @param {string} [name]
 */
function readDeclaration(d, where, name) {
  if (d.signatures) throw new Error(`${where}: a function type`);
  const own = (d.children ?? []).map((/** @type {Json} */ c) => ({
    name: c.name,
    optional: !!c.flags?.isOptional,
    ir: read(c.type, `${where}.${c.name}`),
    doc: render(c.comment?.summary, `${where}.${c.name}`),
  }));
  const inherited = (d.extendedTypes ?? []).flatMap((/** @type {Json} */ e) => read(e, where).fields ?? []);
  const rec = { k: 'rec', fields: mergeFields([...inherited, ...own]) };
  if (name) Object.assign(rec, { name, doc: render(d.comment?.summary, where) });
  return rec;
}

/**
 * @param {Json} t
 * @param {string} where
 */
function readReference(t, where) {
  const fixed = api.types[t.name];
  if (fixed) used.add(`types.${t.name}`);
  if (fixed === 'str') return { k: 'str' };
  if (fixed === 'int') return { k: 'num', int: true };
  if (Array.isArray(fixed)) return { k: 'arr', of: { k: 'num' }, shape: fixed };
  if (t.name === 'Readonly' && t.typeArguments) return read(t.typeArguments[0], where);
  if (t.name === 'Record' && t.typeArguments) return { k: 'map', of: read(t.typeArguments[1], where) };
  if (t.name === 'Omit' && t.typeArguments) {
    const base = read(t.typeArguments[0], where);
    const drop = read(t.typeArguments[1], where).lits ?? [];
    return { ...base, fields: base.fields.filter((/** @type {Field} */ f) => !drop.includes(f.name)) };
  }
  if (t.name === 'Extract' && t.typeArguments) return read(t.typeArguments[1], where);
  if (typeof t.target !== 'number') throw new Error(`${where}: unresolved type ${t.name}`);
  const d = decl(t.target);
  if (!d) throw new Error(`${where}: no declaration for ${t.name}`);
  if (d.kind === KIND.interface) return readDeclaration(d, where, d.name);
  if (d.kind === KIND.typeAlias) {
    const ir = read(d.type, `${where}<${d.name}>`);
    if (ir.k === 'str' && ir.lits) return { ...ir, alias: d.name, doc: render(d.comment?.summary, d.name) };
    if (ir.k === 'rec' && !ir.name) return { ...ir, name: d.name, doc: render(d.comment?.summary, d.name) };
    return ir;
  }
  throw new Error(`${where}: reference to ${t.name} of kind ${d.kind}`);
}

// --- Python names of types --------------------------------------------------------------------------

/**
 * The context of a module: its tables, and the TypedDicts and Literal aliases it collects.
 * @typedef {{ name: string, ts: string, prefix: string, floats: Set<string>, ints: Set<string>,
 *   ops: any, usesOperations: boolean, arrays: string, shapes: Record<string, number[]>, records: Map<string, any>, exports: Map<string, Json>, notRequired: boolean, done: string[],
 *   literals: Map<string, { lits: string[], doc: string }>,
 *   lib: Record<string, any> }} Ctx
 */

/**
 * The dtype of an array of numbers under a field name; null if it is no array of numbers.
 * @param {Ctx} ctx
 * @param {string} field
 * @param {string} where
 */
function dtypeOf(ctx, field, where) {
  used.add(`arrays.${ctx.arrays}.${field}`);
  if (ctx.floats.has(field)) return 'float64';
  if (ctx.ints.has(field)) return 'int64';
  throw new Error(`${where}: array field ${field} is in neither list of api.json "arrays" (${ctx.name})`);
}

/**
 * True for an array of numbers, nested to any depth.
 * @param {any} ir
 * @returns {boolean}
 */
function isNumArray(ir) {
  return ir.k === 'arr' && (ir.of.k === 'num' || isNumArray(ir.of));
}

/**
 * @param {Ctx} ctx
 * @param {string} field
 * @param {string} where
 */
function numberType(ctx, field, where) {
  used.add(`numbers.${field}`);
  if (api.numbers.int.includes(field)) return 'int';
  if (api.numbers.float.includes(field)) return 'float';
  throw new Error(`${where}: number ${field} is in neither list of api.json "numbers"`);
}

/**
 * True for a list of the operation record of the module, which Python gives as ``Operations``.
 * @param {Ctx} ctx
 * @param {any} ir
 */
function isOperations(ctx, ir) {
  if (!(ir.k === 'arr' && ir.of.k === 'rec' && ir.of.name === ctx.ops.record)) return false;
  used.add(`operations.${ctx.name}`);
  ctx.usesOperations = true;
  return true;
}

/**
 * The Python annotation of a result type.
 * @param {Ctx} ctx
 * @param {any} ir
 * @param {string} field name of the field (or of the function, for its return value)
 * @param {string} where
 * @param {string} [dtype] the dtype of a top-level array
 * @returns {string}
 */
function pyType(ctx, ir, field, where, dtype) {
  switch (ir.k) {
    case 'str':
      if (!ir.lits) return 'str';
      if (isTensorPropertyNames(ctx, ir)) return tensorPropertyName(ctx);
      if (ir.alias) {
        ctx.literals.set(ir.alias, { lits: ir.lits, doc: ir.doc ?? '' });
        return ir.alias;
      }
      return `Literal[${ir.lits.map((/** @type {string} */ s) => JSON.stringify(s)).join(', ')}]`;
    case 'num':
      return ir.int ? 'int' : numberType(ctx, field, where);
    case 'bool':
      return 'bool';
    case 'arr':
      if (isOperations(ctx, ir)) return 'Operations';
      if (isNumArray(ir)) return `NDArray[np.${dtype ?? dtypeOf(ctx, field, where)}]`;
      return `list[${pyType(ctx, ir.of, field, where)}]`;
    case 'rec':
      if (!ir.name) throw new Error(`${where}: a record without a name in a result`);
      collect(ctx, ir, where);
      return ir.name;
    case 'map':
      return `dict[str, ${pyType(ctx, ir.of, field, where)}]`;
    case 'union': {
      const defined = ir.of.filter((/** @type {any} */ u) => u.k !== 'undef');
      const inner = [...new Set(defined.map((/** @type {any} */ u) => pyType(ctx, u, field, where, dtype)))].join(
        ' | ',
      );
      return defined.length < ir.of.length ? `Optional[${inner}]` : inner;
    }
    default:
      throw new Error(`${where}: no Python type for ${ir.k}`);
  }
}

/**
 * Registers a named record (and the records it holds) as a TypedDict of the module.
 * @param {Ctx} ctx
 * @param {any} ir
 * @param {string} where
 */
function collect(ctx, ir, where) {
  if (ctx.records.has(ir.name)) {
    // Two records of one name (TypeDoc lists an internal type of the same name too) must agree.
    const known = ctx.records.get(ir.name);
    const names = (/** @type {any[]} */ fs) => fs.map((f) => `${f.name}${f.optional ? '?' : ''}`).join(',');
    if (known && names(known.fields) !== names(ir.fields)) {
      throw new Error(`${where}: two records named ${ir.name} with different fields`);
    }
    return;
  }
  ctx.records.set(ir.name, null); // reserved, against recursion
  const fields = ir.fields.map((/** @type {Field} */ f) => ({
    ...f,
    py: pyType(ctx, f.ir, f.name, `${where}.${f.name}`),
    schema: schema(ctx, f.ir, f.name, `${where}.${f.name}`),
  }));
  ctx.records.set(ir.name, { name: ir.name, doc: ir.doc ?? '', fields });
  ctx.done.push(ir.name); // completed after the records it holds
}

/**
 * The conversion schema of a result type (packages/python/src/symcrys/_convert.py, `convert`), as
 * Python source.
 * @param {Ctx} ctx
 * @param {any} ir
 * @param {string} field
 * @param {string} where
 * @param {string} [dtype]
 * @returns {string}
 */
function schema(ctx, ir, field, where, dtype) {
  switch (ir.k) {
    case 'str':
    case 'bool':
      return '_V';
    case 'num':
      return (ir.int ? 'int' : numberType(ctx, field, where)) === 'int' ? '_I' : '_F';
    case 'arr':
      if (isOperations(ctx, ir)) return '_S_Operations';
      if (isNumArray(ir)) {
        const shape = ctx.shapes[field];
        if (shape) used.add(`shapes.${ctx.name}.${field}`);
        return `("a", np.${dtype ?? dtypeOf(ctx, field, where)}, ${shape ? `(${shape.join(', ')}${shape.length === 1 ? ',' : ''})` : 'None'})`;
      }
      return `("l", ${schema(ctx, ir.of, field, where)})`;
    case 'rec':
      if (ir.name) {
        collect(ctx, ir, where);
        return `_S_${ir.name}`;
      }
      return `("d", {${ir.fields.map((/** @type {Field} */ f) => `"${f.name}": ${schema(ctx, f.ir, f.name, `${where}.${f.name}`)}`).join(', ')}})`;
    case 'map':
      return `("m", ${schema(ctx, ir.of, field, where)})`;
    case 'union': {
      const defined = ir.of.filter((/** @type {any} */ u) => u.k !== 'undef');
      let inner;
      if (defined.length === 1) inner = schema(ctx, defined[0], field, where, dtype);
      else if (defined.every((/** @type {any} */ u) => u.k === 'rec')) {
        // Records of the overloads of one function: one record with the fields of all.
        for (const u of defined) if (u.name) collect(ctx, u, where);
        const fields = mergeFields(defined.flatMap((/** @type {any} */ u) => u.fields));
        inner = schema(ctx, { k: 'rec', fields }, field, where);
      } else if (defined.every((/** @type {any} */ u) => u.k === 'arr' && u.of.k === 'rec')) {
        const fields = mergeFields(
          defined.flatMap((/** @type {any} */ u) => {
            if (u.of.name) collect(ctx, u.of, where);
            return u.of.fields;
          }),
        );
        inner = `("l", ${schema(ctx, { k: 'rec', fields }, field, where)})`;
      } else if (defined.every((/** @type {any} */ u) => isNumArray(u))) {
        // Arrays of numbers of different depth (toVoigt: 6 components or a matrix): one array.
        inner = `("a", np.${dtype ?? dtypeOf(ctx, field, where)}, None)`;
      } else throw new Error(`${where}: a union in a result that has no schema`);
      return defined.length < ir.of.length ? `("o", ${inner})` : inner;
    }
    default:
      throw new Error(`${where}: no schema for ${ir.k}`);
  }
}

// --- object parameters ------------------------------------------------------------------------------
//
// A parameter that is an object of plain fields (the cell parameters, the angles, the values of h, k,
// l, the face {hkl} or direction {uvw} of orbit) becomes its fields as arguments (#137 H2): a field
// every signature requires a parameter, the others keyword-only. Operations, tensor specifications and
// options objects are not such objects.

/**
 * The alternatives of an object parameter, one record per signature, or null.
 * @param {Json} decl
 * @param {number} i
 * @param {string} where
 * @returns {any[] | null}
 */
function objectAlternatives(decl, i, where) {
  const p = decl.signatures[0].parameters[i];
  if (p.name === 'operations' || isOptions(p)) return null;
  const alts = decl.signatures.flatMap((/** @type {Json} */ s) => {
    const ir = read(s.parameters[i].type, where);
    return ir.k === 'union' ? ir.of : [ir];
  });
  if (!alts.every((/** @type {any} */ a) => a.k === 'rec' && !/TensorSpec/.test(a.name ?? ''))) return null;
  return alts;
}

/**
 * The fields of an object parameter: required if every alternative requires it.
 * @param {any[]} alts
 * @returns {{ name: string, required: boolean, ir: any, doc: string }[]}
 */
function objectFields(alts) {
  const names = [...new Set(alts.flatMap((a) => a.fields.map((/** @type {Field} */ f) => f.name)))];
  return names.map((name) => {
    const own = alts.map((a) => a.fields.find((/** @type {Field} */ f) => f.name === name));
    const first = own.find(Boolean);
    return { name, required: own.every((f) => f && !f.optional), ir: first.ir, doc: first.doc ?? '' };
  });
}

// --- arguments --------------------------------------------------------------------------------------

/**
 * A parameter of a function: its Python annotation and the expression that passes it on.
 * @param {Ctx} ctx
 * @param {any} ir
 * @param {string} name the TypeScript name
 * @param {string} fn the TypeScript name of the function
 * @param {string} where
 * @returns {{ py: string, expr: string }}
 */
function argument(ctx, ir, name, fn, where) {
  const py = snake(name);
  const own = api.functions[fn]?.args?.[name];
  if (own) used.add(`functions.${fn}.args.${name}`);
  if (own) return { py: 'ArrayLike', expr: own };
  if (ctx.name === 'symcrys.plane' && name === 'point') return { py: 'ArrayLike', expr: api.plane.point };
  if (name === 'operations') {
    // The keys an operation needs, and the field a bare array of matrices is read as: the module's,
    // or a function's own in api.json (an array, or per module an object).
    const perModule = (/** @type {any} */ v) =>
      v === undefined || typeof v === 'string' || Array.isArray(v) ? v : v[ctx.name];
    const ownKeys = perModule(api.functions[fn]?.operationKeys);
    const ownBare = perModule(api.functions[fn]?.bare);
    if (ownKeys) used.add(`functions.${fn}.operationKeys`);
    if (ownBare) used.add(`functions.${fn}.bare`);
    const keys = ownKeys ?? ctx.ops.keys;
    const tuple = `(${keys.map((/** @type {string} */ s) => `"${s}"`).join(', ')}${keys.length === 1 ? ',' : ''})`;
    const field = ownBare ?? ctx.ops.bare;
    const bare = field && keys.length === 1 && keys[0] === field ? `, bare="${field}"` : '';
    ctx.usesOperations = true;
    return {
      py: `Operations | Sequence[Mapping[str, Any]]${bare ? ' | ArrayLike' : ''}`,
      expr: `_shared.operation_list(${py}, ${tuple}${bare})`,
    };
  }
  if (ir.k === 'union' && ir.of.some((/** @type {any} */ u) => u.k === 'rec' && /TensorSpec/.test(u.name ?? ''))) {
    // The TypedDict is the exported TensorSpec of the entry point, not the type of the argument
    // (in symcrys a TensorSpec that also accepts a time parity, to refuse it with a message).
    const exported = ctx.exports.get('TensorSpec');
    if (!exported) throw new Error(`${where}: the entry point exports no TensorSpec`);
    collect(ctx, readDeclaration(exported, where, 'TensorSpec'), where);
    tensorPropertyName(ctx);
    return { py: 'TensorSpec | Mapping[str, Any] | TensorPropertyName', expr: `_shared.spec(${py})` };
  }
  if (ir.k === 'str') {
    if (isTensorPropertyNames(ctx, ir)) return { py: tensorPropertyName(ctx), expr: py };
    return { py: 'str', expr: py };
  }
  if (ir.k === 'union' && ir.of.every((/** @type {any} */ u) => isNumArray(u))) {
    // Arrays of numbers of different depth (fromVoigt: 6 components or a matrix).
    return { py: 'ArrayLike', expr: `_shared.array(${py}, "${py}", np.float64)` };
  }
  if (isNumArray(ir)) {
    const float = ir.shape?.length === 2 ? ', np.float64' : '';
    return { py: 'ArrayLike', expr: `_shared.array(${py}, "${py}"${float})` };
  }
  if (ir.k === 'rec' || (ir.k === 'union' && ir.of.every((/** @type {any} */ u) => u.k === 'rec'))) {
    const fields = ir.k === 'rec' ? ir.fields : ir.of.flatMap((/** @type {any} */ u) => u.fields);
    const types = new Set(
      fields.map((/** @type {Field} */ f) =>
        isNumArray(f.ir) ? 'ArrayLike' : f.ir.k === 'num' ? numberOrInt(f.name, `${where}.${f.name}`) : 'Any',
      ),
    );
    const value = types.size === 1 ? [...types][0] : 'Any';
    return { py: `Mapping[str, ${value}]`, expr: `_shared.mapping(${py}, "${py}")` };
  }
  throw new Error(`${where}: no Python argument for ${ir.k}`);
}

/**
 * @param {string} field
 * @param {string} where
 */
function numberOrInt(field, where) {
  used.add(`numbers.${field}`);
  if (['h', 'k', 'l'].includes(field) || api.numbers.int.includes(field)) return 'int';
  if (api.numbers.float.includes(field)) return 'float';
  throw new Error(`${where}: number ${field} is in neither list of api.json "numbers"`);
}

/**
 * True for the names of the tensor properties, also where TypeScript writes them out as literals.
 * @param {Ctx} ctx
 * @param {any} ir
 */
function isTensorPropertyNames(ctx, ir) {
  if (ir.alias === 'TensorPropertyName') return true;
  const names = Object.keys(ctx.lib[api.literals.TensorPropertyName] ?? {});
  return (
    !!ir.lits &&
    names.length > 0 &&
    ir.lits.length === names.length &&
    ir.lits.every((/** @type {string} */ s) => names.includes(s))
  );
}

/** @param {Ctx} ctx */
function tensorPropertyName(ctx) {
  const source = api.literals.TensorPropertyName;
  ctx.literals.set('TensorPropertyName', {
    lits: Object.keys(ctx.lib[source]),
    doc: `The names of the named tensor properties, the keys of \`\`${source}\`\`.`,
  });
  return 'TensorPropertyName';
}

/**
 * The keyword arguments of an options object.
 * @param {Ctx} ctx
 * @param {Json} type
 * @param {string} where
 * @returns {{ py: string, ann: string, expr: string }[]}
 */
function keywordArguments(ctx, type, where) {
  const props = optionFields(type, where);
  return props.map((p) => {
    const py = snake(p.name);
    let ann;
    let expr = py;
    if (p.ir.k === 'str')
      ann = p.ir.lits ? `Literal[${p.ir.lits.map((/** @type {string} */ s) => JSON.stringify(s)).join(', ')}]` : 'str';
    else if (p.ir.k === 'num') ann = numberOrInt(p.name, `${where}.${p.name}`);
    else if (
      p.name === 'setting' &&
      p.ir.k === 'union' &&
      p.ir.of.some((/** @type {any} */ u) => u.k === 'num') &&
      p.ir.of.some((/** @type {any} */ u) => u.k === 'str')
    )
      ann = 'Union[int, str]';
    else if (isNumArray(p.ir)) {
      ann = 'ArrayLike';
      expr = `None if ${py} is None else _shared.array(${py}, "${py}", np.float64)`;
    } else throw new Error(`${where}.${p.name}: no Python type for an option of kind ${p.ir.k}`);
    return { py, ann: `Optional[${ann}]`, expr: `${py}=${expr}` };
  });
}

/**
 * The properties of an options type, inherited first (the order of the docstrings).
 * @param {Json} type
 * @param {string} where
 * @returns {{ name: string, ir: any }[]}
 */
function optionFields(type, where) {
  const names = optionProperties(type, where).map((o) => o.name);
  const ir = read(type, where);
  return names.map((n) => ({ name: n, ir: ir.fields.find((/** @type {Field} */ f) => f.name === n).ir }));
}

// --- the modules --------------------------------------------------------------------------------------

/**
 * @param {string} name
 * @param {any} cfg
 */
async function generate(name, cfg) {
  const lib = await import(pathToFileURL(path.join(root, `packages/ts/dist/${cfg.ts}.js`)).href);
  const arrays = api.arrays[name] ?? api.arrays.symcrys;
  /** @type {Ctx} */
  const ctx = {
    name,
    ts: cfg.ts,
    prefix: cfg.prefix,
    arrays: api.arrays[name] ? name : 'symcrys',
    floats: new Set(arrays.float64),
    ints: new Set(arrays.int64),
    shapes: api.shapes[name] ?? {},
    records: new Map(),
    exports: new Map(),
    ops: api.operations[name],
    usesOperations: false,
    notRequired: false,
    done: [],
    literals: new Map(),
    lib,
  };
  const done = ctx.done;
  const tsModule = project.children.find((/** @type {Json} */ m) => m.name === cfg.ts);
  for (const c of tsModule.children) ctx.exports.set(c.name, c.kind === KIND.reference ? byId.get(c.target) : c);
  const extra = extras[name] ?? {};
  const extrasUsed = new Set();
  const constants = [];
  const functions = [];
  for (const child of tsModule.children) {
    const d = child.kind === KIND.reference ? { ...byId.get(child.target), name: child.name } : child;
    const where = `${cfg.ts}.${d.name}`;
    if (d.kind === KIND.variable) {
      const own = api.constants[d.name];
      if (own) used.add(`constants.${d.name}`);
      let ann;
      let sch;
      if (own) {
        ann = own.type;
        sch = `("x", "${own.custom}")`;
      } else {
        let ir = read(d.type, where);
        if (ir.k === 'rec' && !ir.name) {
          // An object literal type with a field per name (magnetic TENSOR_PROPERTIES): a mapping, if
          // every field has the same type.
          const types = new Set(ir.fields.map((/** @type {Field} */ f) => f.ir.name ?? JSON.stringify(f.ir)));
          if (types.size !== 1) throw new Error(`${where}: an object of fields of different types`);
          ir = { k: 'map', of: ir.fields[0].ir };
        }
        // A string constant (VERSION) is a str, not a Literal of its one value.
        if (ir.k === 'str') ir = { k: 'str' };
        if (ir.k === 'arr' && ir.of.k === 'str') {
          ann = 'tuple[str, ...]';
          sch = '("t", _V)';
        } else {
          ann = pyType(ctx, ir, d.name, where);
          sch = schema(ctx, ir, d.name, where);
        }
      }
      if (extra[d.name]) extrasUsed.add(d.name);
      const doc = quote(variableDocstring(d, extra[d.name], where), '');
      const line = `${d.name}: ${ann} = _shared.convert(_value("${d.name}"), ${sch})`;
      const def =
        line.length <= WIDTH
          ? [line]
          : [`${d.name}: ${ann} = _shared.convert(`, `    _value("${d.name}"),`, `    ${sch},`, ')'];
      constants.push([...def, ...doc].join('\n'));
    } else if (d.kind === KIND.function) {
      const py = snake(d.name);
      const sigs = d.signatures;
      const sig = sigs[0];
      const own = api.functions[d.name] ?? {};
      for (const k of ['returns', 'custom', 'listOf']) if (own[k] !== undefined) used.add(`functions.${d.name}.${k}`);
      /** @type {string[]} */
      const params = [];
      /** @type {{ py: string, ann: string, expr: string }[]} */
      const keywords = [];
      /** @type {string[]} */
      const args = [];
      /** @type {{ tsIndex: number, fields: any[], alts: any[] } | null} */
      let objectParam = null;
      for (const [i, p] of (sig.parameters ?? []).entries()) {
        if (isOptions(p)) {
          const kw = keywordArguments(ctx, p.type, `${where}(${p.name})`);
          keywords.push(...kw);
          args.push(`_shared.options(${kw.map((k) => k.expr).join(', ')})`);
          continue;
        }
        const alts = objectAlternatives(d, i, `${where}(${p.name})`);
        if (alts) {
          // Its fields as arguments; the library gets the object back (only the fields given).
          const fields = objectFields(alts);
          /** @type {string[]} */
          const passed = [];
          for (const f of fields) {
            const name = snake(f.name);
            // A list of operations as a field (changeOfCoordinates): read as an operations argument.
            const ops =
              f.name === 'operations' && f.ir.k === 'arr' && f.ir.of?.k === 'rec'
                ? argument(ctx, null, 'operations', d.name, `${where}(${p.name}).${f.name}`)
                : null;
            const ann = ops
              ? ops.py
              : isNumArray(f.ir)
                ? 'ArrayLike'
                : f.ir.k === 'num'
                  ? numberOrInt(f.name, `${where}.${f.name}`)
                  : null;
            if (!ann) throw new Error(`${where}(${p.name}).${f.name}: a field of kind ${f.ir.k}`);
            if (f.required) params.push(`${name}: ${ann}`);
            else keywords.push({ py: name, ann: `Optional[${ann}]`, expr: '' });
            passed.push(
              ops && !f.required
                ? `${name}=None if ${name} is None else ${ops.expr}`
                : `${name}=${ops ? ops.expr : name}`,
            );
          }
          // Several object parameters only without overloads: the overloads are written for one.
          if (objectParam && sigs.length > 1) {
            throw new Error(`${where}: two object parameters, which the overloads do not handle`);
          }
          objectParam ??= { tsIndex: i, fields, alts };
          const inline = `_shared.options(${passed.join(', ')})`;
          // An argument too long for one line (12 columns of indentation in the call) gets a line per field.
          args.push(
            inline.length + 13 <= WIDTH
              ? inline
              : ['_shared.options(', ...passed.map((x) => `                ${x},`), '            )'].join('\n'),
          );
          continue;
        }
        // An overloaded function: the parameter's types of all signatures. Operations are read by name.
        const types = sigs.map((/** @type {Json} */ s) => s.parameters[i].type);
        const ir =
          p.name === 'operations'
            ? null
            : types.length > 1
              ? unite(types.map((/** @type {Json} */ t) => read(t, where)))
              : read(p.type, `${where}(${p.name})`);
        const a = argument(ctx, ir, p.name, d.name, `${where}(${p.name})`);
        params.push(`${snake(p.name)}: ${a.py}`);
        args.push(a.expr);
      }
      // A generic result (residualOperations gives back the caller's operations): the list of a
      // record of the entry point named in api.json.
      // The name of that record: one for every module, or per module an object (#119).
      const listOfName = typeof own.listOf === 'object' ? own.listOf[ctx.name] : own.listOf;
      const listOf = listOfName && tsModule.children.find((/** @type {Json} */ c) => c.name === listOfName);
      const returns = listOf
        ? {
            k: 'arr',
            of: readDeclaration(listOf.kind === KIND.reference ? byId.get(listOf.target) : listOf, where, listOfName),
          }
        : sigs.length > 1
          ? unite(sigs.map((/** @type {Json} */ s) => read(s.type, where)))
          : read(sig.type, `${where}()`);
      let ann;
      let sch;
      if (own.custom) {
        ann = pyType(ctx, returns, d.name, where, own.returns);
        sch = `("x", "${own.custom}")`;
      } else if (returns.k === 'num') {
        ann = numberType(ctx, d.name, where);
        sch = ann === 'int' ? '_I' : '_F';
      } else {
        const dtype = own.returns;
        ann = pyType(ctx, returns, d.name, where, dtype);
        sch = schema(ctx, returns, d.name, where, dtype);
      }
      if (returns.k === 'union' && returns.of.every((/** @type {any} */ u) => u.k === 'arr')) {
        ann = [...new Set(returns.of.map((/** @type {any} */ u) => pyType(ctx, u, d.name, where, own.returns)))].join(
          ' | ',
        );
      }
      if (extra[py]) extrasUsed.add(py);
      // An overloaded function whose overloads differ in an object parameter (orbit: hkl or uvw):
      // one Python @overload per TypeScript signature that takes one alternative, with its result.
      const overloads = [];
      if (objectParam && sigs.length > 1) {
        for (const s of sigs) {
          const alt = read(s.parameters[objectParam.tsIndex].type, where);
          if (alt.k !== 'rec') continue;
          const own = new Set(
            alt.fields.filter((/** @type {Field} */ f) => !f.optional).map((/** @type {Field} */ f) => f.name),
          );
          const kws = keywords.flatMap((k) => {
            const field = objectParam?.fields.find((f) => snake(f.name) === k.py && !f.required);
            if (!field) return [`${k.py}: ${k.ann} = None`];
            if (own.has(field.name)) return [`${k.py}: ${k.ann.replace(/^Optional\[(.*)\]$/, '$1')}`];
            return [];
          });
          const result = pyType(ctx, read(s.type, where), d.name, where);
          const sigLines = [...params, ...(kws.length ? ['*', ...kws] : [])];
          const one = `def ${py}(${sigLines.join(', ')}) -> ${result}: ...`;
          overloads.push(
            [
              '@overload',
              ...(one.length <= WIDTH
                ? [one]
                : [`def ${py}(`, ...sigLines.map((x) => `    ${x},`), `) -> ${result}: ...`]),
            ].join('\n'),
          );
        }
      }
      // Every Python parameter name once (an object field must not take the name of another
      // parameter or option).
      const names = [...params.map((x) => x.split(':')[0]), ...keywords.map((k) => k.py)];
      const twice = names.filter((n, k) => names.indexOf(n) !== k);
      if (twice.length) throw new Error(`${where}: the Python parameter ${twice[0]} twice`);
      const signature = [
        ...params,
        ...(keywords.length ? ['*', ...keywords.map((k) => `${k.py}: ${k.ann} = None`)] : []),
      ];
      const head = `def ${py}(${signature.join(', ')}) -> ${ann}:`;
      const defLines =
        head.length <= WIDTH ? [head] : [`def ${py}(`, ...signature.map((s) => `    ${s},`), `) -> ${ann}:`];
      const doc = quote(functionDocstring(d, extra[py], where, '    '), '    ');
      const call = `_call("${d.name}"${args.map((a) => `, ${a}`).join('')})`;
      const one = `    result: ${ann} = _shared.convert(${call}, ${sch})`;
      const callLines =
        call.length + 9 <= WIDTH
          ? [`        ${call},`]
          : ['        _call(', `            "${d.name}",`, ...args.map((a) => `            ${a},`), '        ),'];
      const body =
        one.length <= WIDTH
          ? [one]
          : [`    result: ${ann} = _shared.convert(`, ...callLines, `        ${sch},`, '    )'];
      if (own.body) {
        // A function with a body of its own in _shared.py (rotateTensor: shapes and stacks), given
        // the library call and the arguments as the caller passed them, options converted.
        used.add(`functions.${d.name}.body`);
        if (objectParam) throw new Error(`${where}: a body of its own with an object parameter`);
        const parameters = sig.parameters ?? [];
        const raw = parameters.map((/** @type {Json} */ p, /** @type {number} */ k) =>
          isOptions(p) ? args[k] : snake(p.name),
        );
        const one = `    result: ${ann} = _shared.${own.body}(_call, _value, ${raw.join(', ')})`;
        functions.push(
          [
            ...defLines,
            ...doc,
            ...(one.length <= WIDTH
              ? [one]
              : [
                  `    result: ${ann} = _shared.${own.body}(`,
                  '        _call,',
                  '        _value,',
                  ...raw.map((/** @type {string} */ x) => `        ${x},`),
                  '    )',
                ]),
            '    return result',
          ].join('\n'),
        );
        continue;
      }
      if (own.selects) {
        // A function that keeps some of the caller's operations (residualOperations): the library is
        // given the caller's operations as they are, each with its index (so that it refuses what it
        // refuses), and the result takes the kept ones from them, as Operations.
        used.add(`functions.${d.name}.selects`);
        const rest = args.slice(1).map((a) => `        ${a},`);
        functions.push(
          [
            ...defLines,
            ...doc,
            `    given = ${args[0]}`,
            `    kept = _call(`,
            `        "${d.name}",`,
            '        [{**op, "index": i} for i, op in enumerate(given)],',
            ...rest,
            '    )',
            '    ops = operations if isinstance(operations, Operations) else _shared.operations_of(given, Operations)',
            `    result: ${ann} = _shared.select(ops, kept)`,
            '    return result',
          ].join('\n'),
        );
        continue;
      }
      functions.push([...overloads, [...defLines, ...doc, ...body, '    return result'].join('\n')].join('\n\n\n'));
    } else if (![KIND.interface, KIND.typeAlias, KIND.module].includes(d.kind)) {
      problems.push(`${where}: an export of kind ${d.kind}, which this script does not convert`);
    }
  }
  for (const k of Object.keys(extra)) {
    if (!extrasUsed.has(k)) problems.push(`packages/python/docstrings.json: ${k} is not an export of ${cfg.ts}`);
  }

  // Literal aliases and TypedDicts.
  const literals = [...ctx.literals].map(([n, { lits, doc }]) => {
    const one = `${n} = Literal[${lits.map((/** @type {string} */ s) => JSON.stringify(s)).join(', ')}]`;
    const def =
      one.length <= WIDTH
        ? [one]
        : [`${n} = Literal[`, ...lits.map((/** @type {string} */ s) => `    ${JSON.stringify(s)},`), ']'];
    return [...def, ...(doc ? quote(wrapParagraphs(doc, '', 3), '') : [])].join('\n');
  });
  const typed = [];
  const schemas = [];
  if (ctx.usesOperations) {
    const record = readDeclaration(ctx.exports.get(ctx.ops.record), name, ctx.ops.record);
    const entries = Object.entries(ctx.ops.fields).filter(([k]) => k !== '//');
    const pyDtype = (/** @type {string} */ d) => (d === 'bool' ? 'np.bool_' : `np.${d}`);
    const fieldLines = entries.flatMap(([k, [dtype, shape]]) => {
      const f = record.fields.find((/** @type {Field} */ x) => x.name === k);
      if (!f) throw new Error(`${name}: the operation record ${ctx.ops.record} has no field ${k}`);
      const dims = ['n', ...shape].join(', ');
      const doc = `${dtype} array of shape (${dims}${shape.length ? '' : ','}), one row per operation. ${f.doc}`;
      return [`    ${snake(k)}: NDArray[${pyDtype(dtype)}]`, ...quote(wrapParagraphs(doc, '', 3), '    ')];
    });
    const missing = record.fields
      .filter((/** @type {Field} */ f) => !ctx.ops.fields[f.name])
      .map((/** @type {Field} */ f) => f.name);
    if (missing.length) throw new Error(`${name}: api.json "operations" lacks the fields ${missing.join(', ')}`);
    const first = snake(entries[0][0]);
    const opRecord = ctx.ops.record;
    if (done.includes(opRecord)) throw new Error(`${name}: ${opRecord} is a result record too`);
    typed.unshift(
      [
        '@dataclass(frozen=True, eq=False)',
        'class Operations:',
        ...quote(
          wrapParagraphs(ctx.ops.doc, '    ', 3).map((l) => l.slice(4)),
          '    ',
        ),
        '',
        ...fieldLines,
        '',
        '    _symcrys_operations = True',
        '',
        '    def __post_init__(self) -> None:',
        '        _shared.freeze(self, _OPERATION_FIELDS)',
        '',
        '    def __reduce__(self) -> tuple[Any, ...]:',
        '        # A copy or a pickle is built anew, so its arrays are checked and read-only too.',
        '        return (type(self), tuple(getattr(self, name) for name in _OPERATION_FIELDS))',
        '',
        '    def __len__(self) -> int:',
        `        return len(self.${first})`,
        '',
        `    def __iter__(self) -> Iterator[${opRecord}]:`,
        '        return (self[i] for i in range(len(self)))',
        '',
        '    @overload',
        `    def __getitem__(self, index: int | np.integer[Any]) -> ${opRecord}: ...`,
        '',
        '    @overload',
        '    def __getitem__(self, index: slice | Sequence[int] | NDArray[Any]) -> Operations: ...',
        '',
        `    def __getitem__(self, index: int | np.integer[Any] | slice | Sequence[int] | NDArray[Any]) -> ${opRecord} | Operations:`,
        `        """One operation as a dict \`\`{${entries.map(([k]) => `"${snake(k)}"`).join(', ')}}\`\` for an integer, otherwise`,
        '        the ``Operations`` of the selected rows (a slice, a list of indices, a boolean mask)."""',
        `        result: ${opRecord} | Operations = _shared.operation_at(self, index)`,
        '        return result',
      ].join('\n'),
    );
    // The TypedDict of one operation (ops[i], for op in ops), from the same fields.
    typed.unshift(
      [
        '@final',
        `class ${opRecord}(TypedDict):`,
        ...quote([`One operation of \`\`Operations\`\` (\`\`ops[i]\`\`, \`\`for op in ops\`\`).`], '    '),
        '',
        ...entries.flatMap(([k, [dtype, shape]]) => {
          const f = record.fields.find((/** @type {Field} */ x) => x.name === k);
          const py = shape.length
            ? `NDArray[${pyDtype(dtype)}]`
            : dtype === 'bool'
              ? 'bool'
              : dtype === 'int64'
                ? 'int'
                : 'float';
          return [`    ${snake(k)}: ${py}`, ...quote(wrapParagraphs(f.doc, '', 3), '    ')];
        }),
      ].join('\n'),
    );
    const spec = entries.map(
      ([k, [dtype, shape]]) => `"${k}": (${pyDtype(dtype)}, (${shape.join(', ')}${shape.length === 1 ? ',' : ''}))`,
    );
    schemas.unshift(
      [
        `_OPERATION_FIELDS = {${entries.map(([k, [dtype, shape]]) => `"${snake(k)}": (${pyDtype(dtype)}, (${shape.join(', ')}${shape.length === 1 ? ',' : ''}))`).join(', ')}}`,
        `_S_Operations = ("ops", Operations, {${spec.join(', ')}})`,
      ].join('\n'),
    );
  }
  for (const n of done) {
    const r = ctx.records.get(n);
    const optional = r.fields.filter((/** @type {any} */ f) => f.optional);
    const body = (/** @type {any[]} */ fs) =>
      fs.flatMap((f) => [
        `    ${snake(f.name)}: ${f.py}`,
        ...(f.doc ? quote(wrapParagraphs(f.doc, '', 3), '    ') : []),
      ]);
    const doc = r.doc
      ? quote(
          wrapParagraphs(r.doc, '    ', 3).map((l) => l.slice(4)),
          '    ',
        )
      : [];
    // One class: an optional field is NotRequired (Python 3.11, typing_extensions for type checkers
    // on 3.10), so that Sphinx documents every field; @final lets a type checker narrow a union of
    // TypedDicts by a key (`if "hkl" in entry`).
    const fields = r.fields.map((/** @type {any} */ f) => (f.optional ? { ...f, py: `NotRequired[${f.py}]` } : f));
    if (optional.length) ctx.notRequired = true;
    typed.push(['@final', `class ${n}(TypedDict):`, ...doc, ...(doc.length ? [''] : []), ...body(fields)].join('\n'));
    const entries = r.fields.map((/** @type {any} */ f) => `"${f.name}": ${f.schema}`);
    const line = `_S_${n} = ("d", {${entries.join(', ')}})`;
    schemas.push(
      line.length <= WIDTH
        ? line
        : [
            `_S_${n} = (`,
            '    "d",',
            '    {',
            ...entries.map((/** @type {string} */ e) => `        ${e},`),
            '    },',
            ')',
          ].join('\n'),
    );
  }

  const publicTypes = [
    ...ctx.literals.keys(),
    ...done,
    ...(ctx.usesOperations ? ['Operations', ctx.ops.record] : []),
  ].sort();
  const names = (/** @type {string[]} */ l) => l.map((s) => s.match(/^(\w+)/)?.[1] ?? s);
  const all = [
    ...names(constants),
    'SymcrysError',
    'SymcrysInternalError',
    ...publicTypes,
    ...functions.map((f) => f.match(/^def (\w+)\(/m)?.[1] ?? f).sort(),
    ...(cfg.submodules ?? []),
  ];
  const header = [
    `"""${cfg.docstring}"""`,
    '',
    `# Generated by scripts/python-api.mjs from packages/ts/src/${cfg.ts}.ts and packages/python/api.json:`,
    '# do not edit, run `npm run docs:python`.',
    '',
    'from __future__ import annotations',
    '',
    'IMPORTS',
  ].join('\n');
  const sections = [
    header,
    [
      `_PREFIX = "${cfg.prefix}"`,
      '_V = ("v",)',
      '_I = ("i",)',
      '_F = ("f",)',
      ...(literals.length ? ['', ...literals] : []),
    ].join('\n'),
    ...typed,
    [...schemas, '', `__all__ = [\n${all.map((s) => `    "${s}",`).join('\n')}\n]`].join('\n'),
    'def _call(name: str, *args: Any) -> Any:\n    return _shared.call(_PREFIX + name, *args)',
    'def _value(name: str) -> Any:\n    return _shared.value(_PREFIX + name)',
    [...constants, ...(cfg.version ? ['__version__ = VERSION'] : [])].join('\n'),
    ...functions,
    ...(cfg.submodules?.length
      ? [
          cfg.submodules
            .map((/** @type {string} */ m) => `from . import ${m}  # noqa: E402  (also reachable as symcrys.${m})`)
            .join('\n'),
        ]
      : []),
  ];
  let text = sections.join('\n\n\n') + '\n';
  const typing = [
    'Any',
    'Iterator',
    'Literal',
    'Mapping',
    'Optional',
    'Sequence',
    'TypedDict',
    'Union',
    'final',
    'overload',
  ].filter((w) => new RegExp(`\\b${w}\\b`).test(text.replace('IMPORTS', '')));
  const nptyping = ['ArrayLike', 'NDArray'].filter((w) => new RegExp(`\\b${w}\\b`).test(text));
  const imports = [
    ...(ctx.notRequired ? ['import sys'] : []),
    ...(ctx.usesOperations ? ['from dataclasses import dataclass'] : []),
    `from typing import ${[...(ctx.notRequired ? ['TYPE_CHECKING'] : []), ...typing].join(', ')}`,
    '',
    ...(ctx.notRequired
      ? [
          'if sys.version_info >= (3, 11):',
          '    from typing import NotRequired',
          'elif TYPE_CHECKING:  # Python 3.10: for type checkers; the annotations stay strings at run time',
          '    from typing_extensions import NotRequired',
          '',
        ]
      : []),
    'import numpy as np',
    ...(nptyping.length ? [`from numpy.typing import ${nptyping.join(', ')}`] : []),
    '',
    'from . import _shared',
    'from ._engine import SymcrysError, SymcrysInternalError',
  ].join('\n');
  text = text.replace('IMPORTS', imports);
  return text;
}

for (const [name, cfg] of Object.entries(api.modules)) {
  const file = path.join(root, cfg.py);
  let text;
  try {
    text = await generate(name, cfg);
  } catch (e) {
    problems.push(`${name}: ${/** @type {Error} */ (e).message}`);
    continue;
  }
  const original = readFileSync(file, 'utf8');
  if (text === original) continue;
  if (check) problems.push(`${cfg.py} is not what scripts/python-api.mjs writes`);
  else {
    writeFileSync(file, text);
    console.log(`python-api: ${cfg.py} written`);
  }
}

// Every entry of api.json must have been used by some module.
const own = (/** @type {Record<string, unknown>} */ o) => Object.keys(o).filter((k) => k !== '//');
const entries = [
  ...own(api.types).map((k) => `types.${k}`),
  ...[...api.numbers.int, ...api.numbers.float].map((k) => `numbers.${k}`),
  ...Object.entries(api.arrays)
    .filter(([k]) => k !== '//')
    .flatMap(([m, t]) => [...t.float64, ...t.int64].map((k) => `arrays.${m}.${k}`)),
  ...Object.entries(api.shapes)
    .filter(([k]) => k !== '//')
    .flatMap(([m, t]) => Object.keys(t).map((k) => `shapes.${m}.${k}`)),
  ...own(api.constants).map((k) => `constants.${k}`),
  ...own(api.operations).map((k) => `operations.${k}`),
  ...Object.entries(api.functions)
    .filter(([k]) => k !== '//')
    .flatMap(([f, o]) =>
      Object.entries(o).flatMap(([k, v]) =>
        k === 'args' ? Object.keys(v).map((a) => `functions.${f}.args.${a}`) : [`functions.${f}.${k}`],
      ),
    ),
];
for (const e of entries) if (!used.has(e)) problems.push(`packages/python/api.json: ${e} is not used`);

if (problems.length) {
  for (const p of problems) console.error(`python-api: ${p}`);
  if (check) console.error('python-api: run `npm run docs:python` and commit the result');
  process.exit(1);
}
if (check) console.log('python-api: the Python modules are current');
