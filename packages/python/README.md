# symcrys for Python

Crystallographic symmetry calculations: the 32 crystal classes and the 122 magnetic point groups
with their settings as ITC gives them, symbols, symmetry elements, site symmetry and the
forms of property tensors of rank 0 to 4 they allow, and for the crystal classes Wyckoff positions
and crystal forms; the 17 plane groups with their operations, Wyckoff positions, asymmetric unit
and symmetry elements; checked against print (ITC, Birss, Yariv).

This package is the TypeScript library [symcrys](https://github.com/manganite/symcrys) of the same
version, run in an embedded JavaScript engine ([quickjs-ng](https://pypi.org/project/quickjs-ng/)).
The results are those of the TypeScript library (up to rounding in the last bit of a float); the
names follow a fixed rule (`tensorForm` → `tensor_form`), and matrices and vectors are NumPy arrays.

```bash
pip install symcrys
```

```python
import symcrys
from symcrys import magnetic

SHG = {"rank": 3, "kind": "polar", "intrinsic": "symmetric-last-pair"}
symcrys.tensor_form("mm2", SHG)["parameters"]   # the free components: xxz, yyz, zxx, zyy, zzz
symcrys.allowed_properties("32")               # ['piezoelectric', 'gyrotropic']: quartz
magnetic.allowed_properties("321'")            # the same: quartz is the grey group in the magnetic API
magnetic.allowed_properties("m'm'2")           # six of the eight names, 'ferromagnetic' among them
```

`symcrys` is the crystallographic API (the 32 crystal classes, without time reversal),
`symcrys.magnetic` the magnetic API (the 122 magnetic point groups), under the same function names;
`symcrys.plane` the plane groups and plane point groups, in the lattice basis.

**Documentation:** [manganite.github.io/symcrys](https://manganite.github.io/symcrys/): getting
started, the two readings of a key, the conventions and their print sources, tensors and named
properties, the example notebook on second-harmonic generation at surfaces, and the reference.

Python 3.10 or later. quickjs-ng has no wheel for macOS on Intel; pip builds it from source there
(a C compiler is needed). Licence: MIT.
