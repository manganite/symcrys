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
tensorForm('mm2', { rank: 3, parity: 'polar', intrinsic: 'jk' }).parameters;
// [[0,0,2], [1,1,2], [2,0,0], [2,1,1], [2,2,2]]: xxz, yyz, zxx, zyy, zzz
```

`symcrys` is the crystallographic API: the 32 crystal classes, without time reversal. The 122
magnetic point groups are in `symcrys/magnetic`, under the same function names; there `'32'` is a
white group, and a crystal without magnetic order has the grey group of its class:

```ts
import { allowedProperties } from 'symcrys/magnetic';

allowedProperties("321'"); // ['piezoelectric', 'gyrotropic']: quartz
allowedProperties("m'm'2"); // six of the seven names, 'ferromagnetic' among them
```

Documentation, conventions (ITC and Birss) and their print sources, and the Python package of the
same version: [github.com/manganite/symcrys](https://github.com/manganite/symcrys).
