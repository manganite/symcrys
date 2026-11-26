# ITC Vol. D § 1.1.4.10 and eq. (1.5.7.4): Voigt's notation and its factors

Source: _International Tables for Crystallography_, Vol. D, 2nd edition (2013): Chapter 1.1
(A. Authier, "Introduction to the properties of tensors"), § 1.1.4.10.2 (stress and strain, p. 24),
§ 1.1.4.10.3 (third-rank tensors, pp. 24–25) and § 1.1.4.10.5 (fourth-rank tensors, pp. 26–27);
Chapter 1.5 (A. S. Borovik-Romanov, H. Grimmer, M. Kenzelmann, "Magnetic properties"), § 1.5.7.1,
eq. (1.5.7.4), p. 134; Chapter 1.7 ("Nonlinear optical properties"),
§ 1.7.2.2.1.3, p. 185. Transcribed on 2026-11-25;
checked again against print in the review of PR #174, which also pointed to p. 185.

Transcription conventions: indices as printed, subscripts written inline (`S23` for S₂₃, `d_ijk`);
Greek letters as printed (α, β); one printed relation per row. Where print writes a chain of
equalities (`S4 = 2S23 = 2S32`), the row keeps the chain.

## Voigt indices and the strain and stress tensors, § 1.1.4.10.2, p. 24

The strain tensor, eq. (1.1.4.6):

| Quantity | Relation |
|---|---|
| strain | S1 = S11 |
| strain | S2 = S22 |
| strain | S3 = S33 |
| strain | S4 = S23 + S32 |
| strain | S5 = S31 + S13 |
| strain | S6 = S12 + S21 |
| strain | S4 = 2S23 = 2S32 |
| strain | S5 = 2S31 = 2S13 |
| strain | S6 = 2S12 = 2S21 |

The stress tensor:

| Quantity | Relation |
|---|---|
| stress | T1 = T11 |
| stress | T2 = T22 |
| stress | T3 = T33 |
| stress | T4 = T23 = T32 |
| stress | T5 = T31 = T13 |
| stress | T6 = T12 = T21 |

## Third-rank tensors, § 1.1.4.10.3, pp. 24–25

| Quantity | Relation | Note |
|---|---|---|
| d (piezoelectric, P_i = d_ijk T_jk) | d_ijj = d_iα (α = 1, 2, 3) | p. 24 |
| d (piezoelectric, P_i = d_ijk T_jk) | d_ijk + d_ikj (j ≠ k) = d_iα (α = 4, 5, 6) | p. 24 |
| e (piezoelectric, T_ij = e_ijk E_k, eq. (1.1.4.8)) | e_αk = e_ijk | p. 25; "Submatrices 2 and 3 are equal" |

Beside the relation, p. 25 prints the e_αk matrix as the block column "(1 / 2+3)" (submatrix 1 above
the sum of the submatrices 2 and 3); taken literally the lower block would be 2e_ijk, which the
relation e_αk = e_ijk next to it does not give. Transcribed as printed; the tests read the relation.

The key to the diagrams of § 1.1.4.10.4, p. 25 (group 3): "⊙ means that the component is equal to
twice minus the value of the component to which it is linked for d_ijk and to minus the value of
the component to which it is linked for e_ijk".

## Fourth-rank tensors, § 1.1.4.10.5, p. 27

| Quantity | Relation | Note |
|---|---|---|
| s (elastic compliances), eq. (1.1.4.12) | i = j; k = l; s_αβ = s_iill | |
| s (elastic compliances), eq. (1.1.4.12) | i = j; k ≠ l; s_αβ = s_iikl + s_iilk | |
| s (elastic compliances), eq. (1.1.4.12) | i ≠ j; k = l; s_αβ = s_ijkk + s_jikk | |
| s (elastic compliances), eq. (1.1.4.12) | i ≠ j; k ≠ l; s_αβ = s_ijkl + s_jikl + s_ijlk + s_jilk | |
| c (elastic stiffnesses) | c_αβ = c_ijkl | |
| p (elasto-optic coefficients) | p_αβ = p_ijkl | |
| π (piezo-optic coefficients) | i = j; k = l; π_αβ = π_iill | |
| π (piezo-optic coefficients) | i = j; k ≠ l; π_αβ = π_iikl + π_iilk | |
| π (piezo-optic coefficients) | i ≠ j; k = l; π_αβ = π_ijkk = π_jikk | |
| π (piezo-optic coefficients) | i ≠ j; k ≠ l; π_αβ = π_ijkl + π_jikl = π_ijlk + π_jilk | |
| Q (electrostriction coefficients) | same relation as for the elastic compliances | |

## The piezomagnetic tensor, eq. (1.5.7.4), p. 134

| Quantity | Relation |
|---|---|
| Λ (piezomagnetic, μ₀*δM_i = Λ_ijk T_jk = Λ_iα T_α) | Λ_ij = Λ_ijj for j = 1, 2, 3 |
| Λ (piezomagnetic, μ₀*δM_i = Λ_ijk T_jk = Λ_iα T_α) | Λ_i4 = 2Λ_i23 |
| Λ (piezomagnetic, μ₀*δM_i = Λ_ijk T_jk = Λ_iα T_α) | Λ_i5 = 2Λ_i31 |
| Λ (piezomagnetic, μ₀*δM_i = Λ_ijk T_jk = Λ_iα T_α) | Λ_i6 = 2Λ_i12 |

## The susceptibility of second-harmonic generation, § 1.7.2.2.1.3, p. 185

Print: "The tensors χ⁽²⁾_μαβ(−2ω; ω, ω) or d⁽²⁾_μαβ(−2ω; ω, ω) are invariant with respect to (α, β)
permutation as a consequence of the intrinsic permutation symmetry. […] Therefore, these
third-rank tensors can be represented in contracted form as 3 × 6 matrices χ_μm(−2ω; ω, ω) and
d_μm(−2ω; ω, ω), where the suffix m runs over the six possible (α, β) Cartesian index pairs
according to the classical convention of contraction":

| Index | Contraction |
|---|---|
| μ | x → 1 |
| μ | y → 2 |
| μ | z → 3 |
| m | xx → 1 |
| m | yy → 2 |
| m | zz → 3 |
| m | yz = zy → 4 |
| m | xz = zx → 5 |
| m | xy = yx → 6 |

Example, eq. (1.7.2.41): P_y⁽²⁾(2ω) = ε₀ χ₂₅(−2ω; ω, ω)[e_x⁺(ω)E⁺(ω)e_z⁻(ω)E⁻(ω) + e_z⁺(ω)E⁺(ω)e_x⁻(ω)E⁻(ω)].

