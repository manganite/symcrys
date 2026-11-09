# Birss generating matrices σ(0) to σ(9)

Source: R. R. Birss, _Symmetry and Magnetism_ (North-Holland, Amsterdam, 1966), equation (2.17),
printed p. 48. Transcribed in manganite/birss-tables (`conventions-reference.md`, § 4).

Each matrix is given by its rows; entries are integers or `±1/2`, `±√3/2`. The frame is Birss's
Cartesian frame (x, y, z); `σ'(N)` is σ(N) combined with time reversal.

| N | Symbol | Row 1 | Row 2 | Row 3 | Operation |
|---|---|---|---|---|---|
| 0 | [1] | 1 0 0 | 0 1 0 | 0 0 1 | identity |
| 1 | [-1] | -1 0 0 | 0 -1 0 | 0 0 -1 | inversion |
| 2 | [2_y] | -1 0 0 | 0 1 0 | 0 0 -1 | twofold rotation about y |
| 3 | [2_z] | -1 0 0 | 0 -1 0 | 0 0 1 | twofold rotation about z |
| 4 | [-2_y] | 1 0 0 | 0 -1 0 | 0 0 1 | mirror perpendicular to y |
| 5 | [-2_z] | 1 0 0 | 0 1 0 | 0 0 -1 | mirror perpendicular to z |
| 6 | [3_z] | -1/2 √3/2 0 | -√3/2 -1/2 0 | 0 0 1 | threefold rotation about z |
| 7 | [4_z] | 0 1 0 | -1 0 0 | 0 0 1 | fourfold rotation about z |
| 8 | [-4_z] | 0 -1 0 | 1 0 0 | 0 0 -1 | fourfold rotoinversion about z |
| 9 | | 0 1 0 | 0 0 1 | 1 0 0 | threefold rotation about [111] (x → y → z → x, as a cyclic permutation of components) |
