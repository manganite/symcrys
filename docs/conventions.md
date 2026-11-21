# Conventions for point groups

How symcrys represents the crystallographic point groups, and where the two supported conventions,
ITC and Birss, differ. The print sources behind each statement are listed in "Sources" at the end;
the tests named there re-check them against the transcriptions in `references/`.

symcrys holds the 122 magnetic point groups: the 32 crystallographic point groups (crystal classes,
type I) and the 90 groups with time reversal (32 grey groups, type II; 58 black-and-white groups,
type III). For all of them: settings, symbols, operations, generators and symmetry elements in both
conventions, and the forms of property tensors of rank 0 to 4. For the crystal classes also the
Wyckoff positions of directions and the crystal forms.

The library has two entry points with the same function names: `symcrys`, the crystallographic API
for the 32 crystal classes, and `symcrys/magnetic`, the magnetic API for all 122 groups ("Two entry
points"). Where a section below speaks of time reversal, of the types or of a magnetic group, it
describes the magnetic API.

## Conventions

| Name      | Source                                                                                                                                                | Role     |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `'itc'`   | _International Tables for Crystallography_: Vol. A (6th ed., 2016) for the 32 classes, Vol. D (2nd ed., 2013), Ch. 1.5, for the magnetic point groups | default  |
| `'birss'` | R. R. Birss, _Symmetry and Magnetism_ (North-Holland, Amsterdam, 1966)                                                                                | optional |

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

The 32 class keys are the `POINT_GROUP_KEYS` of the crystallographic API. The `POINT_GROUP_KEYS` of
the magnetic API are all 122 keys: the 32 classes, the 32 grey groups in the same order, and the 58
black-and-white groups in the order of ITC Vol. D Table 1.5.2.3.

- **Black-and-white groups:** the short Hermann–Mauguin symbol printed in ITC Vol. D Table 1.5.2.3,
  with a prime `'` for time reversal: `4'/mmm'`, `-6'2m'`, `m'-3'm`. These are birss-app's keys (the
  Birss short symbols) except for two groups, whose Birss and ITC short symbols differ:

  | Group    | Key (ITC) | Birss symbol, birss-app's key | Why                                                                                                          |
  | -------- | --------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------ |
  | D2h(C2h) | `mm'm'`   | `m'm'm`                       | the two books put the twofold axis without time reversal along different axes: x in ITC, z in Birss          |
  | D6h(D3h) | `6'/mmm'` | `6'/mm'm`                     | the same frame in both books; the strings differ because position 2 is read along x in ITC, along y in Birss |

  In the Birss convention each of these two keys is, as a string, the Birss symbol of setting 2 of
  its group (the Birss symbol of the default setting 1 is the one in the third column). A key
  passed to `operations`, `symbol` and the other functions is always the key and gives the default
  setting; `findPointGroup` of the magnetic API, which reads its argument as a symbol, gives the
  setting the symbol names, so `findPointGroup("mm'm'", 'birss')` is setting 2 and
  `findPointGroup("m'm'm", 'birss')` setting 1. For every other key, and for all keys in the ITC convention, `findPointGroup(key)` is
  the default setting.

- **Grey groups:** the key of the crystal class followed by `1'`: `2221'`, `m-3m1'`, and `321'`,
  `3m1'`, `-3m1'` for the classes `32`, `3m`, `-3m`. ITC Vol. D writes the grey groups this way
  (Table 1.5.2.1: `4221'`); so does birss-app.

## Types

| `type`  | Name                                        | Operations                                                            | Number |
| ------- | ------------------------------------------- | --------------------------------------------------------------------- | -----: |
| `'I'`   | crystal class; in magnetism the white group | none with time reversal                                               |     32 |
| `'II'`  | grey group                                  | every operation of a crystal class, with and without time reversal    |     32 |
| `'III'` | black-and-white group                       | half of the operations of a crystal class combined with time reversal |     58 |

**Crystal class and white group.** A key of type `'I'` stands for two things that have the same
operations and are not to be equated (maintainer, 2026-11-20):

- the **crystal class**, as crystallography uses it: time reversal is not considered at all. Quartz
  has the class `32`;
- the **white (single-colour) magnetic group**, as magnetism uses it: time reversal is considered,
  and no operation of the group involves it. This is the symmetry of a magnetically ordered
  crystal, one of the 90 magnetic groups of Birss's Tables 6 and 7 and of ITC Vol. D Chapter 1.5.

Where magnetic properties are discussed, a crystal without magnetic order has the **grey group** of
its class: quartz is `321'`, not `32` (Birss p. 84; Paufler p. 60; ITC Vol. D § 1.5.2.1, p. 111: all
dia- and paramagnets belong to the grey groups, and of the 32 white groups 13 allow ferromagnetism
and 19 describe antiferromagnets). symcrys keeps the two readings
apart by its two entry points ("Two entry points", below).

The **crystal class** of a magnetic group is the class it becomes when time reversal is dropped
from every operation. The numbers I, II, III are the usual ones (birss-app uses them). ITC Vol. D
Ch. 1.5 numbers differently: its first type are the grey groups (§ 1.5.2.1, eq. (1.5.2.1)), its
second type the crystal classes, its third type the black-and-white groups; its Table 1.5.2.3,
"The 90 magnetic point groups of types 2 and 3", therefore lists the 32 classes and the 58
black-and-white groups, not the grey groups. Birss's Table 6 lists the same 90 groups.

## Two entry points

