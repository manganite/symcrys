// A cube stretched along [111] keeps the operations that map [111] onto ±[111]: the class -3m, with
// its threefold axis along [111], so in no setting of symcrys.
import { describeOperationsOf, operations, pointGroupOf } from 'symcrys';

const along111 = (m: readonly (readonly number[])[]) => {
  const v = m.map((row) => row[0] + row[1] + row[2]);
  return v.every((x) => Math.abs(x - v[0]) < 1e-9) && Math.abs(Math.abs(v[0]) - 1) < 1e-9;
};
const kept = operations('m-3m').filter((op) => along111(op.cartesian));
console.log(kept.length, 'operations:', pointGroupOf(kept));
for (const d of describeOperationsOf(kept).filter((x) => x.n === 3)) {
  console.log(d.kind, d.n, d.sense, d.axis?.cartesian.map((x) => x.toFixed(3)).join(' '));
}
