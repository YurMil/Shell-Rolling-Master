# User Guide

Operational reference for Shell Rolling Master.

## Purpose

Calculate the **flat plate blank** required to roll an open-seam **cylindrical** or **conical** shell, accounting for:

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

1. Select **Cylinder** or **Cone**.
2. Choose **OD** or **ID** as the diameter basis.
3. Enter dimensions (all values in **millimetres**):
   - **D1** — primary / top diameter
   - **D2** — bottom diameter (cone only)
   - **H** — axial height (also the blank width for cylinders)
   - **Thickness** — plate thickness
   - **K-factor** — neutral fibre position in the thickness (typical steel ~0.3–0.5)
   - **Gap** — open seam / weld gap along the developed length
4. Optionally enable **bend lines** and set the count of guide lines. With bend
   lines on, **Dimension bend-line spacing** adds an aligned dimension run
   between the guides — on one edge for a cylinder blank (both edges are
   parallel, so the numbers would repeat) and on both edges for a cone, where
   the two arcs have different chord lengths. **Dimension offset** controls how
   far the dimension lines sit outside the blank.
5. Review the results card (required sheet size; for cones also sector angle and radii).
6. Switch view modes as needed; export PDF / DXF / STEP when ready.

Every input change recalculates immediately. Invalid combinations show an error instead of numeric results.

## Input reference

| Field | Unit | Constraints | Notes |
|-------|------|-------------|-------|
| Mode | — | `cylinder` \| `cone` | Switches development algorithm |
| Spec type | — | `OD` \| `ID` | Which surface the diameters describe |
| D1 | mm | Finite, > 0 | Top / main diameter |
| D2 | mm | Finite, > 0 (cone) | Bottom diameter; ignored for cylinder |
| H | mm | Finite, > 0 | Shell height / cylinder blank width |
| Thickness | mm | Finite, > 0; must be &lt; neutral radius | Plate thickness |
| K-factor | — | &gt; 0 and ≤ 1 | Neutral-axis fraction through thickness |
| Gap | mm | Finite, ≥ 0 | Deducted from developed blank length / sector |
| Bend lines | — | Optional; count ≥ 1 when enabled | Equally spaced roll guides |
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

Cone **reported** sheet dimensions include a **10 mm** cutting margin on the bounding box. The DXF outline itself does not add that margin.

## Viewing modes

### 3D Model

- Thick open-seam shell derived from neutral geometry and thickness / K-factor offsets
- Orbit / pan / zoom; auto-fit camera; grid and edge overlays
- Orientation cube for face / edge / corner viewpoints

### 2D Pattern

- **Cylinder:** dimensioned rectangle
- **Cone:** dimensioned annular sector with dashed bounding rectangle
- Bend lines drawn when enabled, with their spacing dimensions when that option is on

## Exports

| Format | Typical use |
|--------|-------------|
| **PDF** | Shop fabrication report (inputs, neutrals, cutting data, pattern sketch) |
| **DXF** | CNC / CAD blank outline (+ optional bend and dimension layers) |
| **STEP** | Thick open-seam solid for CAD (browser OpenCascade WASM) |

Filenames:

- PDF: `shell-pattern-{mode}.pdf`
- DXF: `shell-pattern-{mode}.dxf`
- STEP: `shell-rolling-{mode}_D…_H…_T….step`

See [export-formats.md](./export-formats.md) for entity-level detail.

## Validation messages (common)

| Condition | Effect |
|-----------|--------|
| Non-positive dimensions or invalid K-factor | Calculation marked invalid |
| Gap negative or non-finite | Invalid welding gap |
| Thickness ≥ neutral radius | Physically impossible shell |
| Cylinder gap ≥ neutral circumference | Gap too large |
| Cone |D1ₙ − D2ₙ| &lt; 1 mm | Rejected — use cylinder mode or increase difference |
| Cone gap yields non-positive sector angle | Gap too large for geometry |
| Cone angle &gt; 360° | Allowed with console warning (overlapping pattern) |

## Practical tips

- Prefer **K-factor** values from your shop / material standards; 0.44 is a reasonable steel default, not a universal constant.
- Specify diameters consistently as **OD** or **ID** for the finished shell after rolling.
- Use **gap** for the intended weld root opening or fit-up clearance on the developed length.
- For near-equal cone ends, switch to **cylinder** mode rather than forcing a tiny frustum.
- STEP export may take several seconds on first use while the CAD kernel loads.
