// The plane API, `symcrys/plane`: the 17 plane groups and the 10 plane point groups, in the lattice basis.
import { asymmetricUnit, operations, planeGroup, symmetryElements, wyckoffPositionOf } from 'symcrys/plane';

console.log(planeGroup('p4gm'));
console.log(operations('p4gm')[4]); // b 1/4,y: -x+1/2,y+1/2
console.log(wyckoffPositionOf('p4gm', [0.5, 0])); // a point on the 2-fold centre at 1/2,0
console.log(asymmetricUnit('p4gm').vertices);
console.log(symmetryElements('p4gm').rotations.map((r) => `${r.order} at ${r.point.join(',')}`));
