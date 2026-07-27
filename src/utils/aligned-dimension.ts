import type { Point2D } from '../features/calculator/types';
import type { PatternStation } from './pattern-stations';

export interface AlignedDimension {
    /** Dimension line, parallel to the measured segment. */
    line: { x1: number; y1: number; x2: number; y2: number };
    /** Extension lines from the measured points to (slightly past) the dimension line. */
    extensions: Array<{ x1: number; y1: number; x2: number; y2: number }>;
    /** Short ticks at both ends of the dimension line. */
    ticks: Array<{ x1: number; y1: number; x2: number; y2: number }>;
    text: string;
    textX: number;
    textY: number;
    /** Text rotation, in the same coordinate system as the input points. */
    angleDeg: number;
    length: number;
}

/**
 * Geometry of an aligned (parallel) dimension between two points.
 *
 * Shared by the DXF writer and the SVG preview so both show exactly the same
 * numbers and placement. The helper is coordinate-system agnostic: pass points
 * in the frame you draw in (Y-up for DXF, Y-down for SVG) and the returned
 * angle is valid for that same frame.
 *
 * `away` only selects the side of the segment the dimension is placed on; it
 * does not have to be perpendicular or normalised.
 */
export const buildAlignedDimension = (
    p1: Point2D,
    p2: Point2D,
    away: Point2D,
    offset: number,
    textHeight: number,
    label?: string
): AlignedDimension | null => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.hypot(dx, dy);

    if (!(length > 1e-6) || !isFinite(offset)) return null;

    let nx = -dy / length;
    let ny = dx / length;

    if (nx * away.x + ny * away.y < 0) {
        nx = -nx;
        ny = -ny;
    }

    const d1 = { x: p1.x + nx * offset, y: p1.y + ny * offset };
    const d2 = { x: p2.x + nx * offset, y: p2.y + ny * offset };
    const overshoot = textHeight * 0.5;
    const tick = textHeight * 0.4;

    // Tick marks drawn at 45 degrees to the dimension line, architectural style.
    const ux = dx / length;
    const uy = dy / length;
    const tx = (ux + nx) * tick * 0.5;
    const ty = (uy + ny) * tick * 0.5;

    let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (angleDeg > 90 || angleDeg < -90) angleDeg += 180;

    return {
        line: { x1: d1.x, y1: d1.y, x2: d2.x, y2: d2.y },
        extensions: [
            { x1: p1.x, y1: p1.y, x2: d1.x + nx * overshoot, y2: d1.y + ny * overshoot },
            { x1: p2.x, y1: p2.y, x2: d2.x + nx * overshoot, y2: d2.y + ny * overshoot }
        ],
        ticks: [
            { x1: d1.x - tx, y1: d1.y - ty, x2: d1.x + tx, y2: d1.y + ty },
            { x1: d2.x - tx, y1: d2.y - ty, x2: d2.x + tx, y2: d2.y + ty }
        ],
        text: label ?? length.toFixed(1),
        textX: (d1.x + d2.x) / 2 + nx * textHeight * 0.6,
        textY: (d1.y + d2.y) / 2 + ny * textHeight * 0.6,
        angleDeg,
        length
    };
};

export interface PatternDimensionOptions {
    /** Distance from the measured edge to the dimension line. */
    offset: number;
    textHeight: number;
    /**
     * Dimension the `b` edge as well. Pointless on a cylinder blank, where both
     * edges are parallel and would carry identical numbers.
     */
    bothEdges?: boolean;
    /** Also dimension the first and last station lines (the seam edges). */
    seams?: boolean;
}

/**
 * Dimension run along a chain of stations: the spacing between consecutive
 * bend-line endpoints on each edge, plus the length of the two seam edges.
 *
 * Works for every pattern shape, because it only looks at the station
 * endpoints — a rectangular blank, an annular sector and a free-form eccentric
 * development all reduce to the same chain.
 */
export const buildDevelopmentDimensions = (
    stations: PatternStation[],
    { offset, textHeight, bothEdges = true, seams = true }: PatternDimensionOptions
): AlignedDimension[] => {
    const dimensions: AlignedDimension[] = [];
    if (stations.length < 2) return dimensions;

    const awayFrom = (from: Point2D, to: Point2D): Point2D => ({ x: from.x - to.x, y: from.y - to.y });

    for (let i = 0; i < stations.length - 1; i += 1) {
        const current = stations[i];
        const next = stations[i + 1];

        const alongA = buildAlignedDimension(
            current.a,
            next.a,
            awayFrom(current.a, current.b),
            offset,
            textHeight
        );
        if (alongA) dimensions.push(alongA);

        if (!bothEdges) continue;

        const alongB = buildAlignedDimension(
            current.b,
            next.b,
            awayFrom(current.b, current.a),
            offset,
            textHeight
        );
        if (alongB) dimensions.push(alongB);
    }

    if (!seams) return dimensions;

    // Seam edges, measured towards the outside of the blank.
    const first = stations[0];
    const last = stations[stations.length - 1];

    const firstSeam = buildAlignedDimension(
        first.a,
        first.b,
        awayFrom(first.a, stations[1].a),
        offset * 1.5,
        textHeight
    );
    if (firstSeam) dimensions.push(firstSeam);

    const lastSeam = buildAlignedDimension(
        last.a,
        last.b,
        awayFrom(last.a, stations[stations.length - 2].a),
        offset * 1.5,
        textHeight
    );
    if (lastSeam) dimensions.push(lastSeam);

    return dimensions;
};
