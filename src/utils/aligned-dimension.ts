import type { Point2D } from '../features/calculator/types';

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

/**
 * Chord dimensions between consecutive bend-line endpoints, on both edges, plus
 * the length of each seam ruling.
 *
 * `bottomEdge` / `topEdge` hold the station points only (not the full contour).
 */
export const buildDevelopmentDimensions = (
    bottomStations: Point2D[],
    topStations: Point2D[],
    offset: number,
    textHeight: number
): AlignedDimension[] => {
    const dimensions: AlignedDimension[] = [];
    const count = Math.min(bottomStations.length, topStations.length);

    const awayFrom = (from: Point2D, to: Point2D): Point2D => ({ x: from.x - to.x, y: from.y - to.y });

    for (let i = 0; i < count - 1; i += 1) {
        const bottomAway = awayFrom(bottomStations[i], topStations[i]);
        const bottom = buildAlignedDimension(
            bottomStations[i],
            bottomStations[i + 1],
            bottomAway,
            offset,
            textHeight
        );
        if (bottom) dimensions.push(bottom);

        const topAway = awayFrom(topStations[i], bottomStations[i]);
        const top = buildAlignedDimension(topStations[i], topStations[i + 1], topAway, offset, textHeight);
        if (top) dimensions.push(top);
    }

    // Seam rulings: measured towards the outside of the blank.
    if (count >= 2) {
        const first = buildAlignedDimension(
            bottomStations[0],
            topStations[0],
            awayFrom(bottomStations[0], bottomStations[1]),
            offset * 1.5,
            textHeight
        );
        if (first) dimensions.push(first);

        const last = buildAlignedDimension(
            bottomStations[count - 1],
            topStations[count - 1],
            awayFrom(bottomStations[count - 1], bottomStations[count - 2]),
            offset * 1.5,
            textHeight
        );
        if (last) dimensions.push(last);
    }

    return dimensions;
};
