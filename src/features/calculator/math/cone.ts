import type { CalculationResult, ShellParameters } from '../types';
import { buildConeBendLines } from '../../../utils/bend-lines';

// Manufacturing padding for cutting operations (mm)
const CUT_MARGIN = 10;

interface BoundingBox {
    width: number;
    height: number;
    minX: number;
    minY: number;
}

interface Point2D {
    x: number;
    y: number;
}

/**
 * Rotate a point around origin by given angle (radians)
 */
const rotatePoint = (point: Point2D, angleRad: number): Point2D => {
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    return {
        x: point.x * cos - point.y * sin,
        y: point.x * sin + point.y * cos
    };
};

/**
 * Generate all significant points for the annular sector
 * Includes: 4 corners, arc extrema, and additional arc samples for accuracy
 */
const generateSectorPoints = (rOut: number, rIn: number, angleDegreesTotal: number): Point2D[] => {
    const angleRad = (angleDegreesTotal * Math.PI) / 180;
    const startAngle = -angleRad / 2;
    const endAngle = angleRad / 2;

    const points: Point2D[] = [];

    // 4 corner points
    points.push({ x: Math.cos(startAngle) * rOut, y: Math.sin(startAngle) * rOut });
    points.push({ x: Math.cos(endAngle) * rOut, y: Math.sin(endAngle) * rOut });
    points.push({ x: Math.cos(startAngle) * rIn, y: Math.sin(startAngle) * rIn });
    points.push({ x: Math.cos(endAngle) * rIn, y: Math.sin(endAngle) * rIn });

    // Check cardinal angles (0°, 90°, 180°, 270°) for arc extrema
    const cardinalAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2, -Math.PI / 2, -Math.PI];
    for (const angle of cardinalAngles) {
        if (angle >= startAngle && angle <= endAngle) {
            points.push({ x: Math.cos(angle) * rOut, y: Math.sin(angle) * rOut });
            points.push({ x: Math.cos(angle) * rIn, y: Math.sin(angle) * rIn });
        }
    }

    // Sample additional points along the arc for better accuracy (every 1 degree)
    const sampleStep = (1 * Math.PI) / 180;
    for (let angle = startAngle; angle <= endAngle; angle += sampleStep) {
        points.push({ x: Math.cos(angle) * rOut, y: Math.sin(angle) * rOut });
        points.push({ x: Math.cos(angle) * rIn, y: Math.sin(angle) * rIn });
    }

    return points;
};

/**
 * Calculate Axis-Aligned Bounding Box (AABB) for a set of points
 */
const calculateAABB = (points: Point2D[]): BoundingBox => {
    const allX = points.map(p => p.x);
    const allY = points.map(p => p.y);

    const minX = Math.min(...allX);
    const maxX = Math.max(...allX);
    const minY = Math.min(...allY);
    const maxY = Math.max(...allY);

    return {
        width: maxX - minX,
        height: maxY - minY,
        minX,
        minY
    };
};

/**
 * Calculate Minimum Bounding Rectangle (MBR) by rotating points
 * Returns the rotation angle and bounding box that minimizes area
 */
const calculateMinimumBoundingBox = (
    rOut: number, 
    rIn: number, 
    angleDegreesTotal: number
): { bbox: BoundingBox; rotationDeg: number } => {
    const basePoints = generateSectorPoints(rOut, rIn, angleDegreesTotal);
    
    let minArea = Infinity;
    let bestRotation = 0;
    let bestBbox: BoundingBox = { width: 0, height: 0, minX: 0, minY: 0 };

    // Coarse search: 0° to 90° in 1° increments
    for (let rotationDeg = 0; rotationDeg <= 90; rotationDeg += 1) {
        const rotationRad = (rotationDeg * Math.PI) / 180;
        const rotatedPoints = basePoints.map(p => rotatePoint(p, rotationRad));
        const bbox = calculateAABB(rotatedPoints);
        const area = bbox.width * bbox.height;

        if (area < minArea) {
            minArea = area;
            bestRotation = rotationDeg;
            bestBbox = bbox;
        }
    }

    // Fine-tune: Check half-degree increments around best angle
    const fineStart = Math.max(0, bestRotation - 1);
    const fineEnd = Math.min(90, bestRotation + 1);
    
    for (let rotationDeg = fineStart; rotationDeg <= fineEnd; rotationDeg += 0.5) {
        if (Math.abs(rotationDeg - bestRotation) < 0.1) continue; // Skip already checked
        
        const rotationRad = (rotationDeg * Math.PI) / 180;
        const rotatedPoints = basePoints.map(p => rotatePoint(p, rotationRad));
        const bbox = calculateAABB(rotatedPoints);
        const area = bbox.width * bbox.height;

        if (area < minArea) {
            minArea = area;
            bestRotation = rotationDeg;
            bestBbox = bbox;
        }
    }

    return { bbox: bestBbox, rotationDeg: bestRotation };
};

