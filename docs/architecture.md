# Architecture

Technical architecture of Shell Rolling Master (v0.21.0).

## Runtime model

| Aspect | Choice |
|--------|--------|
| Delivery | Static SPA (Vite), relative `base: './'` |
| Runtime | Browser only — no application server |
| State | In-memory Zustand store |
| CAD | Module Web Worker + OpenCascade WASM (replicad) |
| Hosting | Static files; GitHub Actions deploys to site repo |

## High-level diagram

```text
┌─────────────────────────────────────────────────────────────┐
│                         App.tsx                             │
│  ┌──────────────┐    ┌───────────────────────────────────┐  │
│  │ InputPanel   │    │  ViewToggle → Scene | PatternView │  │
│  │ ResultsCard  │    │  (3D R3F / 2D SVG)                 │  │
│  │ Exports      │    └───────────────────────────────────┘  │
│  └──────┬───────┘                                           │
│         │ set* / results                                    │
│         ▼                                                   │
│  ┌──────────────────┐                                       │
│  │  useShellStore   │── calculateShell (math/*)             │
│  └────────┬─────────┘                                       │
│           │                                                 │
│     ┌─────┴─────┬──────────────┬────────────┐               │
│     ▼           ▼              ▼            ▼               │
│   PDF util   DXF util   buildShellGeometry  CAD worker      │
│                                      (Three.js)  (STEP)     │
└─────────────────────────────────────────────────────────────┘
```

## Module map

| Path | Responsibility |
|------|----------------|
| `src/main.tsx` | React bootstrap; initializes share-link listeners |
| `src/App.tsx` | Responsive shell: sidebar + workspace |
| `src/store/useShellStore.ts` | Parameters, results, view mode; setters trigger recalc |
| `src/features/calculator/` | UI inputs, results, math, STEP button |
| `src/features/calculator/math/` | Pure development algorithms |
| `src/features/viewer-2d/` | SVG pattern renderers |
| `src/features/viewer-3d/` | R3F scene, meshes, view cube |
| `src/cad/` | CAD geometry, worker client, STEP export |
| `src/utils/` | DXF, PDF, bend lines, solid geometry helpers |
| `src/shareLink.ts` | `postMessage` embed protocol |
| `src/components/ui/` | Shared UI primitives (`ViewToggle`, `cn`, etc.) |

## Data flow

1. **Input** — `InputPanel` calls store setters (`setD1`, `setMode`, …).
2. **Sanitize** — setters clamp / coerce values as defined in the store.
3. **Calculate** — `calculateShell` validates, computes neutrals, dispatches cylinder or cone math.
4. **Publish** — `results: CalculationResult` updates subscribers.
5. **Render** — results card, 2D pattern, and 3D mesh consume the same result object.
6. **Export** — PDF/DXF read store state synchronously; STEP sends derived CAD geometry to the worker.

Results are never stored in share links or host messages — only inputs are serialized; results are always recomputed.

## Calculator layer

```text
math/index.ts
  shared.ts      validateBaseParams, calculateNeutralDiameters, …
  cylinder.ts    rectangle blank + bend lines
  cone.ts        sector blank + MBR + CUT_MARGIN
```

Math modules are intentionally pure (no React). Bend-line geometry is shared via `src/utils/bend-lines.ts`.

## Visualization

### 3D (`features/viewer-3d`)

- `Scene.tsx` — canvas, lights, grid, orbit controls, auto-fit
- `ShellMesh` / `CylinderShellMesh` / `ConeShellMesh` — mode-specific meshes
- `geometry/buildShellGeometry.ts` — thick open-seam buffer geometry (~64 segments)
- `ViewCube.tsx` — orientation widget

Solid radii use the same K-factor offsets as the CAD path (`shell-solid-geometry.ts`).

### 2D (`features/viewer-2d`)

- `PatternView.tsx` — switches cylinder / cone pattern components
- Dimensioned SVG for shop preview; bend lines optional

## CAD / STEP pipeline

```text
UI (StepExportButton)
  → computeShellCadGeometry(params, results)
  → useShellCad / cad-worker-client
  → cad-worker.ts (Web Worker)
       ├─ lazy-load replicad + opencascade WASM
       ├─ build-shell-solid (revolve profile − seam wedge)
       └─ solid.blobSTEP() → ArrayBuffer → download
```

Progress stages: `init` → `geometry` → `export`.  
The worker warms up on mount to reduce first-click latency. Errors are returned per request without crashing the main UI thread.

Key files:

| File | Role |
|------|------|
| `cad/hooks/useShellCad.ts` | React bridge to worker |
| `cad/services/cad-worker.ts` | Worker entry |
| `cad/services/cad-worker-client.ts` | Main-thread client |
| `cad/services/cad-worker-protocol.ts` | Message types |
| `cad/geometry/compute-shell-cad-geometry.ts` | Parametric CAD radii / angles |
| `cad/geometry/build-shell-solid.ts` | OpenCascade solid construction |
| `cad/geometry/validation.ts` | Pre-export geometry checks |

## State management conventions

- Zustand is the single source of truth for shell parameters and results.
- Side effects for sharing (`shareLink.ts`) subscribe to the store and debounce updates (300 ms).
- View mode is ephemeral UI state in the same store.
- No undo stack, no autosave, no remote sync beyond optional host `postMessage`.

## Build & chunking

Vite configuration highlights (`vite.config.ts`):

- Dev server: port **3000**, host `0.0.0.0`
- `base: './'` for relative assets
- Manual chunk `three-vendor` for Three.js
- Workers emitted as ES modules (`worker.format: 'es'`)
- Path alias `@` → project root

## Extension seams

| Goal | Preferred seam |
|------|----------------|
| New development formula | Add pure function under `math/` + wire in index |
| New export format | New util + button in calculator panel; reuse `CalculationResult` |
| Persist projects | Serialize `SharedParams` (or full store inputs); rehydrate via setters |
| Kerf compensation | Apply in math before DXF; keep PDF/bbox reporting explicit |
| Alternate materials | Parameterise K defaults; keep core math unchanged |

## Known architectural constraints

- Duplicate geometry paths: lightweight Three.js mesh vs OpenCascade solid (kept consistent via shared offset helpers).
- Legacy `app.html` at repo root is not the Vite entry; production deploy renames `dist/index.html` → `dist/app.html`.
- No automated test suite; rely on lint and manual verification for releases.
- `process.env.GEMINI_API_KEY` is defined in Vite config for historical template reasons; the shell calculator does not call Gemini APIs.
