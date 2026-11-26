import { describe, expect, it } from 'vitest';
import { checkText } from './check-wording.mjs';

describe('check-wording', () => {
  it('passes neutral text', () => {
    expect(checkText('docs/x.md', 'Settings are those that ITC prints (ITA 2016, p. 114).')).toEqual([]);
  });

  it('finds persons, decision records, internal ids, issue numbers and dates in documentation', () => {
    const lines = [
      'As Thomas said.',
      'Decided by the owner.',
      'The maintainer agreed.',
      'See #137 C1.',
      'Fixed in #121.',
      'On 2026-11-25.',
      'Chosen while implementing.',
    ];
    const findings = checkText('docs/x.md', lines.join('\n'));
    expect(findings.map((f) => Number(f.split(':')[1]))).toEqual([1, 2, 3, 4, 4, 5, 6, 7]);
  });

  it('allows the maintainer, issue numbers and dates in CLAUDE.md, but no names', () => {
    expect(checkText('CLAUDE.md', 'Merge on the maintainer OK; open work in #126; 2026-11-25.')).toEqual([]);
    expect(checkText('CLAUDE.md', 'Ask Thomas.')).toHaveLength(1);
  });

  it('allows issue numbers and dates in tests, not internal ids', () => {
    expect(checkText('packages/ts/src/a.test.ts', '// regression of #89, captured 2026-11-25')).toEqual([]);
    expect(checkText('packages/ts/src/a.test.ts', '// #137 H1')).toHaveLength(1);
  });

  it('checks references/ for persons only, besides decision records and internal ids', () => {
    expect(checkText('references/x.md', 'Transcribed on 2026-11-20, reported in #12.')).toEqual([]);
    expect(checkText('references/x.md', 'Checked by Thomas.')).toHaveLength(1);
  });

  it('names authors and copyright holders as metadata', () => {
    expect(checkText('README.md', '[MIT](LICENSE) © 2026 Thomas Lottermoser')).toEqual([]);
    expect(checkText('packages/ts/package.json', '"author": "Thomas Lottermoser",')).toEqual([]);
  });

  it('does not take colours or anchors for issue numbers', () => {
    expect(checkText('docs/_static/a.css', 'border: 1px solid #333; /* gradient(#123, #456) */')).toEqual([]);
    expect(checkText('docs/x.md', '[link](page.md#123)')).toEqual([]);
  });

  it('finds issues of other repositories, after a colon and in quotes', () => {
    expect(checkText('docs/x.md', 'manganite/crystallography-common#99')).toHaveLength(1);
    expect(checkText('docs/x.md', 'Fixed in: #121')).toHaveLength(1);
    expect(checkText('docs/x.md', "see '#12'")).toHaveLength(1);
  });

  it('reads "decided by" as a decision record only with a person or a date', () => {
    expect(checkText('docs/x.md', 'The sign is decided by the order of the planes.')).toEqual([]);
    expect(checkText('docs/x.md', 'Decided by the maintainer.')).toHaveLength(2);
    expect(checkText('docs/x.md', 'Decided on 2026-11-25.')).toHaveLength(2);
  });

  it('exempts authorship lines only, not prose that mentions authors', () => {
    expect(checkText('docs/x.md', 'Thomas checked the authors of the table.')).toHaveLength(1);
    expect(checkText('packages/python/pyproject.toml', 'authors = [{ name = "Thomas Lottermoser" }]')).toEqual([]);
    expect(checkText('docs/conf.py', 'copyright = "2026 Thomas Lottermoser"')).toEqual([]);
  });
});
