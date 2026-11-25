# Conventions

How symcrys represents the crystallographic point groups, as the _International Tables for
Crystallography_ (ITC) give them. The print sources behind each statement are listed in "Sources" at the end;
the tests named there re-check them against the transcriptions in `references/`.

symcrys holds the 122 magnetic point groups: the 32 crystallographic point groups (crystal classes,
type I) and the 90 groups with time reversal (32 grey groups, type II; 58 black-and-white groups,
type III). For all of them: settings, symbols, operations, generators and symmetry elements,
operations in the lattice basis and orbits of faces and directions, and the forms of
property tensors of rank 0 to 4. For the crystal classes also the Wyckoff positions of directions
and the crystal forms.

The library has two entry points for the point groups, with the same function names: `symcrys`,
the crystallographic API for the 32 crystal classes, and `symcrys/magnetic`, the magnetic API for
all 122 groups ("Two entry points"). A third, `symcrys/plane`, holds the 17 plane groups and the 10
plane point groups ("Plane groups"). Where a section below speaks of time reversal, of the types or of a magnetic group, it
describes the magnetic API.

## ITC

symcrys follows ITC: Vol. A (6th ed., 2016) for the 32 crystal classes, Vol. D (2nd ed., 2013),
Ch. 1.5, for the magnetic point groups (the reference edition and its exception: CLAUDE.md, "Pure
ITC"). There is no other convention: a function given the option `convention` (with which a caller
chose Birss's presentation before 0.11) throws a RangeError, so that such a call is not answered in
ITC's presentation without notice. R. R. Birss, _Symmetry and Magnetism_ (North-Holland, Amsterdam,
1966), is an independent second print check of the ITC output ("Birss as a second print check").

## Keys

A class is identified by its key: the ITC short symbol of the class, as in `POINT_GROUP_KEYS`
(`'32'`, `'3m'`, `'-3m'`, `'-6m2'`, `'m-3m'`, …). A key names the class, not a setting; for the
classes with several settings, `symbol()` gives the symbol of a setting (`321`, `312`).

For D3h the key is `-6m2`, as in ITC Vol. D Table 1.5.2.3. ITA lists both orientations, `-6m2`
first (§ 3.2.1.2.1 (b), p. 721; Table 3.2.3.2, pp. 762–763), but its tables of classes print `-62m`
(Tables 2.1.1.1, 3.2.1.2, 3.2.2.1). symcrys keeps `-6m2`, the symbol of the magnetic table (#137
B1).

The 32 class keys are the `POINT_GROUP_KEYS` of the crystallographic API. The `POINT_GROUP_KEYS` of
the magnetic API are all 122 keys: the 32 classes, the 32 grey groups in the same order, and the 58
black-and-white groups in the order of ITC Vol. D Table 1.5.2.3.

- **Black-and-white groups:** the short Hermann–Mauguin symbol printed in ITC Vol. D Table 1.5.2.3,
  with a prime `'` for time reversal: `4'/mmm'`, `-6'2m'`, `m'-3'm`. Birss prints the same short
  symbols except for two groups:

  | Group    | Key (ITC) | Birss's symbol | Why                                                                                                          |
  | -------- | --------- | -------------- | ------------------------------------------------------------------------------------------------------------ |
  | D2h(C2h) | `mm'm'`   | `m'm'm`        | the two books put the twofold axis without time reversal along different axes: x in ITC, z in Birss          |
  | D6h(D3h) | `6'/mmm'` | `6'/mm'm`      | the same frame in both books; the strings differ because position 2 is read along x in ITC, along y in Birss |

