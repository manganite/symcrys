// Bundles the built TypeScript package (packages/ts/dist/, npm run build first) into one script for
// the Python package (npm run bundle:python). The script runs in the JavaScript engine of the
// Python package (quickjs-ng) and defines one global object, `__symcrys`, the whole boundary
// between the two languages (#30):
//
//   __symcrys.call(name, argsJson) → resultJson   calls an exported function with JSON arguments;
//                                                  the result is {"result": …} or {"error": {name, message}}
//   __symcrys.value(name) → json                   an exported constant
//   __symcrys.exports() → json                     names and kinds ("function", "value") of all exports
//
// Writes packages/python/src/symcrys/_bundle.js (not committed; built for every Python build and
// test). Checks that dist/ reports the version of packages/ts/package.json and of
// packages/python/pyproject.toml, so the Python package always carries the TypeScript code of its
// own version.

import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const tsPackage = JSON.parse(readFileSync(`${root}packages/ts/package.json`, 'utf8'));
const pyproject = readFileSync(`${root}packages/python/pyproject.toml`, 'utf8');
const pyVersion = pyproject.match(/^version = "([^"]+)"$/m)?.[1];
const dist = `${root}packages/ts/dist/index.js`;
const { VERSION } = await import(pathToFileURL(dist).href);

const errors = [];
if (VERSION !== tsPackage.version)
  errors.push(`dist/ reports ${VERSION}, packages/ts/package.json ${tsPackage.version}`);
if (pyVersion !== tsPackage.version)
  errors.push(`pyproject.toml has ${pyVersion}, packages/ts/package.json ${tsPackage.version}`);
if (errors.length > 0) {
  console.error(errors.map((e) => `bundle:python: ${e}; run npm run build, keep the versions equal`).join('\n'));
  process.exit(1);
}

const entry = `
import * as symcrys from ${JSON.stringify(dist.replaceAll('\\', '/'))};
const failure = (e) => ({ error: { name: (e && e.name) || 'Error', message: String((e && e.message) || e) } });
globalThis.__symcrys = {
  call(name, argsJson) {
    try {
      const f = symcrys[name];
      if (typeof f !== 'function') throw new TypeError(name + ' is not a function of symcrys');
      return JSON.stringify({ result: f(...JSON.parse(argsJson)) });
    } catch (e) {
      return JSON.stringify(failure(e));
    }
  },
  value(name) {
    if (!(name in symcrys) || typeof symcrys[name] === 'function') throw new TypeError(name + ' is not a value of symcrys');
    return JSON.stringify(symcrys[name]);
  },
  exports() {
    return JSON.stringify(Object.keys(symcrys).map((name) => [name, typeof symcrys[name] === 'function' ? 'function' : 'value']));
  },
};
`;

await build({
  stdin: { contents: entry, resolveDir: root, sourcefile: 'python-entry.js', loader: 'js' },
  bundle: true,
  format: 'iife',
  target: 'es2022',
  platform: 'neutral',
  legalComments: 'none',
  banner: { js: `// symcrys ${VERSION}, bundled for the Python package by scripts/bundle-python.mjs. MIT licence.` },
  outfile: `${root}packages/python/src/symcrys/_bundle.js`,
  logLevel: 'warning',
});
console.log(`bundle:python: symcrys ${VERSION} → packages/python/src/symcrys/_bundle.js`);
