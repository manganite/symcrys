// The logic of the browser example (docs/examples/browser/form.js) run in Node, as the page runs it.
import * as symcrys from 'symcrys';
import { describeForm } from './browser/form.js';

for (const [key, setting, property] of [
  ['3m', 1, 'piezoelectric'],
  ['3m', 2, 'piezoelectric'],
  ['-1', 1, 'piezoelectric'],
] as const) {
  console.log(describeForm(symcrys, key, setting, property));
}
