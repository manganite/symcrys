# Yariv Table 16.1: form of the nonlinear optical tensor d_ijk

Source: A. Yariv, _Quantum Electronics_, 2nd ed. (John Wiley & Sons, New York, 1975;
ISBN 0-471-97176-6), Table 16.1, printed
pp. 410–411: "The Form of the Nonlinear Optical Tensor d_ijk as Defined by (16.1-4), after
Reference 2" (Reference 2 is J. F. Nye, _Physical Properties of Crystals_). Transcribed in birss-app
(`src/services/yarivT161.reference.fixtures.ts`, 2026-07-31) from the two printed pages, each
panel also read on its own; taken over unchanged.

Yariv's d_ijk is defined through a field product (his Eq. (16.1-4)), so it carries no Voigt factor:
the 3×6 grid is the tensor component d_i(jk) itself, with columns μ = 1…6 for jk = xx, yy, zz, yz,
zx, xy (rows i = 1, 2, 3 for x, y, z). The table is the general form without Kleinman symmetry.

Transcription, per panel, as printed and before anything is compared:

- `Links`: the connected groups of marks, separated by `;`. A mark is `iμ` followed by `f` (heavy
  dot, "nonzero modulus") or `o` (open circle, "moduli numerically equal, but opposite in sign" to
  the heavy dot it is linked to). A group of one heavy dot is an independent modulus. A cell in no
  group is printed as the small dot, "zero modulus".
- `Count`: Yariv's printed number of independent moduli, kept to be compared with the number of
  link groups; it is not an input.
- `Evidence`: `blind` (transcribed before the computed form of that class was looked at),
  `engine-known-unambiguous` (the computed form was known, but every mark is unambiguous),
  `engine-known-print-confirmed` (known, and an ambiguous mark was confirmed by Thomas against
  print).
- `Groups`: point-group keys of symcrys; Yariv prints `-43m` and `23` as one panel. `-6m2` is the
  class Yariv heads `-6m2`.

Yariv names an orientation for four classes (2, m, 3m, -6m2), and prints two panels for each.

| Id | Panel | Groups | Count | Links | Evidence | Note |
|---|---|---|---:|---|---|---|
| class-1 | Class 1 | 1 | 18 | 11f; 12f; 13f; 14f; 15f; 16f; 21f; 22f; 23f; 24f; 25f; 26f; 31f; 32f; 33f; 34f; 35f; 36f | blind |  |
| class-2-2parx2 | Class 2, 2∥x2 (standard orientation) | 2 | 8 | 14f; 16f; 21f; 22f; 23f; 25f; 34f; 36f | blind |  |
| class-2-2parx3 | Class 2, 2∥x3 | 2 | 8 | 14f; 15f; 24f; 25f; 31f; 32f; 33f; 36f | blind |  |
| class-m-perpx2 | Class m, m-perp-x2 (standard orientation) | m | 10 | 11f; 12f; 13f; 15f; 24f; 26f; 31f; 32f; 33f; 35f | blind |  |
| class-m-perpx3 | Class m, m-perp-x3 | m | 10 | 11f; 12f; 13f; 16f; 21f; 22f; 23f; 26f; 34f; 35f | blind |  |
| class-222 | Class 222 | 222 | 3 | 14f; 25f; 36f | blind |  |
| class-mm2 | Class mm2 | mm2 | 5 | 15f; 24f; 31f; 32f; 33f | blind |  |
| class-4 | Class 4 | 4 | 4 | 14f 25o; 15f 24f; 31f 32f; 33f | blind | The two links at columns 4/5 cross as a printed X; endpoints unambiguous. |
| class-bar4 | Class -4 | -4 | 4 | 14f 25f; 15f 24o; 31f 32o; 36f | engine-known-unambiguous | Crossed X at columns 4/5, opposite polarity to class 4; row 3 carries d31--d32 open and a separate d36. |
| class-422 | Class 422 | 422 | 1 | 14f 25o | blind | Single link; all other cells are small zero dots. |
| class-4mm | Class 4mm | 4mm | 3 | 15f 24f; 31f 32f; 33f | engine-known-unambiguous |  |
| class-bar42m-2parx1 | Class -42m, 2∥x1 | -42m | 2 | 14f 25f; 36f | engine-known-unambiguous |  |
| class-432 | Class 432 (all moduli vanish) | 432 | 0 | — | engine-known-unambiguous |  |
| classes-bar43m-and-23 | Classes -43m and 23 | -43m, 23 | 1 | 14f 25f 36f | engine-known-unambiguous | One printed chain of two segments across all three heavy dots. |
| class-3 | Class 3 | 3 | 6 | 11f 12o 26o; 14f 25o; 15f 24f; 16o 21o 22f; 31f 32f; 33f | engine-known-unambiguous | The hardest panel: two three-mark sign chains (d11--d12--d26 and d22--d21--d16) whose long diagonals cross, plus the d14/d15 X. All six glyphs and both diagonal endpoints resolve when the panel is read on its own. |
| class-32 | Class 32 | 32 | 2 | 11f 12o 26o; 14f 25o | blind | Ambiguity logged: the long diagonal reaching d26 leaves the d11/d12 pair without a resolvable start dot. Immaterial -- both candidates lie in the same connected component, so neither the cell set nor the partition depends on it. |
| class-3m-perpx1 | Class 3m, m-perp-x1 (standard orientation) | 3m | 4 | 15f 24f; 16o 21o 22f; 31f 32f; 33f | blind |  |
| class-3m-perpx2 | Class 3m, m-perp-x2 | 3m | 4 | 11f 12o 26o; 15f 24f; 31f 32f; 33f | engine-known-unambiguous |  |
| class-6 | Class 6 (same as class 4) | 6 | 4 | 14f 25o; 15f 24f; 31f 32f; 33f | blind | Yariv's own 'same as class 4' note is an in-source cross-check, and the two transcriptions agree. |
| class-6mm | Class 6mm (same as class 4mm) | 6mm | 3 | 15f 24f; 31f 32f; 33f | blind | Yariv's 'same as class 4mm' note is an in-source cross-check, and the two transcriptions agree. |
| class-622 | Class 622 (same as class 422) | 622 | 1 | 14f 25o | blind | Yariv's 'same as class 422' note is an in-source cross-check, and the two transcriptions agree. |
| class-bar6 | Class -6 | -6 | 2 | 11f 12o 26o; 16o 21o 22f | engine-known-unambiguous | Printed rotated 90deg. The rotation was fixed WITHOUT the engine: under the sigma-h of -6 every component with an odd z count vanishes, so the all-small line must be row 3, which determines the orientation uniquely. Both three-mark chains and the crossing diagonals then resolve. |
| class-bar6m2-perpx1 | Class -6m2, m-perp-x1 (standard orientation) | -6m2 | 1 | 16o 21o 22f | blind | One three-mark chain: d21--d22 horizontal, then the long diagonal d22--d16. Same shape as the in-plane group of 3m m-perp-x1, which is what -6m2 = 3m + sigma-h leaves standing. |
| class-bar6m2-perpx2 | Class -6m2, m-perp-x2 | -6m2 | 1 | 11f 12o 26o | blind | One three-mark chain: d11--d12 horizontal, then the long diagonal d12--d26. An earlier page-level read of this panel put a mark near column 5; the panel read on its own shows that was the diagonal's descent, not a mark. No stray dot -- both -6m2 panels occupy only rows 1-2 x columns 1, 2, 6, the only cells sigma-h and the threefold axis leave alive. |
