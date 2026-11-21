---
file_format: mystnb
kernelspec:
  name: python3
  display_name: Python 3
---

# Crystal forms

A crystal form is a set of faces that a point group makes equivalent. ITA (6th ed.) lists, for every
crystal class and every Wyckoff position, the forms that occur there: the **basic** form and the
**limiting** forms, which have the same face symmetry but a higher eigensymmetry. symcrys gives these
lists, in the ITC convention, together with ITA's table of the 47 forms (number, English name,
number of faces, eigensymmetry). The rules and the print anchors are in
[Conventions](conventions.md), "Crystal forms" and "Site symmetry and Wyckoff positions".

## TypeScript

```{ts-example} crystal-forms.ts

```

A form names its kind by its number in `CRYSTAL_FORM_TYPES`; an application that shows the names
in another language keeps its own table by these numbers.

## Python

```{code-cell} ipython3
import symcrys

for f in symcrys.crystal_forms("-43m"):
    form = symcrys.CRYSTAL_FORM_TYPES[f["form_type"] - 1]
    print(f["letter"], f["basic"], f["miller_indices"], f.get("condition", ""), form["name"])
```

Each form has a representative face with numbers, its Miller indices and its Cartesian unit normal
in the frame of the setting, e.g. to draw its pole or to compute its site symmetry:

```{code-cell} ipython3
f = symcrys.crystal_forms("-43m")[2]
f["representative"]["hkl"], f["representative"]["cartesian"]
```
