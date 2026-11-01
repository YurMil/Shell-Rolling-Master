# User Guide

Operational reference for Shell Rolling Master.

Engineering formulas: [calculations](./calculations.md).
Eccentric-cone specification: [eccentric-cone.md](./eccentric-cone.md).
File layouts: [export formats](./export-formats.md).

## Purpose

Calculate the **flat plate blank** required to roll an open-seam **cylindrical**, **conical**, or **eccentric** shell, accounting for:

- Outer (OD) or inner (ID) diameter specification
- Plate thickness and **K-factor** (neutral-axis position)
- Welding / seam **gap**
- Optional **bend / roll guide lines**

Inspect results as a 3D solid or 2D pattern, then export PDF, DXF, or STEP.

## Workspace layout

| Region | Role |
|--------|------|
| Left sidebar | Mode, dimensions, K-factor, gap, bend lines, results, export actions |
| Main viewport | Toggle between **3D Model** and **2D Pattern** |

On narrow screens the sidebar stacks above the viewport.

## Workflow

1. Select **Cylinder**, **Cone**, or **Ecc. Cone**.
2. Choose **OD** or **ID** as the diameter basis.
3. Enter dimensions (all values in **millimetres**):
   - **D1** — top / main diameter
   - **D2** — bottom diameter (both cone modes)
   - **H** — axial height (also the blank width for cylinders)
   - **Thickness** — plate thickness
   - **K-factor** — neutral fibre position in the thickness (typical steel ~0.3–0.5; must be greater than 0 and at most 1)
   - **Gap** — open seam / weld gap
4. Optionally enable **bend lines**. On a cylinder or a straight cone, set how
   many guide lines to draw. With bend lines on, **Dimension bend-line spacing**
   adds an aligned dimension run between the guides — on one edge for a
   cylinder blank (both edges are parallel, so the numbers would repeat) and
   on both edges for a cone, where the two arcs have different chord lengths.
   **Dimension offset** controls how far the dimension lines sit outside the blank.
5. Review the results card (required sheet size; for a straight cone also the sector angle and radii).
6. Switch view modes as needed; export PDF / DXF / STEP when ready.

### Eccentric cone

Select **Ecc. Cone** and, in addition to the fields above, set:

- **Eccentricity e** — how far the top circle is shifted along +X. A negative entry is stored as its absolute value (the mirrored part). `e = 0` with different end diameters reproduces the straight cone.
- **Seam position** — **Short** (shortest ruling), **Long** (longest ruling), or **Custom** with a seam angle in degrees. Short and long are computed from which end is larger; they are not fixed sides of the part.
- **Bend lines** — how many interior rulings to mark. The store keeps one more station than that count, because the two seam edges are stations too. Allowed station count is 8–360. The same grid is the PDF station table.
- **Density** — kg/m³, used only for the blank mass (default 7850, carbon steel).

The results card then shows the shortest and longest ruling, both developed edge lengths, the ruling inclination, the mid-surface area, and the blank mass. Warnings (a steep ruling, or a solver residual) appear under the mass and do not block export.

Full geometry, the gap formula, and the check numbers: [eccentric-cone.md](./eccentric-cone.md).

Number fields commit on blur or Enter (Escape restores the previous value). Every other control recalculates immediately. Invalid combinations show an error instead of numeric results. The draft you are still typing does not move the 3D model.

## Input reference

| Field | Unit | Constraints | Notes |
|-------|------|-------------|-------|
| Mode | — | `cylinder` \| `cone` \| `eccentric-cone` | Switches development algorithm |
| Spec type | — | `OD` \| `ID` | Which surface the diameters describe |
| D1 | mm | Finite, > 0 | Top / main diameter |
| D2 | mm | Finite, > 0 (both cone modes) | Bottom diameter; ignored for cylinder |
| Eccentricity | mm | Finite; stored as `\|e\|` | Top-circle offset. Eccentric cone only |
| H | mm | Finite, > 0 | Shell height / cylinder blank width |
| Thickness | mm | Finite, > 0; must be &lt; neutral radius | Plate thickness |
| K-factor | — | &gt; 0 and ≤ 1 | Neutral-axis fraction through thickness |
| Gap | mm | Finite, ≥ 0 | Deducted from the developed blank |
| Seam | — | `short` \| `long` \| `custom` | Where the eccentric development is cut |
| Seam angle | deg | Used when seam is `custom` | Wrapped into 0–360 |
| Bend lines | — | Optional | Cylinder and straight cone: equally spaced guides. Eccentric cone: interior rulings; count is stations minus 1 |
| Stations | — | 8–360 | Eccentric cone. Clamped. Also the PDF table grid |
| Density | kg/m³ | Finite, > 0 | Eccentric-cone blank mass. Invalid values fall back to 7850 |
| Dimension bend-line spacing | — | Requires bend lines | Spacing between guides plus both seam edges |
| Dimension offset | mm | > 0 | Distance from the edge to the dimension line |

