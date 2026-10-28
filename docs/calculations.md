# Calculation Reference

Engineering reference for flat-pattern development in Shell Rolling Master.
The eccentric (oblique) cone has its own specification:
[eccentric-cone.md](./eccentric-cone.md). This page is the shared neutral-fibre
model plus the cylinder and the straight cone.

All linear dimensions are in **millimetres**. Angles are in **degrees** unless noted.

Implementation sources:

- [`shared.ts`](../src/features/calculator/math/shared.ts) — validation and neutral diameters
- [`cylinder.ts`](../src/features/calculator/math/cylinder.ts) — cylinder development
- [`cone.ts`](../src/features/calculator/math/cone.ts) — straight-cone development and bounding box
- [`eccentric-cone.ts`](../src/features/calculator/math/eccentric-cone.ts) — oblique cone ([full write-up](./eccentric-cone.md))
- [`bend-lines.ts`](../src/utils/bend-lines.ts) — roll guide geometry for cylinder and straight cone

---

## 1. Neutral fibre

Plate bending develops along the **neutral fibre**, not the inner or outer surface. The K-factor \(K\) locates that fibre through the thickness \(t\):

- \(K \to 0\) → neutral fibre at the inner surface
- \(K = 0.5\) → mid-thickness
- \(K = 1\) → neutral fibre at the outer surface

