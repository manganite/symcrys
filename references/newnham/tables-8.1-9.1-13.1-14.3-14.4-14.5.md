# Newnham (2005): pyroelectric, dielectric, elastic, pyromagnetic, magnetoelectric and piezomagnetic matrices

Source: R. E. Newnham, _Properties of Materials: Anisotropy, Symmetry, Structure_ (Oxford University
Press, Oxford, 2005): Table 8.1 "Matrices for the ten pyroelectric crystal classes and two
pyroelectric Curie groups (all others are zero)", printed p. 53; Table 9.1 "Dielectric constant
matrices for the various symmetry groups", p. 64; Table 13.1 "Elastic constant matrices for the 32
crystal classes and seven limiting groups", pp. 108–109; Table 14.3 "The 31 pyromagnetic point
groups", p. 133; Table 14.4 "Magnetoelectric matrices for the 90 magnetic crystal classes and 14
magnetic Curie groups", p. 140; Table 14.5 "Piezomagnetic matrices for the various magnetic symmetry
groups", pp. 144–145. Transcribed on 2026-11-25 from the PDF in Thomas' Zotero (item `G32GB96M`,
attachment `UKXAALX2`; printed page = PDF page number − 13 = page index − 12 counting from 0), read
from page images at 130 dpi and every matrix and group list again at 250–400 dpi.

The axes are those of § 4.3 (p. 26) with the secondary elements of Table 4.2 (p. 25), as in
`tables-12.2-30.1-30.2.md`: monoclinic 2 ∥ Z₂ and m ⊥ Z₂; 2 ∥ Z₁ in 32, 422, −42m, 622; m ⊥ Z₁ in
3m, −3m, 4mm, 6mm, −6m2. A magnetic group carries its orientation in its symbol, read position by
position as for the crystal classes (`m'2'm`: m′ ⊥ Z₁, 2′ ∥ Z₂, m ⊥ Z₃; `2mm`: 2 ∥ Z₁).

Transcription conventions: a matrix is written by rows, rows separated by `;`, entries by spaces; an
entry is `0`, a coefficient as printed with its sign and factor (`c14`, `-c25`, `-2Q22`), or
`1/2(c11-c12)` for the printed ½(c₁₁ − c₁₂). A leading `-` before a digit of a group symbol is the
overbar, `'` the prime. Group names as printed: Newnham writes `m3` and `m3m` without the overbar of
the 3; the names in Tables 14.4 and 14.5 that name no group, or another orientation of the group
than the one of the printed matrix, are listed in "Errata". The
Curie (limiting) groups are transcribed where they share a row with crystal classes; they are not
compared.

## Table 8.1, p. 53

The pyroelectric coefficients p_i as a column (rows separated by `;`).

| Point groups | Matrix |
|---|---|
| 1 | p1; p2; p3 |
| 2 | 0; p2; 0 |
| m | p1; 0; p3 |
| mm2, 3, 3m, 4, 4mm, 6, 6mm, ∞, ∞m | 0; 0; p3 |

## Table 9.1, p. 64

The dielectric constant K_ij. The last column is the number of coefficients as printed.

| Crystals | Point groups | Matrix | Count |
|---|---|---|---|
| Triclinic | 1, -1 | K11 K12 K13; K12 K22 K23; K13 K23 K33 | Six coefficients |
| Monoclinic | 2, m, 2/m | K11 0 K13; 0 K22 0; K13 0 K33 | Four coefficients |
| Orthorhombic | 222, mm2, mmm | K11 0 0; 0 K22 0; 0 0 K33 | Three coefficients |
| Uniaxial | 3, -3, 32, 3m, -3m, 4, -4, 4/m, 422, 4mm, -42m, 4/mmm, 6, -6, 6/m, 622, 6mm, -6m2, 6/mmm, ∞, ∞m, ∞/m, ∞2, ∞/mm | K11 0 0; 0 K11 0; 0 0 K33 | Two coefficients |
| Cubic | 23, m3, 432, -43m, m3m, ∞∞, ∞∞m | K11 0 0; 0 K11 0; 0 0 K11 | One coefficient |

## Table 13.1, pp. 108–109

The elastic stiffnesses c_ij in Voigt's notation, "no factors of two or four" (§ 13.2, p. 105:
c₆₁ = c₁₂₁₁, c₆₆ = c₁₂₁₂).

