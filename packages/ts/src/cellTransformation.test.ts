/**
 * cellTransformation: behaviour that no printed table anchors (the printed changes of cell are in
 * cellTransformation.reference.test.ts).
 */

import { describe, expect, it } from 'vitest';
import * as classes from './index.js';

describe('a name of Object.prototype as a centring (#233)', () => {
  // A name such as 'toString' is an unknown centring, refused with the message for any other one
  // ('Q'): the centrings the lattice has.
  it('is an unknown centring of the lattice (#233)', () => {
    for (const name of ['toString', '__proto__', 'constructor']) {
      expect(() => classes.cellTransformation('tP', { centring: name as never }, {})).toThrow(
        /its centring is one of P, C/,
      );
    }
  });

  it('an unknown centring names the centrings of the lattice', () => {
    expect(() => classes.cellTransformation('tP', { centring: 'Q' as never }, {})).toThrow(
      /its centring is one of P, C/,
    );
  });
});
