# symcrys for Python

Crystallographic symmetry calculations: the 32 crystallographic and the 90 magnetic point groups
with their settings (ITC and Birss conventions), symbols and symmetry elements, and for the
crystallographic point groups site symmetry, Wyckoff positions and the forms of property tensors of
rank 0 to 4 they allow, checked against print (ITC, Birss, Yariv).

This package is the TypeScript library [symcrys](https://github.com/manganite/symcrys) of the same
version, run in an embedded JavaScript engine ([quickjs-ng](https://pypi.org/project/quickjs-ng/)).
The results are those of the TypeScript library (up to rounding in the last bit of a float); the names follow a fixed rule (`tensorForm` →
`tensor_form`), and matrices and vectors are NumPy arrays.

```bash
pip install symcrys
```

## Example: second-harmonic generation at a surface

```python
import numpy as np
import symcrys

SHG = {"rank": 3, "parity": "polar", "intrinsic": "jk"}

symcrys.tensor_form("m-3m", SHG)["basis"].shape   # (0, 27): no SHG from the bulk

ops = symcrys.operations("m-3m")
site = symcrys.site_symmetry(ops, [1, 1, 1])      # symmetry of the (111) surface normal
form = symcrys.tensor_form_of([ops[i] for i in site["operations"]], SHG)
form["parameters"]                                # 4 free components (3m)

# The same form in a frame with z along the normal and x along a mirror normal:
z = np.array([1, 1, 1]) / np.sqrt(3)
x = np.array([1, -1, 0]) / np.sqrt(2)
frame = np.array([x, np.cross(z, x), z])
basis = np.array([symcrys.rotate_tensor(b, frame, SHG) for b in form["basis"]])
chi = basis.reshape(-1, 3, 3, 3)                  # chi[k] is the k-th basis tensor chi_ijk
```

A property has a name where its tensor has one (`symcrys.TENSOR_PROPERTIES`):
`symcrys.allows_property("432", "piezoelectric")` is `False`, `symcrys.allowed_properties("32")` is
`["piezoelectric", "gyrotropic"]`, and `symcrys.tensor_form("32", "piezoelectric")` is the form of
that tensor. What is fixed once the group is named is a key of `symcrys.point_group("32")`:
`crystal_system`, `order`, `centrosymmetric`, `polar`, `chiral`, `laue_class`.

## Crystal classes and magnetic point groups

`symcrys` is the crystallographic API: the 32 crystal classes, without time reversal.
`symcrys.magnetic` is the magnetic API: the 122 magnetic point groups, under the same function
names, with `time_reversal` in an operation and `time_parity` in a tensor specification. The module
decides how a key is read: in `symcrys`, `"32"` is a crystal class, that of quartz; in
`symcrys.magnetic` it is a white group, the symmetry of a magnetically ordered crystal, and quartz
has the grey group `"321'"`.

```python
from symcrys import magnetic

magnetic.allowed_properties("321'")    # ['piezoelectric', 'gyrotropic']: quartz
magnetic.allowed_properties("32")      # the white group: also 'magnetoelectric', 'piezomagnetic'
magnetic.allowed_properties("m'm'2")   # six of the seven names: all but 'ferroaxial'
magnetic.tensor_form("m'm'2", "ferromagnetic")["parameters"]   # [[2]]: M_s along z
```

A question that involves time reversal (a magnetic key, a time-odd tensor or property, an operation
with time reversal) raises `SymcrysError` in `symcrys`.

A tensor form has `basis` (rows of length 3**rank in reduced row echelon form, components in C
order, so `reshape((3,)*rank)` gives the tensor), `parameters` (the free components as index
lists) and `relations` (rows r with r @ t = 0). Each call costs about a millisecond or more: fetch
forms and operations once, then compute with NumPy.

## Documentation

- Conventions, frames and the print sources of every result:
  [docs/conventions.md](https://github.com/manganite/symcrys/blob/main/docs/conventions.md).
- Functions: the docstrings here, and the TypeScript API they call (same names in camelCase).
- Errors from the library raise `symcrys.SymcrysError`, a subclass of `ValueError`.

Python 3.10 or later. quickjs-ng has no wheel for macOS on Intel; pip builds it from source there
(a C compiler is needed). Licence: MIT.