| System | Point groups | Matrix |
|---|---|---|
| Triclinic | 1, -1 | c11 c12 c13 c14 c15 c16; c12 c22 c23 c24 c25 c26; c13 c23 c33 c34 c35 c36; c14 c24 c34 c44 c45 c46; c15 c25 c35 c45 c55 c56; c16 c26 c36 c46 c56 c66 |
| Monoclinic | 2, m, 2/m | c11 c12 c13 0 c15 0; c12 c22 c23 0 c25 0; c13 c23 c33 0 c35 0; 0 0 0 c44 0 c46; c15 c25 c35 0 c55 0; 0 0 0 c46 0 c66 |
| Orthorhombic | 222, mm2, mmm | c11 c12 c13 0 0 0; c12 c22 c23 0 0 0; c13 c23 c33 0 0 0; 0 0 0 c44 0 0; 0 0 0 0 c55 0; 0 0 0 0 0 c66 |
| Tetragonal | 4, -4, 4/m | c11 c12 c13 0 0 c16; c12 c11 c13 0 0 -c16; c13 c13 c33 0 0 0; 0 0 0 c44 0 0; 0 0 0 0 c44 0; c16 -c16 0 0 0 c66 |
| Tetragonal | 4mm, -42m, 422, 4/mmm | c11 c12 c13 0 0 0; c12 c11 c13 0 0 0; c13 c13 c33 0 0 0; 0 0 0 c44 0 0; 0 0 0 0 c44 0; 0 0 0 0 0 c66 |
| Trigonal | 3, -3 | c11 c12 c13 c14 -c25 0; c12 c11 c13 -c14 c25 0; c13 c13 c33 0 0 0; c14 -c14 0 c44 0 c25; -c25 c25 0 0 c44 c14; 0 0 0 c25 c14 1/2(c11-c12) |
| Trigonal | 32, 3m, -3m | c11 c12 c13 c14 0 0; c12 c11 c13 -c14 0 0; c13 c13 c33 0 0 0; c14 -c14 0 c44 0 0; 0 0 0 0 c44 c14; 0 0 0 0 c14 1/2(c11-c12) |
| Hexagonal; Curie groups | 6, -6, 6/m, 622, 6mm, -6m2, 6/mmm, ∞, ∞m, ∞/m, ∞2, ∞/mm | c11 c12 c13 0 0 0; c12 c11 c13 0 0 0; c13 c13 c33 0 0 0; 0 0 0 c44 0 0; 0 0 0 0 c44 0; 0 0 0 0 0 1/2(c11-c12) |
| Cubic | 23, m3, 432, -43m, m3m | c11 c12 c12 0 0 0; c12 c11 c12 0 0 0; c12 c12 c11 0 0 0; 0 0 0 c44 0 0; 0 0 0 0 c44 0; 0 0 0 0 0 c44 |
| Curie groups | ∞∞, ∞∞m | c11 c12 c12 0 0 0; c12 c11 c12 0 0 0; c12 c12 c11 0 0 0; 0 0 0 1/2(c11-c12) 0 0; 0 0 0 0 1/2(c11-c12) 0; 0 0 0 0 0 1/2(c11-c12) |

## Table 14.3, p. 133

The pyromagnetic coefficients (the spontaneous magnetization), printed as a row.

| Magnetic point groups | Pyromagnetic matrix |
|---|---|
| 1, -1 | Q1 Q2 Q3 |
| 2', m', 2'/m' | Q1 0 Q3 |
| 2, m, 2/m | 0 Q2 0 |
| 2'2'2, m'm'2, m'2'm, m'm'm, 3, -3, 32', 3m', -3m', 4, -4, 4/m, 42'2', 4m'm', -42'm', 4/mm'm', 6, -6, 6/m, 62'2', 6m'm', -6m'2', 6/mm'm', ∞, ∞/m, ∞2', ∞m', ∞/mm' | 0 0 Q3 |
| All others | 0 0 0 |

## Table 14.4, p. 140

The magnetoelectric coefficients Q_ij. Print writes `∞m'` both at the end of the row of 3 and at the
end of the row of 32 (read at 400 dpi); the Curie groups are not compared.

