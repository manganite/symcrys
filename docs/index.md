# symcrys

Crystallographic symmetry calculations: the 32 crystal classes and the 122 magnetic point groups,
with their settings, symbols, symmetry elements, site symmetry, Wyckoff positions and crystal forms,
and the forms of the property tensors (rank 0 to 4) they allow. The results are checked against print, the
_International Tables for Crystallography_ (ITC) and Birss, _Symmetry and Magnetism_ (1966), and,
where print leaves a choice open, against birss-app.

One implementation, two packages of the same version:

| Language                | Install               | Import                               |
| ----------------------- | --------------------- | ------------------------------------ |
| TypeScript / JavaScript | `npm install symcrys` | `symcrys`, `symcrys/magnetic`        |
| Python ≥ 3.10           | `pip install symcrys` | `import symcrys`, `symcrys.magnetic` |

The TypeScript library has no dependencies and runs unbundled in browsers and in Node. The Python
package runs the same library in an embedded JavaScript engine, so the results agree; names follow a
fixed rule (`tensorForm` → `tensor_form`), and matrices are NumPy arrays.

Where to start:

- [Getting started](getting-started.md): the first calls, in both languages.
- [Two readings of a key](readings.md): crystal class or magnetic point group, `symcrys` or
  `symcrys/magnetic`.
- [Conventions](conventions.md): ITC and Birss, settings, the Cartesian frame. Which convention and
  which setting you need decides which tensor components you get.
- [Crystal forms and orbits](forms.md): the basic and limiting forms of each crystal class, as ITA
  lists them, and the orbits of faces and directions.
- [Tensors and named properties](tensors.md): forms of property tensors, and the named properties
  such as piezoelectric or ferromagnetic.
- [Examples](examples.md), among them second-harmonic generation at surfaces.
- [Reference](reference/index.md): every function, for TypeScript and for Python.

symcrys is the computational core of the crystallography teaching apps
([stereography](https://github.com/manganite/stereography),
[plane-groups](https://github.com/manganite/plane-groups)) and of
[birss-app](https://github.com/manganite/birss-app). Source, issues and changes:
[github.com/manganite/symcrys](https://github.com/manganite/symcrys). Licence: MIT.

```{toctree}
:hidden:
:maxdepth: 2

getting-started
readings
conventions
forms
tensors
examples
reference/index
```
