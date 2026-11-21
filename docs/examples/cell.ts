// The cell of a hexagonal crystal, an angle between two faces, and the operations of 6/mmm that a
// distortion of the angle γ leaves.
import {
  angleBetweenPlanes,
  directionToFourIndices,
  latticeFromParameters,
  latticeOperations,
  metricTensor,
  residualOperations,
} from 'symcrys';

const hexagonal = { a: 3, b: 3, c: 5, alpha: 90, beta: 90, gamma: 120 };
const basis = latticeFromParameters(hexagonal);
console.log(
  'metric tensor:',
  metricTensor(basis).map((row) => row.map((x) => +x.toFixed(6))),
);
console.log('(100) to (010):', angleBetweenPlanes(basis, [1, 0, 0], [0, 1, 0]).toFixed(4), 'degrees');
console.log('[110] in four indices:', directionToFourIndices([1, 1, 0]));

const operations = latticeOperations('6/mmm');
const distorted = latticeFromParameters({ ...hexagonal, gamma: 121 });
console.log('operations kept at gamma = 120:', residualOperations(operations, basis).length);
console.log('operations kept at gamma = 121:', residualOperations(operations, distorted).length);
