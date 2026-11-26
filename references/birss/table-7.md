# Birss Table 7: symbol classes of the 90 magnetic point groups for i- and c-tensors

Source: R. R. Birss, _Symmetry and Magnetism_ (North-Holland, Amsterdam, 1966), Table 7, printed pp.
103–108, with the text of Ch. 3, § 3.1, pp. 102 and 109–110. The transcription is that of birss-app
(`birss-tables/table-7.md`, there with columns 3–12 first taken from R. R. Birss, _Proc. Phys. Soc._
**79**, 946 (1962), Table 2(a), then checked against the book); it was compared again row by row
with the book (the table printed rotated by 90°) on 2026-11-20: columns 3–12 of all 90 rows agree
with the book. Column 2 was read with the order of the rows; the tests identify each group again
from its column 3 (see below).

The table lists the 32 classical groups and the 58 additional magnetic groups, not the 32
non-magnetic groups that contain time reversal itself. For each it gives the symbol class (a letter
A–U, a row key into Tables 4b–4f) of the i-tensors (invariant under time reversal) and of the
c-tensors (changing sign under time reversal), polar and axial, of even rank m and of odd rank n.

What the book says about the table:

- Which groups (p. 84): a group that contains time reversal R itself belongs to a non-magnetic
  crystal ("non-magnetic groups"); the magnetic groups, for magnetic crystals, are the 58
  additional ones and, as the limiting case in which R does not occur at all, the 32 classical
  groups.
- Their tensors (p. 102): for non-magnetic crystals all time-antisymmetric tensors vanish and the
  time-symmetric ones are those of Table 4. For the 32 classical groups R is not a symmetry
  operator, so both kinds are those of Table 4. For an additional magnetic group the i-tensors are
  those of the corresponding classical group; the c-tensors obey eqs. (3.23a), (3.23b), which carry
  a factor −1 for an operator combined with time reversal.
- Associated group A (p. 109, eq. (3.24)): the group obtained by multiplying every operator
  combined with time reversal by −R, that is the operators without time reversal and the spatial
  parts of the others times the inversion. Polar c-tensors of odd rank and axial ones of even rank
  have the form of the tensors of A (column 3).
- Associated group B (pp. 109–110): polar c-tensors of even rank have the form of the axial tensors
  of even rank of B, axial c-tensors of odd rank that of its polar tensors of odd rank (column 4).
  The book refers to Birss (1962) for its construction. The tests build B by a rule that is
  derived, not quoted: the rotation parts of the operators without time reversal, and the rotation
  parts of the others times the inversion; it reproduces the printed B of all 58 groups.
- Parentheses (p. 110): the symbols of the group 2′m′m and of its associated group A are printed
  in brackets, `(2'm'm)` and `(m2m)`, and so are its tensor symbols E_m and E_n, to say that the
  reference axes are not those of mm2; likewise −4m2 and −4′m2′ are referred to axes rotated by π/4
  against those of −42m, and −62m and −6′2m′ to axes rotated by π/6 against those of −6m2.

Notation used in this transcription:

- Overbar is written with a leading minus sign; Birss's underline (an element combined with time
  reversal) is written as a prime after the element (`4'/mm'm`). Birss prints `m3`, `m3m` for the
  cubic groups.
- A dash (`-`) means the entry is blank: for a classical group, no associated group; for a tensor,
  it vanishes.
- Parentheses are Birss's. A tensor symbol is in parentheses where its source (the group itself for
  i-tensors, A or B for c-tensors) is, and the form of that symbol class changes under the rotation
  (E, J, R; not D, H, I, P, Q). The spelling inside the parentheses of a group is not uniform: the
  same rotated group is `(-4m2)` in the row `4'mm'` and `(-42m)` in the row `-42'm'`.

