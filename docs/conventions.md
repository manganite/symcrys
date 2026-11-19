# Conventions for point groups

How symcrys represents the crystallographic point groups, and where the two supported conventions,
ITC and Birss, differ. The print sources behind each statement are listed in "Sources" at the end;
the tests named there re-check them against the transcriptions in `references/`.

So far symcrys holds the 32 crystallographic point groups (crystal classes, type I), with their
symmetry directions and elements, the site symmetry and Wyckoff positions of directions, and the
forms of property tensors of rank 0 to 4. The magnetic point groups (types II and III) follow.

## Conventions

| Name      | Source                                                                                | Role     |
| --------- | ------------------------------------------------------------------------------------- | -------- |
| `'itc'`   | _International Tables for Crystallography_: Vol. A (6th ed., 2016) for the 32 classes | default  |
| `'birss'` | R. R. Birss, _Symmetry and Magnetism_ (North-Holland, Amsterdam, 1966)                | optional |

A convention decides which setting a class takes by default and the Hermann–Mauguin symbols of its
settings, and it decides how the operations of a setting are presented: their order, the generators
and the sign of the axes in `describeOperations`. The ITC convention follows ITA; the Birss
convention gives what birss-app gives ("Birss convention and birss-app"). A convention does not
change the set of operations of a given setting. Functions that take a convention default to
`'itc'`.

## Keys

A class is identified by its key: the ITC short symbol of the class, as in `POINT_GROUP_KEYS`
(`'32'`, `'3m'`, `'-3m'`, `'-6m2'`, `'m-3m'`, …). A key names the class, not a setting; for the
classes with several settings, `symbol()` gives the symbol of a setting (`321`, `312`).