export const calculateCone = (params: ShellParameters, base: CalculationResult): CalculationResult => {
    const { d1_neutral, d2_neutral } = base;
    const { h, gap } = params;

    const R1 = d1_neutral / 2;
    const R2 = d2_neutral / 2;

    if (Math.abs(d1_neutral - d2_neutral) < 1.0) {
        console.warn('Cone diameters are too similar (< 1mm difference). Treating as cylinder.');
        return { ...base, isValid: false, error: 'Diameters too similar. Please use Cylinder mode or increase the diameter difference.' };
    }

    const dR = Math.abs(R2 - R1);
    const slantHeight = Math.sqrt(Math.pow(dR, 2) + Math.pow(h, 2));

    if (!isFinite(slantHeight) || slantHeight <= 0) {
        return { ...base, isValid: false, error: 'Invalid geometry: slant height calculation failed.' };
    }

    const R_large = Math.max(R1, R2);
    const R_small = Math.min(R1, R2);

    if (R_large <= R_small) {
        return { ...base, isValid: false, error: 'Invalid radius configuration.' };
    }

    const patternRadiusOuter = (slantHeight * R_large) / (R_large - R_small);
    const patternRadiusInner = patternRadiusOuter - slantHeight;

    if (!isFinite(patternRadiusOuter) || !isFinite(patternRadiusInner) || patternRadiusOuter <= 0 || patternRadiusInner < 0) {
        return { ...base, isValid: false, error: 'Invalid pattern radius calculation.' };
    }

    const initialAngle = (360 * R_large) / patternRadiusOuter;
    const currentArc = (initialAngle / 360) * 2 * Math.PI * patternRadiusOuter;
    const newArc = currentArc - gap;

    if (newArc <= 0) {
        return { ...base, isValid: false, error: 'Gap is too large for this geometry.' };
    }

    const finalAngle = (newArc / (2 * Math.PI * patternRadiusOuter)) * 360;

    if (finalAngle > 360) {
        console.warn(`Development angle (${finalAngle.toFixed(2)}°) exceeds 360°. Pattern will overlap.`);
    }

    // Calculate Minimum Bounding Rectangle (MBR) by rotating the actual sector geometry
    const { bbox, rotationDeg } = calculateMinimumBoundingBox(
        patternRadiusOuter, 
        patternRadiusInner, 
        finalAngle
    );

    let patternRotationDeg = rotationDeg;
    let adjustedBBox = bbox;

    // Force landscape orientation if best fit is portrait
    if (bbox.height > bbox.width) {
        patternRotationDeg = rotationDeg + 90;
        const rotatedPoints = generateSectorPoints(patternRadiusOuter, patternRadiusInner, finalAngle)
            .map(point => rotatePoint(point, (patternRotationDeg * Math.PI) / 180));
        adjustedBBox = calculateAABB(rotatedPoints);
    }

    // Add manufacturing padding for cutting operations
    const finalWidth = adjustedBBox.width + CUT_MARGIN;
    const finalHeight = adjustedBBox.height + CUT_MARGIN;
    const finalMinX = adjustedBBox.minX - CUT_MARGIN / 2;
    const finalMinY = adjustedBBox.minY - CUT_MARGIN / 2;

    const bendLines = params.bendLinesEnabled
        ? buildConeBendLines(patternRadiusOuter, patternRadiusInner, finalAngle, patternRotationDeg, params.bendLinesCount)
        : [];
    const neutralRadius = (patternRadiusOuter + patternRadiusInner) / 2;
    const neutralArcLength = (finalAngle / 360) * 2 * Math.PI * neutralRadius;
    const bendStep = params.bendLinesEnabled && params.bendLinesCount > 0
        ? neutralArcLength / (params.bendLinesCount + 1)
        : undefined;

    return {
        ...base,
        flatLength: finalWidth,
        flatWidth: finalHeight,
        rOut: patternRadiusOuter,
        rIn: patternRadiusInner,
        angle: finalAngle,
        patternRotationDeg,
        shape: 'sector',
        bendLines,
        bendStep,
        bboxWidth: finalWidth,
        bboxHeight: finalHeight,
        bboxMinX: finalMinX,
        bboxMinY: finalMinY
    };
};
