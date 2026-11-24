// Getting started with symcrys in TypeScript: the crystallographic API, `symcrys`.
import { allowedProperties, operations, pointGroup, settings, symbol, tensorForm } from 'symcrys';

// A crystal class by its key: the ITC short symbol of the class.
console.log(pointGroup('32'));

// Symbols and settings, as ITC gives them: the default setting, another one, the Schoenflies symbol.
console.log(symbol('32'), symbol('32', { setting: '312' }), symbol('32', { form: 'schoenflies' }));
console.log(settings('32').map((s) => `${s.index}: ${s.symbol}${s.isDefault ? ' (default)' : ''}`));

// The operations: each as ITA's matrix W in the lattice basis (the threefold rotation -y, x-y, z) and
// as a Cartesian matrix, x ∥ a and z ∥ c for hexagonal axes.
const threefold = operations('32')[1];
console.log(operations('32').length, threefold.matrix, threefold.cartesian);

// The form of a tensor: by its specification, or by the name of a property.
const SHG = { rank: 3, kind: 'polar', intrinsic: 'symmetric-last-pair' } as const;
console.log(tensorForm('mm2', SHG).parameters); // the free components as index lists: xxz, yyz, zxx, zyy, zzz
console.log(allowedProperties('32'));
