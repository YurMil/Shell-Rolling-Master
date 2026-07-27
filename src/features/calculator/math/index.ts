import type { CalculationResult, ShellParameters } from '../types';
import { calculateCone } from './cone';
import { calculateCylinder } from './cylinder';
import { calculateEccentricCone } from './eccentric-cone';
import { buildBaseResult, buildInvalidResult, calculateNeutralDiameters, validateBaseParams, validateNeutralThickness } from './shared';

export const calculateShell = (params: ShellParameters): CalculationResult => {
    const baseError = validateBaseParams(params);
    if (baseError) {
        return buildInvalidResult(baseError);
    }

    const { d1_n, d2_n } = calculateNeutralDiameters(params);
    const r1_n = d1_n / 2;
    const r2_n = d2_n / 2;

    const thicknessError = validateNeutralThickness(params.mode, params.thickness, r1_n, r2_n);
    if (thicknessError) {
        return buildInvalidResult(thicknessError);
    }

    const base = buildBaseResult(params, d1_n, d2_n);

    if (params.mode === 'cylinder') {
        return calculateCylinder(params, base);
    }

    if (params.mode === 'eccentric-cone') {
        return calculateEccentricCone(params, base);
    }

    return calculateCone(params, base);
};

export { calculateCylinder } from './cylinder';
export { calculateCone } from './cone';
export { calculateEccentricCone } from './eccentric-cone';
