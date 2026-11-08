// Checks the built output in dist/ (npm run check:dist, after npm run build).
//
// The apps copy dist/ into lib/kern/ and load it unbundled in the browser, so every module must
// import only relative paths ending in .js: no bare package names (no runtime dependencies) and no
// node: built-ins. Also checks that the package entry points exist, that no test file was built,
// and that the built module loads in Node and reports the version of package.json.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const errors = [];

if (!existsSync(dist)) {
  console.error('dist/ is missing; run npm run build first.');
  process.exit(1);
}

/** @param {string} dir @returns {string[]} */
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)],
  );
}

const all = files(dist);

// Entry points named in package.json
const targets = [pkg.main, pkg.types, ...Object.values(pkg.exports['.'])];
for (const target of targets) {
  if (!existsSync(join(root, target))) errors.push(`entry point ${target} does not exist`);
}

// No tests in the build
for (const file of all) {
  if (/\.test\.(js|d\.ts)$/.test(file)) errors.push(`test file in dist: ${relative(root, file)}`);
}

// Import specifiers: static imports and re-exports, side-effect imports, dynamic imports
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*|\bimport\s*\(\s*)(['"])([^'"]+)\1/g;
for (const file of all.filter((f) => f.endsWith('.js') || f.endsWith('.d.ts'))) {
  const code = readFileSync(file, 'utf8');
  for (const [, , spec] of code.matchAll(SPECIFIER)) {
    if (!/^\.{1,2}\//.test(spec) || !spec.endsWith('.js')) {
      errors.push(`${relative(root, file)}: import '${spec}' is not a relative .js path`);
    }
  }
}

// The built module loads and carries the right version
const mod = await import(pathToFileURL(join(root, pkg.exports['.'].import)).href);
if (mod.VERSION !== pkg.version) {
  errors.push(`dist reports VERSION ${mod.VERSION}, package.json has ${pkg.version}`);
}

if (errors.length > 0) {
  console.error(errors.map((e) => `check:dist: ${e}`).join('\n'));
  process.exit(1);
}
console.log(`check:dist: ${all.length} files in dist/ OK`);
