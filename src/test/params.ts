import type { ShellParameters } from '../features/calculator/types';

/**
 * Baseline for the engine tests: the DN 2000 / 15 mm shell used as the worked
 * example on the documentation page. Each test overrides only what it varies.
 */
export const BASE_PARAMS: ShellParameters = {
    mode: 'cylinder',
    specType: 'OD',
    d1: 2000,
    d2: 1500,
    h: 2500,
    thickness: 15,
    kFactor: 0.44,
    gap: 2,
    bendLinesEnabled: false,
    bendLinesCount: 0,
    eccentricity: 250,
    seamPosition: 'short',
    seamAngleDeg: 0,
    stationCount: 24,
    density: 7850,
    bendDimensionsEnabled: false,
    bendDimensionOffset: 120
};

export const shellParams = (overrides: Partial<ShellParameters> = {}): ShellParameters => ({
    ...BASE_PARAMS,
    ...overrides
});