| Magnetic groups | Matrix |
|---|---|
| 1, -1' | Q11 Q12 Q13; Q21 Q22 Q23; Q31 Q32 Q33 |
| 2, m', 2/m' | Q11 0 Q13; 0 Q22 0; Q31 0 Q33 |
| 2', m, 2'/m | 0 Q12 0; Q21 0 Q23; 0 Q32 0 |
| 222, m'm'2, m'm'm' | Q11 0 0; 0 Q22 0; 0 0 Q33 |
| 22'2', 2mm, m'm2', m'mm | 0 0 0; 0 0 Q23; 0 Q32 0 |
| 3, -3', 4, -4', 4/m', 6, -6', 6/m', ∞, ∞m' | Q11 Q12 0; -Q12 Q11 0; 0 0 Q33 |
| 4', -4, 4'/m' | Q11 Q12 0; Q12 -Q11 0; 0 0 0 |
| 32, 3m', -3'm', 422, 4m'm', -4'2m', 4/m'm'm', 622, 6m'm', -6'm'2, 6/m'm'm', ∞2, ∞/m'm', ∞m' | Q11 0 0; 0 Q11 0; 0 0 Q33 |
| 4'22, 4'mm', -42m, -42'm', 4'/m'mm' | Q11 0 0; 0 -Q11 0; 0 0 0 |
| 32', 3m, -3'm, 42'2', 4mm, -4'2'm, 4/m'mm, 62'2', 6mm, -6'm2', 6/m'mm, ∞2', ∞/m'm | 0 Q12 0; -Q12 0 0; 0 0 0 |
| 23, m'3, 432, -4'3m', m'3m', ∞∞, ∞∞m' | Q11 0 0; 0 Q11 0; 0 0 Q11 |
| Other magnetic groups | 0 0 0; 0 0 0; 0 0 0 |

The text before the table (p. 139): "Only 58 of the 90 magnetic point groups are magnetoelectric."

## Table 14.5, pp. 144–145

The piezomagnetic coefficients Q_ij (I_i = Q_ijk X_jk, § 14.10, p. 142), a 3 × 6 matrix "similar in
form to the 3 × 6 piezoelectric matrix" (p. 143), so with the factors of d (−2Q22, −2Q11).

| Magnetic groups | Matrix |
|---|---|
| 1, -1 | Q11 Q12 Q13 Q14 Q15 Q16; Q21 Q22 Q23 Q24 Q25 Q26; Q31 Q32 Q33 Q34 Q35 Q36 |
| 2, m, 2/m | 0 0 0 Q14 0 Q16; Q21 Q22 Q23 0 Q25 0; 0 0 0 Q34 0 Q36 |
| 2', m', 2'/m' | Q11 Q12 Q13 0 Q15 0; 0 0 0 Q24 0 Q26; Q31 Q32 Q33 0 Q35 0 |
| 222, mm2, mmm | 0 0 0 Q14 0 0; 0 0 0 0 Q25 0; 0 0 0 0 0 Q36 |
| 2'2'2, m'm'2, m'2'm, m'm'm | 0 0 0 0 Q15 0; 0 0 0 Q24 0 0; Q31 Q32 Q33 0 0 0 |
| 3, -3 | Q11 -Q11 0 Q14 Q15 -2Q22; -Q22 Q22 0 Q15 -Q14 -2Q11; Q31 Q31 Q33 0 0 0 |
| 32, 3m, -3m | Q11 -Q11 0 Q14 0 0; 0 0 0 0 -Q14 -2Q11; 0 0 0 0 0 0 |
| 32', 3m', -3m' | 0 0 0 0 Q15 -2Q22; -Q22 Q22 0 Q15 0 0; Q31 Q31 Q33 0 0 0 |
| 4, -4, 4/m, 6, -6, 6/m, ∞, ∞/m | 0 0 0 Q14 Q15 0; 0 0 0 Q15 -Q14 0; Q31 Q31 Q33 0 0 0 |
| 4', -4', 4'/m | 0 0 0 Q14 Q15 0; 0 0 0 -Q15 Q14 0; Q31 -Q31 0 0 0 Q36 |
| 422, 4mm, -42m, 4/mmm, 622, 6mm, -6m2, 6/mmm, ∞2 | 0 0 0 Q14 0 0; 0 0 0 0 -Q14 0; 0 0 0 0 0 0 |
| 4'22, 4'mm', -4'2m', -4'2'm, 4'/mmm' | 0 0 0 Q14 0 0; 0 0 0 0 Q14 0; 0 0 0 0 0 Q36 |
| 42'2', 4m'm', -42'm', 4/mm'm', 62'2', 6m'm', -6m'2', 6/mm'm', ∞2', ∞/mm' | 0 0 0 0 Q15 0; 0 0 0 Q15 0 0; Q31 Q31 Q33 0 0 0 |
| 6', -6', 6'/m' | Q11 -Q11 0 0 0 -2Q22; -Q22 Q22 0 0 0 -2Q11; 0 0 0 0 0 0 |
| 6'22', 6'mm', -6'm'2, -6'm2', 6'/m'mm' | Q11 -Q11 0 0 0 0; 0 0 0 0 0 -2Q11; 0 0 0 0 0 0 |
| 23, m3, 4'32, -4'3m', m3m' | 0 0 0 Q14 0 0; 0 0 0 0 Q14 0; 0 0 0 0 0 Q14 |
| All other magnetic groups | 0 0 0 0 0 0; 0 0 0 0 0 0; 0 0 0 0 0 0 |