The two readings of a class key ("Types") are two entry points of the library, with the same
function names (maintainer, 2026-11-20, #47). The import decides which reading a key has:

| Entry point                                                     | Groups                        | The key `'32'`                                              |
| --------------------------------------------------------------- | ----------------------------- | ----------------------------------------------------------- |
| `symcrys` (crystallographic API)                                | the 32 crystal classes        | the crystal class; quartz                                   |
| `symcrys/magnetic` (magnetic API; in Python `symcrys.magnetic`) | the 122 magnetic point groups | the white group: a magnetically ordered crystal, not quartz |

**The crystallographic API has no time reversal.** An operation is its matrix (`{ matrix }`), the
description of an operation has no `timeReversal`, a point group has no `type`, a tensor
specification has no time parity, and `TENSOR_PROPERTIES` holds the properties of time-even
tensors (`'pyroelectric'`, `'ferroaxial'`, `'piezoelectric'`, `'gyrotropic'`). A question that involves time
reversal is a `RangeError` that names the magnetic API: the key of a magnetic point group, the name
of a time-odd property (`'ferromagnetic'`), a tensor specification with `timeParity: 'c'`, and an
operation with `timeReversal: true` in a list of operations. `timeParity: 'i'` and
`timeReversal: false` are accepted at run time, so that data of the magnetic API without time
reversal can be passed on from JavaScript and Python; the TypeScript types take a value whose time
parity may be `'c'` or whose `timeReversal` may be `true` only after it is narrowed.

**The magnetic API** takes all 122 keys; operations carry `timeReversal`, a tensor specification
its `timeParity`, and `TENSOR_PROPERTIES` holds all seven properties. For a crystal without magnetic
order ask the grey group of its class: `allowedProperties("321'")` gives the properties of quartz,
`allowedProperties('32')` those of a magnetically ordered crystal with the white group `32`, which
may be magnetoelectric and piezomagnetic. It has every function of the crystallographic API except
the Wyckoff positions and the crystal forms, which ITA tabulates for the crystal classes.

**The two agree where both can be asked.** A question without time reversal has one answer for a
crystal class and its white group, which have the same operations: the same settings, symbols,
matrices in the same order, generators, symmetry elements, site symmetries, and forms of time-even
tensors. The crystallographic API is computed by the same code and returns the answer of the white
group with time reversal left out. The grey group of the class has other symbols (`3211'`) and
twice the operations, but the same settings, the same properties of the operations
(centrosymmetric, polar, chiral, Laue class), the same multiplicity of a direction, the same forms
of time-even tensors and so the same time-even properties. `entryPoints.test.ts` checks both for
all 32 classes.

**Operations passed in.** Where a function takes a list of operations (`tensorFormOf`,
`allowsPropertyOf`, `allowedPropertiesOf`, `isCentrosymmetricOf`, `isChiralOf`), the matrices must
be orthogonal (Cartesian), and the magnetic API asks every operation whether it is
combined with time reversal: `timeReversal` must be `true` or `false`. Operations of the
crystallographic API, which do not say, are refused there and not read as a white group; a caller
who means the white group adds `timeReversal: false`, one who means a crystal without magnetic
order builds the grey group. `siteSymmetry` does not depend on time reversal and takes either.

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

### Settings of the magnetic groups

A **grey group** has the settings of its class, with the same indices, frames and defaults.

A **black-and-white group** has the settings birss-app gives it (#17), setting 1 being Birss's frame,
and `2'm'm` three more:

- monoclinic (5 groups): setting 1 with unique axis c, setting 2 with unique axis b, as the classes;
- orthorhombic `2'2'2`, `m'm'2`, `mm'm'`, `mmm'`: three settings, the cyclic permutations of the axes
  as for `mm2` (`uniqueAxis` c, a, b: the axis that is c in setting 1). The classes `222` and `mmm`
  need one setting, but time reversal singles out one axis. `m'm'm'` has one setting;
- orthorhombic `2'm'm`: six settings (below);
- tetragonal `4'22'`, `4'mm'`, `-4'2m'`, `-4'm2'`, `-42'm'`, `4'/mmm'`, `4'/m'm'm`: two settings 45°
  apart about z. For `422`, `4mm` and `4/mmm` the two frames hold the same operations; with time
  reversal on the fourfold rotation they differ in which lateral elements carry it;
- trigonal `32'`, `3m'`, `-3m'`, `-3'm'`, `-3'm` and hexagonal `6'22'`, `6'mm'`, `-6'2m'`, `-6'm2'`,
  `-6m'2'`, `6'/m'mm'`, `6'/mmm'`: two settings 30° apart about z;
- all other groups: one setting.

**The six settings of `2'm'm`.** An orthorhombic group has a setting for every distinct orientation
of its axes. For all but one this is birss-app's scheme, which of x, y, z carries the unique
element (at most three). `2'm'm` (C2v(Cs)) is the one orthorhombic group whose three elements all
differ, so exchanging the other two axes gives a further orientation: six in all, and print uses
every one of them. Settings 1 to 3 are birss-app's, with their indices; 4 to 6 exchange the other
two axes at the same unique axis (maintainer, 2026-11-20). `uniqueAxis` is the normal of the mirror
plane without time reversal, the direction a spontaneous magnetization may have; two settings share
each axis, so for this group it does not identify a setting: the symbol or the index does.

| Setting | Symbol  | Axis | Operations besides 1 | Symbol printed in                                               |
| ------- | ------- | ---- | -------------------- | --------------------------------------------------------------- |
| 1       | `2'm'm` | c    | 2′_x, m′_y, m_z      | Birss Table 6; ITC Vol. D Tables 1.5.2.3, 1.5.7.1 (in brackets) |
| 2       | `m2'm'` | a    | m_x, 2′_y, m′_z      | ITC Vol. D Table 1.5.8.1 (in brackets)                          |
| 3       | `m'm2'` | b    | m′_x, m_y, 2′_z      | ITC Vol. D Table 1.5.2.4                                        |
| 4       | `m'2'm` | c    | m′_x, 2′_y, m_z      | ITC Vol. D Table 1.5.7.1                                        |
| 5       | `mm'2'` | a    | m_x, m′_y, 2′_z      | Paufler (1986), p. 62 and Table A 6, no. 15, p. 316             |
| 6       | `2'mm'` | b    | 2′_x, m_y, m′_z      | ITC Vol. D Table 1.5.8.1                                        |

Birss (Table 6) and Paufler (Table A 6) print the operations with the symbol; for the other rows
the operations are those the symbol names, each position read along x, y, z.

Setting 1 is the default in both conventions; the symbols are the same in both, an orthorhombic
symbol being read along x, y, z in each. birss-app has settings 1 to 3 (its standing decision of at
most three settings per group); it takes the other three over when it moves onto symcrys (#19).

A setting of a black-and-white group is a frame of its crystal class, but not always the one with
the same index: setting 1 of `-6'2m'` (Birss's frame: twofold axes along y) is the frame of setting
2 of `-6m2`. The functions find the frame of the class from the operations.

**Defaults.** Birss: setting 1. ITC: the frame in which the key, read along ITA's symmetry
directions (Table 2.1.3.1), describes the group. For the triclinic to tetragonal systems this is
the frame of the operators printed in ITC Vol. D Table 1.5.2.3 (monoclinic `2'_y`; `mm'm'` with
`2_x`, `2'_y`, `2'_z`; tetragonal with their x, y and diagonal axes); for the trigonal and hexagonal
groups, whose lateral operators the table prints without axes (`3(2'_⊥)`), it follows from the
symbol alone. So the ITC default is setting 2 for the monoclinic groups, for `mm'm'`, and for the
trigonal and hexagonal groups with two settings except `6'/mmm'`, and setting 1 otherwise. birss-app's
ITC mode takes the same frames (pinned).

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
   and `m3m`. The same holds for the magnetic groups (`m'-3'm'` for Birss's `m'3m'`).
4. **Magnetic groups with other frames or symbols.** Points 1 and 2 hold for the magnetic groups of
   these classes as well. In addition D2h(C2h) has different default frames (ITC `mm'm'`, the
   twofold axis without time reversal along x; Birss `m'm'm`, along z), and D6h(D3h) has the same
   default frame under two symbols (ITC `6'/mmm'`, Birss `6'/mm'm`); see "Keys".

Everywhere else the two conventions agree: same default setting, same symbols, same Schoenflies
symbols (`-3` is `C3i` in both Birss Table 3 and ITA Tables 3.2.1.2 and 3.2.3.2).

## Symbols

- Plain strings: a leading `-` is the overbar (`-3m`, `m-3m`); a prime `'` after an element means
  that it is combined with time reversal (`4'`, `-3'`, `2'/m`, `m'`).
- **Symbols of the magnetic groups.** A black-and-white group has, in every frame and convention,
  the symbol of its crystal class in that frame, each element with a prime if the operation it
  names is combined with time reversal (ITC Vol. D § 1.5.2.1, Table 1.5.2.3): `4/m 2/m 2/m` becomes
  `4'/m 2/m 2'/m'`, short `4'/mmm'`. symcrys derives these symbols from the symbols of the class
  and the operations; the ITC full symbols of the default settings equal the printed ones for all
  58 groups. As for the classes, the ITC short symbol of a trigonal setting keeps the `1`
  (`32'1`, `-3'1m`), while the key is the printed short symbol (`32'`). A grey group has the symbols
  of its class followed by `1'` (short `mm21'`, full `m m 2 1'`).
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
  in both conventions. A black-and-white group is `G(H)`, G the crystal class and H the subgroup of
  the operations without time reversal (`D4h(D2d)`), as in ITC Vol. D Table 1.5.2.3; a grey group
  is `GR` (`D4R`; ITC Vol. D Table 1.5.2.1). ITC Vol. D writes `S6` for `-3`; symcrys writes `C3i`
  as for the class (`C3i(C3)`, `D3d(C3i)`, `C6h(C3i)`).
- **Shubnikov symbols** are not provided. `references/` holds them as printed (ITC Vol. D
  Table 1.5.2.3; Birss Tables 3 and 6).
- Rendering (overbars, subscripts, LaTeX) is left to the applications.

## Numbers

Matrices hold floating-point numbers. During group closure every entry within 10⁻⁹ of an exact
value (0, ±1, ±1/2, ±√3/2, and ±√2/2 for the 45° setting frame) is set to that value, so products do not drift; two matrices are
equal when all entries agree within 10⁻⁶. Exact matrices in the lattice basis may come later, when
a consumer needs them (decision on #13).

## Properties

What is fixed once the group is named is a field of `pointGroup(key)`: `crystalSystem`, `order`,
`centrosymmetric`, `polar`, `chiral`, `laueClass`, and in the magnetic API also `type` and
`crystalClass` (maintainer, 2026-11-20, #41). They follow from the operations alone; none depends
on setting or convention. For a magnetic point group, as in birss-app:

- `centrosymmetric`: the group contains the inversion without time reversal. `m'm'm'`, which
  contains only the inversion combined with time reversal, is not centrosymmetric in this sense;
  its crystal class `mmm` is.
- `polar`, `chiral`, `laueClass`: those of the crystal class (`crystalClass`). Time reversal
  changes neither a polar vector nor handedness. `polar`: a direction is fixed by every operation;
  `chiral`: proper rotations only; `laueClass`: the class with the inversion added.

**For a list of operations** (a site symmetry, the operations of a distorted crystal):
`isCentrosymmetricOf(operations)` and `isChiralOf(operations)`, for the group the operations
generate, with what `tensorFormOf` asks of the list ("Two entry points", "Operations passed in").
Polar is there the named property: `allowsPropertyOf(operations, 'pyroelectric')`. A
list of operations has no Laue class as a key; a consumer that needs it identifies the group first.

**Holohedry.** `holohedry(system)` is the class that is the point symmetry of the lattice of a
crystal system, the Laue groups in full boxes of ITA Table 2.1.1.1 (p. 143): `-1`, `2/m`, `mmm`,
`4/mmm`, `-3m`, `6/mmm`, `m-3m`. It is a function of the system and not a field of the point
group, because there are two readings for the trigonal classes and both have a consumer: the
holohedry of the trigonal system is `-3m` (the rhombohedral lattice; birss-app shows it), while
with hexagonal axes, as symcrys stores the trigonal classes ("Cartesian frame"), the lattice has
the symmetry `6/mmm`: `holohedry(crystalFamily('trigonal'))` (stereography uses it for the lattice
of a crystal). For the other six systems the two calls agree.

Properties that are the question whether a tensor is allowed (piezoelectric, ferroaxial,
ferromagnetic, …) are named tensor properties: `allowsProperty(key, 'piezoelectric')` ("Tensors",
"Named properties").

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

**Magnetic groups, ITC convention** (maintainer, 2026-11-19). ITC Vol. D prints no order of the
individual operations: Table 1.5.2.3 lists them grouped (`±4_z`, `3(2_⊥)`, `4(±3)`). symcrys keeps
ITA's numbers of the crystal class: operation k of a black-and-white group is operation k of its
class in the same frame, with or without time reversal, so that numbers, poles and descriptions
stay comparable with the class (operation k of `m'm'm'` is operation k of `mmm`). A grey group
lists the operations of its class, then the same sequence combined with time reversal.

## Generators

In the ITC convention `generators` returns ITA's selected generators of the setting ("Generators
selected" of the symmorphic P group, 5th ed., Part 7), in printed order and without the identity;
for `mm2` settings 2 and 3, which ITA does not list, those of setting 1 carried into their frame. In
the ITC convention a magnetic group has the generators of its class in the same frame, each with
the time reversal it has in the group (they generate the group, because dropping time reversal maps
a black-and-white group one to one onto its class), a grey group those of its class followed by
time reversal `1'`; ITC Vol. D prints no generators. In
the Birss convention it returns birss-app's generators (for `1` the identity, as in birss-app),
which are the generators stored in `packages/ts/src/pointGroups/data.ts` carried into the frame of the setting
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
`packages/ts/src/pointGroups/birssApp.pins.json`, at present 2be5fe3, and the test requires this text to name
it): for all 122 groups and all settings birss-app has the generators and the operations in order with their
time reversal, the symbols, the type, the crystal class, the default setting (also that of
birss-app's ITC mode), the property flags, and the operation symbols birss-app writes, rebuilt from
`describeOperations` with birss-app's labelling rules. The pins carry birss-app's keys; the test
names the two groups whose symcrys key differs ("Keys"). `packages/ts/src/tensors/birssApp.pins.test.ts` checks
the tensor forms the same way, against `packages/ts/src/tensors/birssApp.pins.json` from the same revision: for
all classes, settings and 26 kinds of tensor, the basis and the free parameters of the time-even
forms, and for the 58 black-and-white groups those of the time-odd forms. For these choices birss-app is the specification (maintainer decision), so here its
pins are the reference, not only a regression detector. The strings themselves (`2_z`, `3_[111]⁺`,
`m_60°`) and the order birss-app sorts them into for display stay in birss-app.

**Settings birss-app does not have.** Settings 4 to 6 of `2'm'm` exist in symcrys only ("Settings
of the magnetic groups"), so for them there is no birss-app output to give and no pin. They follow
the same rules: the stored generators carried into the frame, and birss-app's closure for the order;
this makes them settings 1 to 3 with two axes exchanged, generators and order included, which a test
checks. When birss-app takes the three settings over (#19), with the same frames and indices, the
pins are captured again and the list of settings beyond birss-app's (`SETTINGS_BEYOND_BIRSS_APP` in
`packages/ts/src/testUtils/birssAppPins.ts`) becomes empty.

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
| `timeReversal` | magnetic API: as in the operation                                                                        |

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
- **Time reversal** (magnetic API) is the `timeReversal` of each described operation. The elements along a
  direction (`symmetryDirections`) count rotations, rotoinversions and mirrors with and without
  time reversal alike; the `symbol` of the position carries the primes (`4'/m`). The full symbol of
  a grey group ends in `1'`, which is no position.
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

They are given for the **32 crystal classes only**: ITA tabulates them for these, and
`wyckoffPositions` and `wyckoffPositionOf` throw for a magnetic point group with time reversal. For
such a group, use the key of its crystal class or `siteSymmetry` with its operations.

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

## Crystal forms

A **crystal form** is a set of faces equivalent under a point group: the orbit of one face (hkl)
(ITA 6th ed., § 3.2.1.2.2, p. 722). ITA distinguishes 47 forms by their number of faces and their
**eigensymmetry**, the symmetry of the form as a polyhedron, and lists them in Table 3.2.1.3
(pp. 724–726). symcrys exports this table as `CRYSTAL_FORM_TYPES`: number (1 to 47), English name as
printed, number of faces, eigensymmetry as printed (`4/mmm`, `-62m`; `∞m` and `∞/mm` for pedion and
pinacoid). Names in other languages, and the names an application derives from the generating group
(sphenoid in 2, dome in m), are left to the applications, which look a form up by its number
(maintainer, 2026-11-21, #24).

`crystalForms(key, { setting })` lists the forms of a crystal class as ITA 6th ed. Table 3.2.3.2
prints them in its fifth column (pp. 745–769): by Wyckoff position, general position first, and for
each position first the **basic** form, the one of lowest eigensymmetry, then the **limiting**
forms, which have the face symmetry of the position but a higher eigensymmetry (§ 3.2.1.2.2, p. 723;
a basic form need not be characteristic, i.e. have the eigensymmetry of the class: the rhombic prism
of 2/m has the eigensymmetry mmm). For instance the faces (hk0) of the general position of 4mm form
a ditetragonal prism, eigensymmetry 4/mmm, a limiting form of the general form, the ditetragonal
pyramid of eigensymmetry 4mm. A limiting form may occur more than once at one position (the two
tetragonal dipyramids of 422, (h0l) and (hhl)).

| Field            | Meaning                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `letter`         | the Wyckoff letter of the position the faces belong to                                    |
| `multiplicity`   | number of faces, the multiplicity of the position                                         |
| `siteSymmetry`   | the oriented site-symmetry symbol of the position (the face symmetry)                     |
| `basic`          | true for the basic form of the position, false for a limiting form                        |
| `formType`       | the number of the form in `CRYSTAL_FORM_TYPES`                                            |
| `millerIndices`  | ITA's first face of the form as printed, e.g. `h,0,l`, `1,1,-2,0`                         |
| `condition`      | the condition printed with the cubic forms (hhl), below; absent otherwise                 |
| `representative` | that face with numbers, as for the Wyckoff positions: `hkl` and its Cartesian unit normal |

- **Two forms on the faces (hhl).** In the cubic classes the faces (hhl) of one Wyckoff position
  form two different forms depending on whether |h| < |l| or |h| > |l| (trigon- and
  tetragon-tritetrahedron in 23 and -43m, trigon- and tetragon-trioctahedron in m-3, 432 and m-3m).
  ITA prints both with the condition, which `condition` gives as `'|h|<|l|'` or `'|h|>|l|'`; in
  -43m and m-3m both are basic forms of the position, elsewhere both are limiting forms. The
  representative takes h = 3, k = 2, l = 1 as for the Wyckoff positions, and h = 1, l = 3 where the
  condition is |h| < |l|: (331) and (113).
- **Convention and groups.** As the Wyckoff positions: ITC convention only, the 32 crystal classes
  only (a RangeError otherwise), and the settings ITA does not print (`mm2` settings 2 and 3) are
  setting 1 carried into their frame.
- **Monoclinic and triclinic:** the Cartesian normal of the representative takes a, b, c along x, y,
  z, as for the Wyckoff positions; the form and its number do not depend on the cell angles.
- **Print anchors.** Table 3.2.3.2 for the forms of each position, Table 3.2.1.3 for the 47 forms. The
  tests check the two tables against each other: every form of Table 3.2.3.2, with the face symmetry
  of its position, is listed among the generating point groups of its form in Table 3.2.1.3, in bold
  for a basic form, in normal type for a limiting one, and conversely. Two entries of Table 3.2.1.3
  disagree with Table 3.2.3.2 and with the rest of the table, and are read corrected (errata in
  `references/itc/vol-a-table-3.2.1.3-crystal-forms.md`): No. 14 prints the face symmetry `.m` for
  `..m` (4/mmm), and No. 31 prints 6/m(1) in normal type, although the hexagonal dipyramid is the
  basic general form of 6/m. Independently of the library, the tests compute from the printed
  general position the faces of every printed form and check: their number and Wyckoff position;
  the eigensymmetry, as the group of all orthogonal maps that permute the face normals; whether the
  form is open (a prism: normals in one plane) or closed; and, where the name gives it, the polygon
  of the faces (trigon-, tetragon-, pentagon-), from the polyhedron the faces bound. Together these
  tell apart all forms with the same number of faces and eigensymmetry (tetragonal dipyramid and
  ditetragonal prism; the two forms on (hhl)). A form is listed once per position, except the
  limiting forms Table 3.2.1.3 marks with †: three rhombic prisms in 222, two dipyramids in 422
  and 622 (pp. 726–727).
- **ITA 2006.** The 5th edition prints the forms of the point groups as Table 10.1.2.2 and the 47
  forms as Table 10.1.2.3. stereography's catalogue follows it, with the basic forms only and the
  numbers of Table 10.1.2.3; `audit/forms-2006` compares the 47 forms (number of faces,
  eigensymmetry) and the basic forms with symcrys, without difference, so the two editions number
  the forms alike.

## Tensors

`tensorForm(key, spec, options)` gives the form of a property tensor under a point group, a
crystal class or a magnetic point group: which Cartesian components it may have and how they depend
on each other. `tensorFormOf(operations, spec)` does the same for any list of operations (closed
into a group first), e.g. the site symmetry of a surface normal from `siteSymmetry`. In place of
`spec`, both take the name of a property ("Named properties" below). Moved from birss-app (`tensorForms.ts`,
`tensorProjection.ts`, `linalg.ts`, revision 2be5fe3).

**Kind of tensor** (`TensorSpec`, as in birss-app): rank 0 to 4; `'polar'` (transforms with R) or
`'axial'` (with det(R)·R); in the magnetic API `'i'` (time-even) or `'c'` (time-odd: changes sign
under an operation with time reversal), while a specification of the crystallographic API has no
time parity and means a time-even tensor ("Two entry points"); and the symmetry of the tensor under permutation of its own indices,
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

**Time reversal** (magnetic API). An operation with time reversal changes the sign of a `'c'`-tensor.
The 32 white groups have none, so their `'c'`-forms equal their `'i'`-forms. A grey group contains time reversal
itself, so all its `'c'`-tensors vanish, and its `'i'`-forms are those of its class. This is Birss's
reading (pp. 84, 102) and birss-app's: the grey groups are the groups of non-magnetic crystals; the
32 groups without time reversal (the white groups: "Types") are, like the 58 black-and-white
groups, groups of magnetic crystals, the limiting case in which time reversal does not occur. Litvin (_Acta Cryst._ A**64**, 419 (2008), p. 419) says the
same of the space groups: a group without time inversion is also the invariance group of an
arrangement of non-zero magnetic moments, while the product of a group with the time-inversion
group is not a magnetic group, because time inversion as an element excludes such moments. Paufler
(_Physikalische Kristallographie_, 1986, § 4.3.2, pp. 60–62, Table 4.5) divides the 122 groups the
same way, 32 grey (non-magnetic) and 32 + 58 = 90 magnetically ordered, and asks that, where
magnetic properties are discussed, a non-magnetic crystal be given the grey symbol (rock salt
m3m1′, low quartz 321′), to avoid confusion with the magnetic group of the same class.
In a black-and-white group the `'i'`-forms are those of the crystal class in the same frame, and
the `'c'`-forms are those of two other crystal classes, possibly in a rotated frame, which Birss's
Table 7 names (pp. 109–110): polar `'c'`-tensors of odd rank and axial ones of even rank have the
form of the `'i'`-tensors of his group A (eq. (3.24): the operations without time reversal and
those with time reversal times the inversion), the others that of the `'i'`-tensors of opposite
parity of his group B. The
table prints a symbol class in parentheses where the frame is rotated.

**Named properties.** A physical property that a group allows if and only if a tensor of a certain
kind does not vanish has a name in `TENSOR_PROPERTIES`: name → kind of tensor (`spec`), what the
tensor relates (`description`) and the print source of the definition (`source`).

| Name                | Tensor                                  | Property                                             |
| ------------------- | --------------------------------------- | ---------------------------------------------------- |
| `'pyroelectric'`    | rank 1, polar, `'i'`                    | spontaneous polarization                             |
| `'ferroaxial'`      | rank 1, axial, `'i'`                    | ferroaxial (ferro-rotational) order: an axial vector |
| `'piezoelectric'`   | rank 3, polar, `'i'`, symmetric in j, k | P_i = d_ijk T_jk                                     |
| `'gyrotropic'`      | rank 2, axial, `'i'`, symmetric         | optical activity: the gyration tensor g_ij           |
| `'ferromagnetic'`   | rank 1, axial, `'c'`                    | spontaneous magnetization (also ferri-, weak ferro-) |
| `'magnetoelectric'` | rank 2, axial, `'c'`                    | linear magnetoelectric effect, P_i = α_ij H_j        |
| `'piezomagnetic'`   | rank 3, axial, `'c'`, symmetric in j, k | M_i = Λ_ijk T_jk                                     |

`allowsProperty(key, name)` is true if the form is not zero, `allowedProperties(key)` lists the
names a group allows, in the order of the table; `allowsPropertyOf(operations, name)` and
`allowedPropertiesOf(operations)` do the same for any list of operations. None depends on setting
or convention. `tensorForm(key, 'piezoelectric')` is the form of the tensor the name stands for.
The crystallographic API has the four time-even names, the magnetic API all seven ("Two entry
points"). In the magnetic API a key of type `'I'` is the white group, the symmetry of a
magnetically ordered crystal ("Types"): `'432'` is magnetoelectric. **A crystal without magnetic
order has the grey group of its class** (`"4321'"`; quartz `"321'"`), which allows none of the three time-odd
properties; for the four time-even ones a class, its grey group and the black-and-white groups of
the class agree. `rotateTensor` takes a name as well.
Each kind of tensor has one name: second-harmonic generation has the tensor of
`'piezoelectric'` and is asked for by that name or by its specification. Symmetry only allows a
property: `'ferromagnetic'` says that a spontaneous magnetization is compatible with the group, not
that the crystal is a ferromagnet. Counted over the 122 groups: pyroelectric 31, piezoelectric 66,
gyrotropic 47 (each twice the 10, 20 and 15 classes of ITA Table 3.2.2.1, plus 11, 26 and 17
black-and-white groups); ferromagnetic 31, magnetoelectric 58, piezomagnetic 66, none of them a grey
group (ITC Vol. D Tables 1.5.2.4, 1.5.8.1, 1.5.7.1).

**Ferroaxial.** A crystal is ferroaxial if its symmetry allows an axial vector that does not change
sign under time reversal, e.g. a net rotation of structural units about an axis (NiTiO₃, class
`-3`). The tensor is that of `'ferromagnetic'` with the other time parity, so the 13 classes are
the white groups among the 31 ferromagnetic groups: `1`, `-1`, `2`, `m`, `2/m`, `4`, `-4`, `4/m`,
`3`, `-3`, `6`, `-6`, `6/m`, the classes whose short Hermann–Mauguin symbol (the key) has a single position; the
vector lies along that symmetry direction (any direction in `1` and `-1`). Seven of them are neither polar nor chiral (`-1`,
`2/m`, `-4`, `4/m`, `-3`, `-6`, `6/m`). Over the 122 groups: 43 (13 classes, their 13 grey groups,
17 black-and-white groups). The name is that of Hlinka, Privratska, Ondrejkovic & Janovec, _Phys.
Rev. Lett._ **116**, 177602 (2016); ITC Vol. D does not tabulate the property, so the print anchor
of the classes is Birss: Table 4a (pp. 56–57) gives each class its form of an axial tensor of odd
rank, Table 4c (p. 58) that form at rank 1. The name is `'ferroaxial'` and not "axial" (maintainer,
2026-11-20): "axial" already names the parity of a tensor (`parity: 'axial'`), and five of the
seven properties have an axial tensor.

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
classes, also with the axis along z); ITC Vol. D § 1.1.4.10.6 (`'ij_kl'` and `'voigt'` tensors of
rank 4 in the ITC default setting: the numbers of independent components and the full forms of the
6 × 6 matrices of p, π, Q, c and s, 29 diagrams for the classes, with the factors 2 and 4 that the two-index notation
gives π, Q and s, and the element 66 of the trigonal and hexagonal classes, ⊗, as ½(p₁₁ − p₁₂),
π₁₁ − π₁₂, 2(Q₁₁ − Q₁₂), ½(c₁₁ − c₁₂), 2(s₁₁ − s₁₂)). ITC Vol. D § 1.1.4.10.6.7 (i) prints the cubic class m-3 as
`3m`, a misprint. Index symmetries: Yariv's Table 16.1 (rank 3,
`'jk'`, all 21 noncentrosymmetric classes; it prints d_ijk without the Voigt factor 2, so its 3×6
grid is the tensor itself; the panels Yariv calls the standard orientation are the ITC default
settings), Hoshi et al. (1995) (rank 4, `'ij_kl'`, 6/mmm and 6mm, with Hoshi's tracelessness Q_ii = 0
added to the form). The surface use case of #30 is checked against Yariv: an m-3m crystal has no SHG in
the bulk, its (001), (110) and (111) surfaces have the forms of 4mm, mm2 and 3m with 3, 5 and 4
independent components.

Magnetic point groups, Birss convention: Birss's Table 7 (pp. 103–108) names for each of the 58
black-and-white groups the symbol class of Tables 4b–4f for i- and c-tensors, polar and axial, of
even and odd rank; all ranks 0 to 4 are compared in Birss's frame, a class in parentheses in a
rotated setting (Birss p. 110). Two rows of the table, `(-6'2m')` and `-6m'2'`, lack parentheses;
both are recorded printing errors of the book (found in birss-app; errata with their reasons in
`references/birss/table-7.md`), and the tests apply the corrections. ITC convention: ITC Vol. D Table 1.5.2.4 (the 31 ferromagnetic
groups and the direction of M_s), Table 1.5.7.1 (the piezomagnetic matrix Λ_iα of 66 groups, with
Λ_i4 = 2Λ_i23 and so on, eq. (1.5.7.4)) and Table 1.5.8.1 (the magnetoelectric tensor of 58 groups).
A printed form belongs to the orientation its symbol names (ITC Vol. D § 1.5.7.1, p. 134: x, y, z
along the entries of an orthorhombic symbol; z, x, y along those of a trigonal or hexagonal one),
so each printed symbol, those in square brackets included, is compared in the setting that has this
ITC symbol, and so are the second trigonal orientations the text of § 1.5.8.1 names (312, 31m, …).

## Sources

| What                                                                                                                        | Print source                                                                                                                                                                                                                                                                                                      | Test                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Birss operations, symbols, Schoenflies, orders                                                                              | Birss Table 3 (pp. 36–39), generating matrices eq. (2.17) (p. 48): `references/birss/`                                                                                                                                                                                                                            | `birss.reference.test.ts`                                                                               |
| Birss symbols of other settings, full symbols                                                                               | derived along Birss's directions (position 2 from Birss Table 4a, pp. 56–57)                                                                                                                                                                                                                                      | `birss.reference.test.ts`                                                                               |
| ITC symbols of the settings                                                                                                 | ITA Table 3.2.3.2 (headlines, pp. 745–769); ITC Vol. D Table 1.5.2.3 for monoclinic full symbols; the symbol rule (positions: ITA § 2.1.3.4, p. 151; `1` for a direction without symmetry: 5th ed. § 2.2.4.1 (iv), p. 18; monoclinic full symbols: § 2.1.3.15, p. 171) for `2mm`, `m2m` and unique axis c         | `itc.reference.test.ts`                                                                                 |
| ITC operations of every setting                                                                                             | the general positions of ITA Table 3.2.3.2 (pp. 745–769), in the frame of #6; `2mm`, `m2m`, which ITA does not list: their ITC symbol along the symmetry directions of ITA Table 2.1.3.1 (p. 151)                                                                                                                 | `itcGeneralPositions.reference.test.ts`, `itc.reference.test.ts`                                        |
| ITC default settings                                                                                                        | see "Settings" above                                                                                                                                                                                                                                                                                              | `itcSettings.fixtures.ts`                                                                               |
| centrosymmetric, polar, chiral, Laue class, holohedry, Schoenflies                                                          | ITA Table 2.1.1.1 (p. 143, Laue groups and holohedries), Table 3.2.2.1 (p. 738), Table 3.2.3.2                                                                                                                                                                                                                    | `properties.reference.test.ts`, `itc.reference.test.ts`                                                 |
| symmetry directions                                                                                                         | ITA Table 2.1.3.1 (p. 151)                                                                                                                                                                                                                                                                                        | `symmetryDirections.reference.test.ts`                                                                  |
| ITC: order of the operations, generators                                                                                    | ITA's selected generators, ITA 5th ed. (2006), Part 7 (pages in `references/itc/vol-a-2006-symmetry-operations.md`), § 2.2.11 (iv) p. 27, § 8.3.5 p. 737, giving the numbering of Table 3.2.3.2                                                                                                                   | `elements.reference.test.ts`                                                                            |
| Magnetic groups, ITC: keys, crystal system, Schoenflies and full symbols, operators of the default setting                  | ITC Vol. D (2013) Table 1.5.2.3 (pp. 111–112): `references/itc/vol-d-table-1.5.2.3.md`; grey groups: eq. (1.5.2.1), p. 110                                                                                                                                                                                        | `magnetic.reference.test.ts`                                                                            |
| Magnetic groups, Birss: operations of the default setting, classical subgroup, symbol                                       | Birss Table 6 (pp. 91–98) with the generating matrices of eq. (2.17) (p. 48): `references/birss/table-6.md`                                                                                                                                                                                                       | `magnetic.reference.test.ts`                                                                            |
| Magnetic groups: symbols of all settings in both conventions, grey groups, axes of trigonal, hexagonal and cubic operations | derived: each symbol read along the symmetry directions of its convention, a prime meaning time reversal                                                                                                                                                                                                          | `magnetic.reference.test.ts`                                                                            |
| Birss: order of the operations, generators, axis signs                                                                      | none: birss-app 2be5fe3, behavioural pins (class (c)) captured by `audit/birss-app`                                                                                                                                                                                                                               | `birssApp.pins.test.ts`                                                                                 |
| operations described (kind, n, axis, sense)                                                                                 | the symmetry operations of the symmorphic P space groups, ITA 5th ed. (2006), Part 7, one per ITC setting (pages in `references/itc/vol-a-2006-symmetry-operations.md`); symbols as defined in § 11.1.2, pp. 810–811; numbering checked against the general positions of Table 3.2.3.2                            | `elements.reference.test.ts`, `elements.test.ts`                                                        |
| Wyckoff positions (letter, multiplicity, oriented site symmetry, representative point and face)                             | ITA Table 3.2.3.2 (pp. 745–769): `references/itc/vol-a-table-3.2.3.2-wyckoff-positions.md`; the oriented symbols read along ITA Table 2.1.3.1 (p. 151); `2mm`, `m2m`: derived (above); additional check against the 5th ed. (2006), Table 10.1.2.2, by `audit/wyckoff-2006`                                       | `wyckoff.reference.test.ts`                                                                             |
| crystal forms: the forms of each Wyckoff position, basic and limiting; the 47 forms with number of faces and eigensymmetry  | ITA Table 3.2.3.2 (pp. 745–769): `references/itc/vol-a-table-3.2.3.2-face-forms.md`; ITA Table 3.2.1.3 (pp. 724–726): `references/itc/vol-a-table-3.2.1.3-crystal-forms.md`, the two checked against each other; additional check against the 5th ed. (2006), Tables 10.1.2.2 and 10.1.2.3, by `audit/forms-2006` | `crystalForms.reference.test.ts`                                                                        |
| tensor forms, Birss convention                                                                                              | Birss Tables 4a–4f (pp. 56–66): `references/birss/table-4a.md` … `table-4f.md`                                                                                                                                                                                                                                    | `tensors/birss.reference.test.ts`                                                                       |
| tensor forms, ITC convention: counts, pyroelectric direction, piezoelectric classes                                         | ITA Table 3.2.2.1 (p. 738)                                                                                                                                                                                                                                                                                        | `tensors/itc.reference.test.ts`                                                                         |
| ferroaxial classes (axial vector, time-even)                                                                                | Birss Table 4a (pp. 56–57) with Table 4c (p. 58): `references/birss/`; the term: Hlinka, Privratska, Ondrejkovic & Janovec, _Phys. Rev. Lett._ **116**, 177602 (2016)                                                                                                                                             | `tensors/tensorProperties.test.ts`                                                                      |
| rank 3, `'jk'` (SHG, piezoelectric d_ijk): cells, classes, signs; the forms at m-3m surfaces                                | Yariv, _Quantum Electronics_, 2nd ed. (Wiley, 1975), Table 16.1 (pp. 410–411): `references/yariv/table-16.1.md`                                                                                                                                                                                                   | `tensors/yariv.reference.test.ts`, `tensors/tensorForm.test.ts`                                         |
| rank 4, `'ij_kl'` (electric-quadrupole SHG) for 6/mmm, 6mm                                                                  | Hoshi et al., Phys. Rev. B 52, 12355 (1995), Eqs. (11)–(12): `references/hoshi/eqs-11-12.md`                                                                                                                                                                                                                      | `tensors/hoshi.reference.test.ts`                                                                       |
| ITC: axial tensors of rank 2 (forms); rank 4 `'ij_kl'`, `'voigt'` (counts and forms)                                        | ITC Vol. D (2013) § 1.1.4.10.7 (pp. 29–31), § 1.1.4.10.6 (pp. 27–29): `references/itc/vol-d-*.md`                                                                                                                                                                                                                 | `tensors/itcVolD.reference.test.ts`                                                                     |
| tensor forms of the magnetic groups, Birss convention: i- and c-tensors, ranks 0 to 4; associated groups A, B               | Birss Table 7 (pp. 103–108): `references/birss/table-7.md`, with Tables 4a–4f; grey groups: p. 102                                                                                                                                                                                                                | `tensors/birssMagnetic.reference.test.ts`                                                               |
| ferromagnetic, piezomagnetic, magnetoelectric: the groups and the forms, ITC convention                                     | ITC Vol. D (2013) Table 1.5.2.4 (p. 113), Table 1.5.7.1 (p. 135, conventions p. 134), Table 1.5.8.1 (p. 139, text p. 140): `references/itc/vol-d-table-1.5.*.md`                                                                                                                                                  | `tensors/itcMagnetic.reference.test.ts`                                                                 |
| orthorhombic settings: one for every orientation of the axes; the six orientations of `2'm'm`                               | counted by hand; Paufler (1986) Table A 6, rows 12–20 (p. 316): `references/paufler/table-a6-orthorhombic.md`; the symbols of `2'm'm` in Birss Table 6, ITC Vol. D Tables 1.5.2.3, 1.5.2.4, 1.5.7.1, 1.5.8.1 and Paufler                                                                                          | `pointGroups/magnetic.reference.test.ts`, `tensors/itcMagnetic.reference.test.ts`                       |
| the three types of magnetic point groups; which describes a non-magnetic crystal                                            | Birss (1966) pp. 84, 102; Litvin, _Acta Cryst._ A**64**, 419 (2008), p. 419; Paufler, _Physikalische Kristallographie_ (Akademie-Verlag, Berlin, 1986), pp. 60–62                                                                                                                                                 | `tensors/birssMagnetic.reference.test.ts` (classes: c-forms equal i-forms; grey groups: c-forms vanish) |
| the two entry points: a time-even question has one answer for a class, its white group and its grey group                   | none needed: the same operations (Birss pp. 84, 102, as the row above); checked by comparing the two entry points                                                                                                                                                                                                 | `entryPoints.test.ts`                                                                                   |
| named tensor properties: the kind of tensor behind each name                                                                | ITC Vol. D (2013) §§ 1.1.4.4.2, 1.1.4.4.3 (p. 12), 1.1.4.10.7.2 (p. 30), 1.5.2.1 (p. 113), 1.5.7.1 (p. 134), 1.5.8.1 (pp. 139–140); the `source` of each entry of `TENSOR_PROPERTIES`                                                                                                                             | `tensors/tensorProperties.test.ts`                                                                      |
| Birss: free parameters of the tensor forms                                                                                  | none: birss-app 2be5fe3, behavioural pins (class (c)) captured by `audit/birss-app`: time-even forms of the 32 classes, time-odd forms of the 58 black-and-white groups                                                                                                                                           | `tensors/birssApp.pins.test.ts`                                                                         |

Each file in `references/` names its source and the printed page. ITA means Vol. A, 6th edition
(2016), unless the 5th edition (2006) is named: its space-group tables are the source for the
symbols of the operations.
