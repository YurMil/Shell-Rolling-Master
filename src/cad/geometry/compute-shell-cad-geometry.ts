import { getEccentricSeam } from '../../features/calculator/math/eccentric-cone';
import { computeShellSolidGeometry } from '../../utils/shell-solid-geometry';
import type { ShellCadGeometry, ShellCadSource } from '../types/cad-types';

export const computeShellCadGeometry = ({ params, results }: ShellCadSource): ShellCadGeometry => {
    if (!results.isValid) {
        throw new Error(results.error ?? 'The current shell configuration is invalid.');
    }

    const rTopNeutral = results.d1_neutral / 2;
    const rBottomNeutral = results.d2_neutral / 2;

    if (params.mode === 'eccentric-cone') {
        const innerOffset = params.kFactor * params.thickness;
        const outerOffset = (1 - params.kFactor) * params.thickness;
        const { seamPhi, gapAngle } = getEccentricSeam(
            { gap: params.gap, seamPosition: params.seamPosition, seamAngleDeg: params.seamAngleDeg },
            rBottomNeutral,
            rTopNeutral
        );

        return {
            kind: 'eccentric',
            mode: 'eccentric-cone',
            height: params.h,
            thickness: params.thickness,
            topInnerRadius: rTopNeutral - innerOffset,
            topOuterRadius: rTopNeutral + outerOffset,
            bottomInnerRadius: rBottomNeutral - innerOffset,
            bottomOuterRadius: rBottomNeutral + outerOffset,
            eccentricity: Math.abs(params.eccentricity),
            seamPhi,
            gapAngle,
        };
    }

    const geometry = computeShellSolidGeometry({
        r1Neutral: rTopNeutral,
        r2Neutral: rBottomNeutral,
        height: params.h,
        thickness: params.thickness,
        gap: params.gap,
        kFactor: params.kFactor,
    });

    return {
        kind: 'revolved',
        mode: params.mode,
        ...geometry,
    };
};
