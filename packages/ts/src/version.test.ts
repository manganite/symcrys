import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import pkg from '../package.json' with { type: 'json' };
import { VERSION } from './index.js';

const repo = (path: string) => readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8');

describe('VERSION', () => {
  it('equals the version in package.json', () => {
    expect(VERSION).toBe(pkg.version);
  });

  it('is a plain SemVer version', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('equals the version of the Python package (one version for both, GUIDE.md)', () => {
    expect(repo('packages/python/pyproject.toml').match(/^version = "([^"]+)"$/m)?.[1]).toBe(pkg.version);
  });
});

describe('packages', () => {
  it('ship the licence of the repository', () => {
    const licence = repo('LICENSE');
    expect(repo('packages/ts/LICENSE')).toBe(licence);
    expect(repo('packages/python/LICENSE')).toBe(licence);
  });
});
