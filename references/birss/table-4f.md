# Birss Table 4f: tensor forms of rank 4

Source: R. R. Birss, _Symmetry and Magnetism_ (North-Holland, Amsterdam, 1966), Table 4f,
printed pp. 62–66. Transcribed in manganite/birss-tables (`table-4f.md`, vendored in birss-app as
`birss-tables/`); taken over unchanged.

Checked against the printed pages in birss-app on 2026-07-09; five sites in the c4 column block of Part II were corrected then (header `xyxz(c4)`, `yxxz(c4)`; rows A4, C4, K4, L4, M4, O4, R4).

All five parts share the same 21 row labels (A4–U4) and have been merged here, split into Part I (columns 1–11) and Part II (columns 12–25) for readability.

Notation:
- Minus signs are literal minus signs.
- Headers such as `xxxz(4)` denote the distinct unrestricted permutations of `xxxz`.
- A header of the form `yxxx(x·3)` denotes the three distinct components obtained from `yxxx` by keeping its last index fixed and permuting all the others.
- A header of the form `xxyy(x:3)` denotes the three distinct components obtained from `xxyy` by keeping its first index fixed and permuting all the others.
- A header of the form `xxyz(c4)` denotes the four distinct cyclic permutations of `xxyz`.
- A header of the form `zzxy(xy:6)` denotes the six components obtained from `zzxy` by permuting its indices subject to the restriction that the order of `x` and `y` remains unchanged, although `x` and `y` need not remain adjacent.
- By the same convention, `zzyx(yx:6)` preserves the order `y, x`.

**Lockstep expansion rule (Birss, text preceding Table 4f, printed pages 62–66).** Quote: "Notations
of the type xz(2), xxy(3), yxxx(x.3), xxxz(4), xxyy(x:3), xxyz(c4) and zzxy(xy:6) indicate certain
permutations which must be applied to every component in the column. Thus, in considering a
permutation of a component at the top of a column, the same permutation must be applied to all the
components listed in that column for the various crystal classes." In other words, the header
annotation defines a set of **index-position** permutations, and each cell value is expanded by the
**same** position permutations (it is *not* an axis relabel). Worked example — row `K4`, column
`xxyz(c4)`, cell `-yyyz`: the four cyclic position shifts give `T_xxyz = -T_yyyz`,
`T_zxxy = -T_zyyy`, `T_yzxx = -T_yzyy`, `T_xyzx = -T_yyzy`. Sum cells (single-component columns,
e.g. `xxxx = yyxx+xyyx+yxyx`) are direct equalities with no expansion.

Row labels (A4-U4) are the rank-4 (m=4) instances of the symbol classes `A_m`-`U_m`
assigned to each of the 32 point groups in Table 4a — see `table-4a.md` for the
point-group -> symbol-class lookup and the full rank-mapping explanation (m=0 -> Table
4b, m=2 -> Table 4d, m=4 -> this table).

## Part I: Columns 1–11

| Row | xxxx | yyyy | zzzz | xxxy | yxxx(x·3) | yyyx | xyyy(y·3) | xxxz(4) | yyyz(4) | zzzx(4) | zzzy(4) |
|-----|------|------|------|------|-----------|------|-----------|---------|---------|---------|---------|
| A4 | xxxx | yyyy | zzzz | xxxy | yxxx | yyyx | xyyy | xxxz | yyyz | zzzx | zzzy |
| B4 | xxxx | yyyy | zzzz | xxxy | yxxx | yyyx | xyyy | 0 | 0 | 0 | 0 |
| C4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | xxxz | yyyz | zzzx | zzzy |
| D4 | xxxx | yyyy | zzzz | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| E4 | 0 | 0 | 0 | xxxy | yxxx | yyyx | xyyy | 0 | 0 | 0 | 0 |
| F4 | xxxx | xxxx | zzzz | xxxy | yxxx | -xxxy | -yxxx | 0 | 0 | 0 | 0 |
| G4 | xxxx | -xxxx | 0 | xxxy | yxxx | xxxy | yxxx | 0 | 0 | 0 | 0 |
| H4 | xxxx | xxxx | zzzz | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| I4 | 0 | 0 | 0 | xxxy | yxxx | -xxxy | -yxxx | 0 | 0 | 0 | 0 |
| J4 | xxxx | -xxxx | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| K4 | yyxx+xyyx+yxyx | xxxx | zzzz | yyxy+xyyy+yxyy | yxxx | -xxxy | -yxxx | xxxz | yyyz | 0 | 0 |
| L4 | yyxx+xyyx+yxyx | xxxx | zzzz | 0 | 0 | 0 | 0 | xxxz | 0 | 0 | 0 |
| M4 | 0 | 0 | 0 | yyxy+xyyy+yxyy | yxxx | -xxxy | -yxxx | 0 | yyyz | 0 | 0 |
| N4 | yyxx+xyyx+yxyx | xxxx | zzzz | yyxy+xyyy+yxyy | yxxx | -xxxy | -yxxx | 0 | 0 | 0 | 0 |
| O4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | xxxz | yyyz | 0 | 0 |
| P4 | yyxx+xyyx+yxyx | xxxx | zzzz | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Q4 | 0 | 0 | 0 | yyxy+xyyy+yxyy | yxxx | -xxxy | -yxxx | 0 | 0 | 0 | 0 |
| R4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | yyyz | 0 | 0 |
| S4 | xxxx | xxxx | xxxx | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| T4 | xxxx | xxxx | xxxx | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| U4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

