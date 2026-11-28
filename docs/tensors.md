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

A specification is a Jahn symbol in words. Gallego et al. (_Acta Cryst._ A75, 438 (2019), pp.
439–440) write the kind of tensor after Jahn (1949) as a prefix e (axial) and a (magnetic, i.e.
time-odd) before the index part, square brackets for symmetric and curly brackets for antisymmetric
indices: the magnetoelectric tensor is aeV², the piezomagnetic tensor aeV[V²], the elastic tensor
[[V²][V²]]. `kind: 'axial'` is the e, `timeParity: 'odd'` the a, and `intrinsic` the index part
(ITC Vol. D § 1.9.2, p. 232, names Jahn's nomenclature as well):

| `intrinsic`                      | Ranks | Jahn symbol | Index symmetry                                               |
| -------------------------------- | ----- | ----------- | ------------------------------------------------------------ |
| `'none'`                         | 0–4   | Vⁿ          | none                                                         |
| `'symmetric-first-pair'`         | 2–4   | [V²]V…      | the first two indices interchangeable                        |
| `'symmetric-last-pair'`          | 2–4   | V…[V²]      | the last two interchangeable (piezoelectric effect, SHG)     |
| `'symmetric-pairs'`              | 4     | [V²][V²]    | each pair symmetric (photoelasticity, quadrupole SHG)        |
| `'symmetric-pairs-exchangeable'` | 4     | [[V²][V²]]  | each pair symmetric and the pairs interchangeable (elastic)  |
| `'antisymmetric'`                | 2     | {V²}        | t<sub>ij</sub> = −t<sub>ji</sub>                             |
| `'totally-symmetric'`            | 2–4   | [Vⁿ]        | every index interchangeable (SHG under Kleinman's condition) |

Jahn (1949) writes [V²]² and [[V²]²] for the two rank-4 symmetries. The symbols for transport and
optical tensors with a star ([V²]\*), whose behaviour under time reversal follows from Onsager's
theorem rather than from a time parity, are not in symcrys.

A specification with the names of Birss and of symcrys before 0.11 (`parity`, `'i'`/`'c'`, `'ij'`,
`'jk'`, `'ij_kl'`, `'voigt'`) is an error that names the current ones.

Second-harmonic generation, for example, is `{ rank: 3, kind: 'polar', intrinsic: 'symmetric-last-pair' }`:
χ<sub>ijk</sub> = χ<sub>ikj</sub>. The index symmetries are explained in the reference
(`IntrinsicSymmetry`) and in [Conventions, "Tensors"](conventions.md#tensors).

## The result

A form has

- `basis`: the allowed tensors, in reduced row echelon form of their components by flat index with
  the first index slowest (xyz of rank 3 is 5); in TypeScript rows of length 3<sup>rank</sup>, in
  Python each tensor an array of shape (3, …, 3). Every allowed tensor is
  Σ<sub>k</sub> p<sub>k</sub> · basis[k];
- `parameters`: the free components as index lists, one per entry of `basis`, each the lowest
  component independent of those before it;
- `relations`: the constraints, one per component that is not a parameter, each r with
  Σ r · t = 0 over all components for every allowed tensor t; in TypeScript rows of length
  3<sup>rank</sup>, in Python each an array of shape (3, …, 3) like the basis tensors;
- `largestCoefficient` (Python `largest_coefficient`): the largest magnitude of a coefficient of the
  basis, 1 or 2 for a group in a setting, 0 if the tensor vanishes.

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

**A crystal in another frame.** The form of a list of operations is the same reduced row echelon
form, in the frame of the operations. For a frame that is nearly, but not exactly, aligned with a
symmetry element, its coefficients grow, the more the higher the rank: the polar axis of 4mm tilted
by 10⁻⁶ about y gives the basis tensor (1, 0, cot 10⁻⁶), its piezoelectric tensor tilted by 0.1
coefficients of about cot³ 0.1 ≈ 10³, and `largest_coefficient` says so. Such a basis amplifies
every error of a parameter by that factor.

```{code-cell} ipython3
import numpy as np

theta = 1e-6
tilt = np.array([[np.cos(theta), 0, np.sin(theta)], [0, 1, 0], [-np.sin(theta), 0, np.cos(theta)]])
ops = symcrys.operations("4mm")
tilted = [{"cartesian": tilt @ r @ tilt.T} for r in ops.cartesian]
symcrys.tensor_form_of(tilted, "pyroelectric")["largest_coefficient"]
```

The form computed in the frame of the setting, with exact entries, and rotated into the other frame
spans the same tensors with small coefficients. The rotated tensors are a basis, no longer in row
echelon form: their parameters are not components of the tensor.

```{code-cell} ipython3
form = symcrys.tensor_form("4mm", "pyroelectric")
symcrys.rotate_tensor(form["basis"], tilt, "pyroelectric")
```

## Named properties

A property that is the question whether a tensor is allowed has a name, an entry of
`TENSOR_PROPERTIES`. The name stands in for the specification in `tensorForm`, `tensorFormOf`,
`rotateTensor` and `rotateTensors`, and `allowsProperty`, `allowedProperties` (and their `…Of`
forms for a list of operations) answer whether symmetry allows it. Symmetry only allows a
property; whether a crystal shows it is a question of the material.

The table is made from `TENSOR_PROPERTIES` of this version; the source of each definition is in
[Conventions, "Named properties"](conventions.md#tensors):

```{tensor-properties}

```

Second-harmonic generation has the tensor of `'piezoelectric'` and so no name of its own.

```{code-cell} ipython3
symcrys.allows_property("432", "piezoelectric"), symcrys.tensor_form("-3", "ferroaxial")["parameters"]
```

In Voigt's notation, with ITC's factors, one per contracted index pair: `[2]` for the piezoelectric
d (d_iα = d_ijk + d_ikj), `[1]` for the susceptibility of second-harmonic generation, which has the
same tensor (ITC Vol. D § 1.7.2.2.1.3):

```{code-cell} ipython3
d = symcrys.tensor_form("3", "piezoelectric")["basis"][0]
symcrys.to_voigt(d, "piezoelectric", factors=[2]), symcrys.to_voigt(d, "piezoelectric", factors=[1])
```