The app accepts \(0 < K \le 1\). Exactly \(0\) is rejected with the other non-positive inputs ([user guide](./user-guide.md#validation-messages-common)).

The radial offset from the specified surface to the neutral diameter uses:

\[
\delta_{\text{ID}} = 2Kt, \qquad
\delta_{\text{OD}} = 2t(1 - K)
\]

### From inner diameter (ID)

\[
D_{\text{neutral}} = D_{\text{ID}} + 2Kt
\]

### From outer diameter (OD)

\[
D_{\text{neutral}} = D_{\text{OD}} - 2t(1 - K)
\]

For **cylinders**, a single neutral diameter is used (\(D_{2,n} = D_{1,n}\)).
For **both cone modes**, \(D_{1,n}\) (top) and \(D_{2,n}\) (bottom) are computed independently with the same \(K\) and \(t\). Height and, for the eccentric cone, the offset \(e\) are not shifted.

### Physical check

Thickness must remain smaller than each applicable neutral radius:

\[
t < R_{1,n}, \qquad t < R_{2,n}\ \text{(cone)}
\]

---

## 2. Cylinder development

Let \(D_n\) be the neutral diameter and \(g\) the weld gap.

### Neutral circumference

\[
C = \pi D_n
\]

### Flat blank

\[
L = C - g, \qquad W = H
\]

where \(H\) is the axial height (blank width).

### Validity

Require \(C > g\). Otherwise the seam gap exceeds the available developed length.

### Pattern shape

Axis-aligned rectangle centred at the origin:

- Width \(L\) along development (circumferential)  
- Height \(W = H\) along the axis  

Bounding box equals the rectangle (\(L \times H\)).

### Bend / roll lines

When enabled with count \(n \ge 1\):

\[
\text{step} = \frac{L}{n + 1}
\]

Guide lines are placed at equal intervals along \(L\), spanning the full blank height.

---

## 3. Cone (frustum) development

Neutral end radii:

\[
R_1 = \frac{D_{1,n}}{2}, \qquad R_2 = \frac{D_{2,n}}{2}
\]

Reject the case when \(|D_{1,n} - D_{2,n}| < 1\,\text{mm}\) (use cylinder mode).

### Slant height

\[
\Delta R = |R_2 - R_1|, \qquad
s = \sqrt{(\Delta R)^2 + H^2}
\]

### Pattern radii

\[
R_{\text{large}} = \max(R_1, R_2), \qquad
R_{\text{small}} = \min(R_1, R_2)
\]

\[
r_{\text{out}} = \frac{s\, R_{\text{large}}}{R_{\text{large}} - R_{\text{small}}}, \qquad
r_{\text{in}} = r_{\text{out}} - s
\]

The flat blank is an **annular sector** with outer radius \(r_{\text{out}}\) and inner radius \(r_{\text{in}}\).

### Sector angle

Nominal (closed) development angle:

\[
\theta_{\text{initial}} = 360^\circ \cdot \frac{R_{\text{large}}}{r_{\text{out}}}
\]

Gap is removed as arc length along the **pattern neutral** radius (consistent with subtracting \(g\) from the cylinder’s neutral circumference):

\[
r_{\text{neutral,pattern}} = \frac{r_{\text{out}} + r_{\text{in}}}{2}
\]

\[
\theta_{\text{gap}} = \frac{g}{r_{\text{neutral,pattern}}} \cdot \frac{180^\circ}{\pi}
\]

\[
\theta = \theta_{\text{initial}} - \theta_{\text{gap}}
\]

Require \(\theta > 0\). If \(\theta > 360^\circ\), the calculation remains valid but the pattern overlaps (console warning).

### Minimum bounding rectangle

1. Sample sector vertices and arcs (~1°).
2. Search rotations \(0^\circ\)–\(90^\circ\) in \(1^\circ\) steps; refine ±1° at \(0.5^\circ\).
3. Choose the orientation with minimum axis-aligned bounding-box **area**.
4. If the best fit is portrait (\(h > w\)), add \(90^\circ\) to force **landscape** stock orientation.
5. Add manufacturing padding:

\[
\text{CUT\_MARGIN} = 10\,\text{mm}
\]

Reported sheet width/height = bounding box + margin.  
**DXF geometry does not include this margin** — it is for stock / nesting guidance only.

### Bend / roll lines (cone)

Guides are spaced along the neutral arc of the developed sector:

\[
L_{\text{neutral,arc}} = \frac{\theta}{360} \cdot 2\pi\, r_{\text{neutral,pattern}}, \qquad
\text{step} = \frac{L_{\text{neutral,arc}}}{n + 1}
\]

---

## 4. 3D solid offsets (viewer & STEP)

Shared solid helper (`src/utils/shell-solid-geometry.ts`):

| Surface | Radial offset from neutral |
|---------|----------------------------|
| Inner | \(K \cdot t\) inward |
| Outer | \((1 - K) \cdot t\) outward |

Seam gap angle (radians):

\[
\alpha_{\text{gap}} = \frac{g}{\max(R_{1,n}, R_{2,n})}
\]

The shell spans \(2\pi - \alpha_{\text{gap}}\) with the seam centred at \(90^\circ\) (\(\pi/2\)).

That gap angle is for the revolved cylinder and straight cone only. The eccentric cone removes \(\Delta\varphi = 2g / (R_{\text{bottom}} + R_{\text{top}})\) and places the seam on a chosen ruling ([eccentric cone § 2.4](./eccentric-cone.md#24-weld-gap)).

Viewer meshes for the revolved modes use 64 segments. The eccentric preview uses 128. Cylinder and straight-cone STEP solids are a revolved trapezoidal profile minus a wedge. The eccentric solid is a ruled loft ([eccentric cone § 5.3](./eccentric-cone.md#53-step)).

---

## 5. What is not modelled

| Topic | Status |
|-------|--------|
| Laser / plasma / waterjet kerf | Not implemented |
| Springback / residual stress | Not modelled |
| Multi-pass roll sequences | Guide lines only; no machine-specific CNC |
| Material database / automatic K | Manual K-factor input |
| Closed shells (no seam) | Gap may be 0; cylinder and straight-cone STEP stay an open-seam construction. An eccentric cone with gap 0 is a closed solid ([eccentric cone § 5.3](./eccentric-cone.md#53-step)) |

---

## 6. Worked outline (cylinder)

Given OD \(D = 2000\), \(t = 15\), \(K = 0.44\), \(H = 2500\), \(g = 2\):

\[
D_n = 2000 - 2\cdot15\cdot(1-0.44) = 2000 - 16.8 = 1983.2\,\text{mm}
\]

\[
L = \pi \cdot 1983.2 - 2 \approx 6228.41\,\text{mm}, \qquad W = 2500\,\text{mm}
\]

The same inputs are the worked example in [`cylinder.test.ts`](../src/features/calculator/math/cylinder.test.ts) and on the [documentation page](https://cadautoscript.com/docs/utilities/cylindrical-shell-rolling). Change the three together.

---

## 7. Eccentric cone

An eccentric cone uses the neutral diameters from § 1, then develops the ruled surface between

\[
A(\varphi) = (R_{\text{bottom}}\cos\varphi,\ R_{\text{bottom}}\sin\varphi,\ 0), \qquad
B(\varphi) = (e + R_{\text{top}}\cos\varphi,\ R_{\text{top}}\sin\varphi,\ H)
\]

with \(R_{\text{top}} = D_{1,n}/2\) and \(R_{\text{bottom}} = D_{2,n}/2\). \(D_1\) is the **top** diameter in the UI, the PDF and the tests.

The flat pattern is the integral of an isometry ODE (RK4), not a sum of chords. Edge lengths come out as \(R\cdot\Delta\varphi\). The weld gap is one angular slice whose **mean** opening on the two edges equals \(g\):

\[
\Delta\varphi = \frac{2g}{R_{\text{bottom}} + R_{\text{top}}}
\]

The blank size is the exact minimum-area rectangle of that contour plus the 10 mm cutting margin. Area, mass, seam presets, the station table, DXF layers and the STEP loft are specified in [eccentric-cone.md](./eccentric-cone.md). Equal neutral diameters with \(e = 0\) are rejected; \(e = 0\) with unequal diameters must match § 3.