| System | Magnetic point group (International) | Associated classical group A (International) | Associated classical group B (International) | i-tensor: Polar even rank m | i-tensor: Axial even rank m | i-tensor: Polar odd rank n | i-tensor: Axial odd rank n | c-tensor: Polar even rank m | c-tensor: Axial even rank m | c-tensor: Polar odd rank n | c-tensor: Axial odd rank n |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Triclinic | 1 | - | - | A_m | A_m | A_n | A_n | A_m | A_m | A_n | A_n |
| Triclinic | -1 | - | - | A_m | - | - | A_n | A_m | - | - | A_n |
| Triclinic | -1' | 1 | -1 | A_m | - | - | A_n | - | A_m | A_n | - |
| Monoclinic | 2 | - | - | B_m | B_m | B_n | B_n | B_m | B_m | B_n | B_n |
| Monoclinic | 2' | m | m | B_m | B_m | B_n | B_n | C_m | C_m | C_n | C_n |
| Monoclinic | m | - | - | B_m | C_m | C_n | B_n | B_m | C_m | C_n | B_n |
| Monoclinic | m' | 2 | m | B_m | C_m | C_n | B_n | C_m | B_m | B_n | C_n |
| Monoclinic | 2/m | - | - | B_m | - | - | B_n | B_m | - | - | B_n |
| Monoclinic | 2'/m' | 2/m | m | B_m | - | - | B_n | C_m | - | - | C_n |
| Monoclinic | 2/m' | 2 | 2/m | B_m | - | - | B_n | - | B_m | B_n | - |
| Monoclinic | 2'/m | m | 2/m | B_m | - | - | B_n | - | C_m | C_n | - |
| Orthorhombic | 222 | - | - | D_m | D_m | D_n | D_n | D_m | D_m | D_n | D_n |
| Orthorhombic | 2'2'2 | mm2 | mm2 | D_m | D_m | D_n | D_n | E_m | E_m | E_n | E_n |
| Orthorhombic | mm2 | - | - | D_m | E_m | E_n | D_n | D_m | E_m | E_n | D_n |
| Orthorhombic | m'm'2 | 222 | mm2 | D_m | E_m | E_n | D_n | E_m | D_m | D_n | E_n |
| Orthorhombic | (2'm'm) | (m2m) | mm2 | D_m | (E_m) | (E_n) | D_n | E_m | (E_m) | (E_n) | E_n |
| Orthorhombic | mmm | - | - | D_m | - | - | D_n | D_m | - | - | D_n |
| Orthorhombic | m'm'm | mmm | mm2 | D_m | - | - | D_n | E_m | - | - | E_n |
| Orthorhombic | m'm'm' | 222 | mmm | D_m | - | - | D_n | - | D_m | D_n | - |
| Orthorhombic | mmm' | mm2 | mmm | D_m | - | - | D_n | - | E_m | E_n | - |
| Tetragonal | 4 | - | - | F_m | F_m | F_n | F_n | F_m | F_m | F_n | F_n |
| Tetragonal | 4' | -4 | -4 | F_m | F_m | F_n | F_n | G_m | G_m | G_n | G_n |
| Tetragonal | -4 | - | - | F_m | G_m | G_n | F_n | F_m | G_m | G_n | F_n |
| Tetragonal | -4' | 4 | -4 | F_m | G_m | G_n | F_n | G_m | F_m | F_n | G_n |
| Tetragonal | 4/m | - | - | F_m | - | - | F_n | F_m | - | - | F_n |
| Tetragonal | 4'/m | 4/m | -4 | F_m | - | - | F_n | G_m | - | - | G_n |
| Tetragonal | 4/m' | 4 | 4/m | F_m | - | - | F_n | - | F_m | F_n | - |
| Tetragonal | 4'/m' | -4 | 4/m | F_m | - | - | F_n | - | G_m | G_n | - |
| Tetragonal | 422 | - | - | H_m | H_m | H_n | H_n | H_m | H_m | H_n | H_n |
| Tetragonal | 4'22' | -42m | -42m | H_m | H_m | H_n | H_n | J_m | J_m | J_n | J_n |
| Tetragonal | 42'2' | 4mm | 4mm | H_m | H_m | H_n | H_n | I_m | I_m | I_n | I_n |
| Tetragonal | 4mm | - | - | H_m | I_m | I_n | H_n | H_m | I_m | I_n | H_n |
| Tetragonal | 4'mm' | (-4m2) | -42m | H_m | I_m | I_n | H_n | J_m | (J_m) | (J_n) | J_n |
| Tetragonal | 4m'm' | 422 | 4mm | H_m | I_m | I_n | H_n | I_m | H_m | H_n | I_n |
| Tetragonal | -42m | - | - | H_m | J_m | J_n | H_n | H_m | J_m | J_n | H_n |
| Tetragonal | -4'2m' | 422 | -42m | H_m | J_m | J_n | H_n | J_m | H_m | H_n | J_n |
| Tetragonal | (-4'm2') | 4mm | -42m | H_m | (J_m) | (J_n) | H_n | J_m | I_m | I_n | J_n |
| Tetragonal | -42'm' | (-42m) | 4mm | H_m | J_m | J_n | H_n | I_m | (J_m) | (J_n) | I_n |
| Tetragonal | 4/mmm | - | - | H_m | - | - | H_n | H_m | - | - | H_n |
| Tetragonal | 4'/mmm' | 4/mmm | -42m | H_m | - | - | H_n | J_m | - | - | J_n |
| Tetragonal | 4/mm'm' | 4/mmm | 4mm | H_m | - | - | H_n | I_m | - | - | I_n |
| Tetragonal | 4/m'm'm' | 422 | 4/mmm | H_m | - | - | H_n | - | H_m | H_n | - |
| Tetragonal | 4/m'mm | 4mm | 4/mmm | H_m | - | - | H_n | - | I_m | I_n | - |
| Tetragonal | 4'/m'm'm | -42m | 4/mmm | H_m | - | - | H_n | - | J_m | J_n | - |
| Trigonal | 3 | - | - | K_m | K_m | K_n | K_n | K_m | K_m | K_n | K_n |
| Trigonal | -3 | - | - | K_m | - | - | K_n | K_m | - | - | K_n |
| Trigonal | -3' | 3 | -3 | K_m | - | - | K_n | - | K_m | K_n | - |
| Trigonal | 32 | - | - | L_m | L_m | L_n | L_n | L_m | L_m | L_n | L_n |
| Trigonal | 32' | 3m | 3m | L_m | L_m | L_n | L_n | M_m | M_m | M_n | M_n |
| Trigonal | 3m | - | - | L_m | M_m | M_n | L_n | L_m | M_m | M_n | L_n |
| Trigonal | 3m' | 32 | 3m | L_m | M_m | M_n | L_n | M_m | L_m | L_n | M_n |
| Trigonal | -3m | - | - | L_m | - | - | L_n | L_m | - | - | L_n |
| Trigonal | -3m' | -3m | 3m | L_m | - | - | L_n | M_m | - | - | M_n |
| Trigonal | -3'm' | 32 | -3m | L_m | - | - | L_n | - | L_m | L_n | - |
| Trigonal | -3'm | 3m | -3m | L_m | - | - | L_n | - | M_m | M_n | - |
| Hexagonal | 6 | - | - | N_m | N_m | N_n | N_n | N_m | N_m | N_n | N_n |
| Hexagonal | 6' | -6 | -6 | N_m | N_m | N_n | N_n | O_m | O_m | O_n | O_n |
| Hexagonal | -6 | - | - | N_m | O_m | O_n | N_n | N_m | O_m | O_n | N_n |
| Hexagonal | -6' | 6 | -6 | N_m | O_m | O_n | N_n | O_m | N_m | N_n | O_n |
| Hexagonal | 6/m | - | - | N_m | - | - | N_n | N_m | - | - | N_n |
| Hexagonal | 6'/m' | 6/m | -6 | N_m | - | - | N_n | O_m | - | - | O_n |
| Hexagonal | 6/m' | 6 | 6/m | N_m | - | - | N_n | - | N_m | N_n | - |
| Hexagonal | 6'/m | -6 | 6/m | N_m | - | - | N_n | - | O_m | O_n | - |
| Hexagonal | 622 | - | - | P_m | P_m | P_n | P_n | P_m | P_m | P_n | P_n |
| Hexagonal | 6'22' | (-62m) | (-62m) | P_m | P_m | P_n | P_n | (R_m) | (R_m) | (R_n) | (R_n) |
| Hexagonal | 62'2' | 6mm | 6mm | P_m | P_m | P_n | P_n | Q_m | Q_m | Q_n | Q_n |
| Hexagonal | 6mm | - | - | P_m | Q_m | Q_n | P_n | P_m | Q_m | Q_n | P_n |
| Hexagonal | 6'mm' | -6m2 | (-62m) | P_m | Q_m | Q_n | P_n | (R_m) | R_m | R_n | (R_n) |
| Hexagonal | 6m'm' | 622 | 6mm | P_m | Q_m | Q_n | P_n | Q_m | P_m | P_n | Q_n |
| Hexagonal | -6m2 | - | - | P_m | R_m | R_n | P_n | P_m | R_m | R_n | P_n |
| Hexagonal | (-6'2m') | 622 | (-62m) | P_m | R_m | R_n | P_n | (R_m) | P_m | P_n | (R_n) |
| Hexagonal | -6'm2' | 6mm | (-62m) | P_m | R_m | R_n | P_n | (R_m) | Q_m | Q_n | (R_n) |
| Hexagonal | -6m'2' | -6m2 | 6mm | P_m | R_m | R_n | P_n | Q_m | R_m | R_n | Q_n |
| Hexagonal | 6/mmm | - | - | P_m | - | - | P_n | P_m | - | - | P_n |
| Hexagonal | 6'/m'mm' | 6/mmm | (-62m) | P_m | - | - | P_n | (R_m) | - | - | (R_n) |
| Hexagonal | 6/mm'm' | 6/mmm | 6mm | P_m | - | - | P_n | Q_m | - | - | Q_n |
| Hexagonal | 6/m'm'm' | 622 | 6/mmm | P_m | - | - | P_n | - | P_m | P_n | - |
| Hexagonal | 6/m'mm | 6mm | 6/mmm | P_m | - | - | P_n | - | Q_m | Q_n | - |
| Hexagonal | 6'/mm'm | (-62m) | 6/mmm | P_m | - | - | P_n | - | (R_m) | (R_n) | - |
| Cubic | 23 | - | - | S_m | S_m | S_n | S_n | S_m | S_m | S_n | S_n |
| Cubic | m3 | - | - | S_m | - | - | S_n | S_m | - | - | S_n |
| Cubic | m'3 | 23 | m3 | S_m | - | - | S_n | - | S_m | S_n | - |
| Cubic | 432 | - | - | T_m | T_m | T_n | T_n | T_m | T_m | T_n | T_n |
| Cubic | 4'32' | -43m | -43m | T_m | T_m | T_n | T_n | U_m | U_m | U_n | U_n |
| Cubic | -43m | - | - | T_m | U_m | U_n | T_n | T_m | U_m | U_n | T_n |
| Cubic | -4'3m' | 432 | -43m | T_m | U_m | U_n | T_n | U_m | T_m | T_n | U_n |
| Cubic | m3m | - | - | T_m | - | - | T_n | T_m | - | - | T_n |
| Cubic | m3m' | m3m | -43m | T_m | - | - | T_n | U_m | - | - | U_n |
| Cubic | m'3m' | 432 | m3m | T_m | - | - | T_n | - | T_m | T_n | - |
| Cubic | m'3m | -43m | m3m | T_m | - | - | T_n | - | U_m | U_n | - |

