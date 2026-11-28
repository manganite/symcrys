// Times the heavy calls of the built library (packages/ts/dist/; npm run build first) in Node, so
// that a regression shows: npm run benchmark. The numbers depend on the machine; compare
// them with a run of the previous version on the same machine, not with fixed values. The Python
// package runs the same code in QuickJS, several times slower (3 to 4 times for these calls).

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
 * Operations with rounding errors, as a caller gives them; the caches keep them after the first call.
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

// A list the caches have not seen, on every call: one entry moved by a different amount far below
// the tolerance, so the closure and the projection run each time.
let shift = 0;
/** @param {ReturnType<typeof rounded>} ops */
const fresh = (ops) => {
  shift += 1;
  return ops.map((op, i) =>
    i === 1
      ? { ...op, cartesian: op.cartesian.map((row, r) => row.map((x, c) => (r === c ? x + shift * 1e-12 : x))) }
      : op,
  );
};
time(
  'tensorFormOf m-3m, piezoelectric, new list each call',
  () => classes.tensorFormOf(fresh(cubic), 'piezoelectric'),
  5,
);
time("allowedPropertiesOf m-3m1', new list each call", () => magnetic.allowedPropertiesOf(fresh(grey)), 5);
time("allowedPropertiesOf m-3m1'", () => magnetic.allowedPropertiesOf(grey));
time(
  'rotateTensor, rank 4',
  () => classes.rotateTensor(tensor4, turn, { rank: 4, kind: 'polar', intrinsic: 'none' }),
  2000,
);
const vectors = Array.from({ length: 1000 }, (_, i) => [Math.sin(i), Math.cos(i), 1]);
time(
  'rotateTensor, rank 1, a loop over 1000 tensors',
  () => vectors.map((v) => classes.rotateTensor(v, turn, 'pyroelectric')),
  20,
);
// rotateTensors at ranks 1 to 4: one rotation for 1000 tensors, one rotation per tensor, an empty list.
const turns = Array.from({ length: 1000 }, (_, i) => classes.operations('m-3m')[i % 48].cartesian);
for (const rank of [1, 2, 3, 4]) {
  const spec = { rank, kind: 'polar', intrinsic: 'none' };
  const list = Array.from({ length: 1000 }, (_, i) => Array.from({ length: 3 ** rank }, (_, j) => Math.sin(i + j)));
  time(`rotateTensors, rank ${rank}, 1000 tensors, one rotation`, () => classes.rotateTensors(list, turn, spec), 5);
  time(`rotateTensors, rank ${rank}, 1000 tensors, 1000 rotations`, () => classes.rotateTensors(list, turns, spec), 5);
}
time('rotateTensors, an empty list', () => classes.rotateTensors([], turn, 'pyroelectric'), 2000);
// The first call checks the list and makes it exact; later calls with other directions reuse it.
let shiftDirection = 0;
time(
  'siteSymmetryOf + orbitOf of m-3m, new direction',
  () => {
    shiftDirection += 1;
    classes.siteSymmetryOf(cubic, [1, 2, 3 + shiftDirection]);
    classes.orbitOf(cubic, [1, 2, 3 + shiftDirection]);
  },
  200,
);
time('siteSymmetry m-3m, [111]', () => classes.siteSymmetry('m-3m', { uvw: [1, 1, 1] }));
