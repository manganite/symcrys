---
file_format: mystnb
kernelspec:
  name: python3
  display_name: Python 3
---

# Two readings of a key

The 32 crystal classes are not simply the 32 white magnetic point groups. A key such as `'32'` has
two readings, and the entry point you import says which one you mean:

| Import                                  | Groups                                   | `'32'` is                                                                                     |
| --------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| `symcrys` (Python `symcrys`)            | the 32 crystal classes, no time reversal | the crystal class of quartz                                                                   |
| `symcrys/magnetic` (`symcrys.magnetic`) | the 122 magnetic point groups            | a white group: a magnetically ordered crystal whose symmetry contains no time reversal at all |

In a purely crystallographic application you work with crystal classes, and `'32'` is the class of
quartz. Where magnetism plays a part, a crystal without magnetic order has the **grey group** of its
class, the class combined with time reversal: quartz has `"321'"`. The white group `'32'` there
describes a magnetically ordered crystal, which allows time-odd properties that quartz does not
have.

## Quartz

```{ts-example} quartz.ts

```

The same in Python:

```{code-cell} ipython3
import symcrys
from symcrys import magnetic

print("crystal class 32:", symcrys.allowed_properties("32"))
print("grey group 321':", magnetic.allowed_properties("321'"))
print("white group 32:", magnetic.allowed_properties("32"))
```

The crystal class and the grey group allow the same properties: time reversal is a symmetry of the
grey group, so every time-odd tensor vanishes. The white group `'32'` in addition allows the
magnetoelectric and the piezomagnetic effect, which need magnetic order.

## Which one to use

- **Crystallography without magnetism** (morphology, stereographic projection, piezoelectricity,
  optical activity, second-harmonic generation of a non-magnetic crystal): `symcrys`, the crystal
  classes.
- **Magnetism** (magnetic order, magnetoelectric or piezomagnetic effect, time-odd tensors):
  `symcrys/magnetic`. A non-magnetic crystal is then its grey group (`"321'"`), a magnetically
  ordered one its white or black-and-white group (`'32'`, `"3'2'"`…).

A question that involves time reversal (a magnetic key, a time-odd tensor or property, an operation
with time reversal) is an error in the crystallographic API, because a wrong reading should fail
rather than answer. The rules, with their print sources (Birss p. 84; ITC Vol. D, Ch. 1.5), are in
[Conventions, "Two entry points"](conventions.md#two-entry-points).