- **Grey groups:** the key of the crystal class followed by `1'`: `2221'`, `m-3m1'`, and `321'`,
  `3m1'`, `-3m1'` for the classes `32`, `3m`, `-3m`. ITC Vol. D writes the grey groups this way
  (Table 1.5.2.1: `4221'`).

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
from every operation. The numbers I, II, III are those of ITC Vol. D Table 1.2.6.12 (p. 66,
"Magnetic point groups": type I the 32 classes, type II the grey groups, printed `1'`, `21'`, …, type III
the black-and-white groups; #137 B5). ITC Vol. D Ch. 1.5 numbers differently: its first type are the grey groups (§ 1.5.2.1, eq. (1.5.2.1)), its
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

**The crystallographic API has no time reversal.** An operation is `{ matrix, cartesian }` ("Operations"), the
description of an operation has no `timeReversal`, a point group has no `type`, a tensor
specification has no time parity, and `TENSOR_PROPERTIES` holds the properties of time-even
tensors (`'pyroelectric'`, `'ferroaxial'`, `'piezoelectric'`, `'gyrotropic'`). A question that involves time
reversal is a `RangeError` that names the magnetic API: the key of a magnetic point group, the name
of a time-odd property (`'ferromagnetic'`), a tensor specification with `timeParity: 'odd'`, and an
operation with `timeReversal: true` in a list of operations. `timeParity: 'even'` and
`timeReversal: false` are accepted at run time, so that data of the magnetic API without time
reversal can be passed on from JavaScript and Python; the TypeScript types take a value whose time
parity may be `'odd'` or whose `timeReversal` may be `true` only after it is narrowed.

**The magnetic API** takes all 122 keys; operations carry `timeReversal`, a tensor specification
its `timeParity`, and `TENSOR_PROPERTIES` holds all eight properties. For a crystal without magnetic
order ask the grey group of its class: `allowedProperties("321'")` gives the properties of quartz,
`allowedProperties('32')` those of a magnetically ordered crystal with the white group `32`, which
may be magnetoelectric and piezomagnetic. It has every function of the crystallographic API except
the Wyckoff positions and the crystal forms, which ITA tabulates for the crystal classes.

**The two agree where both can be asked.** A question without time reversal has one answer for a
crystal class and its white group, which have the same operations: the same settings, symbols
(except the Schoenflies symbol of `-3`, `C3i` and `S6`, "Symbols"),
matrices in the same order, generators, symmetry elements, site symmetries, and forms of time-even
tensors. The crystallographic API is computed by the same code and returns the answer of the white
group with time reversal left out. The grey group of the class has other symbols (`321'`, `3121'`) and
twice the operations, but the same settings, the same properties of the operations
(centrosymmetric, polar, enantiomorphic, Laue class), the same multiplicity of a direction, the same forms
of time-even tensors and so the same time-even properties. `entryPoints.test.ts` checks both for
all 32 classes.

**Operations passed in.** Where a function takes a list of operations (`tensorFormOf`,
`allowsPropertyOf`, `allowedPropertiesOf`, `isCentrosymmetricOf`, `isEnantiomorphicOf`, `pointGroupOf`,
`describeOperationsOf`, `siteSymmetryOf`, `orbitOf`), the matrices must be orthogonal (Cartesian;
within the `tolerance` of a function that has one, at least `EPSILON`), and the magnetic API asks
every operation whether it is combined with time reversal: `timeReversal` must be `true` or `false`. Operations of the
crystallographic API, which do not say, are refused there and not read as a white group; a caller
who means the white group adds `timeReversal: false`, one who means a crystal without magnetic
order builds the grey group. `siteSymmetryOf` and `orbitOf` do not depend on time reversal and take
either in the magnetic API.

**A third entry point, `symcrys/plane`,** holds the plane groups and the plane point groups ("Plane
groups" below); its keys are not keys of the other two.

## Cartesian frame

Cartesian matrices (the `cartesian` of an operation, rotations of tensors, bases) are taken in a
right-handed orthonormal frame x, y, z, row-major, acting on column vectors; the `matrix` of an
operation is in the lattice basis ("Operations"). How the conventional lattice basis a, b, c sits in that frame
(`latticeBasis(family)`, columns a, b, c with unit edge lengths):

| Family                      | Frame                                               |
| --------------------------- | --------------------------------------------------- |
| orthorhombic, tetragonal    | x ∥ a, y ∥ b, z ∥ c                                 |
| cubic                       | x ∥ a, y ∥ b, z ∥ c                                 |
| hexagonal (hexagonal axes)  | x ∥ a, z ∥ c, y = z × x; b at 120° from a           |
| trigonal, rhombohedral axes | a_R, b_R, c_R of the hexagonal cell above (below)   |
| monoclinic                  | unique axis ∥ y (unique axis b), ∥ z (c) or ∥ x (a) |
| triclinic                   | no symmetry direction; no fixed basis               |

For the monoclinic and triclinic families the cell angles are free, so `latticeBasis` gives no
basis for them; only the direction of the monoclinic unique axis is fixed.

**Rhombohedral axes** are those of the obverse setting in the hexagonal cell (ITA 2016 Table
1.5.1.1, p. 78, the matrix Q of the row R₁ obverse): a_R = (2a + b + c)/3, b_R = (−a + b + c)/3, c_R = (−a − 2b + c)/3, with the hexagonal a, b,
c above, so that [111] lies along z and the twofold axes of `32` along the a directions of the
hexagonal cell, as in `321`. A setting with rhombohedral axes therefore has the Cartesian operations
of the default setting with hexagonal axes; it differs in its lattice basis, and so in the lattice
operations, the Miller indices and the symmetry directions. As for hexagonal axes, the cell is the one of unit edge lengths a = c = 1; a
crystal's own cell is given by `latticeFromParameters`.

The hexagonal frame puts the secondary symmetry directions of the trigonal classes (the a axes) on
x, as ITC Vol. D does in its tensor tables (§ 1.1.4.10.4.4: group 32 with the twofold axis
parallel to Ox₁, group 3m with the mirror perpendicular to Ox₁). This was decided on #6.

## Operations

An operation of a point group in a setting is one record with both of its matrices (#137 A2,
maintainer 2026-11-22; #94):

| Field          | Meaning                                                                                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `matrix`       | ITA's matrix W in the lattice basis of the setting: integers, acting on the coordinates of a lattice direction [uvw]; the coordinate triplets of ITA's general position are its rows |
| `cartesian`    | the same operation as an orthogonal Cartesian matrix R = B·W·B⁻¹, B the basis of the setting ("Cartesian frame")                                                                     |
| `timeReversal` | magnetic API: whether the operation is combined with time reversal                                                                                                                   |

`matrix` means W in every entry point: in `symcrys/plane` an operation is `{ matrix, translation }`
with the same W ("Plane groups"). `operations` and `generators` give these records; there is no
separate list of lattice operations.

**Operations from a caller.** The functions that compute with Cartesian matrices (`pointGroupOf`,
`describeOperationsOf`, `siteSymmetryOf`, `orbitOf`, `isCentrosymmetricOf`, `isEnantiomorphicOf`,
`tensorFormOf`, `allowsPropertyOf`, `allowedPropertiesOf`) read `cartesian`, and in the magnetic API
`timeReversal`; other fields are not read, so a record of `operations` passes as it is, and so does
`{ cartesian }` (`{ cartesian, timeReversal }`) built by a caller, for instance for the operations
of a distorted crystal. A record without `cartesian` is a RangeError, with a hint if it has
`matrix`: W is not orthogonal in general, and reading it as Cartesian would give a wrong answer
without notice. `residualOperations` reads `matrix` ("Cell, metric and indices"); `orbit` uses the
W of the group itself. Inside the library the calculations work on the Cartesian matrix and the
time reversal alone (`CartesianOperation`).

For the monoclinic and triclinic families, whose basis a point group does not fix, a, b, c are
taken along x, y, z, so W and R are equal; for the other families W and R differ only where the
basis is not orthonormal (hexagonal and rhombohedral axes).

## Settings

A class may be placed in the Cartesian frame in more than one way: a **setting**. Settings are
numbered from 1, and one of them is the ITC default.

The operations, generators, symbols and lattice operations of the classes come from ITA's selected
generators, exact integer matrices in the conventional basis (`pointGroups/itcData.ts`); a setting
ITA does not print is a printed one in another basis. A black-and-white group is given by its ITC
symbol in each setting, from which its operations follow (`pointGroups/itcMagneticData.ts`).

**Numbering** (#137 A4): the ITC default is setting 1; then, for the monoclinic classes, unique
axis c and unique axis a; for the orthorhombic groups, the further orientations in the order of the columns of ITA
(2016) Table 1.5.4.4 (abc, ba-c, cab, -cba, bca, a-cb), each orientation once; otherwise the other
orientation; for the trigonal groups the setting with rhombohedral axes last. A setting is chosen
by its index or by a symbol, short or full (`{ setting: '312' }`, `{ setting: '1 1 2' }`), read as
in "Reading symbols". A symbol that several settings share (the key `'32'`, also the symbol of the
setting with rhombohedral axes; `'2'` for unique axis b, c and a) gives the standard (ITC default)
setting; the others are chosen as ITA's headlines name them (Table 3.2.3.2: "unique axis c",
"rhombohedral axes"), by the options `uniqueAxis` (`'a'`, `'b'`, `'c'`) and `axes`
(`'hexagonal'`, `'rhombohedral'`), alone or with a symbol: `{ axes: 'rhombohedral' }`,
`{ setting: '2', uniqueAxis: 'c' }` (Thomas, 2026-11-23, #96). `uniqueAxis` applies to the monoclinic
groups, `axes` to the hexagonal family (`'hexagonal'` holds for all its groups); criteria that no
setting meets are an error that lists the settings. The record of a setting (`settings(key)`) has
`index`, `symbol`, `fullSymbol`, `isDefault`, and `uniqueAxis` for a monoclinic setting, `axes`
(`'hexagonal'` or `'rhombohedral'`) for a trigonal one.

Classes with more than one setting (short symbol, full symbol in parentheses):

| Class  | Setting | ITC                                           |
| ------ | ------- | --------------------------------------------- |
| `2`    | 1       | `2` (`1 2 1`), unique axis b, **default**     |
|        | 2       | `2` (`1 1 2`), unique axis c                  |
|        | 3       | `2` (`2 1 1`), unique axis a                  |
| `m`    | 1       | `m` (`1 m 1`), unique axis b, **default**     |
|        | 2       | `m` (`1 1 m`), unique axis c                  |
|        | 3       | `m` (`m 1 1`), unique axis a                  |
| `2/m`  | 1       | `2/m` (`1 2/m 1`), unique axis b, **default** |
|        | 2       | `2/m` (`1 1 2/m`), unique axis c              |
|        | 3       | `2/m` (`2/m 1 1`), unique axis a              |
| `mm2`  | 1       | `mm2` (`m m 2`) **default**                   |
|        | 2       | `2mm` (`2 m m`)                               |
|        | 3       | `m2m` (`m 2 m`)                               |
| `-42m` | 1       | `-42m` (`-4 2 m`) **default**                 |
|        | 2       | `-4m2` (`-4 m 2`)                             |
| `3`    | 1       | `3` (`3`), hexagonal axes, **default**        |
|        | 2       | `3` (`3`), rhombohedral axes                  |
| `-3`   | 1       | `-3` (`-3`), hexagonal axes, **default**      |
|        | 2       | `-3` (`-3`), rhombohedral axes                |
| `32`   | 1       | `321` (`3 2 1`) **default**                   |
|        | 2       | `312` (`3 1 2`)                               |
|        | 3       | `32` (`3 2`), rhombohedral axes               |
| `3m`   | 1       | `3m1` (`3 m 1`) **default**                   |
|        | 2       | `31m` (`3 1 m`)                               |
|        | 3       | `3m` (`3 m`), rhombohedral axes               |
| `-3m`  | 1       | `-3m1` (`-3 2/m 1`) **default**               |
|        | 2       | `-31m` (`-3 1 2/m`)                           |
|        | 3       | `-3m` (`-3 2/m`), rhombohedral axes           |
| `-6m2` | 1       | `-6m2` (`-6 m 2`) **default**                 |
|        | 2       | `-62m` (`-6 2 m`)                             |

ITA describes the monoclinic classes with unique axis b and c (unique axis a it prints for the
space groups, Table 1.5.4.4; ITC Vol. D prints `211`, `m11`, `2/m11`, `references/itc/orientations.md`),
`-42m` and `-6m2` in two
orientations, and `32`, `3m`, `-3m` with hexagonal axes in two orientations, without naming one
standard (§ 3.2.1.2.1 (a), (b), (d), p. 721; Table 3.2.3.2), and the five trigonal classes also with
rhombohedral axes (Table 3.2.3.2, pp. 753–759); `mm2` it gives in one setting only.
The ITC defaults of symcrys:

- unique axis b: the IUCr accepts the b-axis setting as standard for morphological and structural
  studies (ITA § 2.1.3.15, p. 171);
- `321` and `3m1`: the frame of the tensor tables of ITC Vol. D (§ 1.1.4.10.4.4, #6);
- `-3m1`: their Laue class in the same frame (a consistency choice; ITC Vol. D Table 1.5.2.3 prints
  its full symbol `-3 2/m 1`);
- `-6m2`: ITC Vol. D Table 1.5.2.3, and the first entry in ITA (#137 B1);
- `-42m`, `mm2`: the first or only entry in ITA.

Frames: the monoclinic settings have the unique axis along y, z and x (unique axis a: from b by
a′ = b, b′ = c, c′ = a, as the column abc of unique axis a in the monoclinic part of ITA 2016 Table
1.5.4.4, p. 97, is that of unique axis b: C121 → B211, P1c1 → Pb11); `2mm` and `m2m` are `mm2` with
the twofold axis along x and y (the settings cab and bca of ITA 2016 Table 1.5.4.4); the second
setting of `-42m` is rotated by 45° about z, those of the trigonal and hexagonal classes by 30°.
The setting with rhombohedral axes has the frame of setting 1 and its Cartesian operations, in the
lattice basis a_R, b_R, c_R ("Cartesian frame"); its operations are numbered as ITA prints them for
rhombohedral axes, from ITA's selected generators of R3, R-3, R32, R3m and R-3m (5th ed., pp. 496,
502, 518, 530, 547). Since setting 1 and the rhombohedral setting hold the same Cartesian
operations, `pointGroupOf` names such operations setting 1; and since the symbol of the rhombohedral
setting of `32`, `3m`, `-3m` is the key, `findPointGroup('32')` and `findPointGroup('3 2')` give the
default, as a key always does. The rhombohedral setting is chosen by its index or by the axes:
`{ axes: 'rhombohedral' }`, `findPointGroup('32', { axes: 'rhombohedral' })`.
The classes `222` and `mmm` have one setting only: their three axes are equivalent.

### Settings of the magnetic groups

A **grey group** has the settings of its class, with the same indices, frames and defaults; ITC
prints grey groups in their standard orientation only, but a grey group is its class with time
reversal (CLAUDE.md, "Pure ITC").

A **black-and-white group** has the orientations ITC prints (`references/itc/orientations.md`),
numbered as above:

- monoclinic (5 groups): unique axis b, c and a, as the classes (ITC Vol. D prints `2'11`, `m'11`,
  `2'/m'11`, pp. 134, 140);
- orthorhombic `2'2'2`, `m'm'2`, `mm'm'`, `mmm'`: three settings, the distinct orientations of the
  default in the column order of Table 1.5.4.4. The classes `222` and `mmm` need one setting, but
  time reversal singles out one axis. `m'm'm'` has one setting;
- orthorhombic `2'm'm`: six settings (below);
- tetragonal `4'22'`, `4'mm'`, `-4'2m'`, `-4'm2'`, `-42'm'`, `4'/mmm'`, `4'/m'm'm`: two settings 45°
  apart about z. For `422`, `4mm` and `4/mmm` the two frames hold the same operations; with time
  reversal on the fourfold rotation they differ in which lateral elements carry it;
- trigonal `32'`, `3m'`, `-3m'`, `-3'm'`, `-3'm`: two settings 30° apart about z, and as setting 3
  the setting with rhombohedral axes in the frame of setting 1 (`3 2'`, `3 m'`, `-3 2'/m'`,
  `-3' 2/m'`, `-3' 2'/m`); `-3'`: hexagonal and rhombohedral axes, as its class (every trigonal
  group gets the rhombohedral setting of its class; Thomas, 2026-11-23, CLAUDE.md, "Pure ITC");
- hexagonal `6'22'`, `6'mm'`, `-6'2m'`, `-6'm2'`, `-6m'2'`, `6'/m'mm'`, `6'/mmm'`: two settings 30°
  apart about z;
- all other groups: one setting.

**The six settings of `2'm'm`.** `2'm'm` (C2v(Cs)) is the one orthorhombic group whose three
elements all differ, so every permutation of the axes gives a further orientation: six in all, and
print uses every one of them. "Mirror" is the normal of the mirror plane without time reversal, the
direction a spontaneous magnetization may have.

| Setting | Symbol  | Mirror | Operations besides 1 | Symbol printed in                                                                                              |
| ------- | ------- | ------ | -------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1       | `2'm'm` | z      | 2′_x, m′_y, m_z      | Birss Table 6; ITC Vol. D Tables 1.5.2.3 (p. 111), 1.5.7.1 (in brackets, p. 135), list on p. 140 (in brackets) |
| 2       | `m'2'm` | z      | m′_x, 2′_y, m_z      | ITC Vol. D Table 1.5.7.1 (p. 135), list on p. 140 (in brackets)                                                |
| 3       | `m2'm'` | x      | m_x, 2′_y, m′_z      | ITC Vol. D Table 1.5.8.1 (in brackets, p. 139), list on p. 136 (in brackets)                                   |
| 4       | `mm'2'` | x      | m_x, m′_y, 2′_z      | ITC Vol. D, lists on pp. 136 and 140; Paufler (1986), p. 62 and Table A 6, no. 15, p. 316                      |
| 5       | `m'm2'` | y      | m′_x, m_y, 2′_z      | ITC Vol. D Table 1.5.2.4 (p. 113), lists on pp. 136 and 140                                                    |
| 6       | `2'mm'` | y      | 2′_x, m_y, m′_z      | ITC Vol. D Tables 1.5.8.1 (p. 139) and 1.2.6.12 (p. 66), list on p. 136                                        |

Birss (Table 6) and Paufler (Table A 6) print the operations with the symbol; for the other rows
the operations are those the symbol names, each position read along x, y, z.

A setting of a black-and-white group is a frame of its crystal class, but not always the one with
the same index: setting 1 of `-6'2m'` (twofold axes along a, x) is the frame of setting 2 of `-6m2`
(`-62m`). The setting of the class is the one whose symbol is the group's without primes.

**Defaults.** The frame in which the key, read along ITA's symmetry directions (Table 2.1.3.1),
describes the group. For the triclinic to tetragonal systems this is the frame of the operators
printed in ITC Vol. D Table 1.5.2.3 (monoclinic `2'_y`; `mm'm'` with `2_x`, `2'_y`, `2'_z`; tetragonal
with their x, y and diagonal axes); for the trigonal and hexagonal groups, whose lateral operators
the table prints without axes (`3(2'_⊥)`), it follows from the symbol alone. The default is
setting 1.

## Birss as a second print check

Birss's Tables 3, 4a–4f, 6 and 7 print the same groups and tensor forms in his own frame. The tests
compare them with the ITC output in one frame (`testUtils/birssFrame.ts`): both frames put x along a
and z along c; they differ where the two print the same group in another orientation, which their
symbols show:

- **monoclinic:** Birss takes the unique axis along z (Table 4a, p. 56: `2//z`), ITC's default
  along b, y;
- **the hexagonal family:** Birss reads position 2 of a symbol along y and position 3 along x (Table
  4a, pp. 56–57: `32: 2//y`, `3m: -2//y`), ITC along a = x and the tertiary directions; so for `32`,
  `3m`, `-3m` and `-6m2` and their magnetic groups the defaults of the two books are 30° apart;
- **`mm'm'`:** Birss prints `m'm'm`, the mirror without time reversal normal to z; ITC prints
  `mm'm'`, that mirror normal to x;
- **cubic symbols:** Birss prints `m3` and `m3m`, ITC `m-3` and `m-3m`.

Everywhere else the two books agree: same frame, same symbols, same Schoenflies symbols (`-3` is
`C3i` in both Birss Table 3 and ITA Tables 3.2.1.2 and 3.2.3.2, which the crystallographic API
writes; ITC Vol. D and the magnetic API write `S6`).

## Symbols

- Plain strings: a leading `-` is the overbar (`-3m`, `m-3m`); a prime `'` after an element means
  that it is combined with time reversal (`4'`, `-3'`, `2'/m`, `m'`).
- **Symbols of the magnetic groups.** A black-and-white group has, in every frame, the symbol of its crystal class in that frame, each element with a prime if the operation it
  names is combined with time reversal (ITC Vol. D § 1.5.2.1, Table 1.5.2.3): `4/m 2/m 2/m` becomes
  `4'/m 2/m 2'/m'`, short `4'/mmm'`. symcrys derives these symbols from the symbols of the class
  and the operations; the ITC full symbols of the default settings equal the printed ones for all
  58 groups. A grey group has the symbols of its class followed by `1'` (short `mm21'`, full
  `m m 2 1'`).
- **Short symbols of the magnetic groups** (#137 B2): the default setting of a grey or
  black-and-white group has its key as short symbol: for a black-and-white group the short symbol
  of ITC Vol. D Table 1.5.2.3 (`32'`, `-3'm'`), for a grey group the key of its class followed by
  `1'` (`321'`, `-3m1'`). Table 1.2.6.12 prints some grey groups otherwise (`1'`, `21'/m`, `2mm1'`,
  where the keys are `11'`, `2/m1'`, `mm21'`). The other settings keep the `1` that fixes the
  orientation (`31m'`; for a grey group `3121'`, by the rule). Vol. D itself writes the default
  orientation with the `1` where it sets it against the other one (§ 1.5.8.1, p. 140: `3m'1`,
  `31m'`); symcrys gives the symbol of Table 1.5.2.3. The symbol derived by the rule for the default
  setting (`32'1`, `3211'`) still selects it (`{ setting }`, `findPointGroup`). With rhombohedral axes the short symbol is again the key
  (`32'`), so the default and the rhombohedral setting share it; the symbol gives the default, and
  `{ axes: 'rhombohedral' }` the other ("Settings"). A crystal class keeps ITA's symbol (`321`) in both entry points, so
  that a setting symbol means the same setting in both.
- **Short symbol** (`form: 'short'`, the default): the symbol of the setting, in ITC as in the
  headline of ITA Table 3.2.3.2, with the trailing or inner `1` that fixes the orientation (`321`,
  `31m`, `-3m1`). With hexagonal axes ITA keeps the `1` (`321`, `312`; Table 3.2.3.2, p. 754),
  because without it the two orientations cannot be told apart; `32` there is the description with
  rhombohedral axes (p. 755), the symbol of setting 3 (full `3 2`: two positions, [111] and the
  directions [1-10], [01-1], [-101] of ITA Table 2.1.3.1).
- **Full symbol** (`form: 'full'`): one entry per symmetry direction, separated by single spaces,
  `1` for a direction without symmetry: `-3 2/m 1`, `1 2 1`, `4/m -3 2/m`.
- **Schoenflies** (`form: 'schoenflies'`): subscripts written inline (`C3v`, `D2d`, `Oh`). A
  black-and-white group is `G(H)`, G the crystal class and H the subgroup of the operations without
  time reversal (`D4h(D2d)`), as in ITC Vol. D Table 1.5.2.3; a grey group is `GR` (`D4R`; ITC
  Vol. D Table 1.5.2.1). Each entry point follows the volume it is anchored in (#137 B3): the
  crystallographic API writes `C3i` for `-3`, as ITA does (Tables 3.2.1.2, 3.2.3.2), the magnetic API
  `S6` throughout, as ITC Vol. D does (`S6`, `S6(C3)`, `D3d(S6)`, `C6h(S6)`; Table 1.5.2.3), and so
  `S6R` for the grey group.
- **Shubnikov** (`form: 'shubnikov'`; #137 B4, decided by Thomas on 2026-11-25): the symbol of ITC
  Vol. D Table 1.5.2.3, column 3 (pp. 111–112), for the 32 classes (in both entry points) and the 58
  black-and-white groups, written as print shows it: the overbar as the combining overbar U+0305
  and the underline (an element combined with time reversal) as the combining low line U+0332, each
  after its character, and `·` for the centred dot: `2̲:m̲` for `2'/m'`, `6̅/4` for `m-3m`. Shubnikov's
  overbar marks a rotoreflection (`2̅` is −1, `6̅` is −3), not Hermann–Mauguin's rotoinversion, so it is
  not written as `-`. A grey group, for which ITC prints no Shubnikov symbol, has the symbol of its
  class, a centred dot and an underlined 1 (`3:2·1̲` for `321'`), as Shubnikov & Belov, _Colored
  Symmetry_ (1964), pp. 113–114, write it ("the addition of the symbol 1̲ [1′] to the symbol of the
  polar group", `m·1̲ [m1′]`, `4·1̲ [41′]`; `references/shubnikov-belov/neutral-groups.md`). The symbol names no
  orientation, so every setting has the same one, as for Schoenflies. Birss Table 6 prints the same
  symbols for the 90 groups (tested; `references/birss/table-6.md`). The low line comes before the
  overbar where both mark a digit, Unicode's canonical order, so that normalizing a symbol keeps it.
- Apart from the combining characters of the Shubnikov form, rendering (overbars, subscripts, LaTeX)
  is left to the applications.

## Reading symbols

`findPointGroup` (in the point-group entry points) and the option `setting` read a symbol tolerantly, as a pure
normalisation before the comparison (#96; decided by Thomas on 2026-11-22 and 2026-11-23):

- **Spellings** (`notation.ts`): the overbar as `-`, `−` (U+2212), a combining overbar or overline
  after the digit (`m3̄m`), the macron `¯` after the digit (as the text layer of the ITA 2016 PDFs
  gives it), `bar3`, or LaTeX's `\bar{3}` and `\overline{3}`; the prime as `'`, `′`
  (U+2032), `ʹ` (U+02B9) or `’` (U+2019, which editors put for an apostrophe); Schoenflies subscripts
  also as Unicode subscripts (`C₃ᵥ`, `D₃d(S₆)`) or LaTeX's (`C_{3v}`, `C_3`). Spaces carry no
  meaning: `3 2` is `32` (Thomas, 2026-11-23), as print writes the short symbols without them.
- **What `findPointGroup` reads:** the key; the short or full symbol of a setting (and the short
  symbol by the rule, `32'1`); a Schoenflies symbol, with `C3i` or `S6` alike (`D3`, `D4h(D2h)`,
  `D4R`), which names the group, not an orientation (Thomas, 2026-11-23); Birss's cubic symbols,
  printed without the overbar on the 3, which takes the prime of the mirror before it (`m3m`, `m'3m`
  for `m-3m`, `m'-3'm`; Birss Tables 3 and 6). A symbol that names several settings (the key `32`,
  also the symbol of the setting with rhombohedral axes; `2` for unique axis b, c and a; `3 1'`;
  every Schoenflies symbol) gives the standard (ITC default) setting, as the name without the
  headline means the standard in ITA; the options `axes` and `uniqueAxis` choose another
  (`findPointGroup('32', { axes: 'rhombohedral' })`; "Settings").

  Every symbol `symbol()` writes is read back to its group (tested over all settings and forms of
  both entry points), and to its setting where the symbol, or the symbol with the setting's axes or
  unique axis, names one; the one exception is the Shubnikov form, which is not read, since its
  overbar means something else (`6̅` is −3 there, `-6` is C3h in Hermann–Mauguin; Thomas,
  2026-11-25): a symbol with a character only Shubnikov writes (the underline, `:`, `·`) is a
  RangeError, and one without (`6̅`, `2̅`) is read as Hermann–Mauguin. A symbol that names several groups is a RangeError that lists them; none
  of the symbols of the library does. The crystallographic API finds no magnetic group, in any
  spelling.

- **`{ setting }`** reads a symbol of a setting with the same spellings, and Birss's cubic symbols,
  with the same rule: a symbol of several settings gives the standard, unless `axes` or
  `uniqueAxis` chooses another. A Schoenflies symbol names no setting and is not read here.

`symcrys/plane` reads its symbols with the same spellings, spaces ignored (#97, 0.12); it has no
Schoenflies or Birss symbols to read: `findPlaneGroup` the key or the full
symbol of a plane group (`'pm'`, `'p1m1'`, `'p 1 m 1'`) and gives `{ key }`; `findPointGroup` the key
or the symbol of a setting of a plane point group (`'31m'`, `'3 1 m'`) and gives `{ key, setting }`,
the key `'3m'` its default setting; `{ setting }` takes the index or the symbol of a setting. The
lattice letter is lower case, as ITA prints it: `'P2mg'` names no plane group, so that a symbol of a
space group is not read as one of a plane group.

## Results

Every result of the API is frozen, nested arrays and objects included, and typed `readonly`; a
caller who wants to change one copies it (#137 C4; `entryPoints.test.ts` calls every function of
the three entry points). `residualOperations` freezes its list, not the operations in it, which are
the caller's. "Not found" is `undefined`, never `null` (`findPointGroup`, `pointGroupOf`,
`zoneAxis`; in Python `None`).

## Errors

Wrong input is a `RangeError` whose message says what is wrong, in every function of the three
entry points: an unknown key or setting, a vector of the wrong length or with a number that is not
finite, an options argument that is not an object, an option the function does not know (a
misspelling such as `uniqueaxis` is not ignored), a tolerance outside its bounds ("Tolerances"). A
`TypeError` or a plain `Error` is a fault of symcrys (#137 D2; `inputErrors.test.ts` calls every
function with wrong values in every position). In Python a `RangeError` raises `SymcrysError`, a
`ValueError`, and any other error `SymcrysInternalError`, a `RuntimeError`.

## Numbers

Matrices hold floating-point numbers. During group closure every entry within 10⁻⁹ of an exact
value (0, ±1, ±1/2, ±√3/2, and ±√2/2 for the 45° setting frame) is set to that value, so products do not drift; two matrices are
equal when all entries agree within 10⁻⁶. Operations a caller passes in are compared within the
tolerance of the call ("Tolerances"). The matrix W of an operation in the lattice basis
(`matrix`, "Operations") is exact: integers.

## Tolerances

Every function that compares numbers a caller passes in (operations, directions, points) takes one
option, `tolerance` (`ToleranceOptions`; in Python the keyword `tolerance`), with the default
`EPSILON` = 10⁻⁶, which all three entry points export (#137 D1, #93). Two numbers count as equal
when they differ by less than the tolerance, in the metric of their kind:

| Kind of object                            | Metric                                                  | Bound | Functions                                                                                                                                                                                                                                                                 |
| ----------------------------------------- | ------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| operations                                | per matrix entry                                        | 0.1   | `pointGroupOf`, `describeOperationsOf` (also in `symcrys/plane`), `tensorFormOf`, `isCentrosymmetricOf`, `isEnantiomorphicOf`, `allowsPropertyOf`, `allowedPropertiesOf`, `rotateTensor`; `changeOfCoordinates` (all three entry points) for the entries of P, p, W and w |
| directions                                | Euclidean distance of the unit vectors                  | 1     | `siteSymmetryOf`, `siteSymmetry`, `wyckoffPosition`, `orbitOf`                                                                                                                                                                                                            |
| points of the plane                       | per coordinate in the lattice basis, modulo the lattice | 1/2   | `siteSymmetry`, `wyckoffPosition`, `orbit` of `symcrys/plane`                                                                                                                                                                                                             |
| the metric tensor G of a cell (W ᵀGW = G) | per entry, relative to the largest entry of G           | 1     | `residualOperations`                                                                                                                                                                                                                                                      |
| the index symmetry of a tensor            | per component, relative to its largest component        | 1     | `toVoigt`, `fromVoigt`                                                                                                                                                                                                                                                    |

- **One check.** A tolerance is a finite number above 0 and below the bound of its kind, beyond
  which it says nothing: two distinct operations of a crystallographic point group differ in some
  matrix entry by at least √2/3 ≈ 0.47 in any orthonormal frame (‖A − B‖ = ‖1 − A⁻¹B‖ ≥ √2, the
  least for a sixfold rotation), two unit vectors are at most 2 apart, two points modulo the lattice
  at most 1/2 per coordinate. Anything else, `null` included, is a RangeError with one message; only
  a missing tolerance takes the default. A function that compares directions checks the
  orthogonality of the operations with its tolerance, at most 0.1 (per entry of RᵀR, at least
  `EPSILON`). The translations read by `describeOperationsOf` of `symcrys/plane` are compared per
  coordinate; one that lies within the tolerance of two fractions with denominators up to 12
  (which can be 1/132 apart) is refused. `changeOfCoordinates` reads each entry of P, p, W and w as
  the simplest fraction within the tolerance, which is unique.
- **Operations of a caller are made exact.** `tensorFormOf`, `isCentrosymmetricOf`,
  `allowsPropertyOf` and `allowedPropertiesOf` close the list into a group within the tolerance and
  replace it by the exact group nearest to it before they compute anything: each matrix f(x) by
  the mean of f(xy)·f(y)⁻¹ over the group, repeated until it settles, which turns matrices that are
  a group within a small error into an exact representation nearby, then made orthogonal by its
  invariant metric. The rank of a tensor form is the trace of the group average of the exact
  group, exact in any frame, and its free parameters are sought first among components larger
  than ten times the distance between the caller's matrices and the exact group, so that a component of the order of that error is not
  taken for an independent one (#89). Operations rounded to 4, 5 or 6 decimals give the form of
  the exact group for every class in every setting, and its number of free parameters in a general
  orientation, for all 122 groups (`tensors/tolerance.test.ts`). `isCentrosymmetricOf` only closes
  the list within the tolerance and seeks the inversion in it.
- **The tolerance must exceed the errors of the products.** Closing a list multiplies its
  matrices, and their errors add up: matrices rounded to n decimals need a tolerance of about
  10^(1−n), not 10^(−n). With the default, matrices rounded to 6 decimals in a hexagonal or
  trigonal group generate no finite group, and the error says to pass a larger tolerance.
- **The exact group is near the caller's, not necessarily the textbook one.** Matrices rounded to 4
  decimals give an exact group within their errors (√3/2 written as 0.866 fixes the orientation of
  a hexagonal group about z only to a few 10⁻⁵), so a form computed from them has entries within
  about that of the exact form.

## Properties

What is fixed once the group is named is a field of `pointGroup(key)`: `crystalSystem`, `order`,
`centrosymmetric`, `polar`, `enantiomorphic`, `laueClass`, and in the magnetic API also `type` and
`crystalClass` (maintainer, 2026-11-20, #41). They follow from the operations alone; none depends
on the setting. For a magnetic point group:

- `centrosymmetric`: the group contains the inversion without time reversal. `m'm'm'`, which
  contains only the inversion combined with time reversal, is not centrosymmetric in this sense;
  its crystal class `mmm` is.
- `polar`, `enantiomorphic`, `laueClass`: those of the crystal class (`crystalClass`). Time reversal
  changes neither a polar vector nor handedness. `polar`: a direction is fixed by every operation;
  `enantiomorphic`: proper rotations only (ITA § 3.2.2.1.3, p. 738: enantiomorphism and chirality
  are the same restriction, the absence of improper rotations); `laueClass`: the class with the inversion added.

**For a list of operations** (a site symmetry, the operations of a distorted crystal):
`isCentrosymmetricOf(operations)` and `isEnantiomorphicOf(operations)`, for the group the operations
generate, with what `tensorFormOf` asks of the list ("Two entry points", "Operations passed in").
Polar is there the named property: `allowsPropertyOf(operations, 'pyroelectric')`. A list of operations has no Laue class as a key; `pointGroupOf` identifies the group first
("Point group of a list of operations").

**Holohedry and lattice systems.** The holohedry belongs to the lattice system (ITA 2016
§ 1.3.4.4.2 and Table 1.3.4.1, p. 39; #137 G1): `holohedry(latticeSystem)` gives the point symmetry
of the lattices of one of the seven lattice systems, `-1`, `2/m`, `mmm`, `4/mmm`, `6/mmm`
(`'hexagonal'`, hP), `-3m` (`'rhombohedral'`, hR) and `m-3m`. Lattice systems classify lattices,
not point groups: a trigonal class acts on a primitive hexagonal (hP) or on a rhombohedrally centred
(hR) lattice, so `latticeSystems(key)` gives `['hexagonal', 'rhombohedral']` for a trigonal
class and the one lattice system of its name for every other class. A crystal system is not a
lattice system: `holohedry('trigonal')` is an error that names the two. A magnetic point group has
the lattice systems of its crystal class.

Properties that are the question whether a tensor is allowed (piezoelectric, ferroaxial,
ferromagnetic, …) are named tensor properties: `allowsProperty(key, 'piezoelectric')` ("Tensors",
"Named properties").

## Order of the operations

`operations` lists the operations of a setting in ITA's order: for every
setting that ITA lists, as ITA numbers its general position (ITA Table 3.2.3.2; the symmetry
operations (1) … (n) of the space-group tables carry the same numbers). ITA bases this sequence on
its selected generators (`generators`, below; 5th ed., § 2.2.11 (iv), p. 27; "Generators selected"
of the symmorphic P group in Part 7) and takes the next generator as soon as a power of the current
one lies in the group generated so far (§ 8.3.5, p. 737). Starting from the identity, each generator
g therefore extends the group H generated so far by the cosets gH, g²H, … until a power of g lies in
H. For the settings ITA does not list, `mm2` settings 2 (`2mm`) and 3 (`m2m`) and monoclinic unique
axis a, the order is that of setting 1, carried into their frame by the change of basis of ITA
(2016) Table 1.5.4.4 (cab, bca; for unique axis a, a′ = b, b′ = c, c′ = a, see "Settings"). `describeOperations` follows the order of `operations`.

**Magnetic groups** (maintainer, 2026-11-19). ITC Vol. D prints no order of the
individual operations: Table 1.5.2.3 lists them grouped (`±4_z`, `3(2_⊥)`, `4(±3)`). symcrys keeps
ITA's numbers of the crystal class: operation k of a black-and-white group is operation k of its
class in the same frame, with or without time reversal, so that numbers, poles and descriptions
stay comparable with the class (operation k of `m'm'm'` is operation k of `mmm`). A grey group
lists the operations of its class, then the same sequence combined with time reversal.

## Generators

`generators` returns ITA's selected generators of the setting ("Generators
selected" of the symmorphic P group, 5th ed., Part 7), in printed order and without the identity;
for the settings ITA does not list (`mm2` settings 2 and 3, monoclinic unique axis a), those of
setting 1 carried into their frame (ITA (2016) Table 1.5.4.4). A magnetic group has
the generators of its class in the same frame, each with the time reversal it has in the group (they
generate the group, because dropping time reversal maps a black-and-white group one to one onto its
class), a grey group those of its class followed by time reversal `1'`; ITC Vol. D prints no
generators. Birss's printed generating matrices (Birss Table 3, pp. 36–38, σ(N) of eq. (2.17),
pp. 48–49) differ from ITA's for some classes in choice and order; Birss's tests check only the
group they generate.

## Symmetry directions and elements

**Symmetry directions** (`LATTICE_SYMMETRY_DIRECTIONS`) are the lattice directions of ITA Table
2.1.3.1, grouped by position of the full symbol, in the printed order and with the printed signs:
primary, secondary, tertiary (hexagonal family: the row "Hexagonal", also for the trigonal classes
with hexagonal axes). The monoclinic full symbol reads along a, b, c, so the monoclinic family has
the orthorhombic positions; the triclinic family has none. A setting with rhombohedral axes has the
two positions of the row "Rhombohedral (rhombohedral axes)": [111], and [1-10], [01-1], [-101].

`symmetryDirections(key, options)` lists, for a setting, every position of the family with the
symbol at that position (if the full symbol has it) and, for each direction, the elements along
it: the highest rotation n, the highest rotoinversion n̄ (n = 3, 4, 6) and whether a mirror is
perpendicular.

`describeOperations(key, options)` describes each operation, in the order of `operations`:

| Field          | Meaning                                                                                                                                                                    |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kind`         | `identity`, `inversion`, `rotation`, `rotoinversion` (n̄ = inversion × rotation n, n = 3, 4, 6), `reflection`, as ITA names the operations (ITA 2016 Table 2.1.2.1, p. 145) |
| `n`            | the n of n or n̄ (ITA 2016 § 1.2.1, p. 12: an n-fold rotation); 1 for the identity and the inversion, 2 for a reflection (m = 2̄)                                            |
| `axis`         | rotation or rotoinversion axis, or the normal of the mirror plane: `lattice` [uvw] and `cartesian` unit vector                                                             |
| `sense`        | for n ≥ 3: `+` or `-`                                                                                                                                                      |
| `timeReversal` | magnetic API: as in the operation                                                                                                                                          |

- **Axis.** Every axis and mirror normal of a crystal class lies along one of its symmetry
  directions; the axis is that direction, as [uvw] and as a Cartesian unit vector in the frame of
  the setting, with the sign of the operation's **Seitz symbol** (ITA 6th ed., Tables 1.4.2.1–1.4.2.3,
  p. 52; "Pure ITC", #114): the direction its subscript names, for every matrix W of the setting.
  Where Table 2.1.3.1 lists the opposite representative, the two differ in sign: in the hexagonal
  family the twofold axes and mirror normals 2₁₁₀, m₁₁₀ and 2₂₁₀, m₂₁₀ are [1, 1, 0] and [2, 1, 0],
  where the table lists [1̄, 1̄, 0] and [2̄, 1̄, 0]; for the other families and for n ≥ 3 the two
  agree. `symmetryDirections` keeps the sign of Table 2.1.3.1, so match an axis with a direction up
  to sign. Tested against the printed tables for every operation of every setting
  (`seitz.reference.test.ts`), with the printed entries checked against their own matrices (axis,
  normal, sense); Table 1.4.2.1 prints No. 32 without the overbar of its type (erratum in the
  transcription). For the monoclinic family, which has no fixed
  basis, a, b, c are taken along x, y, z; this is exact for the unique axis, the only direction
  that carries an element.
- **Sense** follows ITA § 11.1.2 (5th ed., pp. 810–811): `+` if the rotation is counter-clockwise
  seen from the tip of the axis looking towards the origin, i.e. by +360°/n about it; for a
  rotoinversion, angle and sense refer to the rotation part. The sense refers to the sign of the
  axis. For all 45 entries of ITA's tables (5 with rhombohedral axes) the printed
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

**Site symmetry.** `siteSymmetryOf(operations, direction, { tolerance })` returns the operations of
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
direction. `siteSymmetry(key, direction, { setting, axes, uniqueAxis, tolerance })` is the same for
the operations of a point group in a setting, `siteSymmetryOf(operations(key, options), …)`; the
suffix `…Of` marks the functions of a list of operations (#137 C1).

**Wyckoff positions** are ITA's: a Wyckoff position is the set of directions whose site
symmetries are conjugate in the point group (ITA, 6th ed., § 3.2.1.2.2, "Definition", p. 722).

They are given for the **32 crystal classes only**: ITA tabulates them for these, and
`wyckoffPositions` and `wyckoffPosition` throw for a magnetic point group with time reversal. For
such a group, use the key of its crystal class or `siteSymmetry` with its key.

`wyckoffPositions(key, { setting })` lists them in ITA's order, general position first, as ITA
prints them for that setting (ITA 6th ed., Table 3.2.3.2, pp. 745–769):

| Field                    | Meaning                                                                                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `letter`                 | ITA's Wyckoff letter                                                                                                                                |
| `multiplicity`           | number of equivalent directions (faces of the form)                                                                                                 |
| `siteSymmetry`           | oriented site-symmetry symbol as printed, e.g. `..m`, `4m.m`; the positions are those of the symmetry directions of ITA Table 2.1.3.1               |
| `coordinates`            | the printed coordinate triplets in printed order, one per equivalent direction, e.g. `['x,x,z', '-x,-x,z', …]`; the first is a representative point |
| `millerIndices`          | the first printed face, e.g. `h,h,l`, Bravais–Miller indices for hexagonal axes, e.g. `h,h,-2h,l`                                                   |
| `siteSymmetryOperations` | indices into `operations` (same setting) of the operations fixing that face (for values of h, k, l that keep it in the position)                    |

- The **point at the origin** (letter o, site symmetry the whole group), which ITA 2016 prints for
  every group except the ten polar ones (1, 2, m, mm2, 4, 4mm, 3, 3m, 6, 6mm), is not a direction
  and is left out.
- The printed point and the printed face of a position may lie on **different, conjugate
  elements**: in 321, position b prints the point x,0,0 (on the twofold axis along a) and the face
  (112̄0) (on the twofold axis along [110]). Both belong to the position; `siteSymmetryOperations`
  are those of the face, as the applications work with face poles.
- **Faces with numbers** (#137 G3, G4): the records give the faces as ITA prints them, with
  letters. `millerIndices(printed, { h, k, l })` substitutes a caller's values (three indices; for
  hexagonal axes i = −(h + k) is dropped, as `orbit` takes them; rhombohedral axes print sums such
  as `h,k,-h-k` and `h,k,2k-h`), and `faceNormal(basis, hkl)` gives the unit normal
  h a\* + k b\* + l c\* of a face in a cell. A normal exists only for a cell: `latticeBasis(family)`
  for the families with fixed cell angles, `latticeFromParameters` for a real cell, which the
  monoclinic and triclinic classes need, since a point group does not fix their cell angles. The
  values are the caller's choice; values that put a face on a limiting form or a special position
  (a general face with h = k) give the face of that form. Inside, symcrys checks each printed
  position with the face h, k, l = 3, 2, 1 (rhombohedral axes 5, 2, 1, since (321) lies there on the
  limiting form (h,k,2k−h), pp. 755–759; 1, 2, 3 for the condition |h| < |l|) and its normal for
  a, b, c along x, y, z where the angles are free, which gives the right site symmetry.
- Where ITA prints a face with "or", e.g. (001) or (001̄) for the pedion of 4mm, the two faces
  belong to the same Wyckoff position (ITA 6th ed., § 3.2.1.2.4 (i), p. 729); `millerIndices` is the
  first.
- **Settings ITA does not print** (`mm2` settings 2 and 3, `2mm` and `m2m`; monoclinic unique
  axis a, whose site symmetries `2`, `m`, `2/m` name the element on the unique axis and are not
  permuted): the positions of
  setting 1 carried into their frame, a permutation of the axes (the settings cab and bca of ITA
  (2016) Table 1.5.4.4; maintainer decision, 2026-11-18, #24): same letters and multiplicities, the
  positions of the oriented symbol permuted, the coordinates and Miller indices permuted and their
  letters renamed after their new position (`m..`, `0,y,z`, `0,k,l` in `mm2` become `.m.`, `x,0,z`,
  `h,0,l` in `2mm`), every triplet of a position in the order printed for setting 1.
- The **coordinates** are ITA's in full (#137 C4, #121 step 7d): the triplets of a position are the
  images of its first under the general position, in the order of the general position, which a
  test checks for all 45 printed entries against the transcription of both
  (`wyckoff.reference.test.ts`).

`wyckoffPosition(key, direction, { setting, tolerance })` gives the Wyckoff position of any
direction: the one whose printed face has a site symmetry conjugate to that of the direction.

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

| Field           | Meaning                                                                   |
| --------------- | ------------------------------------------------------------------------- |
| `letter`        | the Wyckoff letter of the position the faces belong to                    |
| `multiplicity`  | number of faces, the multiplicity of the position                         |
| `siteSymmetry`  | the oriented site-symmetry symbol of the position (the face symmetry)     |
| `basic`         | true for the basic form of the position, false for a limiting form        |
| `formType`      | the number of the form in `CRYSTAL_FORM_TYPES`                            |
| `millerIndices` | ITA's first face of the form as printed, e.g. `h,0,l`, `1,1,-2,0`         |
| `condition`     | the condition printed with the cubic forms (hhl), below; absent otherwise |

- **Two forms on the faces (hhl).** In the cubic classes the faces (hhl) of one Wyckoff position
  form two different forms depending on whether |h| < |l| or |h| > |l| (trigon- and
  tetragon-tritetrahedron in 23 and -43m, trigon- and tetragon-trioctahedron in m-3, 432 and m-3m).
  ITA prints both with the condition, which `condition` gives as `'|h|<|l|'` or `'|h|>|l|'`; in
  -43m and m-3m both are basic forms of the position, elsewhere both are limiting forms. A face
  with numbers must meet the condition: `millerIndices('h,h,l', { h: 1, l: 3 })` is (113), a face of
  the |h| < |l| form, and (331) one of the other.
- **Groups.** As the Wyckoff positions: the 32 crystal classes only (a RangeError otherwise), and the settings ITA does not print (`mm2` settings 2 and 3, monoclinic unique axis a) are
  setting 1 carried into their frame.
- **Faces with numbers and their normals:** `millerIndices` and `faceNormal`, as for the Wyckoff
  positions; the form and its number do not depend on the cell angles.
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
  and 622 (pp. 726–727). Table 3.2.1.3 prints the rhombohedral description of 32, 3m and -3m as
  the third line of a brace; where a form has no such line (3 and -3, and forms such as the pedion of
  3m), its one row serves both axes.
- **ITA 2006.** The 5th edition prints the forms of the point groups as Table 10.1.2.2 and the 47
  forms as Table 10.1.2.3. stereography's catalogue follows it, with the basic forms only and the
  numbers of Table 10.1.2.3; `audit/forms-2006` compares the 47 forms (number of faces,
  eigensymmetry) and the basic forms with symcrys, without difference, so the two editions number
  the forms alike.

## Point group of a list of operations

`pointGroupOf(operations, { tolerance })` names the point group that a list of Cartesian
operations generates, for instance the operations of a crystal that keep its distorted lattice
(maintainer, 2026-11-21, #24). The list is closed into a group, two matrices being equal when no
entry differs by `tolerance` (default `EPSILON`, below 0.1) or more; a caller whose matrices
carry rounding errors passes a value well above them, and the matrices need only be orthogonal, and
their traces integers, within it. The result is the
key, and the setting whose operations the group equals in the frame of symcrys. A group in another
orientation (a threefold axis along [111] of a cubic crystal, a frame turned by any angle) has no
setting: the key is still found, the setting is absent. `1` and `-1` have no orientation and always
setting 1. The result is undefined if the operations generate no point group (an operation of
order 5, a group of more than 96 operations). The setting is found from the operations passed in,
which generate the group, not from their products, whose errors add up. The first call builds a
table of the 122 groups (about 0.1 s); after that a call takes about 1.5 ms for the 48 operations
of m-3m (Node, measured 2026-11-21), since the closure multiplies only by the operations passed in
and compares a product only with the operations of its kind.

**How the group is named.** Each operation contributes its determinant, its trace and, in the
magnetic API, whether it is combined with time reversal; the group is named by how often each
combination occurs. For the 122 point groups these counts are all different (`identify.test.ts`
checks it). Every finite group of orthogonal matrices whose elements have orders 1, 2, 3, 4 or 6
is a point group in some orientation, and the 122 groups are all point groups up to orientation,
so the counts name every such group. The crystallographic API takes no time reversal and names
one of the 32 classes; the magnetic API takes the time reversal of each operation and names one of
the 122 groups (a list of white operations is the white group, as everywhere in that API).

`describeOperationsOf(operations, { tolerance })` describes each operation of any list as `describeOperations`
does for a key (kind, n, sense), but with the axis as a Cartesian unit vector only, because the
list need not belong to a setting whose lattice directions could name it, and a Seitz symbol needs
a lattice. The axis is signed so that its first non-zero component, in the order x, y, z, is positive,
symcrys's own rule for a list without a lattice (Thomas, 2026-11-24), and the sense refers to that sign; a component smaller than the tolerance
counts as zero, so that a matrix with rounding errors keeps the sign of its axis. A matrix that is
not orthogonal, or whose rotation part does not turn by 360°/n with n = 1, 2, 3, 4, 6 (its trace
1 + 2 cos θ not an integer), is a RangeError, both within `tolerance` as for `pointGroupOf`.

## Lattice basis and orbits

**Operations in the lattice basis.** The matrix W of each operation (`matrix`, "Operations") is
the operation in the conventional basis a, b, c (hexagonal or rhombohedral axes, as the setting has
them, for the trigonal classes): W = B⁻¹·R·B, with B the basis of `latticeBasis` (columns a, b, c;
for rhombohedral axes a_R, b_R, c_R, "Cartesian frame") and R the Cartesian matrix (`cartesian`).
W acts on the coordinates of a lattice direction [uvw].

The matrices W do not depend on the cell angles: a point operation maps the lattice onto itself, and its
matrix in the lattice basis is the same for every metric the point group allows (2 along b is
diag(−1, 1, −1) for every β). So they exist for every family, the monoclinic and triclinic ones
included, where a, b, c are taken along x, y, z as for the Wyckoff positions (maintainer,
2026-11-21, #24). They are, in order, the matrices of ITA's general position
(6th ed., Table 3.2.3.2): its coordinate triplets are the rows of W. Cartesian matrices of a real
monoclinic or triclinic cell need the cell parameters and belong to the geometry of a crystal
(#24 item 4).

**Orbits.** `orbit(key, { hkl } | { uvw }, options)` gives the orbit of a face (hkl) or of a lattice
direction [uvw] exactly, in integers: the distinct faces (directions), in the order in which the
operations reach them, each with the indices of the operations that map the given one onto it. A
direction transforms with W, a face with the inverse transpose, h′ = W⁻ᵀ·h (Miller indices are
coordinates in the reciprocal basis). The two differ in the hexagonal family: under the threefold
rotation of class 3, [100] goes to [010], (100) to (1̄10). Indices for hexagonal axes are three,
without i = −(h + k). The number of entries is the multiplicity, and the
first entry is the given face with its site symmetry. For the general face (321) the orbit is
ITA's general form in the order of the general position; ITA prints the faces in that order for 14
of the 16 entries with hexagonal axes, for 6/m and 6mm with the third and fourth rows
exchanged, and for 32, 3m and -3m with rhombohedral axes with the row of the second coset shifted
by one (`references/itc/vol-a-table-3.2.3.2-general-faces.md`).

`orbitOf(operations, direction, { tolerance })` does the same for a Cartesian direction (a face
normal, a pole) under any list of Cartesian operations, for instance those left after distorting a
crystal: the images of its unit vector, coinciding images merged when closer than `tolerance`
(default `EPSILON`, as for `siteSymmetryOf`; maintainer, 2026-11-21), each with the operations that
lead there. The list is not closed into a group. For a group and a face of a crystal form, `orbit`
and `orbitOf` give the same entries with the same operations.

## Cell, metric and indices

**Frame of a general cell.** `latticeFromParameters({ a, b, c, alpha, beta, gamma })` gives the
basis as the columns a, b, c of a Cartesian matrix: **a along x, b in the xy plane (y > 0), c towards
+z**, so z ∥ c\* (the usual orthogonalization of crystallography). It is right-handed, with
a = (a, 0, 0), b = (b cos γ, b sin γ, 0), c = (c cos β, c (cos α − cos β cos γ)/sin γ, V/(ab sin γ)). It
agrees with `latticeBasis` where that exists (hexagonal axes: b at 120° from a, c ∥ z) and holds
for the monoclinic settings (unique axis b: b ∥ y, c in the xz plane; unique axis c: c ∥ z; unique
axis a: a ∥ x, b and c in the yz plane). Chosen
by the maintainer's rule (2026-11-21) that symcrys follows the ITC standard and an application whose
frame differs converts in the application (stereography, for instance, rotates into its own frame).
Not checked against a printed page: the orthogonalization of ITA Vol. B is not yet read; a printed
difference would be corrected here.

**Metric and angles.** G = AᵀA (A the basis), the reciprocal basis B = A⁻ᵀ with a_i · a\*_j = δ_ij (no
factor 2π); the angle between directions is that of A·u and A·v, between planes (hkl) that of the
reciprocal vectors B·h. A plane angle is that of the **normals**, so 180° minus the interior dihedral
angle of two faces. Angles come from the arc tangent of cross and dot product, so equal vectors give
exactly 0°.

**Valid cells.** Three angles belong to a cell if each lies in (0°, 180°) and
1 − cos²α − cos²β − cos²γ + 2 cos α cos β cos γ > 0 (the volume is V = abc·√ of it). `isValidCell` has
the optional `minVolumeRatio`, default 0: the library accepts what is mathematically a cell; an
application that wants to avoid nearly flat cells passes its own limit (stereography 0.1).

**Residual operations.** `residualOperations(operations, basis, { tolerance })` keeps the operations
whose matrix W in the lattice basis (`matrix`, as `operations` gives it) has WᵀGW = G; a matrix that
is not integer is refused, so that a Cartesian matrix passed as `matrix` gives an error, not a wrong
answer (#94). The
deviation is relative to the largest entry of G, so the unit of the lengths does not matter; the
default is `EPSILON`.

**Indices.** (hkl) ↔ (hkil) with i = −(h + k); [uvw] → [UVTW] with U = (2u − v)/3, V = (2v − u)/3,
T = −(U + V), W = w, scaled to the smallest integers, and back with u = U − T, v = V − T, w = W,
reduced. `zoneAxis(h1, h2)` is the reduced cross product h₁ × h₂ (zone law hu + kv + lw = 0), so its
sign follows the order of the planes; parallel planes give `undefined` (never `null`, #137 C4).

**Change of the coordinate system** (#120, #137 G2, 0.12). `changeOfCoordinates({ linearPart,
originShift }, quantities, { tolerance })` changes the coordinate system by the pair (P, p) of ITA
2016 § 1.5.1.3 (p. 83): the new basis is (a′, b′, c′) = (a, b, c)·P (the columns of P are the new basis
vectors in the old basis) and the new origin lies at p in the old coordinates. It transforms each
quantity given, by ITA's equations (§ 1.5.2, pp. 83–85): point coordinates x′ = P⁻¹(x − p) (eq.
(1.5.1.7)), vector coefficients such as directions [uvw]′ = P⁻¹[uvw] (eq. (1.5.2.3)), Miller indices
(hkl)′ = (hkl)P (eq. (1.5.2.2)), the metric tensor G′ = PᵀGP (eq. (1.5.2.4)), and operations
W′ = P⁻¹WP, w′ = P⁻¹(w + (W − I)p) (eqs. (1.5.2.12), (1.5.2.13)); hu + kv + lw is invariant, and the
origin shift changes neither vectors, indices nor the metric. It also gives the inverse pair
(Q, q) = (P⁻¹, −P⁻¹p), which takes the new coordinates back. det P may be negative (ITA calls a
positive one preferable, § 1.5.1.2, p. 76); a singular P is refused. P, p and the operations are
read each number as the simplest fraction within the tolerance (0.3333333 is 1/3, 0.0625 is 1/16)
and transformed exactly, so that W′ is exactly integral and every result, the inverse pair included,
can be passed back (Thomas, 2026-11-25); an operation with det W ≠ ±1, or whose W′ is not integral
(the new basis spans no lattice that the operation maps onto itself), is refused. A transformed
operation is `{ matrix, translation }` alone, its translation w′ not reduced modulo the lattice, as
ITA writes it; other fields of an operation record (`cartesian`, `timeReversal`) are not carried
over. The plane has the same function with 2 × 2 matrices (`symcrys/plane`). The
matrices P of named changes (ITA Table 1.5.1.1: cell choices, centrings, rhombohedral ↔ hexagonal)
are not tabulated here; the caller passes them.

## Tensors

`tensorForm(key, spec, options)` gives the form of a property tensor under a point group, a
crystal class or a magnetic point group: which Cartesian components it may have and how they depend
on each other. `tensorFormOf(operations, spec)` does the same for any list of operations (closed
into a group first), e.g. the site symmetry of a surface normal from `siteSymmetry`. In place of
`spec`, both take the name of a property ("Named properties" below).

**Kind of tensor** (`TensorSpec`, #137 E1, E2): `rank` 0 to 4; `kind` `'polar'` (transforms with
R) or `'axial'` (with det(R)·R; ITC calls the behaviour under inversion "parity", under which a polar
vector is odd, so the field is not named `parity`); in the magnetic API `timeParity` `'even'` or
`'odd'` (ITC Vol. D: time-even, time-odd; a time-odd tensor changes sign under an operation with
time reversal), while a specification of the crystallographic API has no time parity and means a
time-even tensor ("Two entry points"); and `intrinsic`, the symmetry of the tensor under
permutation of its own indices, independent of the crystal, named descriptively with its symbol in
Jahn symbol as Gallego et al. (_Acta Cryst._ A75, 438 (2019), pp. 439–440) write it after Jahn
(1949) in the TSDoc of `IntrinsicSymmetry`: `'none'`,
`'symmetric-first-pair'`, `'symmetric-last-pair'` (the index symmetry of SHG and of the
piezoelectric tensor; at rank 2 both mean a symmetric tensor), at rank 4 `'symmetric-pairs'` (both
pairs symmetric, not interchangeable: electric-quadrupole SHG, photoelasticity) and
`'symmetric-pairs-exchangeable'` (the pairs interchangeable too: elastic stiffness, the symmetry
Voigt's notation uses), at rank 2 `'antisymmetric'`, and from rank 2 `'totally-symmetric'` (SHG
under Kleinman's condition). An index symmetry that does not apply at the rank is an error, and so
is a specification with the names of Birss and of symcrys before 0.11 (`parity`, `'i'`/`'c'`,
`'ij'`, `'jk'`, `'ij_kl'`, `'voigt'`), which names the current ones.

**Components** are numbered by a flat index: indices (i₁, …, iₙ) with x, y, z = 0, 1, 2 give
i₁·3ⁿ⁻¹ + … + iₙ, the first index varying slowest (the order of a NumPy array of shape (3,)·n in C
order). For rank 3, xyz is 0·9 + 1·3 + 2 = 5.

**The form** (`TensorForm`) is plain numbers (CLAUDE.md, "Tensors"):

- `basis`: the allowed tensors as the span of rows of length 3ⁿ, in reduced row echelon form: one
  row per free parameter, 1 at its own component and 0 at the components of the other parameters.
  Every allowed tensor is Σₖ pₖ·basis[k], pₖ the value of component `parameters[k]`. The form is
  unique for the span, so it does not depend on how the span was found.
- `parameters`: the free parameters as index lists (`[0, 1, 1]` for xyy), one per basis row: each is
  the lowest component that is independent of those before it (the pivot). This is symcrys's rule,
  not ITC's choice (#137 E3): the tables of ITC Vol. D name the components of a form by other
  criteria, sometimes others for the same span (e.g. Λ₂₂ where symcrys gives xxy); the span, and so
  the number of parameters and every relation between components, is the same. A rule rather than
  a table per group and tensor keeps every form reproducible.
- `relations`: one row r per component that is not a parameter, with r·t = 0 for every allowed
  tensor t: t_c − Σₖ basis[k][c]·t_{parameters[k]} = 0. A row with a single 1 says the component
  vanishes.

Relation strings (`\chi_{xxx} = -\chi_{xyy}`), Nye diagrams and LaTeX are presentation and stay
in the applications; they follow from these numbers.

**Voigt's notation** (#137 E3, 0.12). `toVoigt(tensor, spec, { factors })` writes a tensor with
symmetric index pairs in the two-index notation of ITC Vol. D § 1.1.4.10 (pp. 24–27), and
`fromVoigt(voigt, spec, { factors })` takes it back. Each contracted pair ij becomes α = 1…6 for 11,
22, 33, 23, 31, 12 (eq. (1.1.4.6)). The shape follows the specification: a symmetric tensor of rank 2
gives 6 components; one of rank 3 symmetric in its last pair a 3 × 6 matrix (d_iα), in its first pair
a 6 × 3 matrix (e_αk); one of rank 4 with symmetric pairs a 6 × 6 matrix; a specification without a
symmetric pair is refused. ITC defines the components with α = 4, 5, 6 per quantity: as the sum of
the two symmetric components (factor 2: the strain, S₄ = 2S₂₃; the piezoelectric d, d_iα = d_ijk +
d_ikj; the piezomagnetic Λ, Λ_i4 = 2Λ_i23, eq. (1.5.7.4); the compliances s and the electrostriction
Q on both pairs, eq. (1.1.4.12)), or as one component (factor 1: the stress, the piezoelectric e,
the stiffnesses c, the elasto-optic p); the piezo-optic π has 1 on its first pair and 2 on its
second. So the specification does not fix the factors, and the caller gives one per pair
(`factors: [2]`, `[2, 2]`, `[1, 2]`; decided by Thomas on 2026-11-25). Only `'piezomagnetic'` takes
ITC's factors by default (`[2]`, eq. (1.5.7.4)); `'piezoelectric'` has none, since its tensor is
also the susceptibility of second-harmonic generation, which ITC contracts without the factor 2
(`[1]`; § 1.7.2.2.1.3, p. 185, eq. (1.7.2.41): χ₂₅ multiplies e_x e_z + e_z e_x), while the
piezoelectric d takes `[2]` (Thomas, 2026-11-25, after the review). A tensor that lacks the index symmetry of its specification, or a Voigt array that is no
tensor of it, is refused, within the tolerance relative to its largest component. Gallego et al.
(2019, p. 440) use unity factors throughout; symcrys follows ITC.

**Settings.** A tensor form is Cartesian, so it depends on the setting (above, "Settings"): for `2`
the polar vector lies along y in the default setting (unique axis b) and along z in setting 2 (unique axis c).

**Time reversal** (magnetic API). An operation with time reversal changes the sign of a time-odd tensor.
The 32 white groups have none, so their time-odd forms equal their time-even forms. A grey group contains time reversal
itself, so all its time-odd tensors vanish, and its time-even forms are those of its class. This is Birss's
reading (pp. 84, 102): the grey groups are the groups of non-magnetic crystals; the
32 groups without time reversal (the white groups: "Types") are, like the 58 black-and-white
groups, groups of magnetic crystals, the limiting case in which time reversal does not occur. Litvin (_Acta Cryst._ A**64**, 419 (2008), p. 419) says the
same of the space groups: a group without time inversion is also the invariance group of an
arrangement of non-zero magnetic moments, while the product of a group with the time-inversion
group is not a magnetic group, because time inversion as an element excludes such moments. Paufler
(_Physikalische Kristallographie_, 1986, § 4.3.2, pp. 60–62, Table 4.5) divides the 122 groups the
same way, 32 grey (non-magnetic) and 32 + 58 = 90 magnetically ordered, and asks that, where
magnetic properties are discussed, a non-magnetic crystal be given the grey symbol (rock salt
m3m1′, low quartz 321′), to avoid confusion with the magnetic group of the same class.
In a black-and-white group the time-even forms are those of the crystal class in the same frame, and
the time-odd forms are those of two other crystal classes, possibly in a rotated frame, which Birss's
Table 7 names (pp. 109–110): polar time-odd (Birss's `c`) tensors of odd rank and axial ones of even rank have the
form of the time-even (`i`) tensors of his group A (eq. (3.24): the operations without time reversal and
those with time reversal times the inversion), the others that of the time-even tensors of the
other kind of his group B. The
table prints a symbol class in parentheses where the frame is rotated.

**Named properties.** A physical property that a group allows if and only if a tensor of a certain
kind does not vanish has a name in `TENSOR_PROPERTIES`: name → kind of tensor (`spec`), what the
tensor relates (`description`) and the print source of the definition (`source`).

| Name                | Tensor                                 | Property                                             |
| ------------------- | -------------------------------------- | ---------------------------------------------------- |
| `'pyroelectric'`    | rank 1, polar, even                    | spontaneous polarization                             |
| `'ferroaxial'`      | rank 1, axial, even                    | ferroaxial (ferro-rotational) order: an axial vector |
| `'piezoelectric'`   | rank 3, polar, even, symmetric in j, k | P_i = d_ijk T_jk                                     |
| `'gyrotropic'`      | rank 2, axial, even, symmetric         | optical activity: the gyration tensor g_ij           |
| `'ferromagnetic'`   | rank 1, axial, odd                     | spontaneous magnetization (also ferri-, weak ferro-) |
| `'ferrotoroidic'`   | rank 1, polar, odd                     | spontaneous toroidal moment                          |
| `'magnetoelectric'` | rank 2, axial, odd                     | linear magnetoelectric effect, P_i = α_ij H_j        |
| `'piezomagnetic'`   | rank 3, axial, odd, symmetric in j, k  | M_i = Λ_ijk T_jk                                     |

`allowsProperty(key, name)` is true if the form is not zero, `allowedProperties(key)` lists the
names a group allows, in the order of the table; `allowsPropertyOf(operations, name)` and
`allowedPropertiesOf(operations)` do the same for any list of operations. None depends on the
setting. `tensorForm(key, 'piezoelectric')` is the form of the tensor the name stands for.
The crystallographic API has the four time-even names, the magnetic API all eight ("Two entry
points"). In the magnetic API a key of type `'I'` is the white group, the symmetry of a
magnetically ordered crystal ("Types"): `'432'` is magnetoelectric. **A crystal without magnetic
order has the grey group of its class** (`"4321'"`; quartz `"321'"`), which allows none of the four time-odd
properties; for the four time-even ones a class, its grey group and the black-and-white groups of
the class agree. `rotateTensor` takes a name as well.
Each kind of tensor has one name: second-harmonic generation has the tensor of
`'piezoelectric'` and is asked for by that name or by its specification. Symmetry only allows a
property: `'ferromagnetic'` says that a spontaneous magnetization is compatible with the group, not
that the crystal is a ferromagnet. Counted over the 122 groups: pyroelectric 31, piezoelectric 66,
gyrotropic 47 (each twice the 10, 20 and 15 classes of ITA Table 3.2.2.1, plus 11, 26 and 17
black-and-white groups); ferromagnetic 31, ferrotoroidic 31, magnetoelectric 58, piezomagnetic 66,
none of them a grey group (ITC Vol. D Tables 1.5.2.4, 1.5.8.1 with footnote 3 on p. 140, 1.5.7.1).

The names follow the terms of the print sources: ITC Vol. D for the time-odd properties and for
`'gyrotropic'` (§ 1.1.4.10.7.2, the gyration tensor; ITA Table 3.2.2.1, p. 738, titles the same 15
classes "optical activity"), ITA and ITC Vol. D for `'pyroelectric'` and `'piezoelectric'`. The
four ferroic vectors are those Gallego et al. list (_Acta Cryst._ A75, 438 (2019), p. 440): P of
type V (`'pyroelectric'`), M of type aeV (`'ferromagnetic'`), the polar toroidal moment T of type aV
(`'ferrotoroidic'`) and the axial toroidal moment A of type eV (`'ferroaxial'`).

**Ferrotoroidic.** A spontaneous toroidal moment is a polar vector that changes sign under time
reversal; ITC Vol. D uses the word for its domains ("ferrotoroidic domains", § 1.5.4.3, p. 128).
ITC Vol. D does not tabulate it, but footnote 3 of § 1.5.8.1 (p. 140) names its groups:
the magnetoelectric tensor "does not need to be symmetric for 31 of the 58 point groups" of Table
1.5.8.1, and "these 31 groups coincide with those that admit a spontaneous toroidal moment". Its
antisymmetric part is the dual of a time-odd polar vector, so the two agree by construction; the
print anchor is the table: the 31 groups whose printed matrix is not symmetric
(`itcMagnetic.reference.test.ts`). In the magnetic API only.

**Ferroaxial** (not a term of ITC; #137 E4). A crystal is ferroaxial if its symmetry allows an axial vector that does not change
sign under time reversal, e.g. a net rotation of structural units about an axis (NiTiO₃, class
`-3`). The tensor is that of `'ferromagnetic'` with the other time parity, so the 13 classes are
the white groups among the 31 ferromagnetic groups: `1`, `-1`, `2`, `m`, `2/m`, `4`, `-4`, `4/m`,
`3`, `-3`, `6`, `-6`, `6/m`, the classes whose short Hermann–Mauguin symbol (the key) has a single position; the
vector lies along that symmetry direction (any direction in `1` and `-1`). Seven of them are neither polar nor enantiomorphic (`-1`,
`2/m`, `-4`, `4/m`, `-3`, `-6`, `6/m`). Over the 122 groups: 43 (13 classes, their 13 grey groups,
17 black-and-white groups). The name is that of Hlinka, Privratska, Ondrejkovic & Janovec, _Phys.
Rev. Lett._ **116**, 177602 (2016); Gallego et al. (2019, p. 440) call the vector the axial toroidal
moment. ITC Vol. D does not tabulate the property, so the print anchor
of the classes is Birss: Table 4a (pp. 56–57) gives each class its form of an axial tensor of odd
rank, Table 4c (p. 58) that form at rank 1. The name is `'ferroaxial'` and not "axial" (maintainer,
2026-11-20): "axial" already names the kind of a tensor (`kind: 'axial'`), and five of the
eight properties have an axial tensor.

**Rotation.** `rotateTensor(tensor, R, spec)` gives the components in a frame rotated by the
orthogonal matrix R (rows: the new axes in the old frame), with the factor det(R) for an axial
tensor. For the form at a surface: the site symmetry of the normal (`siteSymmetry`), its form
(`tensorFormOf`), and the basis rotated into a frame with z along the normal. Both functions take
Cartesian matrices only and throw for a matrix that is not orthogonal within the tolerance (e.g. one
in the lattice basis).

**Numbers.** The form is computed in floating point: each component's unit tensor, symmetrised over
the index symmetry, is averaged over the group, and the averages are row-reduced (pivot threshold
10⁻⁷; for operations of a caller, see "Tolerances"). An entry of the result within 10⁻⁹ of a multiple of 1/12 is set to it, as matrices are
snapped ("Numbers" above): for the 32 classes in all their settings every entry of every form is 0,
±1/2, ±1 or ±2, which then come out exact; other values, e.g. in a rotated frame, are kept.

**Print anchors.** Birss's Tables 4a–4f (pp. 56–66) for ranks 0 to 4, polar and axial, as a second
print check: the forms of the ITC default setting carried into Birss's frame
(`testUtils/birssFrame.ts`). The ITC anchor: ITA Table 3.2.2.1 (counts of three tensors and the direction
of the pyroelectric vector, in the ITC default setting); ITC Vol. D § 1.1.4.10.7 (the full forms of
axial tensors of rank 2, general and symmetric, in the ITC default setting and, for the monoclinic
classes, also with the axis along z); ITC Vol. D § 1.1.4.10.6 (`'symmetric-pairs'` and `'symmetric-pairs-exchangeable'` tensors of
rank 4 in the ITC default setting: the numbers of independent components and the full forms of the
6 × 6 matrices of p, π, Q, c and s, 29 diagrams for the classes, with the factors 2 and 4 that the two-index notation
gives π, Q and s, and the element 66 of the trigonal and hexagonal classes, ⊗, as ½(p₁₁ − p₁₂),
π₁₁ − π₁₂, 2(Q₁₁ − Q₁₂), ½(c₁₁ − c₁₂), 2(s₁₁ − s₁₂)). ITC Vol. D § 1.1.4.10.6.7 (i) prints the cubic class m-3 as
`3m`, a misprint. Index symmetries: Yariv's Table 16.1 (rank 3,
`'symmetric-last-pair'`, all 21 noncentrosymmetric classes; it prints d_ijk without the Voigt factor 2, so its 3×6
grid is the tensor itself; the panels Yariv calls the standard orientation are the ITC default
settings), Hoshi et al. (1995) (rank 4, `'symmetric-pairs'`, 6/mmm and 6mm, with Hoshi's tracelessness Q_ii = 0
added to the form). The surface use case of #30 is checked against Yariv: an m-3m crystal has no SHG in
the bulk, its (001), (110) and (111) surfaces have the forms of 4mm, mm2 and 3m with 3, 5 and 4
independent components.

Magnetic point groups, second print check: Birss's Table 7 (pp. 103–108) names for each of the 58
black-and-white groups the symbol class of Tables 4b–4f for i- and c-tensors, polar and axial, of
even and odd rank; all ranks 0 to 4 of the ITC forms are compared in Birss's frame, a class in
parentheses in a frame rotated against it (Birss p. 110). Two rows of the table, `(-6'2m')` and `-6m'2'`, lack parentheses;
both are recorded printing errors of the book (found in birss-app; errata with their reasons in
`references/birss/table-7.md`), and the tests apply the corrections. The ITC anchor: ITC Vol. D Table 1.5.2.4 (the 31 ferromagnetic
groups and the direction of M_s), Table 1.5.7.1 (the piezomagnetic matrix Λ_iα of 66 groups, with
Λ_i4 = 2Λ_i23 and so on, eq. (1.5.7.4)) and Table 1.5.8.1 (the magnetoelectric tensor of 58 groups).
A printed form belongs to the orientation its symbol names (ITC Vol. D § 1.5.7.1, p. 134: x, y, z
along the entries of an orthorhombic symbol; z, x, y along those of a trigonal or hexagonal one),
so each printed symbol, those in square brackets included, is compared in the setting that has this
ITC symbol, and so are the second trigonal orientations the text of § 1.5.8.1 names (312, 31m, …).

## Plane groups

The 17 plane groups and the 10 plane point groups are in a third entry point, `symcrys/plane` (in
Python `symcrys.plane`), with the names of the other entry points where the notion is the same
(maintainer, 2026-11-22, #31). They follow ITA (6th ed., 2016), Chapter 2.2 for the plane groups and
Table 3.2.1.1 (p. 720) for the point groups.

**Keys.** The short symbols ITA prints: `'p1'` … `'p6mm'` for the plane groups, in ITA's order, and
`'1'`, `'2'`, `'m'`, `'2mm'`, `'4'`, `'4mm'`, `'3'`, `'3m'`, `'6'`, `'6mm'` for the plane point groups,
in the order of Table 3.2.1.1. The two sets do not overlap: a plane group's symbol begins with its
lattice letter. `3m` has two settings, `3m1` (setting 1, the default) and `31m` (setting 2), as ITA
describes the trigonal groups with hexagonal axes in two orientations and says so for the plane
point group (Ch. 3.2, p. 721, item (d)); the other groups have one. `settings(key)` lists them,
`symbol(key, { setting })` gives the symbol of one. `symbol` takes the key of a plane group too
(#137 F4): its short symbol, the key, or in the form `'full'` the full symbol with its positions
separated by spaces, as the other entry points write full symbols (Thomas, 2026-11-24): `p 1 m 1`
for `pm`, where ITA prints `p1m1`, and `p 2 m g`. ITA prints no other full symbol for a plane point
group ("The full Hermann–Mauguin symbol, if different, is given below the short symbol", Ch. 3.2,
p. 721; Table 3.2.3.1 gives none), so its full form is its symbol with the positions spaced:
`3 m 1`, `2 m m`.

**Lattice basis.** Everything is in the basis a, b of the conventional cell: an operation is
`{ matrix, translation }` with x ↦ W·x + w, W a 2 × 2 matrix with integer entries; a point, a vertex
and the ends of a line are coordinates x, y. Inside, translations and coordinates are exact
fractions; at the API they are numbers (1/3 as the nearest double). No metric is needed: a plane
group fixes the type of its lattice, not its parameters.

**Operations.** A plane group has one operation per coset of the integer translations, with its
translation in [0, 1): first the general position as ITA numbers it, then, for `cm` and `c2mm`, the
same sequence with the centring (1/2, 1/2) added, as ITA prints the "(1/2,1/2)+ set". The
generators are ITA's selected generators without the identity and the integer translations, the
centring first. A plane point group has the linear parts of its symmorphic plane group, in the same
order (pm for `m`, p3m1 and p31m for the settings of `3m`), so that the point group of a plane group
is the set of its linear parts; this is checked for all 17 plane groups, also for those that are not
symmorphic (`pg`, `cm`, `p4gm`, …).

**Descriptions.** `describeOperations` describes each operation as ITA does under "Symmetry
operations": its kind (`'identity'`, `'translation'`, `'rotation'`, `'reflection'` or
`'glide-reflection'`, as ITA names the operations in Table 2.1.2.1, p. 145), the n and sense of a rotation, the centre of a rotation, the direction of a line and one point of
it (on y = 0, or on x = 0 for a line along a), and the glide vector (w + W·w)/2. An operation whose
glide vector is a non-zero lattice vector is a glide, as it is geometrically. A reflection or glide
reflection also carries its `axis`, the normal of its line, a symmetry direction of ITA Table 2.1.3.1
(p. 151), under the name the axis of an operation has in the point groups (#137 C3, where the `axis`
of a reflection is the normal of its plane), with the sign of its Seitz symbol (ITA 2016 Tables
1.4.2.4, 1.4.2.5, p. 53: m₁₀, m₁₂, m₂₁; #107, #114): the shortest integer vector along W − I, first
non-zero component positive, which gives the printed Seitz direction for every operation of the 17
groups (tested). Without a metric it is not
the perpendicular of the direction: in a hexagonal basis the line along [10] has the normal [12]. The
normals of a group are the printed symmetry directions at the positions where its full symbol has
`m` or `g` (tested for all 17), so they say to which position of the symbol a line belongs; the lines
of `symmetryElements` carry them too (maintainer, 2026-11-22, #84). `describeOperationsOf` describes
any list of operations of the plane in the same way, such as a product of operations, an operation
shifted by a lattice translation or the operations of a site symmetry; it reads each translation as
a fraction with a denominator of at most 12 (within the tolerance, default 10⁻⁶) and refuses a matrix that is not the linear
part of a plane point group (maintainer, 2026-11-22, #84).

**Points.** `siteSymmetry`, `wyckoffPosition` and `orbit` take the key of a plane group and a point
in the lattice basis (`orbit` gives each image as `{ point, operations }`, with the indices of the
operations that map the point there, as the orbits of the point groups do; #137 C4), with an
optional `tolerance` measured per coordinate modulo the lattice (default 10⁻⁶, below 1/2). They
answer one question with one criterion (#137 F1, #108; Thomas, 2026-11-24): on which Wyckoff
position does the point lie? `wyckoffDistances(key, point, { basis })` gives the numbers: for every
printed position, in printed order, the nearest point of its point set (the printed coordinates with
every centring and lattice translation: a point, a line or the plane) and the distance to it, per
lattice coordinate (the larger of |Δx| and |Δy| modulo the lattice, the metric of the tolerance)
without a basis, Euclidean with a basis (columns a, b). `wyckoffPosition` is the most special
position within the tolerance (the smallest multiplicity), the nearest among positions of equal
multiplicity; the general position always holds the point, so letter and oriented symbol are ITA's.
`siteSymmetry` sets the point onto that position and gives its site symmetry there, and `orbit` the
images of that point, so the three never disagree. The distance to a position, not the distance of
the images, decides: at a mirror line the two differ by a factor of 2 (the image of a point at
distance d lies 2d away), so a point 0.012 from the mirror of pm lies on it at the tolerance 0.02,
although its image is 0.024 away. Snapping a dragged point (which position wins, within which radius
on screen) is a policy of the application, built on `wyckoffDistances`. "Most special" means the
smallest multiplicity, so at a large tolerance a line can win against a point of the same
multiplicity (c2mm: 4c, a point, against 4d and 4e, lines).

**The cell.** `asymmetricUnit` gives ITA's printed block "Asymmetric unit" as data (#137 F3): the
printed inequalities a·x + b·y ≤ c, all of them in printed order, also bounds that hold no edge
(p3: x ≤ 2/3, y ≤ 2/3; a double inequality and a `min` give one each), and the convex polygon they
bound, its vertices counter-clockwise from the lowest and per edge the index of the inequality that
holds it. `symmetryElements` gives the symmetry elements as ITA describes them (#137 F2): each once
modulo the lattice translations, the centring (1/2, 1/2) included (cm: the mirror line 0,y and the
glide line 1/4,y, as ITA lists them), every rotation point in [0, 1)² with the highest n of a rotation
about it (`rotationPoints`, ITA Table 2.1.2.1: the rotation point is the symmetry element of a
rotation in the plane), and every mirror and glide line as a point and a direction, the point where
it crosses y = 0 (x = 0 for a line along a), of the translates the one with that point in [0, 1)
nearest to 0; a glide line carries its glide vector s·direction with 0 < s < 1 (in a plane group
s = 1/2). With a box (its two corners; a line or a point of the plane too) it gives all
lattice translates that meet the box, boundary included, the lines not clipped: p2 has four
twofold points modulo the lattice and nine in the closed cell [0, 1]²; a box with more than a
million rotation points is refused. Clipping and drawing are left to the application.

**Lattices and cells** (#119, #137 G5, 0.12). `planeGroup(key)` gives the Bravais lattice
(`bravaisLattice`: `'mp'`, `'op'`, `'oc'`, `'tp'`, `'hp'`, the family symbol of ITA Table 2.1.1.1
followed by the lattice letter of the group) and the Patterson symmetry as the headline of the
group prints it (`pattersonSymmetry`, a plane group: `'p2mm'` for `p2mg`, `'c2mm'` for `cm`,
`'p6mm'` for `p3m1`). `pointGroup(key)` of a plane point group gives its Laue class (`laueClass`):
the point group with the twofold rotation added, the symmetry centre of the plane ("its Laue class
is obtained if a symmetry centre is added to its point group", ITA § 3.2.1.1, p. 720), one of the
six Laue classes 2, 2mm, 4, 4mm, 6, 6mm. `cellRestrictions(system)` gives the restrictions of
Table 2.1.1.1 for the conventional cell as data: the parameters to be determined (`['a']` for
square), the pairs of equal parameters (`[['a', 'b']]`), the fixed angles (`{ gamma: 120 }`) and the
angles conventionally taken non-acute (γ of the oblique system, the footnote of the table). The cell
functions have the names of the other entry points, for 2 × 2 matrices whose columns are a and b:
`latticeFromParameters({ a, b, gamma })` (a along x, b at γ from a towards +y),
`latticeParameters(basis)`, `metricTensor(basis)` and `reciprocalBasis(basis)` (a_i · a*_j = δ_ij).

**Not yet.** The positions and edge forms of the plane point groups (ITA Table 3.2.3.1, #81) and
the determination of the plane group of a pattern (a later MINOR, #31).

## Sources

| What                                                                                                                                         | Print source                                                                                                                                                                                                                                                                                                      | Test                                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Crystal classes, second print check: operations in the ITC frame (`testUtils/birssFrame.ts`), Birss's symbols, Schoenflies, orders           | Birss Table 3 (pp. 36–38), generating matrices eq. (2.17) (pp. 48–49): `references/birss/`                                                                                                                                                                                                                        | `birss.reference.test.ts`                                                                               |
| ITC symbols of the settings                                                                                                                  | ITA Table 3.2.3.2 (headlines, pp. 745–769); ITC Vol. D Table 1.5.2.3 for monoclinic full symbols; the symbol rule (positions: ITA § 2.1.3.4, p. 151; `1` for a direction without symmetry: 5th ed. § 2.2.4.1 (iv), p. 18; monoclinic full symbols: § 2.1.3.15, p. 171) for `2mm`, `m2m` and unique axis c         | `itc.reference.test.ts`                                                                                 |
| ITC operations of every setting                                                                                                              | the general positions of ITA Table 3.2.3.2 (pp. 745–769), in the frame of #6; `2mm`, `m2m`, which ITA does not list: their ITC symbol along the symmetry directions of ITA Table 2.1.3.1 (p. 151)                                                                                                                 | `itcGeneralPositions.reference.test.ts`, `itc.reference.test.ts`                                        |
| ITC default settings                                                                                                                         | see "Settings" above                                                                                                                                                                                                                                                                                              | `itcSettings.fixtures.ts`                                                                               |
| centrosymmetric, polar, enantiomorphic, Laue class, holohedry, lattice systems, Schoenflies                                                  | ITA Table 1.3.4.1 (p. 39, lattice systems and holohedries), Table 2.1.1.1 (p. 143, Laue groups and holohedries), Table 3.2.2.1 (p. 738), Table 3.2.3.2                                                                                                                                                            | `properties.reference.test.ts`, `itc.reference.test.ts`                                                 |
| symmetry directions                                                                                                                          | ITA Table 2.1.3.1 (p. 151)                                                                                                                                                                                                                                                                                        | `symmetryDirections.reference.test.ts`                                                                  |
| signs of the axes of operations (Seitz symbols)                                                                                              | ITA 6th ed. Tables 1.4.2.1–1.4.2.5 (pp. 52–53): `references/itc/vol-a-2016-tables-1.4.2-seitz.md`                                                                                                                                                                                                                 | `seitz.reference.test.ts`                                                                               |
| ITC: order of the operations, generators                                                                                                     | ITA's selected generators, ITA 5th ed. (2006), Part 7 (pages in `references/itc/vol-a-2006-symmetry-operations.md`), § 2.2.11 (iv) p. 27, § 8.3.5 p. 737, giving the numbering of Table 3.2.3.2                                                                                                                   | `elements.reference.test.ts`                                                                            |
| Magnetic groups, ITC: keys, crystal system, Schoenflies and full symbols, operators of the default setting                                   | ITC Vol. D (2013) Table 1.5.2.3 (pp. 111–112): `references/itc/vol-d-table-1.5.2.3.md`; grey groups: eq. (1.5.2.1), p. 110                                                                                                                                                                                        | `magnetic.reference.test.ts`                                                                            |
| Magnetic groups, second print check: operations of the ITC default setting in the ITC frame, classical subgroup, Birss's symbols             | Birss Table 6 (pp. 91–98) with the generating matrices of eq. (2.17) (pp. 48–49): `references/birss/table-6.md`                                                                                                                                                                                                   | `magnetic.reference.test.ts`                                                                            |
| Magnetic groups: symbols of all settings, grey groups, axes of trigonal, hexagonal and cubic operations                                      | derived: each symbol read along the symmetry directions of ITA Table 2.1.3.1, a prime meaning time reversal                                                                                                                                                                                                       | `magnetic.reference.test.ts`                                                                            |
| operations described (kind, n, axis, sense)                                                                                                  | the symmetry operations of the symmorphic P space groups, ITA 5th ed. (2006), Part 7, one per ITC setting (pages in `references/itc/vol-a-2006-symmetry-operations.md`); symbols as defined in § 11.1.2, pp. 810–811; numbering checked against the general positions of Table 3.2.3.2                            | `elements.reference.test.ts`, `elements.test.ts`                                                        |
| Wyckoff positions (letter, multiplicity, oriented site symmetry, representative point and face)                                              | ITA Table 3.2.3.2 (pp. 745–769): `references/itc/vol-a-table-3.2.3.2-wyckoff-positions.md`; the oriented symbols read along ITA Table 2.1.3.1 (p. 151); `2mm`, `m2m`: derived (above); additional check against the 5th ed. (2006), Table 10.1.2.2, by `audit/wyckoff-2006`                                       | `wyckoff.reference.test.ts`                                                                             |
| crystal forms: the forms of each Wyckoff position, basic and limiting; the 47 forms with number of faces and eigensymmetry                   | ITA Table 3.2.3.2 (pp. 745–769): `references/itc/vol-a-table-3.2.3.2-face-forms.md`; ITA Table 3.2.1.3 (pp. 724–726): `references/itc/vol-a-table-3.2.1.3-crystal-forms.md`, the two checked against each other; additional check against the 5th ed. (2006), Tables 10.1.2.2 and 10.1.2.3, by `audit/forms-2006` | `crystalForms.reference.test.ts`                                                                        |
| operations in the lattice basis; orbits of directions and faces                                                                              | ITA Table 3.2.3.2 (pp. 745–769): the general positions, `references/itc/vol-a-table-3.2.3.2-general-positions.md`; the faces of the general form for hexagonal axes (pp. 752–764), `references/itc/vol-a-table-3.2.3.2-general-faces.md`                                                                          | `orbits.reference.test.ts`                                                                              |
| the point group of a list of operations                                                                                                      | none needed: the groups are built from the operations of the 122 groups (anchored above) and, independently, from the full symbols of the 32 classes along Cartesian directions, in a general orientation                                                                                                         | `identify.test.ts`                                                                                      |
| tensor forms, second print check: ITC forms carried into Birss's frame                                                                       | Birss Tables 4a–4f (pp. 56–66): `references/birss/table-4a.md` … `table-4f.md`                                                                                                                                                                                                                                    | `tensors/birss.reference.test.ts`                                                                       |
| tensor forms, ITC: counts, pyroelectric direction, piezoelectric classes                                                                     | ITA Table 3.2.2.1 (p. 738)                                                                                                                                                                                                                                                                                        | `tensors/itc.reference.test.ts`                                                                         |
| ferroaxial classes (axial vector, time-even)                                                                                                 | Birss Table 4a (pp. 56–57) with Table 4c (p. 58): `references/birss/`; the term: Hlinka, Privratska, Ondrejkovic & Janovec, _Phys. Rev. Lett._ **116**, 177602 (2016)                                                                                                                                             | `tensors/tensorProperties.test.ts`                                                                      |
| rank 3, `'symmetric-last-pair'` (SHG, piezoelectric d_ijk): cells, classes, signs; the forms at m-3m surfaces                                | Yariv, _Quantum Electronics_, 2nd ed. (Wiley, 1975), Table 16.1 (pp. 410–411): `references/yariv/table-16.1.md`                                                                                                                                                                                                   | `tensors/yariv.reference.test.ts`, `tensors/tensorForm.test.ts`                                         |
| rank 4, `'symmetric-pairs'` (electric-quadrupole SHG) for 6/mmm, 6mm                                                                         | Hoshi et al., Phys. Rev. B 52, 12355 (1995), Eqs. (11)–(12): `references/hoshi/eqs-11-12.md`                                                                                                                                                                                                                      | `tensors/hoshi.reference.test.ts`                                                                       |
| ITC: axial tensors of rank 2 (forms); rank 4 `'symmetric-pairs'`, `'symmetric-pairs-exchangeable'` (counts and forms)                        | ITC Vol. D (2013) § 1.1.4.10.7 (pp. 29–31), § 1.1.4.10.6 (pp. 27–29): `references/itc/vol-d-*.md`                                                                                                                                                                                                                 | `tensors/itcVolD.reference.test.ts`                                                                     |
| tensor forms of the magnetic groups, second print check (ITC forms in Birss's frame): i- and c-tensors, ranks 0 to 4; associated groups A, B | Birss Table 7 (pp. 103–108): `references/birss/table-7.md`, with Tables 4a–4f; grey groups: p. 102                                                                                                                                                                                                                | `tensors/birssMagnetic.reference.test.ts`                                                               |
| ferromagnetic, piezomagnetic, magnetoelectric: the groups and the forms, ITC convention                                                      | ITC Vol. D (2013) Table 1.5.2.4 (p. 113), Table 1.5.7.1 (p. 135, conventions p. 134), Table 1.5.8.1 (p. 139, text p. 140): `references/itc/vol-d-table-1.5.*.md`                                                                                                                                                  | `tensors/itcMagnetic.reference.test.ts`                                                                 |
| orthorhombic settings: one for every orientation of the axes; the six orientations of `2'm'm`                                                | counted by hand; Paufler (1986) Table A 6, rows 12–20 (p. 316): `references/paufler/table-a6-orthorhombic.md`; the symbols of `2'm'm` in Birss Table 6, ITC Vol. D Tables 1.5.2.3, 1.5.2.4, 1.5.7.1, 1.5.8.1 and Paufler                                                                                          | `pointGroups/magnetic.reference.test.ts`, `tensors/itcMagnetic.reference.test.ts`                       |
| the three types of magnetic point groups; which describes a non-magnetic crystal                                                             | Birss (1966) pp. 84, 102; Litvin, _Acta Cryst._ A**64**, 419 (2008), p. 419; Paufler, _Physikalische Kristallographie_ (Akademie-Verlag, Berlin, 1986), pp. 60–62                                                                                                                                                 | `tensors/birssMagnetic.reference.test.ts` (classes: c-forms equal i-forms; grey groups: c-forms vanish) |
| the two entry points: a time-even question has one answer for a class, its white group and its grey group                                    | none needed: the same operations (Birss pp. 84, 102, as the row above); checked by comparing the two entry points                                                                                                                                                                                                 | `entryPoints.test.ts`                                                                                   |
| named tensor properties: the kind of tensor behind each name                                                                                 | ITC Vol. D (2013) §§ 1.1.4.4.2, 1.1.4.4.3 (p. 12), 1.1.4.10.7.2 (p. 30), 1.5.2.1 (p. 113), 1.5.7.1 (p. 134), 1.5.8.1 (pp. 139–140); the `source` of each entry of `TENSOR_PROPERTIES`                                                                                                                             | `tensors/tensorProperties.test.ts`                                                                      |
| plane groups: general position, generators, centring, origin, asymmetric unit, Wyckoff positions                                             | ITA 6th ed. (2016), Chapter 2.2 (pp. 176–192): `references/itc/vol-a-2016-plane-groups.md`; additional check against the 5th ed. (2006), Part 6 (pp. 92–109), by `audit/plane-groups-2006`                                                                                                                        | `spaceGroups/planeGroups.reference.test.ts`                                                             |
| plane groups: description of the operations                                                                                                  | the block "Symmetry operations" of the same pages, both sets of the centred groups; symbols as in ITA § 2.1.3.9 (pp. 160–161); normals: ITA Table 2.1.3.1 (p. 151), `references/itc/vol-a-table-2.1.3.1-plane.md`, with the full symbols                                                                          | `spaceGroups/describe.reference.test.ts`                                                                |
| plane groups: site symmetry, orbit and Wyckoff position of a point                                                                           | the Wyckoff positions of the same pages: every printed point of every position                                                                                                                                                                                                                                    | `spaceGroups/positions.reference.test.ts`                                                               |
| plane groups: asymmetric unit, symmetry elements in the cell                                                                                 | the printed vertices and inequalities, the Wyckoff positions (centres and mirror lines) and the printed glides of the same pages; all lines also derived from the printed general position                                                                                                                        | `spaceGroups/cell.reference.test.ts`                                                                    |
| plane groups: finding a group by its short or full symbol (`findPlaneGroup`)                                                                 | the short and full symbols of the same pages                                                                                                                                                                                                                                                                      | `spaceGroups/planeGroups.reference.test.ts`                                                             |
| change of the coordinate system: P⁻¹, points, vectors, indices, metric, operations                                                           | ITA 6th ed. (2016), Chapter 1.5: the worked examples of pp. 75–90 (F → P, zircon, GeTe, P2₁/c, I4₁/amd) and rows of Table 1.5.1.1 (pp. 77, 79): `references/itc/vol-a-2016-1.5-transformations.md`                                                                                                                | `coordinates.reference.test.ts`                                                                         |
| plane lattices: crystal families, Bravais lattices, restrictions on the cell, Laue classes; Patterson symmetry                               | ITA 6th ed. (2016), Table 2.1.1.1 (p. 143), block "Two dimensions": `references/itc/vol-a-table-2.1.1.1.md`; § 3.2.1.1 (p. 720); the headlines of Chapter 2.2                                                                                                                                                     | `spaceGroups/planeLattice.reference.test.ts`                                                            |
| plane point groups: keys, settings of `3m`, operations                                                                                       | ITA 6th ed. (2016), Table 3.2.1.1 (p. 720), Ch. 3.2, p. 721, item (d); operations: the linear parts of the plane groups (above)                                                                                                                                                                                   | `plane.test.ts`                                                                                         |

Each file in `references/` names its source and the printed page. ITA means Vol. A, 6th edition
(2016), unless the 5th edition (2006) is named: its space-group tables are the source for the
symbols of the operations.
