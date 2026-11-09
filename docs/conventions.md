# Conventions for point groups

How symcrys represents the crystallographic point groups, and where the two supported conventions,
ITC and Birss, differ. The print sources behind each statement are listed in "Sources" at the end;
the tests named there re-check them against the transcriptions in `references/`.

So far symcrys holds the 32 crystallographic point groups (crystal classes, type I). The magnetic
point groups (types II and III) follow.

## Conventions

| Name      | Source                                                                                | Role     |
| --------- | ------------------------------------------------------------------------------------- | -------- |
| `'itc'`   | _International Tables for Crystallography_: Vol. A (6th ed., 2016) for the 32 classes | default  |
| `'birss'` | R. R. Birss, _Symmetry and Magnetism_ (North-Holland, Amsterdam, 1966)                | optional |

A convention decides two things: which setting a class takes by default, and the Hermann–Mauguin
symbols of its settings. It does not change a group's operations in a given setting. Functions
that take a convention default to `'itc'`.

## Keys

A class is identified by its key: the ITC short symbol of the class, as in `POINT_GROUP_KEYS`
(`'32'`, `'3m'`, `'-3m'`, `'-6m2'`, `'m-3m'`, …). A key names the class, not a setting; for the
classes with several settings, `symbol()` gives the symbol of a setting (`321`, `312`).

For D3h the key is `-6m2`, as in ITC Vol. D Table 1.5.2.3. ITA names the class `-62m` (Tables
2.1.1.1, 3.2.1.2, 3.2.2.1), the symbol of the other setting; open question, #17.

## Cartesian frame

All matrices are Cartesian, in a right-handed orthonormal frame x, y, z, row-major, acting on
column vectors. How the conventional lattice basis a, b, c sits in that frame
(`latticeBasis(family)`, columns a, b, c with unit edge lengths):

| Family                     | Frame                                      |
| -------------------------- | ------------------------------------------ |
| orthorhombic, tetragonal   | x ∥ a, y ∥ b, z ∥ c                        |
| cubic                      | x ∥ a, y ∥ b, z ∥ c                        |
| hexagonal (hexagonal axes) | x ∥ a, z ∥ c, y = z × x; b at 120° from a  |
| monoclinic                 | unique axis ∥ y (unique axis b) or ∥ z (c) |
| triclinic                  | no symmetry direction; no fixed basis      |

For the monoclinic and triclinic families the cell angles are free, so `latticeBasis` gives no
basis for them; only the direction of the monoclinic unique axis is fixed.

The hexagonal frame puts the secondary symmetry directions of the trigonal classes (the a axes) on
x, as ITC Vol. D does in its tensor tables (§ 1.1.4.10.4.4: group 32 with the twofold axis
parallel to Ox₁, group 3m with the mirror perpendicular to Ox₁). This was decided on #6.

## Settings

A class may be placed in the Cartesian frame in more than one way: a **setting**. Settings are
numbered from 1; an index means the same physical frame in both conventions, and the convention
decides which one is the default.

The data are stored in **setting 1**, which is Birss's frame. Every other setting is a rotation s
of it: its operations are s·W·sᵀ for the stored operations W. The ITC settings are among these
frames, so ITC results come from the same stored data as Birss results.

Classes with more than one setting (short symbol, full symbol in parentheses):

| Class  | Setting | Axis | ITC                             | Birss                          |
| ------ | ------- | ---- | ------------------------------- | ------------------------------ |
| `2`    | 1       | c    | `2` (`1 1 2`)                   | `2` (`1 1 2`) **default**      |
|        | 2       | b    | `2` (`1 2 1`) **default**       | `2` (`1 2 1`)                  |
| `m`    | 1       | c    | `m` (`1 1 m`)                   | `m` (`1 1 m`) **default**      |
|        | 2       | b    | `m` (`1 m 1`) **default**       | `m` (`1 m 1`)                  |
| `2/m`  | 1       | c    | `2/m` (`1 1 2/m`)               | `2/m` (`1 1 2/m`) **default**  |
|        | 2       | b    | `2/m` (`1 2/m 1`) **default**   | `2/m` (`1 2/m 1`)              |
| `mm2`  | 1       | c    | `mm2` (`m m 2`) **default**     | `mm2` (`m m 2`) **default**    |
|        | 2       | a    | `2mm` (`2 m m`)                 | `2mm` (`2 m m`)                |
|        | 3       | b    | `m2m` (`m 2 m`)                 | `m2m` (`m 2 m`)                |
| `-42m` | 1       |      | `-42m` (`-4 2 m`) **default**   | `-42m` (`-4 2 m`) **default**  |
|        | 2       |      | `-4m2` (`-4 m 2`)               | `-4m2` (`-4 m 2`)              |
| `32`   | 1       |      | `312` (`3 1 2`)                 | `32` (`3 2 1`) **default**     |
|        | 2       |      | `321` (`3 2 1`) **default**     | `312` (`3 1 2`)                |
| `3m`   | 1       |      | `31m` (`3 1 m`)                 | `3m` (`3 m 1`) **default**     |
|        | 2       |      | `3m1` (`3 m 1`) **default**     | `31m` (`3 1 m`)                |
| `-3m`  | 1       |      | `-31m` (`-3 1 2/m`)             | `-3m` (`-3 2/m 1`) **default** |
|        | 2       |      | `-3m1` (`-3 2/m 1`) **default** | `-31m` (`-3 1 2/m`)            |
| `-6m2` | 1       |      | `-62m` (`-6 2 m`)               | `-6m2` (`-6 m 2`) **default**  |
|        | 2       |      | `-6m2` (`-6 m 2`) **default**   | `-62m` (`-6 2 m`)              |

