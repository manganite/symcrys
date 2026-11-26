# ITC: point-group symbols printed in a non-standard orientation

Inventory of every place found in the _International Tables for Crystallography_ where the symbol
of a point group (crystal class, grey or black-and-white magnetic point group) is printed in an
orientation other than its standard one, so that symcrys keeps exactly the settings ITC prints
(step 6 of #121; criterion of `CLAUDE.md`, "Pure ITC": "printed as the symbol of the point group in
that orientation anywhere in ITC").

Sources:

- ITC Vol. D, 2nd edition (2013).
- ITA (Vol. A), 6th edition (2016): Chapter 1.5 (pp. 75–106), Chapter 1.6 (pp. 107–131),
  Chapter 3.2 (pp. 720–776).

Read on 2026-11-23. Every symbol transcribed here with a prime or an overbar was read from print;
a full-text search does not show primes and overbars reliably, so it served only to find candidate
pages. Rows marked "search only" were found by a full-text search of the volume and not read from
print; they carry no prime and no overbar. The ITA Table 3.2.3.2 rows rest on the
print-checked transcriptions `vol-a-table-3.2.3.2-headlines.md` and
`vol-a-table-3.2.3.2-wyckoff-positions.md`, Table 3.2.2.2 on `vol-a-table-3.2.2.2.md`.

What was searched:

- ITC Vol. D Chapter 1.5 (pp. 106–152) completely: every page with a group symbol (pp. 110–113,
  119–124, 128–144) read from print, the others (pp. 106–109, 114–118, 125–127, 145–152, the last
  four references) by full-text search.
- ITC Vol. D Chapter 1.2 where it tabulates point groups: Tables 1.2.3.1 and 1.2.3.2 (p. 49),
  1.2.5.1 (p. 54), 1.2.6.2 (p. 57), 1.2.6.5 (pp. 58–59), 1.2.6.6 (p. 60), 1.2.6.11 (pp. 65–66),
  1.2.6.12 (p. 66).
- ITC Vol. D Chapter 1.1, § 1.1.4.7 to § 1.1.4.10 (pp. 16–31): headings of the reductions, by
  full-text search, and pp. 25–26 read from print.
- ITC Vol. D Chapters 1.3–1.11 and Parts 2–3: full-text search only, for oriented symbols
  (`2mm`, `m2m`, `211`, `m11`, `112`, `11m`, `312`, `31m`, `-4m2`, primed orthorhombic symbols) and
  for orientations stated in words ("parallel to Ox", "⊥ x", "unique axis"). Hits in Chapter 1.6
  were read from print (Table 1.6.6.1, p. 174); hits in Part 3 are listed at the end, not
  inventoried row by row.
- ITA 2016: § 1.6.4 (p. 114) and § 1.6.5 (p. 126) read from print; Chapter 3.2 through the
  transcriptions named above and full-text search (Table 3.2.1.3, p. 724); Table 1.5.4.4 (pp. 97–106)
  by p. 97 read from print and full-text search.

"Not found" means not found in these pages; it is no statement about the rest of ITC.

Transcription conventions: a leading `-` is an overbar (`-4'` for 4̄′), `'` is the printed prime,
`[ ]` marks a symbol printed in square brackets (another orientation with the same tensor form).
"Group" is the symcrys key of the group. "Orientation" is the full symbol read along x, y, z for the
monoclinic and orthorhombic groups, along z, x, y for the trigonal and hexagonal groups and z, x, xy
for the tetragonal groups (ITC Vol. D § 1.5.7.1, p. 134), as symcrys writes its settings; a
monoclinic short symbol (printed `2/m'`) gets its unique axis from the place the note names. The
standard orientation is the one of ITC Vol. D Table 1.5.2.3 for the magnetic groups and the symcrys
default for the crystal classes (`docs/conventions.md`, "Settings"); a printed standard
orientation is not listed.

## Printed occurrences

| Group | Symbol as printed | Orientation (full symbol) | Source | Page | Note |
|---|---|---|---|---|---|
| 2 | 2 (unique axis c) | 1 1 2 | ITA Table 3.2.3.2 | 745 | headline "unique axis c" |
| 2 | 112 | 1 1 2 | ITC D § 1.5.7.1, list (1) | 134 | "unique axis z" |
| 2 | 112 | 1 1 2 | ITC D § 1.5.8.1, list (1) | 140 | "unique axis z" |
| 2 | 112 | 1 1 2 | ITC D Table 1.2.6.11 (e), (f) | 65 | little cogroup K_k; Kovalev's tables |
| 2 | 2 | 1 1 2 | ITC D Table 1.2.6.5 (b) | 58 | α = C_2z |
| 2 | 2 | 1 1 2 | ITC D Table 1.2.6.11 (b), (c) | 65 | monoclinic P and A: K = 2 at k = 00γ, so the axis is c (inferred) |
| 2 | 2 | 1 1 2 | ITC D § 1.1.4.8.2.1 | 18 | "Choosing the twofold axis parallel to Ox3"; Ox2 given after it; search only |
| 2 | 2 | 1 1 2 | ITC D § 1.1.4.10.7.1 (ii)(a), § 1.1.4.10.7.2 (ii)(a) | 29–30 | frame "parallel to Ox3" beside "parallel to Ox2" (`vol-d-1.1.4.10.7-axial-rank-2.md`) |
| 2 | 2 (2 ∥ x3) | 1 1 2 | ITC D Table 1.6.6.1 | 174 | beside 2 (2 ∥ x2) |
| 2 | 2 (2 ∥ x3) | 1 1 2 | ITC D Table 1.6.5.1 | 172 | search only |
| 2 | C2 (2) (twofold axis parallel to z) | 1 1 2 | ITC D Tables 1.7.2.2, 1.7.2.3 | 185–186 | the only monoclinic orientation there; search only |
| 2 | 211 | 2 1 1 | ITC D § 1.5.7.1, list (3) | 134 | "unique axis x" |
| 2 | 211 | 2 1 1 | ITC D § 1.5.8.1, list (3) | 140 | "unique axis x" |
| 2 | 211 | 2 1 1 | ITC D Table 1.2.6.11 (f) | 65 | orthorhombic I, k = (α ½ ½) |
| m | m (unique axis c) | 1 1 m | ITA Table 3.2.3.2 | 746 | headline "unique axis c" |
| m | 11m | 1 1 m | ITC D § 1.5.7.1, list (1) | 134 | "unique axis z" |
| m | 11m | 1 1 m | ITC D § 1.5.8.1, list (2) | 140 | "unique axis z" |
| m | 11m | 1 1 m | ITC D Table 1.2.3.1 | 49 | elements E, m_z |
| m | 11m | 1 1 m | ITC D Table 1.2.6.11 (d)–(i), (l)–(n) | 65–66 | little cogroups |
| m | m | 1 1 m | ITC D Table 1.2.6.5 (b) | 58 | α = σ_z |
| m | m (m ⊥ x3) | 1 1 m | ITC D Table 1.6.6.1 | 174 | beside m (m ⊥ x2) |
| m | m (m ⊥ x3) | 1 1 m | ITC D Table 1.6.5.1 | 172 | search only |
| m | Cs (m) (twofold axis parallel to z) | 1 1 m | ITC D Tables 1.7.2.4, 1.7.2.5 | 187–188 | search only |
| m | m11 | m 1 1 | ITC D § 1.5.7.1, list (3) | 134 | "unique axis x" |
| m | m11 | m 1 1 | ITC D § 1.5.8.1, list (4) | 140 | "unique axis x" |
| m | m11 | m 1 1 | ITC D Table 1.2.3.1 | 49 | elements E, m_x |
| m | m11 | m 1 1 | ITC D Table 1.2.3.2 | 49 | strata of Pmm2/Pmmm |
| m | m11 | m 1 1 | ITC D Table 1.2.6.11 (d)–(h) | 65 | little cogroups |
| 2/m | 2/m (unique axis c) | 1 1 2/m | ITA Table 3.2.3.2 | 747 | headline "unique axis c" |
| 2/m | 11 2/m | 1 1 2/m | ITC D § 1.5.7.1, list (1) | 134 | "unique axis z" |
| 2/m | 112/m | 1 1 2/m | ITC D Table 1.2.6.11 (f) | 65 | orthorhombic I |
| 2/m | 2/m | 1 1 2/m | ITC D Table 1.2.6.5 (b) | 58 | α = C_2z, β = σ_z |
| 2/m | C2h 2/m (twofold axis parallel to z) | 1 1 2/m | ITC D Tables 1.7.2.4, 1.7.2.5 | 187–188 | search only |
| 2/m | 2/m11 | 2/m 1 1 | ITC D § 1.5.7.1, list (3) | 134 | "unique axis x" |
| 2/m | 2/m11 | 2/m 1 1 | ITC D Table 1.2.6.11 (f) | 65 | orthorhombic I |
| 2/m | C2h = 2/m | 2/m 1 1 | ITC D Table 1.5.3.4 | 120 | moments along x (F) and y (A3); twofold axis U_2^1 = 2_x (Table 1.5.3.2, p. 120) |
| 2/m | C2h = 2/m | 2/m 1 1 | ITC D Table 1.5.3.6 | 123 | "by definition, the twofold axis is aligned along the x axis" (p. 124) |
| mm2 | 2mm | 2 m m | ITA § 1.6.4 | 114 | "the three point groups 2mm, m2m and mm2" |
| mm2 | 2mm | 2 m m | ITA § 1.6.5, text and Table 1.6.5.1 | 126 | column heads mmm, 2mm, m2m, mm2, 222 |
| mm2 | 2mm | 2 m m | ITA Table 3.2.3.2 | 748 | site symmetry of 2a (x,0,0) in mmm |
| mm2 | 2mm | 2 m m | ITA Table 3.2.1.3 | 724 | pinacoid in mmm: "mmm (2mm; m2m; mm2)"; search only |
| mm2 | [2mm] | 2 m m | ITC D Table 1.5.7.1 | 135 | in brackets after mm2 |
| mm2 | 2mm | 2 m m | ITC D § 1.5.8.1, list (5) | 140 | |
| mm2 | 2mm | 2 m m | ITC D Table 1.2.3.1 | 49 | elements E, m_y, m_z, 2_x |
| mm2 | 2mm | 2 m m | ITC D Table 1.2.6.11 (d)–(g) | 65 | orthorhombic P, C, I, F at k = α00 etc. |
| mm2 | 2mm | 2 m m | ITC D Table 1.2.6.12 | 66 | type I; see note (a) |
| mm2 | m2m | m 2 m | ITA § 1.6.4 | 114 | |
| mm2 | m2m | m 2 m | ITA § 1.6.5, text and Table 1.6.5.1 | 126 | |
| mm2 | m2m | m 2 m | ITA Table 3.2.3.2 | 748 | site symmetry of 2b (0,y,0) in mmm |
| mm2 | m2m | m 2 m | ITA Table 3.2.1.3 | 724 | pinacoid in mmm; search only |
| mm2 | [m2m] | m 2 m | ITC D Table 1.5.7.1 | 135 | in brackets |
| mm2 | m2m | m 2 m | ITC D § 1.5.8.1, list (6) | 140 | |
| mm2 | m2m | m 2 m | ITC D Table 1.2.3.1 | 49 | elements E, m_x, m_z, 2_y |
| mm2 | m2m | m 2 m | ITC D Table 1.2.6.11 (d)–(g) | 65 | |
| -42m | -4m2 | -4 m 2 | ITA Table 3.2.3.2 | 751 | headline |
| -42m | -4m2 | -4 m 2 | ITA Table 3.2.2.2 | 739 | |
| -42m | [-4m2] | -4 m 2 | ITC D Table 1.5.7.1 | 135 | in brackets after -42m |
| -42m | -4m2 | -4 m 2 | ITC D § 1.5.8.1, list (7) | 140 | |
| -42m | -4m2 | -4 m 2 | ITC D Table 1.2.6.11 (i) | 65 | tetragonal I, k = (½ ½ ½); see note (b) |
| 32 | 312 | 3 1 2 | ITA Table 3.2.3.2 | 754 | headline, hexagonal axes |
| 32 | 312 | 3 1 2 | ITA Table 3.2.2.2 | 739 | |
| 32 | 312 | 3 1 2 | ITC D § 1.5.7.1, list (9) | 136 | |
| 32 | 312 | 3 1 2 | ITC D § 1.5.8.1, text | 140 | "same form for 32 (= 321) and 312" |
| 3m | 31m | 3 1 m | ITA Table 3.2.3.2 | 756 | headline, hexagonal axes |
| 3m | 3.m | 3 1 m | ITA Table 3.2.3.2 | 756, 757, 763 | site symmetry of the origin-line positions in 31m, -31m, -62m (`vol-a-table-3.2.3.2-wyckoff-positions.md`) |
| 3m | 31m | 3 1 m | ITA Table 3.2.2.2 | 739 | |
| 3m | 31m | 3 1 m | ITC D § 1.5.7.1, list (9) | 136 | |
| 3m | 31m | 3 1 m | ITC D § 1.5.8.1, text | 140 | "3m1 and 31m" |
| 3m | 31m (m ⊥ x2) | 3 1 m | ITC D Table 1.6.6.1 | 174 | beside 3m1 (m ⊥ x1) |
| -3m | -31m | -3 1 2/m | ITA Table 3.2.3.2 | 757 | headline, full symbol -3 1 2/m |
| -3m | -31m | -3 1 2/m | ITC D § 1.5.7.1, list (9) | 136 | |
| -6m2 | -62m | -6 2 m | ITA Table 3.2.3.2 | 763 | headline |
| -6m2 | -62m | -6 2 m | ITA Table 3.2.2.2 | 739 | |
| -6m2 | [-62m] | -6 2 m | ITC D Table 1.5.7.1 | 135 | in brackets after -6m2 |
| -6m2 | -62m (m ⊥ x2) | -6 2 m | ITC D Table 1.6.6.1 | 174 | beside -6m2 (m ⊥ x1) |
| -6m2 | -62m | -6 2 m | ITC D § 1.1.4.10.4.5 (ix) | 26 | orientation not stated; the diagram links d11, d12 and d26, i.e. twofold axis ∥ Ox1; see note (c) |
| -6m2 | -62m | -6 2 m | ITC D Table 1.2.6.12 | 66 | type I; see note (a) |
| mm21' | 2mm1' | 2 m m 1' | ITC D Table 1.2.6.12 | 66 | type II; see note (a) |
| mm21' | 2mm1' | 2 m m 1' | ITC D Table 1.2.6.6 (b) | 60 | "cf. 2mm"; see note (a) |
| -6m21' | -62m1' | -6 2 m 1' | ITC D Table 1.2.6.12 | 66 | type II; see note (a) |
| -6m21' | -62m1' | -6 2 m 1' | ITC D Table 1.2.6.6 (b) | 60 | search only; see note (a) |
| 2' | 112' | 1 1 2' | ITC D § 1.5.7.1, list (2) | 134 | "unique axis z" |
| 2' | 112' | 1 1 2' | ITC D § 1.5.8.1, list (2) | 140 | "unique axis z" |
| 2' | 2'11 | 2' 1 1 | ITC D § 1.5.7.1, list (4) | 134 | "unique axis x" |
| 2' | 2'11 | 2' 1 1 | ITC D § 1.5.8.1, list (4) | 140 | "unique axis x" |
| m' | 11m' | 1 1 m' | ITC D § 1.5.7.1, list (2) | 134 | "unique axis z" |
| m' | 11m' | 1 1 m' | ITC D § 1.5.8.1, list (1) | 140 | "unique axis z" |
| m' | m'11 | m' 1 1 | ITC D § 1.5.7.1, list (4) | 134 | "unique axis x" |
| m' | m'11 | m' 1 1 | ITC D § 1.5.8.1, list (3) | 140 | "unique axis x" |
| 2'/m' | 11 2'/m' | 1 1 2'/m' | ITC D § 1.5.7.1, list (2) | 134 | "unique axis z" |
| 2'/m' | 2'/m'11 | 2'/m' 1 1 | ITC D § 1.5.7.1, list (4) | 134 | "unique axis x" |
| 2'/m' | C2h(Ci) = 2'/m' | 2'/m' 1 1 | ITC D Table 1.5.3.4 | 120 | moments along x (A3) and y (F); axis x as for 2/m above |
| 2'/m' | C2h(Ci) = 2'/m' | 2'/m' 1 1 | ITC D Table 1.5.3.6 | 123 | axis x by definition (p. 124) |
| 2/m' | 11 2/m' | 1 1 2/m' | ITC D § 1.5.8.1, list (1) | 140 | "unique axis z" |
| 2/m' | 2/m'11 | 2/m' 1 1 | ITC D § 1.5.8.1, list (3) | 140 | "unique axis x" |
| 2/m' | C2h(C2) = 2/m' | 2/m' 1 1 | ITC D Table 1.5.3.4 | 120 | moments along x (A1) and y (A2); axis x |
| 2/m' | C2h(C2) = 2/m' | 2/m' 1 1 | ITC D Table 1.5.3.6 | 123 | axis x by definition |
| 2'/m | 11 2'/m | 1 1 2'/m | ITC D § 1.5.8.1, list (2) | 140 | "unique axis z" |
| 2'/m | 112'/m | 1 1 2'/m | ITC D § 1.5.8.1, text | 141 | spin-flop phase of Cr2O3, "C2h(Cs) = 112'/m" |
| 2'/m | 2'/m11 | 2'/m 1 1 | ITC D § 1.5.8.1, list (4) | 140 | "unique axis x" |
| 2'/m | C2h(Cs) = 2'/m | 2'/m 1 1 | ITC D Table 1.5.3.4 | 120 | moments along x (A2) and y (A1); axis x |
| 2'/m | C2h(Cs) = 2'/m | 2'/m 1 1 | ITC D Table 1.5.3.6 | 123 | axis x by definition |
| 2'2'2 | 22'2' | 2 2' 2' | ITC D Table 1.5.2.4 (c) | 113 | |
| 2'2'2 | 22'2' | 2 2' 2' | ITC D Table 1.5.5.2 | 131 | |
| 2'2'2 | 22'2' | 2 2' 2' | ITC D § 1.5.7.1, list (5) | 136 | |
| 2'2'2 | 22'2' | 2 2' 2' | ITC D § 1.5.8.1, list (5) | 140 | |
| 2'2'2 | 2'22' | 2' 2 2' | ITC D § 1.5.7.1, list (6) | 136 | |
| 2'2'2 | 2'22' | 2' 2 2' | ITC D § 1.5.8.1, list (6) | 140 | |
| m'm'2 | [2m'm'] | 2 m' m' | ITC D Table 1.5.8.1 | 139 | in brackets after m'm'2 |
| m'm'2 | 2m'm' | 2 m' m' | ITC D § 1.5.7.1, list (5) | 136 | |
| m'm'2 | 2m'm' | 2 m' m' | ITC D Table 1.2.6.12 | 66 | type III; see note (a) |
| m'm'2 | [m'2m'] | m' 2 m' | ITC D Table 1.5.8.1 | 139 | in brackets |
| m'm'2 | m'2m' | m' 2 m' | ITC D § 1.5.7.1, list (6) | 136 | |
| 2'm'm | [m2'm'] | m 2' m' | ITC D Table 1.5.8.1 | 139 | in brackets after 2'mm' |
| 2'm'm | [m2'm'] | m 2' m' | ITC D § 1.5.7.1, list (5) | 136 | in brackets |
| 2'm'm | m'm2' | m' m 2' | ITC D Table 1.5.2.4 (c) | 113 | |
| 2'm'm | m'm2' | m' m 2' | ITC D Table 1.5.5.2 | 131 | |
| 2'm'm | [m'm2'] | m' m 2' | ITC D § 1.5.7.1, list (6) | 136 | in brackets |
| 2'm'm | m'm2' | m' m 2' | ITC D § 1.5.8.1, list (5) | 140 | |
| 2'm'm | m'm2' | m' m 2' | ITC D Table 1.5.8.2 | 141 | six boracites and FeGaO3 |
| 2'm'm | m'm2' | m' m 2' | ITC D Table 1.5.8.3 | 142 | type 4 |
| 2'm'm | m'm2' | m' m 2' | ITC D Table 1.5.8.4 | 143 | |
| 2'm'm | m'm2' | m' m 2' | ITC D § 1.5.8.3, text | 143, 144 | three times on p. 143, once on p. 144 |
| 2'm'm | m'2'm | m' 2' m | ITC D Table 1.5.7.1 | 135 | first, followed by [2'm'm] |
| 2'm'm | [m'2'm] | m' 2' m | ITC D § 1.5.8.1, list (5) | 140 | in brackets |
| 2'm'm | mm'2' | m m' 2' | ITC D § 1.5.7.1, list (5) | 136 | |
| 2'm'm | mm'2' | m m' 2' | ITC D § 1.5.8.1, list (6) | 140 | |
| 2'm'm | 2'mm' | 2' m m' | ITC D Table 1.5.8.1 | 139 | first, followed by [m2'm'] |
| 2'm'm | 2'mm' | 2' m m' | ITC D § 1.5.7.1, list (6) | 136 | |
| 2'm'm | 2'mm' | 2' m m' | ITC D Table 1.2.5.1 and text | 54 | the text fixes m_y and m'_z |
| 2'm'm | 2'mm' | 2' m m' | ITC D Table 1.2.6.12 | 66 | type III; see note (a) |
| mm'm' | m'm'm | 2'/m' 2'/m' 2/m | ITC D Table 1.5.7.1 | 135 | the table's only orientation of D2h(C2h) |
| mm'm' | m'm'm (i.e. 2'_x/m'_x 2'_y/m'_y 2_z/m_z) | 2'/m' 2'/m' 2/m | ITC D § 1.5.5.1, text | 131 | structure (I) of the orthoferrites |
| mm'm' | 2'_x/m'_x 2'_y/m'_y 2_z/m_z | 2'/m' 2'/m' 2/m | ITC D eq. (1.5.6.5) | 133 | |
| mm'm' | m'm'm | 2'/m' 2'/m' 2/m | ITC D eq. (1.5.6.6) | 133 | |
| mm'm' | m'm'm | 2'/m' 2'/m' 2/m | ITC D § 1.5.7.2, text | 138 | twice (DyFeO3, orthoferrites) |
| mm'm' | m'm'm | 2'/m' 2'/m' 2/m | ITC D Table 1.5.8.3 | 142 | type 7 |
| mm'm' | m'm'm | 2'/m' 2'/m' 2/m | ITC D § 1.5.8.2, text | 142 | TbFeO3, YbFeO3 |
| mm'm' | m'm'm | 2'/m' 2'/m' 2/m | ITC D Table 1.2.6.12 | 66 | type III; see note (a) |
| mm'm' | m'mm' | 2'/m' 2/m 2'/m' | ITC D § 1.5.7.1, list (6) | 136 | |
| mmm' | m'mm | 2/m' 2'/m 2'/m | ITC D § 1.5.8.1, list (5) | 140 | |
| mmm' | m'mm | 2/m' 2'/m 2'/m | ITC D Table 1.2.6.12 | 66 | type III; see note (a) |
| mmm' | mm'm | 2'/m 2/m' 2'/m | ITC D § 1.5.8.1, list (6) | 140 | |
| 4'22' | 4'2'2 | 4' 2' 2 | ITC D § 1.5.7.1, list (7) | 136 | |
| 4'22' | 4'2'2 | 4' 2' 2 | ITC D § 1.5.8.1, list (7) | 140 | |
| 4'mm' | 4'm'm | 4' m' m | ITC D Table 1.5.8.1 | 139 | block 10 |
| 4'mm' | 4'm'm | 4' m' m | ITC D § 1.5.7.1, list (7) | 136 | |
| -4'2m' | [-4'm'2] | -4' m' 2 | ITC D Table 1.5.8.1 | 139 | in brackets after -4'2m' |
| -4'2m' | -4'm'2 | -4' m' 2 | ITC D § 1.5.7.1, list (7) | 136 | |
| -4'm2' | -4'2'm | -4' 2' m | ITC D Table 1.5.8.1 | 139 | first, followed by [-4'm2'] |
| -4'm2' | -4'2'm | -4' 2' m | ITC D § 1.5.7.1, list (7) | 136 | |
| -4'm2' | -4'2'm | -4' 2' m | ITC D Table 1.5.8.3 | 142 | type 8 |
| -4'm2' | -4'2'm | -4' 2' m | ITC D Table 1.2.6.12 | 66 | type III; see note (a) |
| -42'm' | [-4m'2'] | -4 m' 2' | ITC D Table 1.5.7.1 | 135 | in brackets after -42'm' |
| -42'm' | -4m'2' | -4 m' 2' | ITC D Table 1.5.8.1 | 139 | block 10 |
| 4'/mmm' | 4'/mm'm | 4'/m 2'/m' 2/m | ITC D § 1.5.7.1, list (7) | 136 | |
| 4'/mmm' | 4'/mm'm | 4'/m 2'/m' 2/m | ITC D Table 1.2.6.12 | 66 | type III; see note (a) |
| 4'/m'm'm | 4'/m'mm' | 4'/m' 2'/m 2/m' | ITC D § 1.5.8.1, list (7) | 140 | |
| 32' | 312' | 3 1 2' | ITC D § 1.5.7.1, list (10) | 136 | |
| 32' | 312' | 3 1 2' | ITC D § 1.5.8.1, text | 140 | "32'1 and 312'" |
| 3m' | 31m' | 3 1 m' | ITC D § 1.5.7.1, list (10) | 136 | |
| 3m' | 31m' | 3 1 m' | ITC D § 1.5.8.1, text | 140 | "3m'1 and 31m'" |
| -3m' | -31m' | -3 1 2'/m' | ITC D § 1.5.7.1, list (10) | 136 | |
| -3'm' | -3'1m' | -3' 1 2/m' | ITC D § 1.5.8.1, text | 140 | "-3'm'1 and -3'1m'" |
| -3'm | -3'1m | -3' 1 2'/m | ITC D § 1.5.8.1, text | 140 | "-3'm1 and -3'1m" |
| 6'22' | 6'2'2 | 6' 2' 2 | ITC D § 1.5.7.1, list (8) | 136 | |
| 6'mm' | 6'm'm | 6' m' m | ITC D § 1.5.7.1, list (8) | 136 | |
| 6'mm' | 6'm'm | 6' m' m | ITC D § 1.5.8.1, text | 140 | "C6v(C3v) = 6'm'm", among the groups that forbid the effect |
| -6'2m' | -6'm'2 | -6' m' 2 | ITC D Table 1.5.8.1 | 139 | first, followed by [-6'2m'] |
| -6'2m' | -6'm'2 | -6' m' 2 | ITC D § 1.5.7.1, list (8) | 136 | |
| -6'2m' | -6'm'2 | -6' m' 2 | ITC D Table 1.5.8.3 | 142 | type 8 |
| -6'm2' | [-6'2'm] | -6' 2' m | ITC D Table 1.5.8.1 | 139 | in brackets after -6'm2' |
| -6'm2' | -6'2'm | -6' 2' m | ITC D § 1.5.7.1, list (8) | 136 | |
| -6'm2' | -6'2'm | -6' 2' m | ITC D Table 1.2.6.12 | 66 | type III; see note (a) |
| -6m'2' | [-62'm'] | -6 2' m' | ITC D Table 1.5.7.1 | 135 | in brackets after -6m'2' |
| -6m'2' | -62'm' | -6 2' m' | ITC D Table 1.2.6.12 | 66 | type III; see note (a) |
| 6'/m'mm' | 6'/m'm'm | 6'/m' 2'/m' 2/m | ITC D § 1.5.7.1, list (8) | 136 | |
| 6'/m'mm' | 6'/m'm'm | 6'/m' 2'/m' 2/m | ITC D Table 1.5.8.3 | 142 | type 15 |
| 6'/m'mm' | 6'/m'm'm | 6'/m' 2'/m' 2/m | ITC D Table 1.2.6.12 | 66 | type III; see note (a) |
| 6'/mmm' | 6'/mm'm | 6'/m 2/m' 2'/m | ITC D Table 1.2.6.12 | 66 | type III; see note (a); the only occurrence found |

Notes:

- (a) Chapter 1.2 of ITC Vol. D uses some symbols as names of the group types without fixing a
  frame: it writes C2v as `2mm` and D3h as `-62m` in Tables 1.2.6.2 (p. 57), 1.2.6.6 (p. 60), 1.2.6.8
  and 1.2.6.9 (pp. 61–62), but its character table writes C2v as `mm2` with α = C_2z (Table 1.2.6.5,
  p. 58), and gives D3h (`-62m`) with β = C_2v, an axis the page does not name (p. 59). Table
  1.2.6.12 (p. 66) lists the 122 groups by type without a frame; its rows are read literally here.
  It also prints `2'2'` (type III of 222, with two entries only), presumably for 2'2'2.
- (b) Table 1.2.6.11 gives the little cogroups K_k of the Bravais classes in the orthorhombic way of
  writing (`2mm`, `m2m`, `m11`, `121`, `12/m1`) also for the tetragonal, hexagonal and cubic
  lattices (pp. 65–66), and `-4m2` for tetragonal I (d) and cubic F (d), `-6m2` for hexagonal P (c,
  d). Only the orthorhombic and monoclinic entries are rows above; for the others the frame of the
  symbol is not stated, and the rows would need the k vectors read against the lattice.
- (c) Chapter 1.1 uses `2mm` and `-62m` also as plain names of the classes (e.g. "Groups mmm, 2mm,
  222", pp. 15, 19, 27; "Groups 622, 6mm, -62m and 6/mm", pp. 20–31), while § 1.1.4.10.4.3 (p. 25)
  heads the same class `mm2`. Only § 1.1.4.10.4.5 (ix) is a row, because its diagram fixes the
  orientation.

## Orientations stated in words, under the standard symbol

Not rows above, because the symbol printed is the standard one:

- ITC Vol. D § 1.1.4.8.5.6 (p. 19) and § 1.1.4.10.4.5 (viii) (p. 26): "Group -42m – mirror
  perpendicular to Ox1 (twofold axis at 45°)", the orientation of `-4m2`.
- ITC Vol. D § 1.1.4.8.4.2, § 1.1.4.9.4.2, § 1.1.4.10.4.4 (pp. 18, 21, 25) and Tables 1.7.2.4,
  1.7.2.5 (pp. 187–188): 32 with the twofold axis ∥ Ox1, 3m with the mirror ⊥ Ox1, the standard
  orientations 321 and 3m1.

## Oriented site symmetries outside the orthorhombic system

ITA Table 3.2.3.2 writes site symmetries in the order of the symmetry directions of the lattice
(ITA Table 2.1.3.1), not along x, y, z. Besides the rows above (`2mm`, `m2m` in mmm; `3.m`), it
prints: `2mm.` (-4m2, p. 751), `2.mm` (-42m, p. 751; -43m, p. 768), `m2m.` and `m.m2` (4/mmm,
p. 752), `mm2` (-6m2, p. 762; 6/mmm, p. 764), `m2m` (-62m, p. 763; 6/mmm, p. 764), `2mm..` (m-3,
p. 766), `m.m2` (m-3m, p. 769); Table 3.2.1.3 (pp. 724–727) lists the same symbols as the site
symmetries of the point forms. They are point groups of type mm2 in the frame of a tetragonal,
hexagonal or cubic lattice. `2.mm` (mirrors ⊥ [110] and [1-10]) and the hexagonal `mm2` (twofold
axis along a tertiary direction such as [1-10], 30° from x) are orientations of mm2 other than
those with its elements along x, y, z; `2mm.` is mm2 in its standard orientation and `m2m.` and the hexagonal `m2m`
at x,0,0 are 2mm (twofold axis along x). Not inventoried further.

## Unique axis a and rhombohedral axes

- Unique axis x (a) of the monoclinic groups: `211`, `m11`, `2/m11` (ITC D pp. 49, 65, 120, 123,
  134, 140), `2'11`, `m'11`, `2'/m'11` (p. 134), `2/m'11`, `2'/m11` (p. 140), `2'/m'`, `2/m'`,
  `2'/m` with twofold axis ∥ x (Tables 1.5.3.4 and 1.5.3.6, pp. 120, 123). ITA 2016 prints the
  monoclinic classes only with unique axis b and c (Table 3.2.3.2); unique axis a occurs there for
  space groups only (Table 1.5.4.4, p. 97: P211, Pm11, P2/m11 and their cell choices; § 2.1.3.15,
  p. 170).
- Rhombohedral axes: 3, -3 (ITA p. 753), 32 (p. 755), 3m (p. 756), -3m (p. 759) and their polar and
  nonpolar directions in Table 3.2.2.2 (p. 739); a basis rather than a Cartesian orientation.

ITA Table 1.5.4.4 (pp. 97–106) prints space-group symbols only; the point-group orientations they
imply (e.g. Pmm2, P2mm, Pm2m for No. 25, p. 98; P211, Pm11, P2/m11, p. 97) are those of the rows
for `mm2` and of unique axis a above, and are not separate rows.

## Grey groups

ITC prints the grey groups with their standard symbol only (ITC D Tables 1.2.6.6, 1.2.6.12,
1.5.8.3; text pp. 119, 128, 142–146); the two grey groups found in another orientation (`2mm1'`,
`-62m1'`) come only from Chapter 1.2, see note (a).

## Occurrences in ITC Vol. D Part 3, not inventoried

Found by full-text search only (not read from print except where stated); listed so that the search
can be completed:

- Chapter 3.3 (twinning): `112/m` as intersection symmetry (pp. 417–418, 449); the black–white
  twin symbol K* = 2'/m' 2'/m' 2/m (p. 418, read from print) and "orthorhombic 2'22' ↔
  monoclinic 121" for Rochelle salt (p. 443, read from print) — dichromatic (twin) groups, of
  the types of mm'm' and 2'2'2 in non-standard orientations; `m2m` for NH4LiSO4 and another
  ferroelectric (pp. 452, 455); `2mm`, `m2m` (pp. 472–473); the twin groups K* = `312'` and
  `31m'` and the composite `-312'/m'` (p. 427, read from print by the review of #121 step 6a).
- Chapter 3.1: "C2v (2mm)" (p. 383).
- Chapter 3.4: `112`, `11m`, `112/m`, `211`, `m11` (p. 526, read from print) are layer-group
  and sectional-group symbols relative to a plane, not point-group settings.
