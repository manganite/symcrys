// Times the heavy calls of the built library (packages/ts/dist/; npm run build first) in Node, so
// that a regression shows (#100): npm run benchmark. The numbers depend on the machine; compare
// them with a run of the previous version on the same machine, not with fixed values. The Python
// package runs the same code in QuickJS, 3 to 10 times slower (CLAUDE.md, "Speed").

import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../packages/ts/dist/', import.meta.url));
const classes = await import(pathToFileURL(`${dist}index.js`).href);
const magnetic = await import(pathToFileURL(`${dist}magnetic.js`).href);

/**
 * Milliseconds of one call: the first call alone, then the mean of `n` further calls.
 * @param {string} label
 * @param {() => unknown} f
 * @param {number} [n]
 */
function time(label, f, n = 20) {
  let t = performance.now();
  f();
  const first = performance.now() - t;
  t = performance.now();
  for (let i = 0; i < n; i++) f();
  const later = (performance.now() - t) / n;
  console.log(
    `${label.padEnd(52)} first ${first.toFixed(2).padStart(8)} ms   later ${later.toFixed(3).padStart(8)} ms`,
  );
}

/**
 * Operations with rounding errors, as a caller gives them: a list the caches have not seen.
 * @param {readonly { cartesian: readonly (readonly number[])[]; timeReversal?: boolean }[]} ops
 */
const rounded = (ops) =>
  ops.map((op) => ({
    cartesian: op.cartesian.map((row) => row.map((x) => Math.round(x * 1e6) / 1e6)),
    timeReversal: op.timeReversal ?? false,
  }));

const cubic = rounded(classes.operations('m-3m'));
const grey = rounded(magnetic.operations("m-3m1'"));
const rank4 = { rank: 4, kind: 'polar', intrinsic: 'symmetric-pairs-exchangeable' };
const turn = [
  [0.36, 0.48, -0.8],
  [-0.8, 0.6, 0],
  [0.48, 0.64, 0.6],
];
const tensor4 = Array.from({ length: 81 }, (_, i) => Math.sin(i + 1));

time('pointGroupOf m-3m (first call builds the table)', () => classes.pointGroupOf(cubic));
time('tensorForm m-3m, rank 4', () => classes.tensorForm('m-3m', rank4));
time('tensorFormOf m-3m, piezoelectric', () => classes.tensorFormOf(cubic, 'piezoelectric'));
time('tensorFormOf m-3m, rank 4', () => classes.tensorFormOf(cubic, rank4));
time("allowedPropertiesOf m-3m1'", () => magnetic.allowedPropertiesOf(grey));
time(
  'rotateTensor, rank 4',
  () => classes.rotateTensor(tensor4, turn, { rank: 4, kind: 'polar', intrinsic: 'none' }),
  2000,
);
time('siteSymmetry m-3m, [111]', () => classes.siteSymmetry('m-3m', [1, 1, 1]));
