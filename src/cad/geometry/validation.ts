import type { ShellCadGeometry } from '../types/cad-types';

const assertPositive = (value: number, label: string) => {
    if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`${label} must be a positive number for STEP export.`);
    }
};

export const assertValidShellCadGeometry = (geometry: ShellCadGeometry) => {
    assertPositive(geometry.height, 'Shell height');
    assertPositive(geometry.thickness, 'Shell thickness');
    assertPositive(geometry.topInnerRadius, 'Top inner radius');
    assertPositive(geometry.topOuterRadius, 'Top outer radius');
    assertPositive(geometry.bottomInnerRadius, 'Bottom inner radius');
    assertPositive(geometry.bottomOuterRadius, 'Bottom outer radius');

    if (geometry.topOuterRadius <= geometry.topInnerRadius) {
        throw new Error('Top outer radius must be larger than top inner radius.');
    }

    if (geometry.bottomOuterRadius <= geometry.bottomInnerRadius) {
        throw new Error('Bottom outer radius must be larger than bottom inner radius.');
    }

    if (!Number.isFinite(geometry.gapAngle) || geometry.gapAngle < 0 || geometry.gapAngle >= (2 * Math.PI)) {
        throw new Error('Gap angle is outside the valid range for STEP export.');
    }

    if (!Number.isFinite(geometry.thetaLength) || geometry.thetaLength <= 0) {
        throw new Error('Shell angular span must be larger than zero.');
    }
};