## Errata of the book

Two rows of the print leave out parentheses. Both are recorded in birss-app as printing errors of
the book (its `docs/findings/`, session of 2026-07-04, nos. 4 and 5 of its inventory, checked there
against the maintainer's scans). The transcription keeps the print; the tests apply the
corrections and fail without them.

- `(-6'2m')`, columns 6 and 7 (i-tensors, axial of even rank and polar of odd rank): printed `R_m`,
  `R_n`; correct `(R_m)`, `(R_n)`. The book itself says (p. 110) that −6′2m′ is referred to axes
  rotated by π/6 against those of −6m2, and the form of R changes under that rotation; the rows
  `(2'm'm)` and `(-4'm2')` print the corresponding symbols in parentheses.
- `-6m'2'`, column 3 (associated group A) and columns 10 and 11 (c-tensors, axial of even rank and
  polar of odd rank): printed `-6m2`, `R_m`, `R_n`; correct `(-62m)`, `(R_m)`, `(R_n)`. With the
  generator of Table 6 for this row, a mirror normal to y combined with time reversal, eq. (3.24)
  gives for A a twofold axis along y: `-6m2` with twofold axes and mirror normals exchanged, which
  the table writes `(-62m)`. Directly: under that mirror a polar c-tensor of rank 3 must equal
  minus its mirror image, which removes the component xxx and keeps yyy, the form of R in the
  rotated axes. The neighbouring row `-6'm2'` prints `(-62m)`, `(R_m)`, `(R_n)`.
