import { getConePatternAngles } from './cone-pattern';
import type { BendLine } from '../features/calculator/types';

export const buildCylinderBendLines = (flatLength: number, flatWidth: number, count: number): BendLine[] => {
    if (!isFinite(flatLength) || !isFinite(flatWidth) || flatLength <= 0 || flatWidth <= 0 || count <= 0) {
        return [];
    }

    const step = flatLength / (count + 1);
    const lines: BendLine[] = [];
    for (let i = 1; i <= count; i += 1) {
        const x = -flatLength / 2 + step * i;
        lines.push({ x1: x, y1: -flatWidth / 2, x2: x, y2: flatWidth / 2 });
    }

    return lines;
};

export const buildConeBendLines = (
    rOut: number,
    rIn: number,
    angleDeg: number,
    rotationDeg: number | undefined,
    count: number
): BendLine[] => {
    if (!isFinite(rOut) || !isFinite(rIn) || !isFinite(angleDeg) || rOut <= 0 || rIn < 0 || angleDeg <= 0 || count <= 0) {
        return [];
    }

    const { startAngleRad, endAngleRad } = getConePatternAngles(angleDeg, rotationDeg);
    const step = (endAngleRad - startAngleRad) / (count + 1);
    const lines: BendLine[] = [];

    for (let i = 1; i <= count; i += 1) {
        const theta = startAngleRad + step * i;
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);
        lines.push({
            x1: cos * rIn,
            y1: sin * rIn,
            x2: cos * rOut,
            y2: sin * rOut
        });
    }

    return lines;
};
