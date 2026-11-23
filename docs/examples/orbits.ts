// The faces of a form in hexagonal axes, exactly, and the poles left after distorting the crystal.
import { operations, orbit, orbitOf } from 'symcrys';

// The rhombohedron {10-11} of -3m1: six faces, three indices each (i = -(h + k) left out).
console.log(
  orbit('-3m', { hkl: [1, 0, 1] })
    .map((f) => `(${f.hkl.join(' ')})`)
    .join(' '),
);
// Directions transform otherwise than faces in hexagonal axes: the threefold axis of 3.
console.log(
  orbit('3', { uvw: [1, 0, 0] })
    .map((d) => `[${d.uvw.join(' ')}]`)
    .join(' '),
);
console.log(
  orbit('3', { hkl: [1, 0, 0] })
    .map((f) => `(${f.hkl.join(' ')})`)
    .join(' '),
);
// The integer matrix of the threefold rotation in the lattice basis (ITA: -y, x-y, z).
console.log(JSON.stringify(operations('3')[1].matrix));

// A cube flattened along z keeps the operations of 4/mmm: the six faces of {100} fall into two orbits.
const kept = operations('m-3m').filter((op) => Math.abs(op.cartesian[2][2]) === 1);
for (const v of [
  [1, 0, 0],
  [0, 0, 1],
] as const)
  console.log(v, orbitOf(kept, v).length, 'poles');
