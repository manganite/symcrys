import { describe, expect, it } from 'vitest';
import pkg from '../package.json' with { type: 'json' };
import { VERSION } from './index.js';

describe('VERSION', () => {
  it('equals the version in package.json', () => {
    expect(VERSION).toBe(pkg.version);
  });

  it('is a plain SemVer version', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
