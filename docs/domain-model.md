# Domain Model

Canonical types and state fields used by Shell Rolling Master.

Primary definition: `src/features/calculator/types.ts`  
Store: `src/store/useShellStore.ts`

---

## Shape and specification enums

Declared as runtime tuples with the unions derived from them, so any code that
validates a value arriving from outside the app (share links, query parameters)
iterates the same source of truth the type is built from:

```ts
const SHAPE_TYPES = ['cylinder', 'cone', 'eccentric-cone'] as const;
const SPEC_TYPES = ['OD', 'ID'] as const;
const SEAM_POSITIONS = ['short', 'long', 'custom'] as const;

type ShapeType = typeof SHAPE_TYPES[number];
type SpecType = typeof SPEC_TYPES[number];
type SeamPosition = typeof SEAM_POSITIONS[number];
```

| Value | Meaning |
|-------|---------|
| `cylinder` | Constant neutral diameter; rectangular blank |
| `cone` | Straight frustum; annular-sector blank |
| `eccentric-cone` | Oblique frustum (offset axes); free-form blank from an exact isometric development |
| `OD` | Entered diameters are outer diameters |
| `ID` | Entered diameters are inner diameters |
| `short` / `long` | Seam on the shortest / longest ruling (computed from the sign of `R2 − R1`) |
| `custom` | Seam at `seamAngleDeg` |

---

## ShellParameters

Input set driving every calculation and export.

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `mode` | `ShapeType` | — | Development mode |
| `specType` | `SpecType` | — | Diameter basis |
| `d1` | `number` | mm | Top / main diameter |
| `d2` | `number` | mm | Bottom diameter (cone) |
| `h` | `number` | mm | Axial height / cylinder blank width |
| `thickness` | `number` | mm | Plate thickness |
| `kFactor` | `number` | — | Neutral-axis position (0–1) |
| `gap` | `number` | mm | Weld / seam opening |
| `bendLinesEnabled` | `boolean` | — | Emit roll guide lines |
| `bendLinesCount` | `number` | — | Number of guide lines when enabled (cylinder / cone) |
| `eccentricity` | `number` | mm | Lateral offset of the top circle centre along +X (eccentric cone) |
| `seamPosition` | `SeamPosition` | — | Where the development is cut open |
| `seamAngleDeg` | `number` | deg | Seam angle when `seamPosition` is `'custom'` |
| `stationCount` | `number` | — | Layout stations = bend lines + 1 (8–360); also the report table grid |
| `density` | `number` | kg/m³ | Material density used for the blank mass |
| `bendDimensionsEnabled` | `boolean` | — | Dimension the chords between bend-line endpoints |
| `bendDimensionOffset` | `number` | mm | Distance from the edge to the dimension line |

### Default store values

| Field | Default |
|-------|---------|
| `mode` | `'cylinder'` |
| `specType` | `'OD'` |
| `d1` | `2000` |
| `d2` | `1500` |
| `h` | `2500` |
| `thickness` | `15` |
| `kFactor` | `0.44` |
| `gap` | `2` |
| `bendLinesEnabled` | `false` |
| `bendLinesCount` | (store default; typically ≥ 1 when enabled) |
| `eccentricity` | `250` |
| `seamPosition` | `'short'` |
| `seamAngleDeg` | `0` |
| `stationCount` | `24` |
| `density` | `7850` |
| `bendDimensionsEnabled` | `false` |
| `bendDimensionOffset` | `120` |

---

## CalculationResult

Output of `calculateShell` (via cylinder / cone math modules).

| Field | Type | Description |
|-------|------|-------------|
| `isValid` | `boolean` | Whether results are usable |
| `error` | `string?` | Human-readable failure reason |
| `d1_neutral` | `number` | Neutral diameter at end 1 |
| `d2_neutral` | `number` | Neutral diameter at end 2 |
| `flatLength` | `number` | Developed length (cylinder) or padded bbox width (cone) |
| `flatWidth` | `number` | Blank height (cylinder) or padded bbox height (cone) |
| `shape` | `'rect' \| 'sector'` | Pattern topology |
| `angle` | `number?` | Cone sector angle (degrees) |
| `rOut` | `number?` | Cone outer pattern radius |
| `rIn` | `number?` | Cone inner pattern radius |
| `patternRotationDeg` | `number?` | Pattern orientation for min bbox / landscape |
| `bendLines` | `BendLine[]?` | Guide segments in pattern coordinates |
| `bendStep` | `number?` | Spacing between guides along developed length / neutral arc |
| `bboxWidth` | `number?` | Reported bounding width |
| `bboxHeight` | `number?` | Reported bounding height |
| `bboxMinX` | `number?` | Bounding box origin X |
| `bboxMinY` | `number?` | Bounding box origin Y |

### BendLine

```ts
interface BendLine {
  x1: number; y1: number;
  x2: number; y2: number;
}
```

Coordinates are in the 2D pattern space used by SVG and DXF writers.

---

## View state

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `viewMode` | string | `'3d'` \| `'2d'` | Active viewport (in-memory only) |

State is **not** persisted to `localStorage` or a project file. Host embedding can restore inputs via the share protocol ([export-formats.md](./export-formats.md#share-state-protocol)).

---

## CAD source payload

STEP export packages a subset of parameters with a valid `CalculationResult`:

```ts
interface ShellCadSource {
  params: Pick<ShellParameters, 'mode' | 'h' | 'thickness' | 'gap' | 'kFactor'>;
  results: CalculationResult;
}
```

Geometry derivation: `src/cad/geometry/compute-shell-cad-geometry.ts`  
Solid build: `src/cad/geometry/build-shell-solid.ts`

---

## Shared params (embed protocol)

Serialized for host sync (inputs only; results recomputed on restore):

```ts
type SharedParams = ShellParameters;
```

Every input parameter is shared — the payload *is* `ShellParameters`. Parsing
and serialisation go through a
`Record<keyof ShellParameters, ParamApplier>` table, so adding an input
parameter does not compile until it is wired into the protocol, and the payload
cannot drift from the parameter set.

Schema version: **1** (`src/shareLink.ts`); versions `1` and `2` are accepted on
restore. See [export-formats.md](./export-formats.md#share-state-protocol).

---

## Calculation entry point

```text
validateBaseParams
  → calculateNeutralDiameters
  → validateNeutralThickness
  → calculateCylinder | calculateCone
  → CalculationResult
```

Orchestration lives in the calculator math index and the Zustand store setters, which sanitize fields and invoke recalculation after each change.
