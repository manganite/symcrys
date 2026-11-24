// The plane API, `symcrys/plane`: the 17 plane groups and the 10 plane point groups, in the lattice basis.
import {
  asymmetricUnit,
  describeOperationsOf,
  operations,
  planeGroup,
  symmetryElements,
  wyckoffPosition,
} from 'symcrys/plane';

console.log(planeGroup('p4gm'));
console.log(operations('p4gm')[4]); // b 1/4,y: -x+1/2,y+1/2
console.log(wyckoffPosition('p4gm', [0.5, 0])); // a point on the 2-fold centre at 1/2,0
console.log(asymmetricUnit('p4gm').vertices);
console.log(symmetryElements('p4gm').rotationPoints.map((r) => `${r.n} at ${r.point.join(',')}`));
// Any operation, e.g. the mirror x,0 of p31m (hexagonal basis): its axis, the normal of the line, is [1,2], not [0,1].
console.log(
  describeOperationsOf([
    {
      matrix: [
        [1, -1],
        [0, -1],
      ],
      translation: [0, 0],
    },
  ]),
);