The text before the table (p. 144): "Of the 90 magnetic groups 66 are piezomagnetic along with 5 of
the 14 magnetic Curie groups."

## Errata

| Table | Printed | Read as |
|---|---|---|
| 14.4 | 4'22 | 4'22' |
| 14.4 | 4'mm' | 4'm'm |
| 14.4 | -42'm' | -4m'2' |
| 14.4 | 4'/m'mm' | 4'/m'm'm |
| 14.5 | 4'22 | 4'22' |
| 14.5 | -4'2'm | -4'm2' |
| 14.5 | -6'm'2 | -6'2m' |
| 14.5 | 4'32 | 4'32' |

- **`4'22`, `4'32`:** as printed, these symbols name no group: with 4′ along Z₃ and 2 along Z₁, the
  product 4′·2 is a primed twofold rotation along [110], so the third position carries a prime.
  The class 422 has one magnetic group with 4′, and ITC Vol. D Table 1.5.2.3 prints it as `4'22'`
  (p. 111, operations 2_x, 2_y and 2′_xy, 2′_−xy); likewise the class 432 has one, `4'32'` (p. 112);
  Birss Table 6 (pp. 91–98) writes both so (`references/itc/vol-d-table-1.5.2.3.md`,
  `references/birss/table-6.md`). Newnham writes the second prime in the other groups of the same
  rows (`4'mm'`, `-4'2m'`), and ITC Vol. D prints `4'22'` and `4'32'` in the blocks with these
  matrices (Table 1.5.8.1, p. 139, block 10; Table 1.5.7.1, p. 135, blocks 10 and 16).
- **The other orientation:** five symbols name a tetragonal or hexagonal group in the orientation
  turned by 45° (by 30° for −6′m′2) against the one of the printed matrix. ITC Vol. D prints the
  same matrices with the same groups and names these in the other orientation: Table 1.5.8.1
  (magnetoelectric, p. 139), block 10, `-42m, -4m'2', 4'22', 4'm'm, 4'/m'm'm` with the matrix
  (α11, −α11, 0) of Newnham's row `4'22, 4'mm', -42m, -42'm', 4'/m'mm'`; Table 1.5.7.1
  (piezomagnetic, p. 135), block 10, `4'22', 4'mm', -4'2m', -4'm2', 4'/mmm'` with the matrix of
  Newnham's row `4'22, 4'mm', -4'2m', -4'2'm, 4'/mmm'`, and block 15, `6'22', 6'mm', -6'2m',
  -6'm2', 6'/m'mm'` with the matrix of Newnham's row `6'22', 6'mm', -6'm'2, -6'm2', 6'/m'mm'`
  (`references/itc/vol-d-table-1.5.8.1.md`, `references/itc/vol-d-table-1.5.7.1.md`). Read with
  Newnham's own axes (Table 4.2: m ⊥ Z₁ in 4mm; 2 ∥ Z₁ in −42m), the printed symbols put an element
  along Z₁ that the matrix does not allow: `4'mm'` an unprimed mirror ⊥ Z₁, which with the
  magnetoelectric tensor acts as a primed twofold axis along Z₁, where the matrix needs an unprimed
  one, as in `-42m` and `4'22'` of the same row. The other groups of these rows and the same
  symbols in rows whose matrix does not change under a turn about Z₃ (`-4'2'm` and `-6'm'2` in
  Table 14.4) are read as printed.
