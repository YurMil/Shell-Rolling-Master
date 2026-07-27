# Documentation

Technical documentation for **Shell Rolling Master** — a browser-based calculator for cylindrical and conical plate-shell flat-pattern development.

## Contents

| Document | Audience | Description |
|----------|----------|-------------|
| [User guide](./user-guide.md) | Fabricators, estimators | Inputs, workflow, validation rules, viewing modes |
| [Calculation reference](./calculations.md) | Engineers | Neutral-fibre theory, cylinder and cone algorithms |
| [Domain model](./domain-model.md) | Developers | Parameter and result schemas, defaults, types |
| [Architecture](./architecture.md) | Developers | Module map, data flow, CAD worker pipeline |
| [Export formats](./export-formats.md) | Developers / CAD users | PDF, DXF, STEP, embed share protocol |
| [Development](./development.md) | Contributors | Environment, scripts, build, CI/CD |

## Product summary

Shell Rolling Master develops **open-seam** shells from plate:

1. Accept OD or ID diameters, height, thickness, K-factor, and weld gap.
2. Compute **neutral diameters** and the flat blank (rectangle or annular sector).
3. Visualize a thick 3D shell and a dimensioned 2D pattern.
4. Export PDF reports, DXF cut paths, and STEP solids.

All processing runs in the browser. Current version: **0.21.0**.

## Recommended reading order

1. Start with the [user guide](./user-guide.md) for operational behaviour.
2. Read [calculations](./calculations.md) for engineering definitions.
3. Use [domain model](./domain-model.md) and [architecture](./architecture.md) when extending code.
4. Consult [export formats](./export-formats.md) when integrating CAD or host shells.
5. Follow [development](./development.md) for local setup and deployment.
