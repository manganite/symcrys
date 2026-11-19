# symcrys

Crystallographic symmetry calculations in TypeScript: point groups with their settings, symbols,
symmetry elements, site symmetry and Wyckoff positions, and the forms of property tensors they
allow. A library without runtime dependencies that runs unbundled in browsers and in Node.

```bash
npm install symcrys
```

```ts
import { operations, symbol, tensorForm } from 'symcrys';

symbol('32'); // '321': ITC short symbol of the default setting
operations('-3m'); // 12 operations, Cartesian matrices; x ∥ a, z ∥ c
tensorForm('mm2', { rank: 3, parity: 'polar', timeParity: 'i', intrinsic: 'jk' }).parameters;
// [[0,0,2], [1,1,2], [2,0,0], [2,1,1], [2,2,2]]: xxz, yyz, zxx, zyy, zzz
```

Documentation, conventions (ITC and Birss) and their print sources, and the Python package of the
same version: [github.com/manganite/symcrys](https://github.com/manganite/symcrys).