## Part II: Columns 12–25

| Row | xxyy(x:3) | yyxx(y:3) | xxzz(x:3) | zzxx(z:3) | yyzz(y:3) | zzyy(z:3) | xxyz(c4) | xyxz(c4) | yxxz(c4) | yyxz(c4) | yxyz(c4) | xyyz(c4) | zzxy(xy:6) | zzyx(yx:6) |
|-----|-----------|-----------|-----------|-----------|-----------|-----------|----------|----------|----------|----------|----------|----------|------------|------------|
| A4 | xxyy | yyxx | xxzz | zzxx | yyzz | zzyy | xxyz | xyxz | yxxz | yyxz | yxyz | xyyz | zzxy | zzyx |
| B4 | xxyy | yyxx | xxzz | zzxx | yyzz | zzyy | 0 | 0 | 0 | 0 | 0 | 0 | zzxy | zzyx |
| C4 | 0 | 0 | 0 | 0 | 0 | 0 | xxyz | xyxz | yxxz | yyxz | yxyz | xyyz | 0 | 0 |
| D4 | xxyy | yyxx | xxzz | zzxx | yyzz | zzyy | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| E4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | zzxy | zzyx |
| F4 | xxyy | xxyy | xxzz | zzxx | xxzz | zzxx | 0 | 0 | 0 | 0 | 0 | 0 | zzxy | -zzxy |
| G4 | xxyy | -xxyy | xxzz | zzxx | -xxzz | -zzxx | 0 | 0 | 0 | 0 | 0 | 0 | zzxy | zzxy |
| H4 | xxyy | xxyy | xxzz | zzxx | xxzz | zzxx | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| I4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | zzxy | -zzxy |
| J4 | xxyy | -xxyy | xxzz | zzxx | -xxzz | -zzxx | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| K4 | xxyy | xxyy | xxzz | zzxx | xxzz | zzxx | -yyyz | -yyyz | -yyyz | -xxxz | -xxxz | -xxxz | zzxy | -zzxy |
| L4 | xxyy | xxyy | xxzz | zzxx | xxzz | zzxx | 0 | 0 | 0 | -xxxz | -xxxz | -xxxz | 0 | 0 |
| M4 | 0 | 0 | 0 | 0 | 0 | 0 | -yyyz | -yyyz | -yyyz | 0 | 0 | 0 | zzxy | -zzxy |
| N4 | xxyy | xxyy | xxzz | zzxx | xxzz | zzxx | 0 | 0 | 0 | 0 | 0 | 0 | zzxy | -zzxy |
| O4 | 0 | 0 | 0 | 0 | 0 | 0 | -yyyz | -yyyz | -yyyz | -xxxz | -xxxz | -xxxz | 0 | 0 |
| P4 | xxyy | xxyy | xxzz | zzxx | xxzz | zzxx | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Q4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | zzxy | -zzxy |
| R4 | 0 | 0 | 0 | 0 | 0 | 0 | -yyyz | -yyyz | -yyyz | 0 | 0 | 0 | 0 | 0 |
| S4 | xxyy | yyxx | yyxx | xxyy | xxyy | yyxx | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| T4 | xxyy | xxyy | xxyy | xxyy | xxyy | xxyy | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| U4 | xxyy | -xxyy | -xxyy | xxyy | xxyy | -xxyy | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
