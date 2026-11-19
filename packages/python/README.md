# symcrys for Python

Crystallographic symmetry calculations: the 32 crystallographic point groups with their settings
(ITC and Birss conventions), symbols, symmetry elements, site symmetry and Wyckoff positions, and
the forms of property tensors of rank 0 to 4 they allow, checked against print (ITC, Birss, Yariv).

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

SHG = {"rank": 3, "parity": "polar", "time_parity": "i", "intrinsic": "jk"}

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
