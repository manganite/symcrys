// A dragged point in p4gm: the distance to each Wyckoff position in a cell of 5 Å, where it
// lies within a tolerance, and the symmetry elements in a box of two by one cells for drawing.
import {
  latticeFromParameters,
  siteSymmetry,
  symmetryElements,
  wyckoffDistances,
  wyckoffPosition,
} from 'symcrys/plane';

const point = { point: [0.47, 0.05] };
const basis = latticeFromParameters({ a: 5, b: 5, gamma: 90 });
for (const d of wyckoffDistances('p4gm', point, { basis })) {
  console.log(
    d.letter,
    d.siteSymmetry,
    d.point.map((x) => +x.toFixed(3)),
    `${d.distance.toFixed(3)} Å`,
  );
}
// Which position wins, within which radius, is the application's choice; here 0.06 per coordinate.
console.log(wyckoffPosition('p4gm', point, { tolerance: 0.06 }).letter);
console.log(siteSymmetry('p4gm', point, { tolerance: 0.06 }));

const elements = symmetryElements('p4gm', {
  box: [
    [0, 0],
    [2, 1],
  ],
});
console.log(elements.rotationPoints.length, 'rotation points,', elements.lines.length, 'lines');
console.log(
  elements.lines.filter((l) => l.kind === 'mirror').map((l) => `m through ${l.point} along [${l.direction}]`),
);
