# Python reference

## `symcrys`: crystal classes

```{eval-rst}
.. automodule:: symcrys
   :members:
   :exclude-members: magnetic, plane
```

## `symcrys.magnetic`: magnetic point groups

```{eval-rst}
.. automodule:: symcrys.magnetic
   :members:
   :exclude-members: SymcrysError, SymcrysInternalError
```

`symcrys.magnetic.SymcrysError` and `symcrys.magnetic.SymcrysInternalError` are those of `symcrys`
above. The records (TypedDicts) and Literal types are each module's own, written with it from the
TypeScript types (a `PointGroup` of `symcrys.magnetic` has `type` and `crystal_class`).

## `symcrys.plane`: plane groups and plane point groups

```{eval-rst}
.. automodule:: symcrys.plane
   :members:
   :exclude-members: SymcrysError, SymcrysInternalError
```
