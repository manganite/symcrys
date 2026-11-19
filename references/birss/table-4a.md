# Birss Table 4a: symbol classes of the 32 point groups for tensors of each kind

Source: R. R. Birss, _Symmetry and Magnetism_ (North-Holland, Amsterdam, 1966), Table 4a,
printed pp. 56–57. Transcribed in manganite/birss-tables (`table-4a.md`, vendored in birss-app as
`birss-tables/`); taken over unchanged.

Not checked against print again since the transcription (2026-06-16); the tests reproduce every
row from the operations of the 32 classes, which an error in the transcription would break.

Notation used in this transcription:
- Overbar is written with a leading minus sign (example: `-4`, `-3m`, `m-3m`).
- Parallel axes use `//`.
- A dash (`-`) means the table entry is blank.

## How to use this table

This table is the central symbol-equivalence key for Tables 4b-4f (and, for the magnetic
point groups, Table 7). Each row gives a point group's **symbol class** for four tensor
types — "Polar tensor of even rank m", "Axial tensor of even rank m", "Polar tensor of
odd rank n", "Axial tensor of odd rank n" — as a letter A-U. These letters are not
tensor values; they are row-keys into Tables 4b-4f, which tabulate the actual
independent components for each rank.

The rank is selected by m or n:
- Even rank **m** (m = 0, 2, 4) -> Table 4b (m=0), Table 4d (m=2), Table 4f (m=4)
- Odd rank **n** (n = 1, 3) -> Table 4c (n=1), Table 4e (n=3)

To find the tensor form of a given rank for a point group:
1. Find the point group's row here and read the symbol class for the desired tensor
   type (polar/axial) and rank parity (even m / odd n), e.g. `H_m` for an axial tensor
   of even rank.
2. Append the desired rank number to that letter to get the row label in the
   corresponding table above, e.g. `H_m` at rank m=2 -> row `H2` in Table 4d, or at
   rank m=4 -> row `H4` in Table 4f.
3. Read that row in Tables 4b-4f for the independent components (`0` = vanishes, a
   coordinate symbol = survives and gives the form of that component).

Example: point group `422` has axial-even symbol `H_m`. For the rank-2 axial tensor,
look up row `H2` in Table 4d; for the rank-4 axial tensor, look up row `H4` in Table 4f.

Table 7 reuses this same 21-letter symbol-class scheme (A-U) for the i-tensor and
c-tensor symbols of the 90 magnetic point groups, via the same rank mapping.

| System | International symbol of symmetry class | Orientation of reference axes | Polar tensor of even rank m | Axial tensor of even rank m | Polar tensor of odd rank n | Axial tensor of odd rank n |
|---|---|---|---|---|---|---|
| Triclinic | 1 | any | A_m | A_m | A_n | A_n |
| Triclinic | -1 | any | A_m | - | - | A_n |
| Monoclinic | 2 | 2//z | B_m | B_m | B_n | B_n |
| Monoclinic | m | -2//z | B_m | C_m | C_n | B_n |
| Monoclinic | 2/m | 2//z | B_m | - | - | B_n |
| Orthorhombic | 222 | 2//x, 2//y | D_m | D_m | D_n | D_n |
| Orthorhombic | mm2 | -2//x, -2//y | D_m | E_m | E_n | D_n |
| Orthorhombic | mmm | 2//x, 2//y | D_m | - | - | D_n |
| Tetragonal | 4 | 4//z | F_m | F_m | F_n | F_n |
| Tetragonal | -4 | -4//z | F_m | G_m | G_n | F_n |
| Tetragonal | 4/m | 4//z | F_m | - | - | F_n |
| Tetragonal | 422 | 4//z, 2//y | H_m | H_m | H_n | H_n |
| Tetragonal | 4mm | 4//z, -2//y | H_m | I_m | I_n | H_n |
| Tetragonal | -42m | -4//z, 2//y | H_m | J_m | J_n | H_n |
| Tetragonal | 4/mmm | 4//z, 2//y | H_m | - | - | H_n |
| Trigonal | 3 | 3//z | K_m | K_m | K_n | K_n |
| Trigonal | -3 | -3//z | K_m | - | - | K_n |
| Trigonal | 32 | 3//z, 2//y | L_m | L_m | L_n | L_n |
| Trigonal | 3m | 3//z, -2//y | L_m | M_m | M_n | L_n |
| Trigonal | -3m | -3//z, 2//y | L_m | - | - | L_n |
| Hexagonal | 6 | 6//z | N_m | N_m | N_n | N_n |
| Hexagonal | -6 | -3//z | N_m | O_m | O_n | N_n |
| Hexagonal | 6/m | 6//z | N_m | - | - | N_n |
| Hexagonal | 622 | 6//z, 2//y | P_m | P_m | P_n | P_n |
| Hexagonal | 6mm | 6//z, -2//y | P_m | Q_m | Q_n | P_n |
| Hexagonal | -6m2 | 3//z, -2//y | P_m | R_m | R_n | P_n |
| Hexagonal | 6/mmm | 6//z, 2//y | P_m | - | - | P_n |
| Cubic | 23 | 2//x, 2//y | S_m | S_m | S_n | S_n |
| Cubic | m3 | 2//x, 2//y | S_m | - | - | S_n |
| Cubic | 432 | 4//x, 4//y | T_m | T_m | T_n | T_n |
| Cubic | -43m | -4//x, -4//y | T_m | U_m | U_n | T_n |
| Cubic | m3m | 4//x, 4//y | T_m | - | - | T_n |
