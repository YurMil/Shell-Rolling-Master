# Export Formats & Interchange

Interchange and delivery formats produced by Shell Rolling Master.

---

## Overview

| Format | Generator | Contents | Filename pattern |
|--------|-----------|----------|------------------|
| PDF | `src/utils/pdf-generator.ts` (jsPDF) | Fabrication report + pattern sketch | `shell-pattern-{mode}.pdf` |
| DXF | `src/utils/dxf-writer.ts` | Flat blank outline + optional bend lines | `shell-pattern-{mode}.dxf` |
| STEP | CAD worker (`replicad` / OpenCascade) | Thick open-seam solid | `shell-rolling-{mode}_D…_H…_T….step` |
| Share state | `src/shareLink.ts` | Input parameters only (JSON via `postMessage`) | Host URL (`?calc=` on parent) |

All exports are generated in the browser and downloaded (or messaged) locally.

---

## PDF fabrication report

- Page: landscape **A4**
- Includes: input parameters, neutral dimensions, cutting / blank specification, bend step (when enabled), scaled pattern visualization
- Intended for shop floor printouts and job packets

Not a substitute for DXF when CNC contour accuracy is required.

---

## DXF flat pattern

ASCII DXF entities:

### Cylinder (`shape: 'rect'`)

- Four boundary **LINE** entities forming the developed rectangle

### Cone (`shape: 'sector'`)

- Two **ARC** entities (outer and inner radii)
- Two radial **LINE** entities (sector edges)

### Bend lines (optional)

- Drawn on a dashed red layer named **`BEND`**
- Positions match the 2D pattern / calculation `bendLines` array

### Notes

- Coordinates are millimetres in pattern space.
- Cone **CUT_MARGIN** (10 mm) used for reported sheet size is **not** applied to DXF geometry.
- No kerf offset is applied.

---

## STEP solid

### Purpose

Export a CAD-ready **thick** cylindrical or conical shell with an open seam for verification, nesting prep in 3D, or downstream CAD workflows.

### Pipeline

1. UI validates that calculation results are available.
2. `computeShellCadGeometry` maps neutrals, thickness, K-factor, and gap to CAD radii and seam angle.
3. Web Worker initializes OpenCascade WASM (first use / warmup).
4. `build-shell-solid` constructs a closed XZ trapezoidal profile, **revolves** about Z, then **subtracts** an extruded wedge for the seam gap.
5. `solid.blobSTEP()` returns an `ArrayBuffer`; the UI triggers a file download.

### Filename example

```text
shell-rolling-cone_D2000-1500_H2500_T15.step
shell-rolling-cylinder_D2000_H2500_T15.step
```

### Progress stages

| Stage | Meaning |
|-------|---------|
| `init` | Loading / initializing CAD kernel |
| `geometry` | Building the solid |
| `export` | Serializing STEP |

### Limitations

- Open-seam topology only (gap may be `0`, but construction remains a cut shell).
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

- **Schema version:** `1`
- **Debounce:** 300 ms on state updates
- **Payload:** input parameters only (`SharedParams`); results always recomputed after restore
- Invalid or unknown fields are ignored; per-field defaults remain via store setters
- Same-origin `postMessage` only

### Shared parameter fields

`mode`, `specType`, `d1`, `d2`, `h`, `thickness`, `kFactor`, `gap`, `bendLinesEnabled`, `bendLinesCount`

Implementation: `src/shareLink.ts`.

---

## Integration checklist

When consuming exports externally:

1. Treat DXF units as **mm**.
2. Prefer DXF for 2D cutting; prefer STEP for 3D CAD; use PDF for human review.
3. If nesting stock size from the UI, remember cone bbox includes **+10 mm** margin vs DXF.
4. When embedding, listen for `cas:share-support` before sending `cas:restore-state`.
5. Do not expect localStorage persistence from the app itself.
