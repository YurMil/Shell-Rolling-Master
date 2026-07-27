import type { CalculationResult, Point2D, ShellParameters } from '../features/calculator/types';
import { getConePatternPoints } from './cone-pattern';

/**
 * One marking station of a flat pattern: the two endpoints of a bend line, or
 * of a seam edge.
 *
 * `a` is the edge the pattern is dimensioned from first (bottom edge of a
 * cylinder blank, outer arc of a cone sector, developed bottom edge of an
 * eccentric cone); `b` is the opposite one.
 */
export interface PatternStation {
    a: Point2D;
    b: Point2D;
}

/**
 * Stations across the whole pattern, seam edge to seam edge, with the bend
 * lines in between — the chain a dimension run is built from.
 *
 * Returns an empty array when the mode has no usable pattern or no bend lines
 * are enabled. Coordinates are the same pattern-space coordinates the 2D view
 * and the DXF writer already use.
 */
export const getPatternStations = (
    params: ShellParameters,
    result: CalculationResult
): PatternStation[] => {
    if (!result.isValid) return [];

    if (params.mode === 'eccentric-cone') {
        return result.eccentric?.stations.map(station => ({ a: station.bottom, b: station.top })) ?? [];
    }

    const bendLines = result.bendLines ?? [];

    if (params.mode === 'cylinder') {
        const width = result.flatLength;
        const height = result.flatWidth;
        if (!(width > 0) || !(height > 0)) return [];

        // buildCylinderBendLines emits (x, -h/2) -> (x, +h/2), left to right.
        const edge = (x: number): PatternStation => ({
            a: { x, y: -height / 2 },
            b: { x, y: height / 2 }
        });

        return [
            edge(-width / 2),
            ...bendLines.map(line => ({ a: { x: line.x1, y: line.y1 }, b: { x: line.x2, y: line.y2 } })),
            edge(width / 2)
        ];
    }

    const { rOut, rIn, angle, patternRotationDeg } = result;
    if (!rOut || rIn === undefined || !angle || angle <= 0) return [];

    const { outerStart, outerEnd, innerStart, innerEnd } = getConePatternPoints(
        rOut,
        rIn,
        angle,
        patternRotationDeg
    );

    // buildConeBendLines emits inner -> outer, from the start angle upwards.
    return [
        { a: outerStart, b: innerStart },
        ...bendLines.map(line => ({ a: { x: line.x2, y: line.y2 }, b: { x: line.x1, y: line.y1 } })),
        { a: outerEnd, b: innerEnd }
    ];
};

/**
 * Whether both edges carry their own dimension run.
 *
 * On a cylinder blank the two edges are parallel, so a second run would only
 * repeat the same numbers; on a cone (straight or eccentric) the two arcs have
 * different chord lengths and both are needed for marking out.
 */
export const dimensionBothEdges = (mode: ShellParameters['mode']): boolean => mode !== 'cylinder';
