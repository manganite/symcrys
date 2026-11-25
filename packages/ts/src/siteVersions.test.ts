/**
 * The plan of the versioned documentation site (#57, scripts/assemble-site.mjs): the newest release
 * at the root, the newest PATCH of each MINOR under X.Y/, newest first; other files left out.
 */

import { describe, expect, it } from 'vitest';
import { planSite } from '../../../scripts/assemble-site.mjs';

describe('planSite', () => {
  it('puts the newest release at the root and each MINOR under its folder', () => {
    const { versions, tarballs } = planSite([
      'symcrys-site-0.14.0.tar.gz',
      'symcrys-site-0.14.2.tar.gz',
      'symcrys-site-0.15.0.tar.gz',
      'symcrys-site-1.0.0.tar.gz',
      'symcrys-site-0.14.1.tar.gz',
      'symcrys-0.15.0.tgz',
      'symcrys-site-1.1.0-beta.1.tar.gz',
    ]);
    expect(versions).toEqual([
      { label: '1.0.0 (newest)', version: '1.0.0', path: '' },
      { label: '1.0 (1.0.0)', version: '1.0.0', path: '1.0/' },
      { label: '0.15 (0.15.0)', version: '0.15.0', path: '0.15/' },
      { label: '0.14 (0.14.2)', version: '0.14.2', path: '0.14/' },
    ]);
    expect(tarballs).toEqual({
      '': 'symcrys-site-1.0.0.tar.gz',
      '1.0/': 'symcrys-site-1.0.0.tar.gz',
      '0.15/': 'symcrys-site-0.15.0.tar.gz',
      '0.14/': 'symcrys-site-0.14.2.tar.gz',
    });
  });

  it('orders by number, not as text', () => {
    const { versions } = planSite(['symcrys-site-0.9.0.tar.gz', 'symcrys-site-0.10.0.tar.gz']);
    expect(versions.map((v) => v.path)).toEqual(['', '0.10/', '0.9/']);
  });

  it('plans nothing without a site', () => {
    expect(planSite(['symcrys-0.14.0.tgz'])).toEqual({ versions: [], tarballs: {} });
  });
});
