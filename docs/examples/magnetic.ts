// The magnetic API, `symcrys/magnetic`: the same function names for the 122 magnetic point groups.
import { allowedProperties, operations, pointGroup, tensorForm } from 'symcrys/magnetic';

console.log(pointGroup("4'/mmm'"));
console.log(operations("4'/mmm'")[2].timeReversal);
console.log(allowedProperties("m'm'2"));
console.log(tensorForm("m'm'2", 'ferromagnetic').parameters); // M_s along z
