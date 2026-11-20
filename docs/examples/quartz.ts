// Quartz in the two readings of the key '32'.
import * as crystal from 'symcrys';
import * as magnetic from 'symcrys/magnetic';

console.log('crystal class 32:', crystal.allowedProperties('32'));
console.log("grey group 321':", magnetic.allowedProperties("321'"));
console.log('white group 32:', magnetic.allowedProperties('32'));

// A question that involves time reversal is an error in the crystallographic API.
try {
  crystal.allowedProperties("321'" as crystal.PointGroupKey);
} catch (e) {
  console.log((e as Error).message);
}
