import type { ShapeType, ShellParameters, CalculationResult } from '../../features/calculator/types';
import type { ShellSolidGeometry } from '../../utils/shell-solid-geometry';

/** Cylinder and straight cone: a revolved profile with an angular gap cut. */
export type RevolvedShellCadGeometry = ShellSolidGeometry & {
    kind: 'revolved';
    mode: Extract<ShapeType, 'cylinder' | 'cone'>;
};

/** Eccentric cone: a ruled loft between two offset circles. */
export interface EccentricConeCadGeometry {
    kind: 'eccentric';
    mode: Extract<ShapeType, 'eccentric-cone'>;
    height: number;
    thickness: number;
    topInnerRadius: number;
    topOuterRadius: number;
    bottomInnerRadius: number;
    bottomOuterRadius: number;
    /** Lateral offset of the top circle centre along +X. */
    eccentricity: number;
    /** Angular position of the seam centre (rad). */
    seamPhi: number;
    /** Angular width of the weld gap (rad). */
    gapAngle: number;
}

export type ShellCadGeometry = RevolvedShellCadGeometry | EccentricConeCadGeometry;

export interface ShellCadSource {
    params: Pick<
        ShellParameters,
        'mode' | 'h' | 'thickness' | 'gap' | 'kFactor' | 'eccentricity' | 'seamPosition' | 'seamAngleDeg'
    >;
    results: CalculationResult;
}
