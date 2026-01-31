export interface ConePatternAngles {
    angleRad: number;
    startAngleRad: number;
    endAngleRad: number;
    startAngleDeg: number;
    endAngleDeg: number;
    largeArcFlag: 0 | 1;
}

export const CONE_PATTERN_ROTATION_DEG = 0;

export interface ConePatternPoints {
    outerStart: { x: number; y: number };
    outerEnd: { x: number; y: number };
    innerEnd: { x: number; y: number };
    innerStart: { x: number; y: number };
}

export const getConePatternAngles = (angleDeg: number, rotationDeg: number = CONE_PATTERN_ROTATION_DEG): ConePatternAngles => {
    const angleRad = (angleDeg * Math.PI) / 180;
    const rotationRad = (rotationDeg * Math.PI) / 180;
    const startAngleRad = rotationRad - angleRad / 2;
    const endAngleRad = rotationRad + angleRad / 2;

    return {
        angleRad,
        startAngleRad,
        endAngleRad,
        startAngleDeg: (startAngleRad * 180) / Math.PI,
        endAngleDeg: (endAngleRad * 180) / Math.PI,
        largeArcFlag: angleDeg > 180 ? 1 : 0
    };
};

export const getConePatternPoints = (rOut: number, rIn: number, angleDeg: number, rotationDeg: number = CONE_PATTERN_ROTATION_DEG): ConePatternPoints => {
    const { startAngleRad, endAngleRad } = getConePatternAngles(angleDeg, rotationDeg);

    const outerStart = { x: Math.cos(startAngleRad) * rOut, y: Math.sin(startAngleRad) * rOut };
    const outerEnd = { x: Math.cos(endAngleRad) * rOut, y: Math.sin(endAngleRad) * rOut };
    const innerEnd = { x: Math.cos(endAngleRad) * rIn, y: Math.sin(endAngleRad) * rIn };
    const innerStart = { x: Math.cos(startAngleRad) * rIn, y: Math.sin(startAngleRad) * rIn };

    return { outerStart, outerEnd, innerEnd, innerStart };
};

export const buildConeSvgPathData = (rOut: number, rIn: number, angleDeg: number, rotationDeg: number = CONE_PATTERN_ROTATION_DEG): string => {
    const { largeArcFlag } = getConePatternAngles(angleDeg, rotationDeg);
    const { outerStart, outerEnd, innerEnd, innerStart } = getConePatternPoints(rOut, rIn, angleDeg, rotationDeg);

    return [
        `M ${outerStart.x} ${outerStart.y}`,
        `A ${rOut} ${rOut} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
        `L ${innerEnd.x} ${innerEnd.y}`,
        `A ${rIn} ${rIn} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
        'Z'
    ].join(' ');
};
