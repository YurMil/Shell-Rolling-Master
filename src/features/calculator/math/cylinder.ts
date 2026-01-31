import type { CalculationResult, ShellParameters } from '../types';
import { buildCylinderBendLines } from '../../../utils/bend-lines';

export const calculateCylinder = (params: ShellParameters, base: CalculationResult): CalculationResult => {
    const { gap, h } = params;
    const circumference = Math.PI * base.d1_neutral;

    if (circumference <= gap) {
        return { ...base, isValid: false, error: 'Gap is larger than circumference!' };
    }

    const flatLength = circumference - gap;

    const bendLines = params.bendLinesEnabled
        ? buildCylinderBendLines(flatLength, h, params.bendLinesCount)
        : [];
    const bendStep = params.bendLinesEnabled && params.bendLinesCount > 0
        ? flatLength / (params.bendLinesCount + 1)
        : undefined;

    return {
        ...base,
        flatLength,
        flatWidth: h,
        shape: 'rect',
        bendLines,
        bendStep,
        bboxWidth: flatLength,
        bboxHeight: h,
        bboxMinX: -flatLength / 2,
        bboxMinY: -h / 2
    };
};
