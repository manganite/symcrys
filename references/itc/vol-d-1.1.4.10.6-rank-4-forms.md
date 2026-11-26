# ITC Vol. D § 1.1.4.10.6: forms of fourth-rank tensors (matrices of independent components)

Source: _International Tables for Crystallography_, Vol. D, 2nd edition (2013), Chapter 1.1 (A.
Authier, "Introduction to the properties of tensors"), § 1.1.4.10.6, "Independent components of the
matrix associated with a fourth-rank tensor according to the following point groups", printed pp.
27–29; the key to the symbols is printed on p. 28 (left column, under the diagrams of the groups 3,
-3), the two-index notation on p. 27. Transcribed 2026-11-20, diagram by diagram, before the forms
computed by symcrys for these tensors were compared. The numbers of independent components alone are
also in `vol-d-table-1.1.4.10.6-rank-4-counts.md` (transcribed 2026-11-19).

**The matrices.** Each diagram is a 6 × 6 matrix in the two-index notation of p. 27, with α, β = 1…6
for the index pairs 11, 22, 33, 23, 31, 12 (Voigt's notation, § 1.1.4.10.2, eq. (1.1.4.6), p. 24).
The section draws 30 diagrams for five tensors:

- p_αβ (elasto-optic) and c_αβ (elastic stiffnesses): p_αβ = p_ijkl, c_αβ = c_ijkl, without factors;
- π_αβ (piezo-optic): π_αβ = π_ijkl for β = 1, 2, 3 and π_ijkl + π_ijlk = 2π_ijkl for β = 4, 5, 6;
- s_αβ (elastic compliances) and Q_αβ (electrostriction, "same relation as for the elastic
  compliances"), eq. (1.1.4.12): the factor 1 if α and β are both ≤ 3, 2 if one of them is > 3,
  4 if both are.

p, π and Q are symmetric in the first and in the last index pair, the pairs not interchangeable:
the full matrix is drawn. For c and s the pairs are interchangeable and only the upper triangle is
drawn.

**The symbols** (key on p. 28; the first two are not spelled out there): a heavy dot is a nonzero
component; a line links related components; ⊖ "is a component numerically equal but opposite in sign
to the heavy dot component to which it is linked"; ⊕ is "equal to twice the heavy dot component to
which it is linked"; ⊙ is "equal to minus twice the heavy dot component to which it is linked"; ⊗
"is equal to 1/2(p11 − p12), (π11 − π12), 2(Q11 − Q12), 1/2(c11 − c12) and 2(s11 − s12),
respectively". A cell without a mark is zero.

Transcription conventions:

- One row per diagram. `Tensors`: the tensors named above the diagram.
- `Count`: the number printed under the diagram ("n independent components").
- `Links`: groups of linked marks separated by `;`. A mark is `αβ` (row α, column β, 1–6) followed by
  `f` (heavy dot), `o` (⊖), `d` (⊕, twice) or `m` (⊙, minus twice). A group of one heavy dot is an
  independent component.
- `Cross`: the cells marked ⊗.
- `Groups`: as printed, a leading minus sign for the overbar (`4/mm`, `6/mm` for 4/mmm, 6/mmm; `2mm`
  and `-62m` for the classes mm2 and -6m2).

Notes on the reading:

- In the crossing lines of the groups 3, -3 the ends were followed line by line: 42 (⊖) runs to 56,
  52 to 46, 62 to 26 (and so, through the vertical line, to 16), 24 (⊖) to 65, 25 to 64, 44 to 55,
  45 to 54 (⊖).
- In the hexagonal groups 6, -6, 6/m the long line runs from 26 to 62 and passes 44 with a bridge
  (a half circle around the dot): 44 is not on it.
- In the diagrams of p, π and Q of the groups 3, -3 the same line 26–62 is drawn straight through
  the dot 44, without a bridge. It is read as passing, not as a link: 44 has its own line to 55, the
  printed count is 12 (11 if 44 were linked), and the hexagonal diagrams bridge the same line.
- Where only the upper triangle is drawn for all five tensors (cubic (ii), spherical), the matrix
  of p, π and Q is read as symmetric, as for c and s.
- The section does not state the orientation of the axes for 32, 3m, -3m. The chapter states it for
  the third-rank tensors (§ 1.1.4.10.4.4, p. 25): "Group 32, twofold axis parallel to Ox1", "Group
  3m, mirror perpendicular to Ox1"; the diagrams here (14, 24 and 56 or 65 nonzero, 15 zero) are in
  that orientation.
- Cubic (i): beside the three diagonal lines, a line runs from 31 along the left and the top of the
  block to 12, and one from 13 along the right and the bottom to 32, so that 12, 23, 31 are linked,
  and 13, 21, 32.

| Section | Groups (as printed) | Tensors | Count | Links | Cross | Note |
|---|---|---|---:|---|---|---|
| 1.1.4.10.6.1 | -1, 1 | p, π, Q | 36 | 11f; 12f; 13f; 14f; 15f; 16f; 21f; 22f; 23f; 24f; 25f; 26f; 31f; 32f; 33f; 34f; 35f; 36f; 41f; 42f; 43f; 44f; 45f; 46f; 51f; 52f; 53f; 54f; 55f; 56f; 61f; 62f; 63f; 64f; 65f; 66f |  |  |
| 1.1.4.10.6.1 | -1, 1 | c, s | 21 | 11f; 12f; 13f; 14f; 15f; 16f; 22f; 23f; 24f; 25f; 26f; 33f; 34f; 35f; 36f; 44f; 45f; 46f; 55f; 56f; 66f |  |  |
| 1.1.4.10.6.2 | 2/m, 2, m | p, π, Q | 20 | 11f; 12f; 13f; 15f; 21f; 22f; 23f; 25f; 31f; 32f; 33f; 35f; 44f; 46f; 51f; 52f; 53f; 55f; 64f; 66f |  | twofold axis parallel to Ox2 |
| 1.1.4.10.6.2 | 2/m, 2, m | c, s | 13 | 11f; 12f; 13f; 15f; 22f; 23f; 25f; 33f; 35f; 44f; 46f; 55f; 66f |  | twofold axis parallel to Ox2 |
| 1.1.4.10.6.3 | mmm, 2mm, 222 | p, π, Q | 12 | 11f; 12f; 13f; 21f; 22f; 23f; 31f; 32f; 33f; 44f; 55f; 66f |  |  |
| 1.1.4.10.6.3 | mmm, 2mm, 222 | c, s | 9 | 11f; 12f; 13f; 22f; 23f; 33f; 44f; 55f; 66f |  |  |
| 1.1.4.10.6.4 (i) | 3, -3 | p | 12 | 11f 22f; 12f 21f; 13f 23f; 14f 24o 65f; 15o 25f 64f; 16f 26o 61o 62f; 31f 32f; 33f; 41f 42o 56f; 44f 55f; 45f 54o; 46f 51o 52f | 66 |  |
| 1.1.4.10.6.4 (i) | 3, -3 | π | 12 | 11f 22f; 12f 21f; 13f 23f; 14f 24o 65f; 15o 25f 64f; 16d 26m 61o 62f; 31f 32f; 33f; 41f 42o 56d; 44f 55f; 45f 54o; 46d 51o 52f | 66 |  |
| 1.1.4.10.6.4 (i) | 3, -3 | Q | 12 | 11f 22f; 12f 21f; 13f 23f; 14f 24o 65d; 15o 25f 64d; 16f 26o 61o 62f; 31f 32f; 33f; 41f 42o 56d; 44f 55f; 45f 54o; 46d 51o 52f | 66 |  |
| 1.1.4.10.6.4 (i) | 3, -3 | c | 7 | 11f 22f; 12f; 13f 23f; 14f 24o 56f; 15o 25f 46f; 33f; 44f 55f | 66 |  |
| 1.1.4.10.6.4 (i) | 3, -3 | s | 7 | 11f 22f; 12f; 13f 23f; 14f 24o 56d; 15o 25f 46d; 33f; 44f 55f | 66 |  |
| 1.1.4.10.6.4 (ii) | 32, 3m, -3m | p | 8 | 11f 22f; 12f 21f; 13f 23f; 14f 24o 65f; 31f 32f; 33f; 41f 42o 56f; 44f 55f | 66 |  |
| 1.1.4.10.6.4 (ii) | 32, 3m, -3m | π | 8 | 11f 22f; 12f 21f; 13f 23f; 14f 24o 65f; 31f 32f; 33f; 41f 42o 56d; 44f 55f | 66 |  |
| 1.1.4.10.6.4 (ii) | 32, 3m, -3m | Q | 8 | 11f 22f; 12f 21f; 13f 23f; 14f 24o 65d; 31f 32f; 33f; 41f 42o 56d; 44f 55f | 66 |  |
| 1.1.4.10.6.4 (ii) | 32, 3m, -3m | c | 6 | 11f 22f; 12f; 13f 23f; 14f 24o 56f; 33f; 44f 55f | 66 | "The sign of c14 depends on the orientation of the Ox1 axis." |
| 1.1.4.10.6.4 (ii) | 32, 3m, -3m | s | 6 | 11f 22f; 12f; 13f 23f; 14f 24o 56d; 33f; 44f 55f | 66 |  |
| 1.1.4.10.6.5 (i) | 4, -4, 4/m | p, π, Q | 10 | 11f 22f; 12f 21f; 13f 23f; 16f 26o; 31f 32f; 33f; 44f 55f; 45f 54o; 61f 62o; 66f |  |  |
| 1.1.4.10.6.5 (i) | 4, -4, 4/m | c, s | 7 | 11f 22f; 12f; 13f 23f; 16o 26f; 33f; 44f 55f; 66f |  | the ⊖ is on 16, the heavy dot on 26 |
| 1.1.4.10.6.5 (ii) | 422, 4mm, -42m, 4/mm | p, π, Q | 7 | 11f 22f; 12f 21f; 13f 23f; 31f 32f; 33f; 44f 55f; 66f |  |  |
| 1.1.4.10.6.5 (ii) | 422, 4mm, -42m, 4/mm | c, s | 6 | 11f 22f; 12f; 13f 23f; 33f; 44f 55f; 66f |  |  |
| 1.1.4.10.6.6 (i) | 6, -6, 6/m | p | 8 | 11f 22f; 12f 21f; 13f 23f; 16f 26o 61o 62f; 31f 32f; 33f; 44f 55f; 45f 54o | 66 |  |
| 1.1.4.10.6.6 (i) | 6, -6, 6/m | π | 8 | 11f 22f; 12f 21f; 13f 23f; 16d 26m 61o 62f; 31f 32f; 33f; 44f 55f; 45f 54o | 66 |  |
| 1.1.4.10.6.6 (i) | 6, -6, 6/m | Q | 8 | 11f 22f; 12f 21f; 13f 23f; 16f 26o 61o 62f; 31f 32f; 33f; 44f 55f; 45f 54o | 66 |  |
| 1.1.4.10.6.6 (i) | 6, -6, 6/m | c, s | 5 | 11f 22f; 12f; 13f 23f; 33f; 44f 55f | 66 |  |
| 1.1.4.10.6.6 (ii) | 622, 6mm, -62m, 6/mm | p, π, Q | 6 | 11f 22f; 12f 21f; 13f 23f; 31f 32f; 33f; 44f 55f | 66 |  |
| 1.1.4.10.6.6 (ii) | 622, 6mm, -62m, 6/mm | c, s | 5 | 11f 22f; 12f; 13f 23f; 33f; 44f 55f | 66 |  |
| 1.1.4.10.6.7 (i) | 23, 3m | p, π, Q | 4 | 11f 22f 33f; 12f 23f 31f; 13f 21f 32f; 44f 55f 66f |  | printed "3m" (no overbar), in the cubic system; misprint for m-3 |
| 1.1.4.10.6.7 (i) | 23, 3m | c, s | 3 | 11f 22f 33f; 12f 13f 23f; 44f 55f 66f |  | as above |
| 1.1.4.10.6.7 (ii) | 432, -43m, m-3m | p, π, Q, c, s | 3 | 11f 22f 33f; 12f 13f 23f; 44f 55f 66f |  | one diagram for all five, upper triangle only |
| 1.1.4.10.6.8 | all tensors (spherical system) | p, π, Q, c, s | 2 | 11f 22f 33f; 12f 13f 23f | 44 55 66 | not a crystal class; one diagram, upper triangle only; the three ⊗ are linked by a line |
