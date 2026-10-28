# Eccentric cone

Specification of the `eccentric-cone` mode in Shell Rolling Master: an oblique
(eccentric) truncated cone, its exact flat development, and the report, DXF,
3D preview and STEP solid built from that development.

**Status:** implemented (application version 0.22.0). This document describes
the code in the repository. The numerical contract is
[§ 7](#7-verification), executed by
[`eccentric-cone.test.ts`](../src/features/calculator/math/eccentric-cone.test.ts).
If the code and this document disagree, change the code or update the document
in the same change.

Related documents: [index](./README.md) · [user guide](./user-guide.md#eccentric-cone) ·
[neutral fibre](./calculations.md#1-neutral-fibre) ·
[domain model](./domain-model.md) ·
[exports](./export-formats.md#eccentric-cone) ·
[architecture](./architecture.md) ·
[tests and CI](./development.md#tests)

---

## 1. What the mode is

[Cylinder](./calculations.md#2-cylinder-development) and
[straight cone](./calculations.md#3-cone-frustum-development) cover a rectangle
and an annular sector. `eccentric-cone` adds a frustum whose end circles lie in
parallel planes but whose centres are offset by `e` along +X.

| Case | Behaviour |
|------|-----------|
| `e = 0` and the neutral diameters differ | Same sector as `cone` mode. Used as a regression check. |
| Neutral diameters equal and `e > 0` | Oblique cylinder. Still developable; the rulings stay parallel on the flat pattern. |
| Neutral diameters equal and `e = 0` | Rejected. Use [cylinder mode](./user-guide.md#validation-messages-common). |
| `e = \|R_top − R_bottom\|` | One ruling is vertical. Typical reducer. |
| `e > \|R_top − R_bottom\|` | Rulings lean to both sides of the vertical. |

### Naming

Throughout the application, the PDF and the tests:

| Symbol | Meaning |
|--------|---------|
| `D1`, `R_top` | **Top** diameter and its neutral radius (`ShellParameters.d1`) |
| `D2`, `R_bottom` | **Bottom** diameter and its neutral radius (`ShellParameters.d2`) |
| `H` | Distance between the planes of the two circles |
| `e` | Offset of the **top** circle centre along +X |
| `t`, `K`, `g` | Plate thickness, K-factor, weld gap |
| `φ` | Circumferential parameter, radians |

An early draft of this note swapped `D1` and `D2`. That draft is obsolete.
The mathematics below uses `R_top` and `R_bottom` so it matches
[`eccentric-cone.ts`](../src/features/calculator/math/eccentric-cone.ts).

### What the prototype got wrong

A chord-triangulation prototype is the right topology and the wrong metric.
The module does not repeat these errors:

1. **Chords instead of arcs.** Summing 3D chords shortens the blank. At 30
   stations the relative deficit is about `(π/N)²/6 ≈ 1.8×10⁻³`. On a
   2460 mm diameter that is about **14 mm** of perimeter.
2. **Thickness.** The prototype locked the neutral fibre at mid-thickness or
   at the inner surface. This mode uses the same K-factor model as the rest
   of the app ([calculations § 1](./calculations.md#1-neutral-fibre)).
3. **No weld gap.** The prototype always developed a full 360°.
4. **No degenerate-case checks.** Equal diameters with `e = 0` must not be
   patched with a `max(..., 1)` stub.
5. **No 3D and no STEP.**

What is kept from the prototype: pairing points at the same `φ` (those are
the true rulings, § 2.2), a bottom edge, a top edge and bend lines, and a
short / long seam.

---

## 2. Mathematics

Right-handed coordinates. Z is vertical.

Bottom edge: `A(φ) = (R_bottom cos φ, R_bottom sin φ, 0)`  
Top edge: `B(φ) = (e + R_top cos φ, R_top sin φ, H)`

`φ = 0` is the side the top circle is shifted toward. `φ = π` is the opposite
side. Which of those two rulings is shorter depends on the sign of
`R_top − R_bottom` (§ 2.6).

### 2.1 The surface is always developable

The ruled surface is the family of segments `A(φ) → B(φ)`. `A'` and `B'` are
parallel, so `det[A', B', B − A] = 0` for every `R_top`, `R_bottom`, `e` and
`H`. A tangent plane is constant along each ruling, and an exact development
exists.

When `R_top ≠ R_bottom` the surface is a real oblique cone with apex

```text
V = ( e · R_bottom / (R_bottom − R_top) ,  0 ,  H · R_bottom / (R_bottom − R_top) )
```

and `B(φ)` is the image of `A(φ)` under a homothety about `V`. Equal-`φ`
pairing is that homothety, not an approximation. The apex is reported for
checking and omitted when the ends are equal (the apex has gone to infinity:
an oblique cylinder). The development method in § 2.2 does not need the apex,
so both cases share one integrator.

### 2.2 Exact development: the isometry ODE

A development preserves curve lengths and the angles between them. Write
`a(φ)` and `b(φ)` for the flat images of the bottom and top edges, `ê(φ)` for
the unit ruling direction in the plane, and `ê⊥` for `ê` rotated by +90°.

```text
V(φ) = B(φ) − A(φ)          ℓ(φ) = |V(φ)|
p(φ) = (A' · V) / ℓ = −R_bottom · e · sin φ / ℓ
q(φ) = √(R_bottom² − p²)                 q ≥ 0
ω(φ) = q · (R_top − R_bottom) / (R_bottom · ℓ)
```

`p² ≤ R_bottom²` holds for every finite input with `H > 0`, because it
rearranges to `(e cos φ + R_top − R_bottom)² + H² ≥ 0`.

Isometry closes into

```text
a' = p · ê + q · ê⊥
ê' = ω · ê⊥
b  = a + ℓ · ê
```

`ω` follows from `B' = (R_top / R_bottom) A'` together with `|b'| = R_top`:
the transverse part of the top edge is `(R_top / R_bottom) q`, so
`q + ℓ ω = (R_top / R_bottom) q`.

Properties, all used as tests:

- `|a'| = R_bottom` and `|b'| = R_top` identically, so the developed edges are
  the true arcs `R · Δφ`, not a chord sum.
- `e = 0` makes `ω` constant and the flat pattern an annular sector with
  `ρ_out = R_large · ℓ / |R_top − R_bottom|` and angle
  `2π |R_top − R_bottom| / ℓ`. That is the straight-cone formula in
  [calculations § 3](./calculations.md#3-cone-frustum-development).
- `R_top = R_bottom` makes `ω = 0`: rulings stay parallel.

**Integration.** Classical RK4 in `φ`. The published contour uses

```text
nodes = stationCount · max(1, round(720 / stationCount))
```

output nodes across the developed angle (about 720 per turn, always a
multiple of the station count, so every station lands on a node). Each output
step is split into 8 RK4 substeps. A second run with 4 substeps is compared
with it; `integrationError` is the distance between the two end positions of
`a`. State is `(a_x, a_y, ê_x, ê_y)`, and `ê` is re-normalised after every
output step.

The result stays valid when the residual is merely large. A residual above
`1×10⁻⁴` mm is a warning on the report. Non-finite contour points mark the
result invalid.

### 2.3 Thickness and the neutral fibre

Same model as the rest of the application
([calculations § 1](./calculations.md#1-neutral-fibre)):

```text
OD:  D_n = D − 2 t (1 − K)
ID:  D_n = D + 2 t K
```

The offset is applied to `D1` and `D2` only. `H` and `e` are unchanged.
Accepted `K` is the open-closed interval `(0, 1]` enforced by
[`validateBaseParams`](../src/features/calculator/math/shared.ts).

**Assumption.** A true normal offset of the mid-surface would change the
radius by `δ / cos α`, where `α(φ)` is the local angle between the ruling and
the axis. On an oblique cone `α` depends on `φ`, so the offset surface is no
longer an eccentric cone. The app uses a **radial** offset, as cylinder and
cone mode do. The error is second order, `δ (1/cos α − 1)`. At `α ≤ 20°` that
is under 6 % of `δ`. The report prints `α_min` and `α_max`. Above 30° it adds
a warning that the radial offset and a true normal offset differ by more than
15 %. The warning does not block the result.

### 2.4 Weld gap

The gap `g` is removed as one angular slice, symmetric about the seam:

```text
Δφ = 2 g / (R_bottom + R_top)
```

The **mean** of the two edge openings equals `g`:

```text
gap on the bottom edge = Δφ · R_bottom = g · 2 R_bottom / (R_bottom + R_top)
gap on the top edge    = Δφ · R_top    = g · 2 R_top    / (R_bottom + R_top)
```

Both seam edges stay true rulings, so the DXF, the 3D preview and the STEP
solid are cut on the same lines. A gap that is exactly `g` on both edges
would break the ruling; that alternative is rejected. The report prints both
actual openings.

Integration interval: `φ ∈ [φ_seam + Δφ/2, φ_seam + 2π − Δφ/2]`.
`Δφ ≥ 2π` is invalid.

### 2.5 Seam position

| Option | `φ_seam` | Meaning |
|--------|----------|---------|
| `short` | `0` when `R_top ≤ R_bottom`, otherwise `π` | Shortest ruling |
| `long` | the opposite side | Longest ruling |
| `custom` | `seamAngleDeg` converted to radians | Arbitrary angle, degrees in the UI |

The extreme rulings are always at `φ = 0` and `φ = π`, because the horizontal
span of a ruling is `|e + (R_top − R_bottom) cos φ|`. They cancel on the
`φ = 0` side only when the top circle is the smaller one. `short` and `long`
are computed from that sign. They are not constants.

Shared by the development, the preview mesh and the STEP solid:
[`getEccentricSeam`](../src/features/calculator/math/eccentric-cone.ts).

### 2.6 Blank rectangle

The reported sheet size is the minimum-area bounding rectangle of the
developed contour, plus the same `CUT_MARGIN = 10` mm used by cone mode.

The rectangle is exact, not a degree scan. One side of a minimum-area
rectangle lies on an edge of the convex hull (Freeman–Shapira), so
[`computeMinimumBoundingBox`](../src/features/calculator/math/mbr.ts) tries
one orientation per hull edge. If that box is portrait, it is rotated 90°
into landscape. The 10 mm margin is stock guidance only. DXF geometry does
not include it ([export formats](./export-formats.md#dxf-flat-pattern)).

The straight cone still uses its own 1° / 0.5° angle search
([calculations § 3](./calculations.md#minimum-bounding-rectangle)). Only the
eccentric contour goes through `mbr.ts`.

### 2.7 Other reported quantities

- `ℓ_min`, `ℓ_max` and the `φ` where they occur.
- `α(φ) = atan2(√(Δx² + Δy²), H)`, then `α_min` / `α_max`.
- Mid-surface area by Simpson's rule on
  `ℓ · q · (1 + R_top / R_bottom) / 2`. The integrand is exact for the ruled
  strip, so the area is not the chord polygon (that polygon runs short by
  about `1×10⁻⁷` relative).
- Blank mass `m = S · t · ρ` with `S` in mm², `t` in mm and `ρ` in kg/m³
  (`density`, default 7850). The UI divides by `1×10⁹` to report kilograms.
  `S` is the developed mid-surface, not the padded bounding rectangle.
- Apex `V` when `R_top ≠ R_bottom`.

Bend lines are the rulings at the interior stations. The spacing is uneven.
`bendStep` is only the average bottom-edge pitch
`totalBottomArc / stationCount`. The shop document is the station table, not
that single number.

The UI asks for the number of bend lines. The store keeps
`stationCount = bend lines + 1` (the two seam stations are not extra bend
lines). The same count is the grid of the PDF table. Allowed range is 8…360
stations; values outside it are clamped.

---

## 3. Data model

Canonical TypeScript is [`types.ts`](../src/features/calculator/types.ts).
Field-by-field tables are in the [domain model](./domain-model.md).

Enums are runtime tuples. Anything that checks a value from outside the app
(a share link, a query parameter) walks the tuple instead of repeating
literals, so a new mode cannot be left out of an allow-list
([share protocol](./export-formats.md#share-state-protocol)).

```ts
export const SHAPE_TYPES = ['cylinder', 'cone', 'eccentric-cone'] as const;
export const SPEC_TYPES = ['OD', 'ID'] as const;
export const SEAM_POSITIONS = ['short', 'long', 'custom'] as const;
```

`CalculationResult.shape` is `'freeform'` for this mode.
`CalculationResult.eccentric` holds the development: both edges, the station
table, arc lengths, ruling extremes, inclination, apex, area, the two actual
gaps, the seam angle, the RK4 residual and warnings.

`EccentricStation` carries `φ`, the ruling length, the developed distance
from the seam along each edge, the tape-measure chord to the next station,
and the blank coordinates of both ends. The last station has no next chord.

---

## 4. Module map

```text
docs/eccentric-cone.md                              this document
src/features/calculator/math/eccentric-cone.ts      ODE, stations, result
src/features/calculator/math/mbr.ts                 minimum-area rectangle
src/features/calculator/InputPanel.tsx              mode, seam, stations, density
src/features/calculator/ResultsCard.tsx             rulings, area, mass, warnings
src/features/viewer-2d/EccentricConePatternView.tsx SVG preview
src/features/viewer-3d/EccentricConeMesh.tsx
src/features/viewer-3d/geometry/buildEccentricConeGeometry.ts
src/cad/geometry/build-eccentric-cone-solid.ts      replicad loft
src/cad/geometry/compute-shell-cad-geometry.ts      kind: 'eccentric'
src/utils/dxf-writer.ts                             generateEccentricConeDxf
src/utils/eccentric-cone-report.ts                  PDF report and station table
src/utils/pattern-dimensions.ts                     shared dimension geometry
src/utils/aligned-dimension.ts                      R12 aligned-dimension primitives
src/shareLink.ts                                    embed protocol
```

Store setters: `setEccentricity` (negative `e` becomes `|e|`), `setSeamPosition`,
`setSeamAngle`, `setStationCount`, `setDensity`, `setBendDimensionsEnabled`,
`setBendDimensionOffset`. See [architecture](./architecture.md).

### 4.1 Share links

Schema version stays compatible with links the host already issued. New
fields are optional: a link from before this mode existed keeps the defaults.
Restore accepts versions `1` and `2`.

Parsing is the table `PARAM_APPLIERS: Record<keyof ShellParameters, ParamApplier>`
in [`shareLink.ts`](../src/shareLink.ts):

- A new input parameter does not compile until it is in the table.
- Allowed enum values come from `SHAPE_TYPES`, `SPEC_TYPES` and `SEAM_POSITIONS`.

`mode` is applied first. The store recalculates on every setter, and the
other values are only meaningful once the shape is known. An earlier
allow-list of `'cylinder' | 'cone'` dropped `eccentric-cone` silently and the
shell came back as a cylinder. That list is gone.

Checks: [`shareLink.test.ts`](../src/shareLink.test.ts), `npm test`.

---

## 5. Exports

Detail shared with the other modes is in
[export formats](./export-formats.md). This section is what is specific to
the eccentric cone.

### 5.1 DXF (1:1, millimetres)

[`generateEccentricConeDxf`](../src/utils/dxf-writer.ts) writes one closed
R12 `POLYLINE` (`70 = 1`): bottom edge, then the top edge reversed. The two
seams are the closing ends of that polyline.

| Layer | Contents |
|-------|----------|
| `CONTOUR` | Closed development outline |
| `BEND` | Interior station rulings, `DASHED`, colour 1. Omitted when bend lines are off. The seam rulings are part of `CONTOUR`. |
| `MARKS` | Station index as `TEXT`, just outside the bottom edge |
| `BEND_DIMS` | Aligned chord dimensions on both edges, plus both seam lengths. Only when bend lines **and** “Dimension bend-line spacing” are on. |
| `SHEET` | Padded blank rectangle, for reference |

Dimensions are plain R12 lines, ticks and centred `TEXT` (group codes 72 / 11 / 21).
No blocks and no `DIMENSION` entities. Geometry is built by
[`pattern-dimensions.ts`](../src/utils/pattern-dimensions.ts) and
[`aligned-dimension.ts`](../src/utils/aligned-dimension.ts), the same modules
the SVG preview uses, so the screen and the file match.
`bendDimensionOffset` is the distance from the edge to the dimension line
(default 120 mm).

Contour density is the ~720-node grid of § 2.2, not the station count. A laser
follows the fine polyline. Layout marks follow the stations (typically 8–36
intervals). Stations lie on contour nodes.

There is no DXF `LAYER` table and no `$INSUNITS`. Treat the coordinates as
millimetres by convention, as for the other modes.

Filename (from the download button):

```text
eccentric-cone_D{D1}-{D2}_H{H}_e{e}.dxf
```

Diameters, height and eccentricity are rounded to whole millimetres.

### 5.2 PDF report

[`generateEccentricConeReport`](../src/utils/eccentric-cone-report.ts),
landscape A4, dispatched from `generatePDF` when the mode is `eccentric-cone`.

1. Title, date, and a link to [cadautoscript.com](https://cadautoscript.com).
2. Inputs: OD/ID, `D1` (top), `D2` (bottom), `H`, `e`, `t`, `K`, gap, seam
   (preset and `φ` in degrees), station count.
3. Development: neutral diameters, both edge lengths, ruling min/max,
   inclination min/max, actual gap on each edge, area, mass, blank size,
   solver residual.
4. A vector sketch of the development, **not to scale**, with the blank size
   printed under it.
5. Warnings, when present: inclination above 30°, or an RK4 residual above
   `1×10⁻⁴` mm.
6. A station table on the following pages. Columns:
   `#`, `phi, deg`, `Ruling, mm`, `Sum bottom`, `Chord bot.`, `Sum top`,
   `Chord top`, `X, mm`, `Y, mm`.
   The last station has no chord (`-`). Rows flow onto extra pages; there is
   no hard cut at 24 stations.

Filename:

```text
eccentric-cone_D{D1}-{D2}_H{H}_e{e}.pdf
```

### 5.3 STEP

Built in the existing CAD worker. `ShellCadGeometry` is a discriminated union:
`{ kind: 'revolved' }` for cylinder and straight cone, `{ kind: 'eccentric' }`
for this mode
([`cad-types.ts`](../src/cad/types/cad-types.ts)).

**`g > 0` — one ruled loft, no boolean cut.** On the bottom and top planes the
worker builds a closed annular-sector wire from `φ_start` to `φ_end` (the same
angles as the development): outer arc, radial segment, inner arc, radial
segment. The two wires have the same structure, so
`loftWith(..., { ruled: true })` pairs `φ` with `φ`. Those rulings are the
development rulings. The seam faces are the radial faces of the loft, and the
gap widens or narrows from bottom to top exactly as `Δφ · R` does on the flat
pattern. Arcs stay arcs. The lateral surface is not faceted.

**`g = 0` — closed shell.** One wire cannot describe a full annulus, so the
worker lofts two complete circles (bottom centre at the origin, top centre
shifted by `e`) and subtracts the inner solid from the outer one.

Wall thickness is the same radial offset as § 2.3 (`R ± δ`).

Filename:

```text
shell-rolling-eccentric-cone_D{D1}-{D2}_e{e}_H{H}_T{t}.step
```

### 5.4 3D preview

[`buildEccentricConeGeometry`](../src/features/viewer-3d/geometry/buildEccentricConeGeometry.ts)
builds the mesh on the rulings: outer and inner rings at the bottom and the
top, 128 segments, angle range cut by `Δφ`, seam ends capped.
`computeVertexNormals()` supplies the shading. It is the eccentric analogue of
[`buildShellGeometry`](../src/features/viewer-3d/geometry/buildShellGeometry.ts),
with the top ring shifted by `e`.

---

## 6. Validation

Shared checks live in [`shared.ts`](../src/features/calculator/math/shared.ts)
and are listed in the [user guide](./user-guide.md#validation-messages-common).

| Check | Result |
|-------|--------|
| `D1`, `D2`, `H`, `t` positive; `0 < K ≤ 1`; `g ≥ 0` and finite | Same messages as the other modes |
| `t` greater than or equal to either neutral radius | “Thickness is too large…” |
| `\|D1_n − D2_n\| < 1×10⁻⁹` and `e = 0` | “Equal diameters with zero eccentricity — use Cylinder mode.” |
| `e < 0` | Stored as `\|e\|`. Negative eccentricity is the mirrored part. |
| Non-finite `e` | “Invalid eccentricity…” |
| `Δφ ≥ 2π` | “Gap is too large for this geometry.” |
| `α_max > 30°` | Warning only |
| RK4 residual `> 1×10⁻⁴` mm | Warning only |
| `stationCount` outside 8…360 | Clamped |

`e = 0` with unequal diameters is allowed and must match `cone` mode.

---

## 7. Verification

Automated suite:
[`src/features/calculator/math/eccentric-cone.test.ts`](../src/features/calculator/math/eccentric-cone.test.ts).

```bash
npm test
```

Reference values come from relations that do not use the RK4 integrator:
the straight-cone formulas, circle arc lengths `2πR`, 3D ruling lengths, and
a separate elliptic integral. Inputs below use the application names
(`D1` top, `D2` bottom). Cases that need the entered diameters to equal the
neutral diameters use a vanishing wall (`t = 0.0001`, `K = 0.5`).

1. **`e = 0`, `D1 = 1500`, `D2 = 2000`, `H = 2500`.** Sector radii and angle
   match `calculateCone`. Both developed edges lie on circles about one centre.
2. **`D1 = D2 = 1000`, `e = 300`, `H = 1000`.** Oblique cylinder. Bottom edge
   `2π · 500`. Every ruling `√(300² + 1000²)`. Developed rulings are parallel.
   Lateral area matches (right-section ellipse perimeter) × (ruling length),
   with the elliptic integral computed independently.
3. **`D1 = 1360`, `D2 = 2460`, `H = 1470`, `e = 550`, `t = 20`, `K = 0.44`.**
   Both developed edges equal `2πR`. The 720-node polyline is shorter than the
   true arc by less than 0.02 mm on each edge (the original chord prototype at
   30 stations was short by about 14 mm). Every laid-out ruling matches its
   3D length, and `integrationError < 1×10⁻⁶` mm on this case.
4. **Gap.** `(gapBottom + gapTop) / 2 = g`, and each edge is shorter than the
   full circle by its own gap.
5. **Seam.** `short` starts on the shortest ruling and `long` on the longest,
   including when the wide end is on top (`φ_seam = 180°` for `short` in that
   orientation). Swapping the seam does not change the area.

A separate manual check in the browser (replicad / OpenCascade), not part of
`npm test`: with a positive gap the solid has 8 faces (outer and inner
surfaces as two faces each, two seam faces, two end faces). With `g = 0` it
has 4 faces. On the reference geometry the kernel volume was 174 728 533 mm³
against an analytic 174 729 438 mm³ (a horizontal slice of an oblique cone is
an annulus whose radii interpolate linearly with height), a relative
difference of about `5×10⁻⁶`.

---

## 8. Where the code left the original plan

The first draft of this note described a few algorithms that the
implementation replaced. The current behaviour is §§ 2–7. The replacements:

| Original plan | What shipped |
|---------------|----------------|
| Scan the blank rotation from 0° to 180° in 1° steps, then refine by 0.1° | Exact minimum rectangle from the convex hull ([§ 2.6](#26-blank-rectangle)) |
| Area as the sum of the flat trapezoids | Simpson on the closed-form integrand ([§ 2.7](#27-other-reported-quantities)) |
| STEP as a full loft minus a box cutter | Ruled loft of the open annular sectors, boolean only when `g = 0` ([§ 5.3](#53-step)) |
| `short` / `long` hard-coded to `φ = 0` and `φ = π` | Chosen from the sign of `R_top − R_bottom` ([§ 2.5](#25-seam-position)) |
| Closure error above `1×10⁻⁶` mm invalidates the result | Residual is reported; only a non-finite contour invalidates ([§ 2.2](#22-exact-development-the-isometry-ode)) |
