# Shell Rolling Master

**Precision flat-pattern development for cylindrical, conical, and eccentric plate shells.**

Shell Rolling Master is a browser-based fabrication calculator for rolling plate into open-seam cylindrical, conical, and eccentric (oblique) shells. It computes neutral-fibre developments with K-factor compensation, visualizes the rolled solid and unfolded blank, and exports shop-ready DXF, PDF, and STEP deliverables — entirely client-side.

[Live App](https://cadautoscript.com/static/utility-apps/cylindrical-shell-rolling/app.html) · [Documentation](./docs/README.md) · [Calculations](./docs/calculations.md) · [Eccentric cone](./docs/eccentric-cone.md) · [Architecture](./docs/architecture.md)

---

## Capabilities

| Area | What you get |
|------|----------------|
| **Geometry modes** | Cylinder, straight frustum, and eccentric (oblique) cone, with OD or ID specification |
| **Neutral fibre** | K-factor–based development along the bending neutral axis |
| **Seam control** | Configurable weld / seam gap deducted from the developed blank |
| **Roll guides** | Optional equally spaced bend / roll reference lines |
| **3D preview** | Interactive thick-shell model (orbit, pan, zoom, view cube) |
| **2D pattern** | Dimensioned SVG layout — rectangle, annular sector, or eccentric development |
| **Exports** | DXF cut pattern, PDF fabrication report, STEP solid (OpenCascade WASM) |
| **Embedding** | Same-origin share-state protocol for host utility shells |

All units are millimetres. Computation and CAD export run in the browser; no backend is required.

---

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Production build:

```bash
npm run build
npm run preview
```

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite development server (port **3000**, host `0.0.0.0`) |
| `npm run build` | Type-checked production bundle to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint across the project |
| `npm test` | Vitest unit tests (calculation engine, pattern dimensions, share links) |

---

## How it works

```text
Inputs (OD/ID, D1/D2, H, T, K, gap, and for the eccentric cone: e, seam, stations)
        │
        ▼
 Neutral diameters  →  Cylinder / cone / eccentric-cone development
        │
        ├──► Results card (sheet size; sector data or ruling table)
        ├──► 2D SVG pattern view
        ├──► 3D Three.js thick-shell mesh
        └──► Exports: PDF · DXF · STEP (CAD worker)
```

1. Enter shell dimensions and material parameters.
2. The engine derives **neutral diameters**, then develops the flat blank (rectangle, annular sector, or eccentric development).
3. Inspect the **3D model** or **2D pattern**.
4. Download **PDF** (shop report), **DXF** (CNC / CAD blank), or **STEP** (thick open-seam solid).

Cylinder and cone formulas: [docs/calculations.md](./docs/calculations.md).
Eccentric cone: [docs/eccentric-cone.md](./docs/eccentric-cone.md).

---

## Default parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| Mode | Cylinder | `cylinder`, `cone`, or `eccentric-cone` |
| Spec | OD | Outer or inner diameter basis |
| D1 | 2000 mm | Top / main diameter |
| D2 | 1500 mm | Bottom diameter (both cone modes) |
| H | 2500 mm | Axial height / cylinder blank width |
| Thickness | 15 mm | Plate thickness |
| K-factor | 0.44 | Neutral-axis position, greater than 0 and at most 1 |
| Gap | 2 mm | Weld / seam opening |
| Eccentricity | 250 mm | Top-circle offset along +X (eccentric cone) |

---

## Technology

- **UI:** React 19 · TypeScript 5.9 · Vite 7 · Tailwind CSS 3 · Zustand 5  
- **3D:** Three.js · React Three Fiber · Drei  
- **CAD / STEP:** replicad · OpenCascade.js (WASM) in a module Web Worker  
- **Reports:** jsPDF  

Relative asset paths (`base: './'`) support static hosting and iframe embedding.

---

## Documentation

| Document | Contents |
|----------|----------|
| [Documentation index](./docs/README.md) | Full documentation map |
| [User guide](./docs/user-guide.md) | Inputs, workflow, validation |
| [Calculation reference](./docs/calculations.md) | Neutral fibre, cylinder and straight-cone maths |
| [Eccentric cone](./docs/eccentric-cone.md) | Oblique-cone development, exports, verification |
| [Domain model](./docs/domain-model.md) | Parameters, results, types |
| [Architecture](./docs/architecture.md) | Modules, data flow, CAD pipeline |
| [Export formats](./docs/export-formats.md) | PDF, DXF, STEP, share protocol |
| [Development](./docs/development.md) | Setup, build, deploy, conventions |

---

## Project layout

```text
src/
  App.tsx                      Layout: sidebar + 2D/3D workspace
  store/useShellStore.ts       Zustand store & recalculation trigger
  features/calculator/         Inputs, results, math, STEP export UI
  features/viewer-2d/          SVG flat-pattern views
  features/viewer-3d/          Three.js scene & shell meshes
  cad/                         OpenCascade / replicad STEP pipeline
  utils/                       DXF, PDF, bend lines, solid geometry
  shareLink.ts                 Embedded host share-state protocol
```

---

## Deployment

Pushes to `main` build with Node 22 and publish `dist/` (as `app.html`) to the CAD Auto Script site under:

`static/utility-apps/cylindrical-shell-rolling`

See [docs/development.md](./docs/development.md#deployment).

---

## Scope notes

- Client-side only — no project persistence, accounts, or server API.
- No laser / plasma / waterjet **kerf** compensation; cone reported sheet size includes a **10 mm** cutting margin on the bounding box (not on DXF geometry).
- Straight-cone mode requires a meaningful diameter difference (≥ 1 mm at the neutral fibre). An eccentric cone with equal diameters is an oblique cylinder and stays in eccentric mode; equal diameters and zero eccentricity are rejected.
- STEP export initializes an OpenCascade WASM kernel on first use (progress is shown in the UI).

---

## License & attribution

Private project (`package.json`: `"private": true`). Part of the [CAD Auto Script](https://cadautoscript.com) utility suite.

**Version:** 0.22.0
