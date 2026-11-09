# Birss Table 3: the 32 crystallographic point groups

Source: R. R. Birss, _Symmetry and Magnetism_ (North-Holland, Amsterdam, 1966), Table 3,
printed pp. 36–39 (printed rotated by 90°, spanning two scanned pages of Thomas' copy). Transcribed
in manganite/birss-tables (`table-3.md`); taken over as printed, with the known misprints listed
under "Errata" instead of corrected in the table.

Notation:

- A leading minus sign is the overbar: `-3_z`, `-4_z`, `-1` (inversion); `-2_z` is the mirror
  perpendicular to z.
- `±n_z`: the two operations of an n-fold axis about z other than the identity (`±-n_z` for
  rotoinversions). `n(op)` groups n equivalent operations; `⊥` means perpendicular to the principal
  axis. `2_xy`, `2_-xy`: twofold axes along the two in-plane diagonals.
- Generating matrices `σ(N)` refer to `sigma-matrices.md`.
- The Schoenflies column gives Birss's alternative names in parentheses.

| System | Intl. abbreviated | Full | Schoenflies | Shubnikov | Symmetry operations | Number | Generating matrices |
|---|---|---|---|---|---|---:|---|
| Triclinic | 1 | 1 | C<sub>1</sub> | 1 | 1 | 1 | σ(0) |
| Triclinic | -1 | -1 | C<sub>i</sub>(S<sub>2</sub>) | -2 | 1, -1 | 2 | σ(1) |
| Monoclinic | 2 | 2 | C<sub>2</sub> | 2 | 1, 2_z | 2 | σ(3) |
| Monoclinic | m | m | C<sub>s</sub>(C<sub>1h</sub>) | m | 1, -2_z | 2 | σ(5) |
| Monoclinic | 2/m | 2/m | C<sub>2h</sub> | 2:m | 1, -1, 2_z, -2_z | 4 | σ(1), σ(3) |
| Orthorhombic | 222 | 222 | D<sub>2</sub>(V) | 2:2 | 1, 2_x, 2_y, 2_z | 4 | σ(2), σ(3) |
| Orthorhombic | mm2 | mm2 | C<sub>2v</sub> | 2.m | 1, 2_z, -2_x, -2_y | 4 | σ(3), σ(4) |
| Orthorhombic | mmm | mmm | D<sub>2h</sub>(V<sub>h</sub>) | m.2:m | 1, -1, 2_x, 2_y, 2_z, -2_x, -2_y, -2_z | 8 | σ(1), σ(2), σ(3) |
| Tetragonal | 4 | 4 | C<sub>4</sub> | 4 | 1, 2_z, ±4_z | 4 | σ(7) |
| Tetragonal | -4 | -4 | S<sub>4</sub> | -4 | 1, 2_z, ±-4_z | 4 | σ(8) |
| Tetragonal | 4/m | 4/m | C<sub>4h</sub> | 4:m | 1, -1, 2_z, -2_z, ±4_z, ±-4_z | 8 | σ(1), σ(7) |
| Tetragonal | 422 | 422 | D<sub>4</sub> | 4:2 | 1, 2_x, 2_y, 2_z, 2_xy, 2_-xy, ±4_z | 8 | σ(2), σ(7) |
| Tetragonal | 4mm | 4mm | C<sub>4v</sub> | 4.m | 1, 2_z, -2_x, -2_y, -2_xy, -2_-xy, ±4_z | 8 | σ(4), σ(7) |
| Tetragonal | -42m | -42m | D<sub>2d</sub>(V<sub>d</sub>) | -4.m | 1, 2_x, 2_y, 2_z, -2_xy, -2_-xy, ±-4_z | 8 | σ(2), σ(8) |
| Tetragonal | 4/mmm | 4/mmm | D<sub>4h</sub> | m.4:m | 1, -1, 2_x, 2_y, 2_z, 2_xy, 2_-xy, -2_x, -2_y, -2_z, -2_xy, -2_-xy, ±4_z, ±-4_z | 16 | σ(1), σ(2), σ(7) |
| Trigonal | 3 | 3 | C<sub>3</sub> | 3 | 1, ±3_z | 3 | σ(6) |
| Trigonal | -3 | -3 | C<sub>3i</sub>(S<sub>6</sub>) | -6 | 1, -1, ±3_z, ±-3_z | 6 | σ(1), σ(6) |
| Trigonal | 32 | 32 | D<sub>3</sub> | 3:2 | 1, 3(2⊥), ±3_z | 6 | σ(2), σ(6) |
| Trigonal | 3m | 3m | C<sub>3v</sub> | 3.m | 1, 3(-2⊥), ±3_z | 6 | σ(4), σ(6) |
| Trigonal | -3m | -3m | D<sub>3d</sub> | -6.m | 1, -1, 3(2⊥), 3(-2⊥), ±3_z, ±-3_z | 12 | σ(1), σ(2), σ(6) |
| Hexagonal | 6 | 6 | C<sub>6</sub> | 6 | 1, 2_z, ±3_z, ±6_z | 6 | σ(3), σ(6) |
| Hexagonal | -6 | -6 | C<sub>3h</sub> | 3:m | 1, -2_z, ±3_z, ±-6_z | 6 | σ(5), σ(6) |
| Hexagonal | 6/m | 6/m | C<sub>6h</sub> | 6:m | 1, -1, 2_z, -2_z, ±3_z, ±-3_z, ±6_z, ±-6_z | 12 | σ(1), σ(3), σ(6) |
| Hexagonal | 622 | 622 | D<sub>6</sub> | 6:2 | 1, 6(2⊥), 2_z, ±3_z, ±6_z | 12 | σ(2), σ(3), σ(6) |
| Hexagonal | 6mm | 6mm | C<sub>6v</sub> | 6.m | 1, 2_z, 6(-2⊥), ±3_z, ±6_z | 12 | σ(4), σ(4), σ(6) |
| Hexagonal | -6m2 | -6m2 | D<sub>3h</sub> | m.3:m | 1, 3(2⊥), 3(-2⊥), -2_z, ±3_z, ±-6_z | 12 | σ(2), σ(5), σ(6) |
| Hexagonal | 6/mmm | 6/mmm | D<sub>6h</sub> | m.6:m | 1, -1, 6(2⊥), 2_z, 6(-2⊥), -2_z, ±3_z, ±-3_z, ±6_z, ±-6_z | 24 | σ(1), σ(2), σ(3), σ(6) |
| Cubic | 23 | 23 | T | 3/2 | 1, 3(2), 4(±3) | 12 | σ(3), σ(9) |
| Cubic | m3 | m3 | T<sub>h</sub> | -6/2 | 1, -1, 3(2), 3(-2), 4(±3), 4(±-3) | 24 | σ(1), σ(3), σ(9) |
| Cubic | 432 | 432 | O | 3/4 | 1, 9(2), 4(±3), 3(±4) | 24 | σ(7), σ(9) |
| Cubic | -43m | -43m | T<sub>d</sub> | 3/-4 | 1, 3(2), 6(-2), 4(±3), 3(±-4) | 24 | σ(8), σ(9) |
| Cubic | m3m | m3m | O<sub>h</sub> | -6/4 | 1, -1, 9(2), 9(-2), 4(±3), 4(±-3), 3(±4), 3(±-4) | 48 | σ(1), σ(7), σ(9) |

## Errata

Printed entries that are wrong. The table above keeps the print; tests apply these corrections.

| Class | Column | Printed | Correct | Evidence |
|---|---|---|---|---|
| 6mm | Generating matrices | σ(4), σ(4), σ(6) | σ(3), σ(4), σ(6) | The printed set repeats σ(4) and generates only 3m (6 operations, against the printed order 12). Birss Table 6 (printed pp. 91–98) lists σ(3), σ(4), σ(6) for 6mm. |
| -6m2 | Generating matrices | σ(2), σ(5), σ(6) | σ(4), σ(5), σ(6) | σ(2) = 2_y makes y a twofold axis, against Birss Table 4a, printed pp. 56–57 (orientation of reference axes: 3 ∥ z, -2 ∥ y, i.e. y is a mirror normal). Birss Table 6 lists σ(4), σ(5), σ(6) for -6m2. |
