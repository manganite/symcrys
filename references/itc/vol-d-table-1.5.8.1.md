# ITC Vol. D Table 1.5.8.1: the forms of the tensor characterizing the linear magnetoelectric effect

Source: _International Tables for Crystallography_, Vol. D, 2nd edition (2013), Chapter 1.5
(A. S. Borovik-Romanov, H. Grimmer, M. Kenzelmann, "Magnetic properties"), Table 1.5.8.1, printed
p. 139, with § 1.5.8.1, printed pp. 139–140. Transcribed 2026-11-20 from the volume in Thomas' Zotero
(item YQKTNYVN), read from page images at 200 and 450 dpi (the text layer of the PDF loses primes
and overbars), and compared with the list of groups in birss-app
(`docs/references/ITC-table-1.5.8.1-magnetoelectric-groups.md`).

The table lists 58 magnetic point groups in 11 blocks; the groups of a block share one matrix.

What the print fixes (§ 1.5.8.1):

- The tensor, eqs. (1.5.8.2) and (1.5.8.3): μ0* M_j = α_ij E_i and P_i = α_ij H_j; α_ij is an axial
  tensor of second rank whose components all change sign under time inversion (p. 140).
- Cartesian axes: as in Table 1.5.7.1 (`vol-d-table-1.5.7.1.md`); square brackets give other
  orientations of the same group with the same form. The trigonal groups are printed without the
  third entry; the text names the orientation meant and a second one with the same form (third
  table below).
- Counts (p. 140): 21 magnetic point groups have a centre of symmetry and forbid the effect; among
  the remaining 69 there are 11 more for which it is forbidden, named in the text (second table
  below); the remaining 58 are those of the table. (The 32 groups with time reversal as an element
  of its own are not among these 90.)

Transcription conventions: a leading minus sign for the overbar, an apostrophe for the prime. The
Schoenflies column is as printed, subscripts on the line; where the print puts several groups on a
line, each has its own row here. `a12` is α_12.

## Groups

| Block | Schoenflies | Hermann–Mauguin |
|---|---|---|
| 1 | C1 | 1 |
| 1 | Ci(C1) | -1' |
| 2 | C2 | 2 (= 121) |
| 2 | Cs(C1) | m' (= 1m'1) |
| 2 | C2h(C2) | 2/m' (= 1 2/m' 1) |
| 3 | Cs | m (= 1m1) |
| 3 | C2(C1) | 2' (= 12'1) |
| 3 | C2h(Cs) | 2'/m (= 1 2'/m 1) |
| 4 | D2 | 222 |
| 4 | C2v(C2) | m'm'2 [2m'm', m'2m'] |
| 4 | D2h(D2) | m'm'm' |
| 5 | C2v | mm2 |
| 5 | D2(C2) | 2'2'2 |
| 5 | C2v(Cs) | 2'mm' [m2'm'] |
| 5 | D2h(C2v) | mmm' |
| 6 | C4 | 4 |
| 6 | S4(C2) | -4' |
| 6 | C4h(C4) | 4/m' |
| 6 | C3 | 3 |
| 6 | S6(C3) | -3' |
| 6 | C6 | 6 |
| 6 | C3h(C3) | -6' |
| 6 | C6h(C6) | 6/m' |
| 7 | S4 | -4 |
| 7 | C4(C2) | 4' |
| 7 | C4h(S4) | 4'/m' |
| 8 | D4 | 422 |
| 8 | C4v(C4) | 4m'm' |
| 8 | D2d(D2) | -4'2m' [-4'm'2] |
| 8 | D4h(D4) | 4/m'm'm' |
| 8 | D3 | 32 |
| 8 | C3v(C3) | 3m' |
| 8 | D3d(D3) | -3'm' |
| 8 | D6 | 622 |
| 8 | C6v(C6) | 6m'm' |
| 8 | D3h(D3) | -6'm'2 [-6'2m'] |
| 8 | D6h(D6) | 6/m'm'm' |
| 9 | C4v | 4mm |
| 9 | D4(C4) | 42'2' |
| 9 | D2d(C2v) | -4'2'm [-4'm2'] |
| 9 | D4h(C4v) | 4/m'mm |
| 9 | C3v | 3m |
| 9 | D3(C3) | 32' |
| 9 | D3d(C3v) | -3'm |
| 9 | C6v | 6mm |
| 9 | D6(C6) | 62'2' |
| 9 | D3h(C3v) | -6'm2' [-6'2'm] |
| 9 | D6h(C6v) | 6/m'mm |
| 10 | D2d | -42m |
| 10 | D2d(S4) | -4m'2' |
| 10 | D4(D2) | 4'22' |
| 10 | C4v(C2v) | 4'm'm |
| 10 | D4h(D2d) | 4'/m'm'm |
| 11 | T | 23 |
| 11 | Th(T) | m'-3' |
| 11 | O | 432 |
| 11 | Td(T) | -4'3m' |
| 11 | Oh(O) | m'-3'm' |

## Matrices

| Block | Row 1 | Row 2 | Row 3 |
|---|---|---|---|
| 1 | a11 a12 a13 | a21 a22 a23 | a31 a32 a33 |
| 2 | a11 0 a13 | 0 a22 0 | a31 0 a33 |
| 3 | 0 a12 0 | a21 0 a23 | 0 a32 0 |
| 4 | a11 0 0 | 0 a22 0 | 0 0 a33 |
| 5 | 0 a12 0 | a21 0 0 | 0 0 0 |
| 6 | a11 a12 0 | -a12 a11 0 | 0 0 a33 |
| 7 | a11 a12 0 | a12 -a11 0 | 0 0 0 |
| 8 | a11 0 0 | 0 a11 0 | 0 0 a33 |
| 9 | 0 a12 0 | -a12 0 0 | 0 0 0 |
| 10 | a11 0 0 | 0 -a11 0 | 0 0 0 |
| 11 | a11 0 0 | 0 a11 0 | 0 0 a11 |

## Groups without a centre of symmetry for which the effect is forbidden

As named in the text of § 1.5.8.1, p. 140.

| Schoenflies | Hermann–Mauguin |
|---|---|
| C3h | -6 |
| C6(C3) | 6' |
| C6h(C3h) | 6'/m |
| D3h | -6m2 |
| D3h(C3h) | -6m'2' |
| D6h(D3h) | 6'/mmm' |
| D6(D3) | 6'22' |
| C6v(C3v) | 6'm'm |
| Td | -43m |
| O(T) | 4'32' |
| Oh(Td) | m'-3'm |

## Trigonal orientations with the same form

As named in the text of § 1.5.8.1, p. 140: "The tensor has the same form for 32 (= 321) and 312,
3m′1 and 31m′, −3′m′1 and −3′1m′; it also has the same form for 3m1 and 31m, 32′1 and 312′, −3′m1
and −3′1m."

| Symbol in the table | Orientation | Second orientation |
|---|---|---|
| 32 | 321 | 312 |
| 3m' | 3m'1 | 31m' |
| -3'm' | -3'm'1 | -3'1m' |
| 3m | 3m1 | 31m |
| 32' | 32'1 | 312' |
| -3'm | -3'm1 | -3'1m |
