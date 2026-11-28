# Reference

Every function is documented once, in the TSDoc comments of the TypeScript sources. The TypeScript
reference is generated from them by TypeDoc; the docstrings of the Python package are written from
them by fixed rules (names in snake_case, an options object as keyword arguments, `RangeError` as
`SymcrysError`) and add only what Python alone has, the shapes and types of the NumPy arrays.

- <a href="../ts/index.html">TypeScript reference</a> (TypeDoc): `symcrys`, `symcrys/magnetic` and `symcrys/plane`.
- [Python reference](python.md): `symcrys`, `symcrys.magnetic` and `symcrys.plane`.

What the functions of a list of operations (`…Of`) read, whether generators suffice and what their
tolerance measures: [Functions of a list of operations](../lists.md).

```{toctree}
:hidden:

python
```
