---
file_format: mystnb
kernelspec:
  name: python3
  display_name: Python 3
---

# Tensors and named properties

`tensorForm` (Python `tensor_form`) gives the form of a property tensor under a point group: which
components are allowed and how they are related. `tensorFormOf` does the same for any list of
operations, for instance the site symmetry of a surface normal.

## The kind of tensor

A tensor is given by its specification:

| Field        | Values                                | Meaning                                                               |
| ------------ | ------------------------------------- | --------------------------------------------------------------------- |
| `rank`       | 0 to 4                                | number of indices                                                     |
| `kind`       | `'polar'`, `'axial'`                  | an axial tensor changes sign under improper operations (factor det R) |
| `timeParity` | `'even'`, `'odd'` (magnetic API only) | a time-odd tensor changes sign under time reversal                    |
| `intrinsic`  | see below                             | the index symmetry                                                    |

The index symmetries, with their Jahn symbols (ITC Vol. D § 1.1.4.10):

| `intrinsic`                      | Ranks | Jahn symbol | Index symmetry                                               |
| -------------------------------- | ----- | ----------- | ------------------------------------------------------------ |
| `'none'`                         | 0–4   | Vⁿ          | none                                                         |
| `'symmetric-first-pair'`         | 2–4   | [V²]V…      | the first two indices interchangeable                        |
| `'symmetric-last-pair'`          | 2–4   | V…[V²]      | the last two interchangeable (piezoelectric effect, SHG)     |
| `'symmetric-pairs'`              | 4     | [V²]²       | each pair symmetric (photoelasticity, quadrupole SHG)        |
| `'symmetric-pairs-exchangeable'` | 4     | [[V²]²]     | each pair symmetric and the pairs interchangeable (elastic)  |
| `'antisymmetric'`                | 2     | {V²}        | t<sub>ij</sub> = −t<sub>ji</sub>                             |
| `'totally-symmetric'`            | 2–4   | [Vⁿ]        | every index interchangeable (SHG under Kleinman's condition) |

Up to 0.10 the fields were `parity` and `'i'`/`'c'`, and the index symmetries `'ij'`, `'jk'`,
`'ij_kl'`, `'voigt'`; a specification with these names is an error that names the new ones.

Second-harmonic generation, for example, is `{ rank: 3, kind: 'polar', intrinsic: 'symmetric-last-pair' }`:
χ<sub>ijk</sub> = χ<sub>ikj</sub>. The index symmetries are explained in the reference
(`IntrinsicSymmetry`) and in [Conventions, "Tensors"](conventions.md#tensors).

## The result

A form has

- `basis`: the allowed tensors as rows of length 3<sup>rank</sup>, in reduced row echelon form,
  components by flat index with the first index slowest (xyz of rank 3 is 5). Every allowed tensor
  is Σ<sub>k</sub> p<sub>k</sub> · basis[k];
- `parameters`: the free components as index lists, one per row of `basis`, each the lowest
  component independent of those before it;
- `relations`: rows r with r · t = 0 for every allowed tensor t.

```{code-cell} ipython3
import symcrys

form = symcrys.tensor_form("3m", {"rank": 3, "kind": "polar", "intrinsic": "symmetric-last-pair"})
form["parameters"]
```

The components depend on the frame, so on the **setting**: the default setting of `3m` is `3m1`,
setting 2 is `31m`, turned by 30° about z. The free components differ:

```{code-cell} ipython3
SHG = {"rank": 3, "kind": "polar", "intrinsic": "symmetric-last-pair"}
[symcrys.tensor_form("3m", SHG, setting=s)["parameters"][0] for s in ("3m1", "31m")]
```

Settings and frames: [Conventions, "Settings"](conventions.md#settings) and
[Conventions, "Cartesian frame"](conventions.md#cartesian-frame).

## Named properties

A property that is the question whether a tensor is allowed has a name, an entry of
`TENSOR_PROPERTIES`. The name stands in for the specification in `tensorForm`, `tensorFormOf` and
`rotateTensor`, and `allowsProperty`, `allowedProperties` (and their `…Of` forms for a list of
operations) answer whether symmetry allows it. Symmetry only allows a property; whether a crystal
shows it is a question of the material.

The table is made from `TENSOR_PROPERTIES` of this version:

```{tensor-properties}

```

Second-harmonic generation has the tensor of `'piezoelectric'` and so no name of its own.

```{code-cell} ipython3
symcrys.allows_property("432", "piezoelectric"), symcrys.tensor_form("-3", "ferroaxial")["parameters"]
```
