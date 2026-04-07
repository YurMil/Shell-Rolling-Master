import { computeShellSolidGeometry } from '../../utils/shell-solid-geometry';
import type { ShellCadGeometry, ShellCadSource } from '../types/cad-types';

export const computeShellCadGeometry = ({ params, results }: ShellCadSource): ShellCadGeometry => {
    if (!results.isValid) {
        throw new Error(results.error ?? 'The current shell configuration is invalid.');
    }

    const geometry = computeShellSolidGeometry({
        r1Neutral: results.d1_neutral / 2,
        r2Neutral: results.d2_neutral / 2,
        height: params.h,
        thickness: params.thickness,
        gap: params.gap,
        kFactor: params.kFactor,
    });

    return {
        mode: params.mode,
        ...geometry,
    };
};
