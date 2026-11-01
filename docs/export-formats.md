# Export Formats & Interchange

Interchange and delivery formats produced by Shell Rolling Master.

Eccentric-cone layers, the station table and the STEP loft are specified in
[eccentric cone § 5](./eccentric-cone.md#5-exports). The parameter list shared
with a host page is the [domain model](./domain-model.md#shared-params-embed-protocol).

---

## Overview

| Format | Generator | Contents | Filename pattern |
|--------|-----------|----------|------------------|
| PDF | `src/utils/pdf-generator.ts` (jsPDF); eccentric cone delegates to `eccentric-cone-report.ts` | Fabrication report + pattern sketch. Eccentric cone adds a station table | `shell-pattern-{mode}.pdf`, or `eccentric-cone_D{D1}-{D2}_H{H}_e{e}.pdf` |
| DXF | `src/utils/dxf-writer.ts` | Flat blank outline + optional bend lines. Eccentric cone is one closed polyline | `shell-pattern-{mode}.dxf`, or `eccentric-cone_D{D1}-{D2}_H{H}_e{e}.dxf` |
| STEP | CAD worker (`replicad` / OpenCascade) | Thick shell. Eccentric cone is a ruled loft | `shell-rolling-{mode}_D…_H…_T….step` (eccentric filenames also include `_e{e}`) |
| Share state | `src/shareLink.ts` | Input parameters only (JSON via `postMessage`) | Host URL (`?calc=` on parent) |

All exports are generated in the browser and downloaded (or messaged) locally.

---

## PDF fabrication report

- Page: landscape **A4**
- **Sheet 1:** input parameters, neutral dimensions, cutting / blank specification, bend step (when enabled), scaled pattern visualization
- **Sheet 2 — rolled part:** a dimensioned drawing of the shell *after rolling*
  (`src/utils/rolled-part-sheet.ts`):
  - *Section A-A* through the shell axis (in the eccentricity plane for the
    eccentric cone): wall drawn solid, the specified diameter (OD or ID) of each
    ring, the other diameter as a reference dimension in parentheses, height H,
    eccentricity e, wall-thickness note
  - *Top view*: rings (hidden ones dashed), centre lines, cutting plane A-A and a
    seam / gap note at the real seam position
  - Data table (OD / ID / mean diameters, slant height, wall angle, seam
    opening at each end, mid-surface area, mass at the `density` parameter) and
    a title block. Cones remove the gap as a constant development angle, so the
    opening scales with the ring radius: top and bottom are reported separately
  - Drawn at the largest standard scale that fits (1:1, 1:2, 1:2.5 … 1:5000, or
    enlarged for small parts), stated in the title block
- Eccentric cone: the station table follows from sheet 3
- Intended for shop floor printouts and job packets

The finished-part numbers come from `src/utils/rolled-shell.ts`, shared with the
3D dimension overlay, so the drawing and the screen always agree.

Not a substitute for DXF when CNC contour accuracy is required.

---

## DXF flat pattern

ASCII DXF entities:

### Cylinder (`shape: 'rect'`)

- Four boundary **LINE** entities forming the developed rectangle

### Cone (`shape: 'sector'`)

- Two **ARC** entities (outer and inner radii)
- Two radial **LINE** entities (sector edges)

### Eccentric cone (`shape: 'freeform'`)

- One closed R12 **POLYLINE** on layer `CONTOUR`: bottom edge, then the top edge reversed. The seams are the two ends of that polyline
- Station numbers on layer `MARKS`
- Interior rulings on `BEND` when bend lines are enabled
- Padded blank rectangle on layer `SHEET`
- Chord dimensions on `BEND_DIMS` when bend lines and bend dimensions are both enabled

Layer contents, the 720-node contour versus the station marks, and the filename are in [eccentric cone § 5.1](./eccentric-cone.md#51-dxf-11-millimetres).

### Bend lines (optional)

- Drawn on a dashed red layer named **`BEND`**
- Positions match the 2D pattern / calculation `bendLines` array

### Bend-line dimensions (optional)

Available in **every** shape mode when bend lines and **Dimension bend-line spacing** are both enabled.

- Layer **`BEND_DIMS`**
- Aligned (parallel) dimensions of the spacing between consecutive bend-line
  endpoints, plus the length of both seam edges
- Cylinder: one run along the blank — the two edges are parallel, so a second
  run would repeat the same numbers. Cone and eccentric cone: one run per edge,
  because the two edges have different chord lengths ([eccentric cone § 5.1](./eccentric-cone.md#51-dxf-11-millimetres))
- Built from plain R12 primitives (extension lines, dimension line, ticks and a
  centred `TEXT` via group codes 72/11/21) — no blocks, no `DIMENSION` entities
- Geometry comes from `src/utils/pattern-dimensions.ts`, shared with the 2D
  preview, so the screen and the file always show the same values
- Offset from the edge is the `bendDimensionOffset` parameter

### Notes

- Coordinates are millimetres in pattern space.
- Cone **CUT_MARGIN** (10 mm) used for reported sheet size is **not** applied to DXF geometry.
- No kerf offset is applied.

---

## STEP solid

### Purpose

Export a CAD-ready **thick** cylindrical, conical, or eccentric shell for verification, nesting prep in 3D, or downstream CAD workflows. Cylinder and straight cone are open-seam. An eccentric cone with a positive gap is an open ruled loft; with gap 0 it is a closed shell ([eccentric cone § 5.3](./eccentric-cone.md#53-step)).

### Pipeline

1. UI validates that calculation results are available.
2. `computeShellCadGeometry` maps neutrals, thickness, K-factor, and gap to CAD radii and seam angle.
3. Web Worker initializes OpenCascade WASM (first use / warmup).
4. For cylinder and straight cone, `build-shell-solid` constructs a closed XZ trapezoidal profile, **revolves** it about Z, then **subtracts** an extruded wedge for the seam gap. For an eccentric cone, `build-eccentric-cone-solid` lofts the open annular sectors on the same angles as the development. A boolean cut is used only when the eccentric gap is 0.
5. `solid.blobSTEP()` returns an `ArrayBuffer`; the UI triggers a file download.

### Filename example

```text
shell-rolling-cone_D2000-1500_H2500_T15.step
shell-rolling-cylinder_D2000_H2500_T15.step
shell-rolling-eccentric-cone_D2000-1500_e250_H2500_T15.step
```

### Progress stages

| Stage | Meaning |
|-------|---------|
| `init` | Loading / initializing CAD kernel |
| `geometry` | Building the solid |
| `export` | Serializing STEP |

### Limitations

- Cylinder and straight-cone topology stays an open seam even when the gap is 0. An eccentric cone with gap 0 is closed.
- Discrete CAD kernel; first export may be slow on low-end devices.
- Not a manufacturing NC program — geometry verification / CAD interchange only.

---

## Share-state protocol

Used when the calculator is **iframe-embedded** in a same-origin host (CAD Auto Script utility shell). Contract reference: host repo `dev-plans/utility-share-protocol.md` (issue #113).

### Message types

| Type | Direction | Purpose |
|------|-----------|---------|
| `cas:share-support` | App → Host | Announce share capability |
| `cas:restore-state` | Host → App | Apply shared input state |
| `cas:state-update` | App → Host | Stream current inputs (debounced) |

### Rules

- **Schema version:** `1` — the host stamps `v` into the link and sends it back,
  so the constant must not be bumped for new fields; versions `1` and `2` are
  both accepted on restore
- **Debounce:** 300 ms on state updates
- **Payload:** input parameters only (`SharedParams` = `ShellParameters`);
  results always recomputed after restore
- Invalid, unknown and missing fields are ignored per field; a link created
  before a parameter existed simply keeps that parameter's default
- Same-origin `postMessage` only

### Shared parameter fields

All of `ShellParameters`: `mode`, `specType`, `d1`, `d2`, `h`, `thickness`,
`kFactor`, `gap`, `bendLinesEnabled`, `bendLinesCount`, `eccentricity`,
`seamPosition`, `seamAngleDeg`, `stationCount`, `density`,
`bendDimensionsEnabled`, `bendDimensionOffset`.

The field list is not maintained by hand. Parsing and serialisation are driven
by `PARAM_APPLIERS: Record<keyof ShellParameters, ParamApplier>`, so a new input
parameter fails to compile until it is wired into the protocol, and the
enumerated values are validated against the `SHAPE_TYPES` / `SPEC_TYPES` /
`SEAM_POSITIONS` tuples the unions are derived from rather than a repeated
allow-list.

Implementation: `src/shareLink.ts`. Round-trip checks: `src/shareLink.test.ts` (`npm test`).

---

## Integration checklist

When consuming exports externally:

1. Treat DXF units as **mm**.
2. Prefer DXF for 2D cutting; prefer STEP for 3D CAD; use PDF for human review.
3. If nesting stock size from the UI, remember cone bbox includes **+10 mm** margin vs DXF.
4. When embedding, listen for `cas:share-support` before sending `cas:restore-state`.
5. Do not expect localStorage persistence from the app itself.
