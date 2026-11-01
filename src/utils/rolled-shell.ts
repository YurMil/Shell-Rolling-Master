import type { CalculationResult, ShapeType, ShellParameters, SpecType } from '../features/calculator/types';
import { getEccentricSeam } from '../features/calculator/math/eccentric-cone';
import { computeShellSolidGeometry } from './shell-solid-geometry';

/** One end ring of the rolled shell. */
export interface RolledRim {
    outerDiameter: number;
    innerDiameter: number;
    neutralDiameter: number;
    /** Centre of the ring along X — the eccentricity direction; 0 for the bottom ring. */
    centerX: number;
}

/**
 * Finished-part dimensions of the shell after rolling, i.e. what a drawing of
 * the rolled part shows (as opposed to the flat blank).
 *
 * Shared by the 3D dimension overlay and the "rolled part" sheet of the PDF
 * report, so the two always show the same numbers. Coordinates follow the 3D
 * preview: Y is the shell axis, the top ring is offset by `eccentricity`
 * along +X, and plan angles are measured from +X towards −Z (counter-clockwise
 * seen from above).
 */
export interface RolledShell {
    mode: ShapeType;
    specType: SpecType;
    top: RolledRim;
    bottom: RolledRim;
    height: number;
    thickness: number;
    eccentricity: number;
    /** Specified weld gap: the opening on the neutral fibre at mid-height. */
    gap: number;
    /**
     * Actual seam opening at each end on the neutral fibre. Both cone modes cut
     * the gap as a constant angle of the development, so it scales with the ring
     * radius: g·2r / (rTop + rBottom). Equal to `gap` for a cylinder.
     */
    gapTop: number;
    gapBottom: number;
    /** Seam centre in plan, degrees. */
    seamAngleDeg: number;
    /** Mid-surface generatrix length; min and max differ only for the eccentric cone. */
    slantMin: number;
    slantMax: number;
    /** Wall inclination to the shell axis, degrees; 0 for a cylinder. */
    halfAngleMinDeg: number;
    halfAngleMaxDeg: number;
    /** Developed (mid-surface) area of the blank, mm². */
    surfaceArea: number;
    /** Blank mass at `density`, kg. */
    mass: number;
    density: number;
}

/** The diameter the user specified (OD or ID) — the primary dimension on the drawing. */
export const specDiameter = (rim: RolledRim, specType: SpecType): number =>
    specType === 'OD' ? rim.outerDiameter : rim.innerDiameter;

/** The other diameter, shown as a reference dimension. */
export const referenceDiameter = (rim: RolledRim, specType: SpecType): number =>
    specType === 'OD' ? rim.innerDiameter : rim.outerDiameter;

const rim = (neutralRadius: number, params: ShellParameters, centerX: number): RolledRim => ({
    outerDiameter: 2 * (neutralRadius + (1 - params.kFactor) * params.thickness),
    innerDiameter: 2 * (neutralRadius - params.kFactor * params.thickness),
    neutralDiameter: 2 * neutralRadius,
    centerX
});

const toDeg = (rad: number) => (rad * 180) / Math.PI;

export const computeRolledShell = (
    params: ShellParameters,
    result: CalculationResult
): RolledShell | null => {
    if (!result.isValid) return null;

    const rTop = result.d1_neutral / 2;
    const rBottom = result.d2_neutral / 2;
    const eccentricity = params.mode === 'eccentric-cone' ? Math.abs(params.eccentricity) : 0;

    let seamAngleDeg: number;
    let slantMin: number;
    let slantMax: number;
    let halfAngleMinDeg: number;
    let halfAngleMaxDeg: number;
    let surfaceArea: number;

    if (params.mode === 'eccentric-cone') {
        const development = result.eccentric;
        if (!development) return null;

        seamAngleDeg = toDeg(getEccentricSeam(params, rBottom, rTop).seamPhi);
        slantMin = development.minRuling.length;
        slantMax = development.maxRuling.length;
        halfAngleMinDeg = development.halfAngleMinDeg;
        halfAngleMaxDeg = development.halfAngleMaxDeg;
        surfaceArea = development.surfaceArea;
    } else {
        seamAngleDeg = toDeg(computeShellSolidGeometry({
            r1Neutral: rTop,
            r2Neutral: rBottom,
            height: params.h,
            thickness: params.thickness,
            gap: params.gap,
            kFactor: params.kFactor
        }).seamCenterAngle);

        const dr = Math.abs(rTop - rBottom);
        slantMin = slantMax = Math.hypot(params.h, dr);
        halfAngleMinDeg = halfAngleMaxDeg = toDeg(Math.atan2(dr, params.h));

        if (params.mode === 'cylinder') {
            surfaceArea = result.flatLength * params.h;
        } else {
            const rOut = result.rOut ?? 0;
            const rIn = result.rIn ?? 0;
            surfaceArea = ((result.angle ?? 0) * Math.PI / 180) * (rOut * rOut - rIn * rIn) / 2;
        }
    }

    return {
        mode: params.mode,
        specType: params.specType,
        top: rim(rTop, params, eccentricity),
        bottom: rim(rBottom, params, 0),
        height: params.h,
        thickness: params.thickness,
        eccentricity,
        gap: params.gap,
        gapTop: (params.gap * 2 * rTop) / (rTop + rBottom),
        gapBottom: (params.gap * 2 * rBottom) / (rTop + rBottom),
        seamAngleDeg,
        slantMin,
        slantMax,
        halfAngleMinDeg,
        halfAngleMaxDeg,
        surfaceArea,
        mass: (surfaceArea * params.thickness * params.density) / 1e9,
        density: params.density
    };
};

/** Seam opening as printed on the drawing: one value, or top / bottom when the ends differ. */
export const formatSeamGap = (shell: RolledShell): string =>
    formatDimension(shell.gapTop) === formatDimension(shell.gapBottom)
        ? formatDimension(shell.gapTop)
        : `${formatDimension(shell.gapTop)} / ${formatDimension(shell.gapBottom)}`;

/** Formats a length the way the drawing prints it: integers stay bare, the rest gets one decimal. */
export const formatDimension = (value: number): string => {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1);
};
