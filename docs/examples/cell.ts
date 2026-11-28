// The cell of a hexagonal crystal, an angle between two faces, the operations of 6/mmm that a
// distortion of the angle γ leaves, and a change to the triple hexagonal cell H₁.
import {
  angleBetweenPlanes,
  changeOfCoordinates,
  directionToFourIndices,
  latticeFromParameters,
  metricTensor,
  operations,
  residualOperationsOf,
} from 'symcrys';

const hexagonal = { a: 3, b: 3, c: 5, alpha: 90, beta: 90, gamma: 120 };
const basis = latticeFromParameters(hexagonal);
console.log(
  'metric tensor:',
  metricTensor(basis).map((row) => row.map((x) => +x.toFixed(6))),
);
console.log('(100) to (010):', angleBetweenPlanes(basis, [1, 0, 0], [0, 1, 0]).toFixed(4), 'degrees');
console.log('[110] in four indices:', directionToFourIndices([1, 1, 0]));

// residualOperationsOf reads the matrix W in the lattice basis (`matrix`) of each operation.
const ops = operations('6/mmm');
const distorted = latticeFromParameters({ ...hexagonal, gamma: 121 });
console.log('operations kept at gamma = 120:', residualOperationsOf(ops, basis).length);
console.log('operations kept at gamma = 121:', residualOperationsOf(ops, distorted).length);

// The triple hexagonal cell H₁ of ITA 2016 Table 1.5.1.1: a′ = a − b, b′ = a + 2b, c′ = c.
const toH1 = changeOfCoordinates(
  {
    linearPart: [
      [1, 1, 0],
      [-1, 2, 0],
      [0, 0, 1],
    ],
  },
  { planes: [[1, 0, 0]], metric: metricTensor(basis) },
);
console.log('(100) in the triple cell:', toH1.planes?.[0]);
console.log('a′ in the triple cell:', Math.sqrt(toH1.metric?.[0][0] ?? 0).toFixed(4));
