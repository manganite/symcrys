// Checks the built output in dist/ (npm run check:dist, after npm run build).
//
// The apps copy dist/ into lib/kern/ and load it unbundled in the browser, so every module must
// import only relative paths ending in .js: no bare package names (no runtime dependencies) and no
// node: built-ins. The .d.ts files must not pull in other type packages either. Also checks that
// the package entry points exist, that no test-only code was built, and that the built module
// loads in Node and reports the version of package.json.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
/** @type {string[]} */
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
const rel = (/** @type {string} */ file) => relative(root, file);

// Entry points named in package.json
const entry = pkg.exports['.'];
for (const target of new Set([pkg.main, pkg.types, entry.types, entry.default])) {
  if (!existsSync(join(root, target))) errors.push(`entry point ${target} does not exist`);
}

// No test-only code in the build (CLAUDE.md, "Tests")
for (const file of all) {
  if (/\.(test|fixtures)\.(js|d\.ts)(\.map)?$/.test(file) || file.includes(`${sep}testUtils${sep}`)) {
    errors.push(`test-only file in dist: ${rel(file)}`);
  }
}

// Imports, re-exports, dynamic imports, type imports and triple-slash directives, read by the
// TypeScript scanner, so that text in comments and strings is not mistaken for an import.
for (const file of all.filter((f) => f.endsWith('.js') || f.endsWith('.d.ts'))) {
  const info = ts.preProcessFile(readFileSync(file, 'utf8'), true, true);
  for (const { fileName } of info.importedFiles) {
    if (!/^\.{1,2}\//.test(fileName) || !fileName.endsWith('.js')) {
      errors.push(`${rel(file)}: import '${fileName}' is not a relative .js path`);
    }
  }
  for (const { fileName } of [...info.typeReferenceDirectives, ...info.libReferenceDirectives]) {
    errors.push(`${rel(file)}: triple-slash reference to '${fileName}'`);
  }
  for (const { fileName } of info.referencedFiles) {
    if (!/^\.{1,2}\//.test(fileName)) errors.push(`${rel(file)}: triple-slash path '${fileName}'`);
  }
}

// The built module loads and carries the right version
const mod = await import(pathToFileURL(join(root, entry.default)).href);
if (mod.VERSION !== pkg.version) {
  errors.push(`dist reports VERSION ${mod.VERSION}, package.json has ${pkg.version}`);
}

if (errors.length > 0) {
  console.error(errors.map((e) => `check:dist: ${e}`).join('\n'));
  process.exit(1);
}
console.log(`check:dist: ${all.length} files in dist/ OK`);
