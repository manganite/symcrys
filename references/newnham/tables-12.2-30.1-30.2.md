# Newnham (2005): piezoelectric matrices, gyration tensors and the properties of the acentric classes

Source: R. E. Newnham, _Properties of Materials: Anisotropy, Symmetry, Structure_ (Oxford University
Press, Oxford, 2005): Table 12.2 "Piezoelectric matrices for the crystallographic and limiting
point groups", printed pp. 91–92; Table 30.1 "Gyration tensor for the 32 crystal classes and 7
texture groups", p. 330; Table 30.2 "Properties associated with acentric crystals and textures:
piezoelectricity (P), pyroelectricity (P*), optical activity (O), and enantiomorphism (E)", p. 332.
Transcribed on 2026-11-25 from the PDF in Thomas' Zotero (item `G32GB96M`, attachment `UKXAALX2`;
printed page = PDF page − 13), read from page images at 100–170 dpi, the entry of −4 in Table 12.2
at 400 dpi.

The axes are those of § 4.3 (p. 26), the IEEE standard settings: monoclinic Z₂ ∥ b (the twofold axis
or the normal of the mirror), orthorhombic Z₁, Z₂, Z₃ along a, b, c, trigonal and hexagonal Z₁ ∥ a,
Z₃ ∥ c, tetragonal and cubic Z₁, Z₂, Z₃ along a, b, c.

Transcription conventions: a matrix is written by rows, rows separated by `;`, entries by spaces; an
entry is `0` or a coefficient as printed with its sign and factor (`d14`, `-d15`, `-2d22`, `g11`); a
leading `-` before a point-group digit is the overbar. Group names as printed (Table 12.2 prints
`m3` and `m3m` without the overbar of the 3, in its list of the groups without piezoelectricity).
The Curie (limiting, texture) groups are transcribed where they share a row with crystal classes.

## Table 12.2, pp. 91–92

The matrix d_ij (P_i = d_ij X_j; i = 1–3, j = 1–6, the Voigt index of the stress; § 12.1–12.2, where
"d_122 = ½d_16"). The last column is the printed number of independent coefficients.

| Point groups | Matrix | Count |
|---|---|---|
| -1, 2/m, mmm, -3, -3m, 4/m, 4/mmm, 6/m, 6/mmm, m3, 432, m3m, ∞/m, ∞/mm, ∞∞, ∞∞m | 0 0 0 0 0 0; 0 0 0 0 0 0; 0 0 0 0 0 0 | |
| 1 | d11 d12 d13 d14 d15 d16; d21 d22 d23 d24 d25 d26; d31 d32 d33 d34 d35 d36 | 18 |
| 2 | 0 0 0 d14 0 d16; d21 d22 d23 0 d25 0; 0 0 0 d34 0 d36 | 8 |
| m | d11 d12 d13 0 d15 0; 0 0 0 d24 0 d26; d31 d32 d33 0 d35 0 | 10 |
| mm2 | 0 0 0 0 d15 0; 0 0 0 d24 0 0; d31 d32 d33 0 0 0 | 5 |
| 222 | 0 0 0 d14 0 0; 0 0 0 0 d25 0; 0 0 0 0 0 d36 | 3 |
| 3 | d11 -d11 0 d14 d15 -2d22; -d22 d22 0 d15 -d14 -2d11; d31 d31 d33 0 0 0 | 6 |
| 32 | d11 -d11 0 d14 0 0; 0 0 0 0 -d14 -2d11; 0 0 0 0 0 0 | 2 |
| 3m | 0 0 0 0 d15 -2d22; -d22 d22 0 d15 0 0; d31 d31 d33 0 0 0 | 4 |
| 4, 6, ∞ | 0 0 0 d14 d15 0; 0 0 0 d15 -d14 0; d31 d31 d33 0 0 0 | 4 |
| -4 | 0 0 0 d14 -d15 0; 0 0 0 d25 d14 0; d31 -d31 0 0 0 d36 | 3 |
| 4mm, 6mm, ∞m | 0 0 0 0 d15 0; 0 0 0 d15 0 0; d31 d31 d33 0 0 0 | 3 |
| 422, 622, ∞2 | 0 0 0 d14 0 0; 0 0 0 0 -d14 0; 0 0 0 0 0 0 | 1 |
| -42m | 0 0 0 d14 0 0; 0 0 0 0 d14 0; 0 0 0 0 0 d36 | 2 |
| -6 | d11 -d11 0 0 0 -2d22; -d22 d22 0 0 0 -2d11; 0 0 0 0 0 0 | 2 |
| -6m2 | 0 0 0 0 0 -2d22; -d22 d22 0 0 0 0; 0 0 0 0 0 0 | 1 |
| -43m, 23 | 0 0 0 d14 0 0; 0 0 0 0 d14 0; 0 0 0 0 0 d14 | 1 |

### Errata

- **−4:** the second row prints `d25` and the count `(3)`. Neither fits the other: with `d25` as a
  coefficient of its own the matrix has five symbols (d14, d15, d25, d31, d36), and no reading gives
  three. Read with `d25` as `d15`, the matrix has the form that the symmetry of −4 gives and four
  independent coefficients (d14, d15, d31, d36), as the row of 4, 6, ∞ above it has with other
  signs: `0 0 0 d14 -d15 0; 0 0 0 d15 d14 0; d31 -d31 0 0 0 d36`, count 4. The tests read this
  correction and compare it with the computed form.

## Table 30.1, p. 330

The gyration tensor g_ij (symmetric, § 30.2).

| Point groups | Matrix |
|---|---|
| 1 | g11 g12 g13; g12 g22 g23; g13 g23 g33 |
| 2 | g11 0 g13; 0 g22 0; g13 0 g33 |
| m | 0 g12 0; g12 0 g23; 0 g23 0 |
| 222 | g11 0 0; 0 g22 0; 0 0 g33 |
| mm2 | 0 g12 0; g12 0 0; 0 0 0 |
| 3, 32, 4, 422, 6, 622, ∞, ∞2 | g11 0 0; 0 g11 0; 0 0 g33 |
| -4 | g11 g12 0; g12 -g11 0; 0 0 0 |
| -42m | g11 0 0; 0 -g11 0; 0 0 0 |
| 23, 432, ∞∞ | g11 0 0; 0 g11 0; 0 0 g11 |
| All others | 0 0 0; 0 0 0; 0 0 0 |

## Table 30.2, p. 332

The crystal classes as printed, with their marks: O optical activity, E enantiomorphism, P
piezoelectricity, P* pyroelectricity. The table lists the 21 acentric classes; the summary beside it
prints "Acentric symmetry 21", "Optical activity 15", "Piezoelectricity 20", "Enantiomorphism 11",
"Pyroelectricity 10".

| Class | O | E | P | P* |
|---|---|---|---|---|
| 1 | O | E | P | P* |
| 2 | O | E | P | P* |
| m | O | | P | P* |
| 222 | O | E | P | |
| mm2 | O | | P | P* |
| 3 | O | E | P | P* |
| 32 | O | E | P | |
| 3m | | | P | P* |
| 4 | O | E | P | P* |
| -4 | O | | P | |
| 422 | O | E | P | |
| 4mm | | | P | P* |
| -42m | O | | P | |
| 6 | O | E | P | P* |
| -6 | | | P | |
| 622 | O | E | P | |
| 6mm | | | P | P* |
| -6m2 | | | P | |
| 23 | O | E | P | |
| 432 | O | E | | |
| -43m | | | P | |
