import type { CalculationResult, ShellParameters } from '../types';

export const isValidDimension = (val: number): boolean => {
    return typeof val === 'number' && isFinite(val) && val > 0;
};

export const buildInvalidResult = (message: string): CalculationResult => ({
    isValid: false,
    d1_neutral: 0,
    d2_neutral: 0,
    flatLength: 0,
    flatWidth: 0,
    shape: 'rect',
    error: message
});

export const validateBaseParams = (params: ShellParameters): string | null => {
    const { mode, d1, d2, h, thickness, kFactor } = params;

    if (!isValidDimension(d1) || !isValidDimension(h) || !isValidDimension(thickness) || !isValidDimension(kFactor)) {
        return 'Invalid input dimensions. All values must be positive numbers.';
    }

    if (mode === 'cone' && !isValidDimension(d2)) {
        return 'Invalid input dimensions. D2 must be positive for cone mode.';
    }

    return null;
};

export const calculateNeutralDiameters = (params: ShellParameters): { d1_n: number; d2_n: number } => {
    const { mode, specType, d1, d2, thickness, kFactor } = params;
    const offset = 2 * kFactor * thickness;

    let d1_n = 0;
    let d2_n = 0;

    if (specType === 'ID') {
        d1_n = d1 + offset;
        d2_n = mode === 'cone' ? d2 + offset : d1_n;
    } else {
        const sub = 2 * thickness * (1 - kFactor);
        d1_n = d1 - sub;
        d2_n = mode === 'cone' ? d2 - sub : d1_n;
    }

    return { d1_n, d2_n };
};

export const validateNeutralThickness = (mode: ShellParameters['mode'], thickness: number, r1_n: number, r2_n: number): string | null => {
    if (thickness >= r1_n) {
        return 'Thickness is too large. It must be smaller than the neutral radius to be physically possible.';
    }

    if (mode === 'cone' && thickness >= r2_n) {
        return 'Thickness is too large. It must be smaller than the neutral radius to be physically possible.';
    }

    return null;
};

export const buildBaseResult = (params: ShellParameters, d1_n: number, d2_n: number): CalculationResult => ({
    isValid: true,
    d1_neutral: d1_n,
    d2_neutral: d2_n,
    flatLength: 0,
    flatWidth: params.h,
    shape: 'rect'
});