For D3h the key is `-6m2`, as in ITC Vol. D Table 1.5.2.3. ITA lists both orientations, `-6m2`
first (§ 3.2.1.2.1 (b), p. 721; Table 3.2.3.2, pp. 762–763), but its tables of classes print `-62m`
(Tables 2.1.1.1, 3.2.1.2, 3.2.2.1). symcrys keeps `-6m2`, as birss-app does (decision on #17).

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

ITA describes the monoclinic classes with unique axis b and c, `-42m` and `-6m2` in two
orientations, and `32`, `3m`, `-3m` with hexagonal axes in two orientations, without naming one
standard (§ 3.2.1.2.1 (a), (b), (d), p. 721; Table 3.2.3.2); `mm2` it gives in one setting only.
The ITC defaults of symcrys:

- unique axis b: the IUCr accepts the b-axis setting as standard for morphological and structural
  studies (ITA § 2.1.3.15, p. 171);
- `321` and `3m1`: the frame of the tensor tables of ITC Vol. D (§ 1.1.4.10.4.4, #6);
- `-3m1`: their Laue class in the same frame (a consistency choice; ITC Vol. D Table 1.5.2.3 prints
  its full symbol `-3 2/m 1`);
- `-6m2`: ITC Vol. D Table 1.5.2.3, the first entry in ITA, and birss-app (decision on #17);
- `-42m`, `mm2`: the first or only entry in ITA.

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
2. **Monoclinic unique axis.** ITC's standard is unique axis b (y; ITA § 2.1.3.15, p. 171), Birss's
   is c (z). The short
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
  `31m`, `-3m1`); in Birss the printed class symbol for the default setting (`32`). Difference
  from birss-app, agreed with Thomas (2026-11-09): birss-app labels the ITC default frames of `32`,
  `3m`, `-3m` as `32`, `3m`, `-3m`. With hexagonal axes ITA keeps the `1` (`321`, `312`; Table
  3.2.3.2, p. 754), because without it the two orientations cannot be told apart; `32` there is the
  description with rhombohedral axes (p. 755). For birss-app, when it moves onto symcrys: #19.
- **Full symbol** (`form: 'full'`): one entry per symmetry direction, separated by single spaces,
  `1` for a direction without symmetry: `-3 2/m 1`, `1 2 1`, `4/m -3 2/m`.
- **Birss symbols other than the printed short symbol of the default setting are derived.** Birss
  prints short symbols for the default orientation only, and no full symbols (the "Full" column of
  his Table 3 repeats the short symbol). symcrys reads the positions along Birss's directions: as
  in ITC, except that in the hexagonal family position 2 is y (Birss Table 4a) and position 3 is x
  (the reading of birss-app; #17).
- **Schoenflies** (`form: 'schoenflies'`): subscripts written inline (`C3v`, `D2d`, `Oh`); the same
  in both conventions. ITC Vol. D Table 1.5.2.3, for the magnetic groups, writes `S6` for `-3`.
- Rendering (overbars, subscripts, LaTeX) is left to the applications.

## Numbers

Matrices hold floating-point numbers. During group closure every entry within 10⁻⁹ of an exact
value (0, ±1, ±1/2, ±√3/2, and ±√2/2 for the 45° setting frame) is set to that value, so products do not drift; two matrices are
equal when all entries agree within 10⁻⁶. Exact matrices in the lattice basis may come later, when
a consumer needs them (decision on #13).

## Properties

`isCentrosymmetric`, `isPolar`, `isChiral` and `laueClass` follow from the operations alone,
`isPiezoelectric` from the form of the piezoelectric tensor ("Tensors"); none depends on setting or
convention. The magnetic properties that need tensors (piezomagnetic, magnetoelectric,
ferromagnetic) come with the magnetic point groups.

## Order of the operations

In the ITC convention `operations` lists the operations of a setting in ITA's order: for every
setting that ITA lists, as ITA numbers its general position (ITA Table 3.2.3.2; the symmetry
operations (1) … (n) of the space-group tables carry the same numbers). ITA bases this sequence on
its selected generators (`generators`, below; 5th ed., § 2.2.11 (iv), p. 27; "Generators selected"
of the symmorphic P group in Part 7) and takes the next generator as soon as a power of the current
one lies in the group generated so far (§ 8.3.5, p. 737). Starting from the identity, each generator
g therefore extends the group H generated so far by the cosets gH, g²H, … until a power of g lies in
H. For the two settings ITA does not list, `mm2` settings 2 (`2mm`) and 3 (`m2m`), the order is that
of setting 1, carried into their frame. In the Birss convention the order is birss-app's ("Birss
convention and birss-app"). `describeOperations` follows the order of `operations`.

## Generators

In the ITC convention `generators` returns ITA's selected generators of the setting ("Generators
selected" of the symmorphic P group, 5th ed., Part 7), in printed order and without the identity;
for `mm2` settings 2 and 3, which ITA does not list, those of setting 1 carried into their frame. In
the Birss convention it returns birss-app's generators (for `1` the identity, as in birss-app),
which are the generators stored in `src/pointGroups/data.ts` carried into the frame of the setting
("Birss convention and birss-app"). Neither are Birss's printed generating matrices (Birss Table 3,
pp. 36–39, σ(N) of eq. (2.17), p. 48), which differ for some classes in choice and order (e.g.
`222`: birss-app 2_z, 2_x; Birss σ(2), σ(3) = 2_y, 2_z); Birss's tests check only the group they
generate.

## Birss convention and birss-app

In the Birss convention symcrys gives what birss-app gives (maintainer, 2026-11-18): birss-app is
the Birss application symcrys serves, and it must show the same once it moves onto symcrys. Beyond
the default settings and symbols (checked against Birss's print and birss-app), this fixes three
choices that Birss's print leaves open:

- **Generators:** birss-app's, per class and setting (`generators`).
- **Order of the operations:** birss-app's group closure: the generators of the setting first,
  then repeated passes that append every new product g·h of two operations found before the pass,
  in the order of g, then h, until a pass adds nothing. The identity is not necessarily first.
- **Sign of an axis** in `describeOperations`: as birss-app signs it, with the first non-zero
  Cartesian component (in the order x, y, z) positive; the sense refers to that sign. The axis is
  still a symmetry direction of ITA Table 2.1.3.1, possibly reversed; `symmetryDirections` keeps
  the sign of the table, so in this convention an axis is matched to a direction by |dot| = 1, not
  by identity.
- **Free parameters of a tensor form** ("Tensors"): the components birss-app names as free
  parameters, in its order. Here symcrys's rule (the pivots of the reduced row echelon form) gives
  birss-app's choice in every setting, so the Birss convention needs nothing of its own.

`birssApp.pins.test.ts` checks this against behavioural pins captured from birss-app
(`audit/birss-app`, fixture class (c); the revision is the `revision` of
`src/pointGroups/birssApp.pins.json`, at present 2be5fe3, and the test requires this text to name
it): for all 32 classes and all settings the generators and the operations in order, the symbols,
the default setting, the property flags, and the operation symbols birss-app writes, rebuilt from
`describeOperations` with birss-app's labelling rules. `src/tensors/birssApp.pins.test.ts` checks
the tensor forms the same way, against `src/tensors/birssApp.pins.json` from the same revision: for
all classes, settings and 26 kinds of tensor, the basis and the free parameters. For these choices birss-app is the specification (maintainer decision), so here its
pins are the reference, not only a regression detector. The strings themselves (`2_z`, `3_[111]⁺`,
`m_60°`) and the order birss-app sorts them into for display stay in birss-app.

## Symmetry directions and elements

**Symmetry directions** (`LATTICE_SYMMETRY_DIRECTIONS`) are the lattice directions of ITA Table
2.1.3.1, grouped by position of the full symbol, in the printed order and with the printed signs:
primary, secondary, tertiary (hexagonal family: the row "Hexagonal", also for the trigonal classes
with hexagonal axes). The monoclinic full symbol reads along a, b, c, so the monoclinic family has
the orthorhombic positions; the triclinic family has none.

`symmetryDirections(key, options)` lists, for a setting, every position of the family with the
symbol at that position (if the full symbol has it) and, for each direction, the elements along
it: the highest rotation n, the highest rotoinversion n̄ (n = 3, 4, 6) and whether a mirror is
perpendicular. In the Birss convention the hexagonal positions 2 and 3 are read along y (a tertiary
direction) and x (a secondary one), as for the symbols ("Where ITC and Birss differ").

`describeOperations(key, options)` describes each operation, in the order of `operations`:

| Field          | Meaning                                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------- |
| `kind`         | `identity`, `inversion`, `rotation`, `rotoinversion` (n̄ = inversion × rotation n, n = 3, 4, 6), `mirror` |
| `order`        | the n of n or n̄; 1 for the identity and the inversion, 2 for a mirror (m = 2̄)                            |
| `axis`         | rotation or rotoinversion axis, or mirror normal: `lattice` [uvw] and `cartesian` unit vector            |
| `sense`        | for n ≥ 3: `+` or `-`                                                                                    |
| `timeReversal` | as in the operation                                                                                      |

- **Axis.** Every axis and mirror normal of a crystal class lies along one of its symmetry
  directions; the axis is that direction, as [uvw] with the sign of Table 2.1.3.1 (Birss
  convention: signed as birss-app signs it, above) and as a Cartesian unit vector in the frame of
  the setting. For the monoclinic family, which has no fixed
  basis, a, b, c are taken along x, y, z; this is exact for the unique axis, the only direction
  that carries an element.
- **Sense** follows ITA § 11.1.2 (5th ed., pp. 810–811): `+` if the rotation is counter-clockwise
  seen from the tip of the axis looking towards the origin, i.e. by +360°/n about it; for a
  rotoinversion, angle and sense refer to the rotation part. The sense refers to the sign of the
  axis. For all 40 settings of ITA's tables the printed
  axis of every operation with n ≥ 3 has exactly this sign, so `sense` equals the printed one
  (test below).
- Symbols built from these data (`4⁺ 0,0,z`, `3⁻`, `2_z`, axis names in another frame) are left to
  the applications.

## Site symmetry and Wyckoff positions

These functions treat **directions**: face normals (poles) and lattice directions, the vectors a
point group acts on. A direction is a non-zero Cartesian vector; its length does not matter.

**Site symmetry.** `siteSymmetry(operations, direction, { tolerance })` returns the operations of
any list (a point group, or for example the operations left after distorting a crystal) that fix
the direction: those that move its unit vector by less than `tolerance` (default `EPSILON`,
10⁻⁶). Near an element, the operations fixing a direction within the tolerance need not form a
group (a sixfold rotation can count as fixing while its square, which moves the direction further,
does not), so symcrys closes them under the products found in the list, sets the given direction
onto the fixed space of that group (the mean of its images, normalised), takes the operations
fixing that set direction, and repeats until the group no longer changes. If the group fixes no
common direction (only with a tolerance far too large), it throws. The result is the site symmetry of the set direction,
which removes rounding errors within the tolerance; the multiplicity is the number of operations
divided by its order. For a list that is not a group, the closure keeps only products in the list,
and the multiplicity may not be an integer. Time reversal is ignored, since it does not change a
direction. Site symmetry is plain computation and works in both conventions.

**Wyckoff positions** are ITA's: a Wyckoff position is the set of directions whose site
symmetries are conjugate in the point group (ITA, 6th ed., § 3.2.1.2.2, "Definition", p. 722). They are
defined in the **ITC convention only**: neither Birss (1966) nor birss-app has them, so there is no
Birss output to follow (maintainer decision, 2026-11-18, #24); in the Birss convention
`wyckoffPositions` and `wyckoffPositionOf` throw. The setting index still names the same frame, so
a Birss caller reaches a frame through its index with `'itc'`.

`wyckoffPositions(key, { setting })` lists them in ITA's order, general position first, as ITA
prints them for that setting (ITA 6th ed., Table 3.2.3.2, pp. 745–769):

| Field                    | Meaning                                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `letter`                 | ITA's Wyckoff letter                                                                                                                  |
| `multiplicity`           | number of equivalent directions (faces of the form)                                                                                   |
| `siteSymmetry`           | oriented site-symmetry symbol as printed, e.g. `..m`, `4m.m`; the positions are those of the symmetry directions of ITA Table 2.1.3.1 |
| `coordinates`            | the first printed coordinate triplet, e.g. `x,x,z` (a representative point)                                                           |
| `millerIndices`          | the first printed face, e.g. `h,h,l`, Bravais–Miller indices for hexagonal axes, e.g. `h,h,-2h,l`                                     |
| `representative`         | that face with h = 3, k = 2, l = 1: `hkl` (three indices, without i) and its Cartesian unit normal h a\* + k b\* + l c\*              |
| `siteSymmetryOperations` | indices into `operations` (same setting, ITC convention) of the operations fixing the representative                                  |

- The **point at the origin** (letter o, site symmetry the whole group), which ITA 2016 prints for
  every group except the ten polar ones (1, 2, m, mm2, 4, 4mm, 3, 3m, 6, 6mm), is not a direction
  and is left out.
- The printed point and the printed face of a position may lie on **different, conjugate
  elements**: in 321, position b prints the point x,0,0 (on the twofold axis along a) and the face
  (112̄0) (on the twofold axis along [110]). Both belong to the position; the representative of
  symcrys is the face, as the applications work with face poles.
- Where ITA prints a face with "or", e.g. (001) or (001̄) for the pedion of 4mm, the two faces
  belong to the same Wyckoff position (ITA 6th ed., § 3.2.1.2.4 (i), p. 729); the first is the
  representative.
- **Monoclinic and triclinic:** the Cartesian normal takes a, b, c along x, y, z, as
  `describeOperations` does, since a point group does not fix the cell angles. This is exact for the
  unique axis; for any other face it is the normal for orthogonal axes, not the true pole for
  β ≠ 90°, but it gives the correct site symmetry, which does not depend on the cell angles.
- **Settings ITA does not print** (`mm2` settings 2 and 3, `2mm` and `m2m`): the positions of
  setting 1 carried into their frame, a permutation of the axes (maintainer decision, 2026-11-18,
  #24): same letters and multiplicities, the positions of the oriented symbol permuted, the
  coordinates and Miller indices permuted and their letters renamed after their new position (`m..`,
  `0,y,z`, `0,k,l` in `mm2` become `.m.`, `x,0,z`, `h,0,l` in `2mm`).

`wyckoffPositionOf(key, direction, { setting, tolerance })` gives the Wyckoff position of any
direction: the one whose representative has a site symmetry conjugate to that of the direction.

**ITA 2006 and 2016.** The 5th edition prints these data as Table 10.1.2.2, without coordinates
("for point coordinates see text", § 10.1.2.3) and without the point at the origin. Letters,
multiplicities and oriented site-symmetry symbols of all face positions agree with the 6th edition
(`audit/wyckoff-2006/report.md`, compared with stereography's form catalogue, which follows the
5th edition). One misprint in the 6th edition: the site symmetry of the origin of 6/mmm reads
`6mmm` (p. 764); it concerns the origin only, which symcrys leaves out.

## Tensors

`tensorForm(key, spec, options)` gives the form of a property tensor under a point group:
which Cartesian components it may have and how they depend on each other. `tensorFormOf(operations, spec)`
does the same for any list of operations (closed into a group first), e.g. the site symmetry
of a surface normal from `siteSymmetry`. Moved from birss-app (`tensorForms.ts`,
`tensorProjection.ts`, `linalg.ts`, revision 2be5fe3).

**Kind of tensor** (`TensorSpec`, as in birss-app): rank 0 to 4; `'polar'` (transforms with R) or
`'axial'` (with det(R)·R); `'i'` (time-even) or `'c'` (time-odd: changes sign under an operation
with time reversal); and the symmetry of the tensor under permutation of its own indices,
independent of the crystal: `'none'`, `'ij'` (first two indices), `'jk'` (last two; the index
symmetry of SHG and of the piezoelectric tensor), and at rank 4 `'ij_kl'` (both pairs symmetric, the
pairs not interchangeable: electric-quadrupole SHG, photoelasticity) and `'voigt'` (`'ij_kl'` and the
pairs interchangeable: elastic stiffness). An index symmetry that does not apply at the rank
(`'ij'`, `'jk'` below rank 2; `'ij_kl'`, `'voigt'` other than at rank 4) is an error; birss-app
ignores it.

**Components** are numbered by a flat index: indices (i₁, …, iₙ) with x, y, z = 0, 1, 2 give
i₁·3ⁿ⁻¹ + … + iₙ, the first index varying slowest (the order of a NumPy array of shape (3,)·n in C
order). For rank 3, xyz is 0·9 + 1·3 + 2 = 5.

**The form** (`TensorForm`) is plain numbers (CLAUDE.md, "Tensors"):

- `basis`: the allowed tensors as the span of rows of length 3ⁿ, in reduced row echelon form: one
  row per free parameter, 1 at its own component and 0 at the components of the other parameters.
  Every allowed tensor is Σₖ pₖ·basis[k], pₖ the value of component `parameters[k]`. The form is
  unique for the span, so it does not depend on how the span was found.
- `parameters`: the free parameters as index lists (`[0, 1, 1]` for xyy), one per basis row: each is
  the lowest component that is independent of those before it (the pivot). birss-app names its free
  parameters by the same rule (its "Q0" reduction), so they agree in name and order.
- `relations`: one row r per component that is not a parameter, with r·t = 0 for every allowed
  tensor t: t_c − Σₖ basis[k][c]·t_{parameters[k]} = 0. A row with a single 1 says the component
  vanishes.

Relation strings (`\chi_{xxx} = -\chi_{xyy}`), Voigt matrices, Nye diagrams and LaTeX are
presentation and stay in the applications; they follow from these numbers.

**Settings and conventions.** A tensor form is Cartesian, so it depends on the setting, and the same
setting index gives the same form in both conventions; the convention only picks the default setting
(above, "Settings"). The ITC and Birss defaults differ for `2`, `m`, `2/m`, `32`, `3m`, `-3m` and
`-6m2`, and so do the components that survive: for `2` the polar vector lies along y in the ITC
default (unique axis b) and along z in the Birss default.

**Time reversal.** An operation with time reversal changes the sign of a `'c'`-tensor. The 32
classes have none, so their `'c'`-forms equal their `'i'`-forms; the distinction matters for the
magnetic point groups (#13).

**Rotation.** `rotateTensor(tensor, R, spec)` gives the components in a frame rotated by the
orthogonal matrix R (rows: the new axes in the old frame), with the factor det(R) for an axial
tensor. For the form at a surface: the site symmetry of the normal (`siteSymmetry`), its form
(`tensorFormOf`), and the basis rotated into a frame with z along the normal. Both functions take
Cartesian matrices only and throw for a matrix that is not orthogonal (e.g. one in the lattice
basis).

**Numbers.** The form is computed in floating point: each component's unit tensor, symmetrised over
the index symmetry, is averaged over the group, and the averages are row-reduced (pivot threshold
10⁻⁷). An entry of the result within 10⁻⁹ of a multiple of 1/12 is set to it, as matrices are
snapped ("Numbers" above): for the 32 classes in all their settings every entry of every form is 0,
±1/2, ±1 or ±2, which then come out exact; other values, e.g. in a rotated frame, are kept.

**Print anchors.** Birss convention: Birss's Tables 4a–4f (pp. 56–66) for ranks 0 to 4, polar and
axial, in Birss's frame. ITC convention: ITA Table 3.2.2.1 (counts of three tensors and the direction
of the pyroelectric vector, in the ITC default setting); ITC Vol. D § 1.1.4.10.7 (the full forms of
axial tensors of rank 2, general and symmetric, in the ITC default setting and, for the monoclinic
classes, also with the axis along z); ITC Vol. D § 1.1.4.10.6 (numbers of independent components of
`'ij_kl'` and `'voigt'` tensors of rank 4). ITC Vol. D § 1.1.4.10.6.7 (i) prints the cubic class m-3 as
`3m`, a misprint. Index symmetries: Yariv's Table 16.1 (rank 3,
`'jk'`, all 21 noncentrosymmetric classes; it prints d_ijk without the Voigt factor 2, so its 3×6
grid is the tensor itself; the panels Yariv calls the standard orientation are the ITC default
settings), Hoshi et al. (1995) (rank 4, `'ij_kl'`, 6/mmm and 6mm, with Hoshi's tracelessness Q_ii = 0
added to the form). The surface use case of #30 is checked against Yariv: an m-3m crystal has no SHG in
the bulk, its (001), (110) and (111) surfaces have the forms of 4mm, mm2 and 3m with 3, 5 and 4
independent components.

## Sources

| What                                                                                            | Print source                                                                                                                                                                                                                                                                                              | Test                                                             |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Birss operations, symbols, Schoenflies, orders                                                  | Birss Table 3 (pp. 36–39), generating matrices eq. (2.17) (p. 48): `references/birss/`                                                                                                                                                                                                                    | `birss.reference.test.ts`                                        |
| Birss symbols of other settings, full symbols                                                   | derived along Birss's directions (position 2 from Birss Table 4a, pp. 56–57)                                                                                                                                                                                                                              | `birss.reference.test.ts`                                        |
| ITC symbols of the settings                                                                     | ITA Table 3.2.3.2 (headlines, pp. 745–769); ITC Vol. D Table 1.5.2.3 for monoclinic full symbols; the symbol rule (positions: ITA § 2.1.3.4, p. 151; `1` for a direction without symmetry: 5th ed. § 2.2.4.1 (iv), p. 18; monoclinic full symbols: § 2.1.3.15, p. 171) for `2mm`, `m2m` and unique axis c | `itc.reference.test.ts`                                          |
| ITC operations of every setting                                                                 | the general positions of ITA Table 3.2.3.2 (pp. 745–769), in the frame of #6; `2mm`, `m2m`, which ITA does not list: their ITC symbol along the symmetry directions of ITA Table 2.1.3.1 (p. 151)                                                                                                         | `itcGeneralPositions.reference.test.ts`, `itc.reference.test.ts` |
| ITC default settings                                                                            | see "Settings" above                                                                                                                                                                                                                                                                                      | `itcSettings.fixtures.ts`                                        |
| centrosymmetric, polar, chiral, Laue class, Schoenflies                                         | ITA Table 2.1.1.1 (p. 143, Laue groups), Table 3.2.2.1 (p. 738), Table 3.2.3.2                                                                                                                                                                                                                            | `properties.reference.test.ts`, `itc.reference.test.ts`          |
| symmetry directions                                                                             | ITA Table 2.1.3.1 (p. 151)                                                                                                                                                                                                                                                                                | `symmetryDirections.reference.test.ts`                           |
| ITC: order of the operations, generators                                                        | ITA's selected generators, ITA 5th ed. (2006), Part 7 (pages in `references/itc/vol-a-2006-symmetry-operations.md`), § 2.2.11 (iv) p. 27, § 8.3.5 p. 737, giving the numbering of Table 3.2.3.2                                                                                                           | `elements.reference.test.ts`                                     |
| Birss: order of the operations, generators, axis signs                                          | none: birss-app 2be5fe3, behavioural pins (class (c)) captured by `audit/birss-app`                                                                                                                                                                                                                       | `birssApp.pins.test.ts`                                          |
| operations described (kind, n, axis, sense)                                                     | the symmetry operations of the symmorphic P space groups, ITA 5th ed. (2006), Part 7, one per ITC setting (pages in `references/itc/vol-a-2006-symmetry-operations.md`); symbols as defined in § 11.1.2, pp. 810–811; numbering checked against the general positions of Table 3.2.3.2                    | `elements.reference.test.ts`, `elements.test.ts`                 |
| Wyckoff positions (letter, multiplicity, oriented site symmetry, representative point and face) | ITA Table 3.2.3.2 (pp. 745–769): `references/itc/vol-a-table-3.2.3.2-wyckoff-positions.md`; the oriented symbols read along ITA Table 2.1.3.1 (p. 151); `2mm`, `m2m`: derived (above); additional check against the 5th ed. (2006), Table 10.1.2.2, by `audit/wyckoff-2006`                               | `wyckoff.reference.test.ts`                                      |
| tensor forms, Birss convention                                                                  | Birss Tables 4a–4f (pp. 56–66): `references/birss/table-4a.md` … `table-4f.md`                                                                                                                                                                                                                            | `tensors/birss.reference.test.ts`                                |
| tensor forms, ITC convention: counts, pyroelectric direction, piezoelectric classes             | ITA Table 3.2.2.1 (p. 738)                                                                                                                                                                                                                                                                                | `tensors/itc.reference.test.ts`                                  |
| rank 3, `'jk'` (SHG, piezoelectric d_ijk): cells, classes, signs; the forms at m-3m surfaces    | Yariv, _Quantum Electronics_, 2nd ed., Table 16.1 (pp. 410–411): `references/yariv/table-16.1.md`                                                                                                                                                                                                         | `tensors/yariv.reference.test.ts`, `tensors/tensorForm.test.ts`  |
| rank 4, `'ij_kl'` (electric-quadrupole SHG) for 6/mmm, 6mm                                      | Hoshi et al., Phys. Rev. B 52, 12355 (1995), Eqs. (11)–(12): `references/hoshi/eqs-11-12.md`                                                                                                                                                                                                              | `tensors/hoshi.reference.test.ts`                                |
| ITC: axial tensors of rank 2 (forms); rank 4 `'ij_kl'`, `'voigt'` (counts)                      | ITC Vol. D (2013) § 1.1.4.10.7 (pp. 29–31), § 1.1.4.10.6 (pp. 27–29): `references/itc/vol-d-*.md`                                                                                                                                                                                                         | `tensors/itcVolD.reference.test.ts`                              |
| Birss: free parameters of the tensor forms                                                      | none: birss-app 2be5fe3, behavioural pins (class (c)) captured by `audit/birss-app`                                                                                                                                                                                                                       | `tensors/birssApp.pins.test.ts`                                  |

Each file in `references/` names its source and the printed page. ITA means Vol. A, 6th edition
(2016), unless the 5th edition (2006) is named: its space-group tables are the source for the
symbols of the operations.