### Defaults

Cylinder · OD · D1 = 2000 · D2 = 1500 · H = 2500 · T = 15 · K = 0.44 · Gap = 2 mm.

## Results interpretation

### Always shown (when valid)

| Output | Meaning |
|--------|---------|
| Neutral diameters | Diameters at the bending neutral fibre |
| Required sheet size | Axis-aligned blank envelope used for nesting / stock |
| Flat length / width | Developed blank extents (see calculations for cone bounding-box logic) |

### Cone-specific

| Output | Meaning |
|--------|---------|
| Sector angle | Development angle after gap deduction (degrees) |
| Outer / inner pattern radii | Annular-sector radii on the flat pattern |
| Pattern rotation | Orientation chosen to minimise bounding-box area (landscape-biased) |

Cone **reported** sheet dimensions include a **10 mm** cutting margin on the bounding box. The DXF outline itself does not add that margin. The eccentric cone uses the same margin on its minimum rectangle ([eccentric cone § 2.6](./eccentric-cone.md#26-blank-rectangle)).

### Eccentric-cone-specific

| Output | Meaning |
|--------|---------|
| Ruling min / max | Shortest and longest generatrix, with the angle where each occurs |
| Bottom / top edge | Exact developed arc length, after the gap is removed |
| Inclination | Ruling angle to the axis. Above 30° the radial thickness offset is no longer a close stand-in for a normal offset |
| Surface area / blank mass | Mid-surface area and `area × thickness × density` |
| Blank size | Minimum rectangle of the development, plus the 10 mm margin |

## Viewing modes

### 3D Model

- Thick open-seam shell derived from neutral geometry and thickness / K-factor offsets
- Orbit / pan / zoom; auto-fit camera; grid and edge overlays
- Orientation cube for face / edge / corner viewpoints
- **Dimensions** toggle (top right, on by default): drawing-style dimensions of
  the rolled part — specified diameter of each ring, the other diameter in
  parentheses as a reference, height H, eccentricity e, wall thickness t and the
  seam gap. For cylinders and cones the dimension plane turns to face the
  camera; for the eccentric cone it stays in the eccentricity plane. The same
  numbers appear on sheet 2 of the PDF report

### 2D Pattern

- **Cylinder:** dimensioned rectangle
- **Cone:** dimensioned annular sector with dashed bounding rectangle
- **Eccentric cone:** the developed outline, station rulings, and station numbers
- Bend lines drawn when enabled, with their spacing dimensions when that option is on

## Exports

| Format | Typical use |
|--------|-------------|
| **PDF** | Shop fabrication report (inputs, neutrals, cutting data, pattern sketch) plus a dimensioned drawing of the rolled part on sheet 2 |
| **DXF** | CNC / CAD blank outline (+ optional bend and dimension layers) |
| **STEP** | Thick open-seam solid for CAD (browser OpenCascade WASM) |

Filenames:

- PDF: `shell-pattern-{mode}.pdf`
- DXF: `shell-pattern-{mode}.dxf`
- STEP: `shell-rolling-{mode}_D…_H…_T….step`
- Eccentric cone PDF and DXF: `eccentric-cone_D{D1}-{D2}_H{H}_e{e}.pdf` / `.dxf`

See [export-formats.md](./export-formats.md) for entity-level detail and [eccentric cone § 5](./eccentric-cone.md#5-exports) for the station table and the STEP loft.

## Validation messages (common)

| Condition | Effect |
|-----------|--------|
| Non-positive dimensions or invalid K-factor | Calculation marked invalid |
| Gap negative or non-finite | Invalid welding gap |
| Thickness ≥ neutral radius | Physically impossible shell |
| Cylinder gap ≥ neutral circumference | Gap too large |
| Straight cone \|D1ₙ − D2ₙ\| &lt; 1 mm | Rejected — use cylinder mode or increase the difference |
| Cone gap yields a non-positive sector angle | Gap too large for geometry |
| Eccentric cone, equal neutral diameters and `e = 0` | Rejected — use cylinder mode |
| Eccentric cone gap consumes a full turn | Gap too large for this geometry |
| Eccentric ruling inclination above 30° | Warning only; the result stays valid |

## Practical tips

- Prefer **K-factor** values from your shop / material standards; 0.44 is a reasonable steel default, not a universal constant.
- Specify diameters consistently as **OD** or **ID** for the finished shell after rolling.
- Use **gap** for the intended weld root opening or fit-up clearance on the developed length.
- For near-equal straight-cone ends, switch to **cylinder** mode rather than forcing a tiny frustum. An eccentric cone with equal diameters and a real offset is an oblique cylinder and stays in **Ecc. Cone**.
- STEP export may take several seconds on first use while the CAD kernel loads.