ITA describes both settings or orientations of these classes without naming one standard (§ 3.2.1.2.1
(a)–(d), p. 721; Table 3.2.3.2). The ITC defaults of symcrys: unique axis b, the standard setting
of the monoclinic space-group symbols (ITA § 2.1.3.3, p. 151); `321`, `3m1` and their Laue class
`-3m1`, as in the tensor tables of ITC Vol. D (§ 1.1.4.10.4.4, #6); `-6m2` after ITC Vol. D Table
1.5.2.3 (open, #17); otherwise the first entry in ITA.

Frames relative to setting 1: monoclinic setting 2 maps z to y (rotation by 180° about [011]);
orthorhombic settings 2 and 3 move the twofold axis from z to x and to y (cyclic permutations of
the axes); `-42m` setting 2 is rotated by 45° about z, the trigonal and hexagonal pairs by 30°.

"Axis" is the unique axis of a monoclinic setting and the axis of the twofold rotation of `mm2`.
The classes `222` and `mmm` have one setting only: their three axes are equivalent.

## Where ITC and Birss differ

1. **Position 2 in trigonal and hexagonal symbols.** ITC reads the second position of a
   Hermann–Mauguin symbol along the a axes (x), Birss along y, which is a tertiary direction
   (90° from a). So the same symbol names two frames 30° apart, and for `32`, `3m`, `-3m` and
   `-6m2` each frame carries, in Birss, the ITC symbol of the other frame (table above). Both
   conventions take as default the frame their own short symbol of the class describes, so the
   defaults are 30° apart, and so are the Cartesian tensor components that survive.
2. **Monoclinic unique axis.** ITC's standard is unique axis b (y), Birss's is c (z). The short
   symbols agree; the full symbols (`1 2 1`, `1 1 2`) tell the settings apart.
3. **Cubic symbols.** Birss prints `m3` and `m3m`; symcrys writes `m-3` and `m-3m` in both
   conventions (pure spelling). `findPointGroup` therefore does not accept Birss's printed `m3`
   and `m3m`.

Everywhere else the two conventions agree: same default setting, same symbols, same Schoenflies
symbols (`-3` is `C3i` in both Birss Table 3 and ITA Tables 3.2.1.2 and 3.2.3.2).

## Symbols

- Plain strings: a leading `-` is the overbar (`-3m`, `m-3m`); time reversal will be written `'`.
- **Short symbol** (`form: 'short'`, the default): the symbol of the setting, in ITC as in the
  headline of ITA Table 3.2.3.2, with the trailing or inner `1` that fixes the orientation (`321`,
  `31m`, `-3m1`); in Birss the printed class symbol for the default setting (`32`).
- **Full symbol** (`form: 'full'`): one entry per symmetry direction, separated by single spaces,
  `1` for a direction without symmetry: `-3 2/m 1`, `1 2 1`, `4/m -3 2/m`.
- **Birss symbols other than the printed short symbol of the default setting are derived.** Birss
  prints short symbols for the default orientation only, and no full symbols (the "Full" column of
  his Table 3 repeats the short symbol). symcrys reads the positions along Birss's directions: as
  in ITC, except that in the hexagonal family position 2 is y (Birss Table 4a) and position 3 is x
  (#17).
- **Schoenflies** (`form: 'schoenflies'`): subscripts written inline (`C3v`, `D2d`, `Oh`); the same
  in both conventions. ITC Vol. D Table 1.5.2.3, for the magnetic groups, writes `S6` for `-3`.
- Rendering (overbars, subscripts, LaTeX) is left to the applications.

## Numbers

Matrices hold floating-point numbers. During group closure every entry within 10⁻⁹ of an exact
value (0, ±1, ±1/2, ±√3/2, and ±√2/2 for the 45° setting frame) is set to that value, so products do not drift; two matrices are
equal when all entries agree within 10⁻⁶. Exact matrices in the lattice basis may come later, when
a consumer needs them (decision on #13).

## Properties

`isCentrosymmetric`, `isPolar`, `isChiral` and `laueClass` follow from the operations alone and do
not depend on setting or convention. Properties that need tensors (piezoelectric, and the magnetic
ones) come with the tensor module.

## Sources

| What                                                    | Print source                                                                                                                                                                                                                                   | Test                                                    |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Birss operations, symbols, Schoenflies, orders          | Birss Table 3 (pp. 36–39), generating matrices eq. (2.17) (p. 48): `references/birss/`                                                                                                                                                         | `birss.reference.test.ts`                               |
| Birss symbols of other settings, full symbols           | derived along Birss's directions (position 2 from Birss Table 4a, pp. 56–57)                                                                                                                                                                   | `birss.reference.test.ts`                               |
| ITC symbols of the settings                             | ITA Table 3.2.3.2 (headlines, pp. 745–769); ITC Vol. D Table 1.5.2.3 for monoclinic full symbols; the symbol rule of ITA § 2.1.3.4 (p. 151; for the monoclinic full symbols, 5th ed. § 2.2.4.1 (ii), p. 18) for `2mm`, `m2m` and unique axis c | `itc.reference.test.ts`                                 |
| ITC operations of every setting                         | the ITC symbol along the symmetry directions of ITA Table 2.1.3.1 (p. 151), in the frame of #6                                                                                                                                                 | `itc.reference.test.ts`                                 |
| ITC default settings                                    | see "Settings" above                                                                                                                                                                                                                           | `itcSettings.fixtures.ts`                               |
| centrosymmetric, polar, chiral, Laue class, Schoenflies | ITA Table 2.1.1.1 (p. 143, Laue groups), Table 3.2.2.1 (p. 738), Table 3.2.3.2                                                                                                                                                                 | `properties.reference.test.ts`, `itc.reference.test.ts` |

Each file in `references/` names its source and the printed page. ITA means Vol. A, 6th edition
(2016).
