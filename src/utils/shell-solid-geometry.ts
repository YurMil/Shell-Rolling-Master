const DEFAULT_SHELL_K_FACTOR = 0.44;
const DEFAULT_SEAM_CENTER_ANGLE = Math.PI / 2;
const MIN_ALLOWED_ANGLE = 0.0001;

export interface ShellSolidGeometryInput {
    r1Neutral: number;
    r2Neutral: number;
    height: number;
    thickness: number;
    gap: number;
    kFactor?: number;
    seamCenterAngle?: number;
}

export interface ShellSolidGeometry {
    height: number;
    thickness: number;
    referenceNeutralRadius: number;
    topInnerRadius: number;
    topOuterRadius: number;
    bottomInnerRadius: number;
    bottomOuterRadius: number;
    seamCenterAngle: number;
    gapAngle: number;
    thetaStart: number;
    thetaEnd: number;
    thetaLength: number;
}

export const computeShellSolidGeometry = ({
    r1Neutral,
    r2Neutral,
    height,
    thickness,
    gap,
    kFactor = DEFAULT_SHELL_K_FACTOR,
    seamCenterAngle = DEFAULT_SEAM_CENTER_ANGLE,
}: ShellSolidGeometryInput): ShellSolidGeometry => {
    const innerOffset = kFactor * thickness;
    const outerOffset = (1 - kFactor) * thickness;

    const topInnerRadius = r1Neutral - innerOffset;
    const topOuterRadius = r1Neutral + outerOffset;
    const bottomInnerRadius = r2Neutral - innerOffset;
    const bottomOuterRadius = r2Neutral + outerOffset;

    const referenceNeutralRadius = Math.max(r1Neutral, r2Neutral);
    let gapAngle = 0;

    if (referenceNeutralRadius > 0) {
        gapAngle = gap / referenceNeutralRadius;
    }

    const maxGapAngle = Math.max(MIN_ALLOWED_ANGLE, (2 * Math.PI) - MIN_ALLOWED_ANGLE);
    if (gapAngle > maxGapAngle) {
        gapAngle = maxGapAngle;
    }

    const thetaStart = seamCenterAngle + gapAngle / 2;
    const thetaLength = (2 * Math.PI) - gapAngle;
    const thetaEnd = thetaStart + thetaLength;

    return {
        height,
        thickness,
        referenceNeutralRadius,
        topInnerRadius,
        topOuterRadius,
        bottomInnerRadius,
        bottomOuterRadius,
        seamCenterAngle,
        gapAngle,
        thetaStart,
        thetaEnd,
        thetaLength,
    };
};
