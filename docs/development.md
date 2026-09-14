# Development Guide

Contributor and maintainer reference for Shell Rolling Master.

## Prerequisites

- **Node.js** 22 (CI uses 22; local 20+ LTS typically works)
- **npm** (lockfile: `package-lock.json`; a `pnpm-lock.yaml` may also exist — prefer `npm ci` to match CI)

## Setup

```bash
git clone <repository-url>
cd Shell-Rolling-Master
npm install
npm run dev
```

Dev server: `http://localhost:3000` (bound to `0.0.0.0`).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite HMR development server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint (TypeScript + React Hooks + Refresh) |
| `npm test` | Vitest unit tests, single run (used by CI) |
| `npm run test:watch` | Vitest in watch mode |

## Tests

Tests live next to the code they cover (`*.test.ts`) and run in Node — no
browser, WebGL or WASM is needed.

| Suite | Covers |
|-------|--------|
| `math/cylinder.test.ts` | Neutral diameter from OD/ID, developed length, K-factor, weld gap, bend lines |
| `math/cone.test.ts` | Sector radii and angle, gap on the neutral fibre, blank rectangle |
| `math/eccentric-cone.test.ts` | Development vs. independently known values (`docs/eccentric-cone.md` § 7) |
| `math/validation.test.ts` | Invalid and boundary input for every mode |
| `utils/pattern-dimensions.test.ts` | Bend-line spacing dimensions in all three shape modes |
| `shareLink.test.ts` | Share-link round trip, real link payload, hostile input |

Reference values are derived by hand from the closed-form relations in
`docs/calculations.md`, never by pasting the engine's own output. The cylinder
and cone reference cases are also published as validation cases on the
[documentation page](https://cadautoscript.com/docs/utilities/cylindrical-shell-rolling),
so change both together.

## Stack versions (declared)

| Package | Role |
|---------|------|
| React 19 / React DOM 19 | UI |
| TypeScript ~5.9 | Typing |
| Vite 7 | Bundler / dev server |
| Zustand 5 | State |
| Three.js / R3F / Drei | 3D viewport |
| replicad / replicad-opencascadejs | STEP CAD |
| jsPDF 4 | PDF reports |
| Tailwind CSS 3 | Styling |
| Lucide React | Icons |

## Project conventions

- Prefer **pure functions** for math (`src/features/calculator/math/`).
- Keep React components thin; mutate domain state only through Zustand setters.
- Shared className helper: `src/components/ui/cn.ts` (`clsx` + `tailwind-merge`).
- Dark Material-inspired palette is defined via Tailwind / utility classes in the app shell.
- CAD work that may block or allocate heavily belongs in the **Web Worker**, not the UI thread.
- Do not commit secrets. Vite defines `GEMINI_API_KEY` placeholders from env for historical reasons; this app does not require them for core features.

## Important paths

```text
src/App.tsx
src/store/useShellStore.ts
src/features/calculator/
src/features/viewer-2d/
src/features/viewer-3d/
src/cad/
src/utils/
src/shareLink.ts
vite.config.ts
.github/workflows/deploy.yml
docs/
```

## Entry HTML

| File | Role |
|------|------|
| `index.html` | Vite entry (development & build input) |
| `app.html` (repo root) | Legacy standalone artifact — not the active SPA entry |
| `dist/app.html` | Produced in CI by renaming `dist/index.html` for site embedding |

When changing the document title or meta tags for production, update `index.html` (the build source).

## Manual verification checklist

Before merging calculation or export changes:

- [ ] Cylinder OD and ID cases produce consistent neutrals for the same finished shell
- [ ] Cone with swapped large/small ends still yields valid sector radii
- [ ] Gap = 0 and gap near circumference / sector limits behave as documented
- [ ] Bend lines appear in 2D, PDF, and DXF when enabled
- [ ] DXF opens in a CAD tool with expected mm scale
- [ ] STEP opens in a CAD tool as an open-seam thick shell
- [ ] Embed share restore (if host available) recomputes matching results
- [ ] `npm run lint`, `npm test` and `npm run build` succeed

## Deployment

Pull requests run `.github/workflows/ci.yml`: `npm ci`, `npm test`, `npm run build`.

Workflow: `.github/workflows/deploy.yml`

**Trigger:** push to `main`

**Steps:**

1. Checkout source  
2. Setup Node.js 22  
3. `npm ci`  
4. `npm test` — a failing test stops the workflow before anything is built or published  
5. `npm run build` && `mv dist/index.html dist/app.html`  
6. Push `dist/` to `YurMil/cadautoscript.com` at  
   `static/utility-apps/cylindrical-shell-rolling`  
   using `DEPLOY_TOKEN` (`API_TOKEN_GITHUB`)

Public path (site):

```text
https://cadautoscript.com/static/utility-apps/cylindrical-shell-rolling/app.html
```

## Documentation maintenance

When changing behaviour:

| Change type | Update |
|-------------|--------|
| Inputs / validation | `docs/user-guide.md`, `docs/domain-model.md` |
| Formulas | `docs/calculations.md` |
| Modules / data flow | `docs/architecture.md` |
| PDF / DXF / STEP / share | `docs/export-formats.md` |
| Scripts / CI | `docs/development.md`, root `README.md` |
| Version bump | `package.json`, root `README.md`, `docs/README.md` |

Keep the root **README** as the product-facing overview; keep `docs/` as the systematic technical set.
