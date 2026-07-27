import type { Point2D } from '../types';

export interface BoundingBox {
    width: number;
    height: number;
    minX: number;
    minY: number;
}

export const rotatePoint = (point: Point2D, angleRad: number): Point2D => {
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    return {
        x: point.x * cos - point.y * sin,
        y: point.x * sin + point.y * cos
    };
};

export const computeAABB = (points: Point2D[]): BoundingBox => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    // Explicit loop instead of Math.min(...arr): the developed contour can hold
    // thousands of points, which overflows the argument list of a spread call.
    for (const point of points) {
        if (point.x < minX) minX = point.x;
        if (point.x > maxX) maxX = point.x;
        if (point.y < minY) minY = point.y;
        if (point.y > maxY) maxY = point.y;
    }

    return { width: maxX - minX, height: maxY - minY, minX, minY };
};

const cross = (o: Point2D, a: Point2D, b: Point2D): number =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

/**
 * Andrew's monotone chain convex hull. Returns the hull in counter-clockwise
 * order without the duplicated closing point.
 */
export const convexHull = (points: Point2D[]): Point2D[] => {
    if (points.length < 3) return [...points];

    const sorted = [...points].sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));

    const lower: Point2D[] = [];
    for (const point of sorted) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
            lower.pop();
        }
        lower.push(point);
    }

    const upper: Point2D[] = [];
    for (let i = sorted.length - 1; i >= 0; i -= 1) {
        const point = sorted[i];
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
            upper.pop();
        }
        upper.push(point);
    }

    lower.pop();
    upper.pop();
    return lower.concat(upper);
};

/**
 * Exact minimum-area bounding rectangle.
 *
 * The optimal rectangle always has one side flush with a convex hull edge
 * (Freeman-Shapira), so evaluating the axis-aligned box for every hull edge
 * direction gives the true optimum instead of a sampled approximation.
 *
 * `rotationDeg` is the angle the caller has to rotate the original points by to
 * land in the returned box frame.
 */
export const computeMinimumBoundingBox = (
    points: Point2D[],
    forceLandscape = true
): { bbox: BoundingBox; rotationDeg: number } => {
    if (points.length === 0) {
        return { bbox: { width: 0, height: 0, minX: 0, minY: 0 }, rotationDeg: 0 };
    }

    const hull = convexHull(points);

    let bestArea = Infinity;
    let bestRotation = 0;
    let bestBox = computeAABB(points);

    if (hull.length < 2) {
        return { bbox: bestBox, rotationDeg: 0 };
    }

    for (let i = 0; i < hull.length; i += 1) {
        const current = hull[i];
        const next = hull[(i + 1) % hull.length];
        const edgeAngle = Math.atan2(next.y - current.y, next.x - current.x);

        if (!isFinite(edgeAngle)) continue;

        const rotation = -edgeAngle;
        const box = computeAABB(points.map(point => rotatePoint(point, rotation)));
        const area = box.width * box.height;

        if (area < bestArea) {
            bestArea = area;
            bestRotation = rotation;
            bestBox = box;
        }
    }

    if (forceLandscape && bestBox.height > bestBox.width) {
        bestRotation += Math.PI / 2;
        bestBox = computeAABB(points.map(point => rotatePoint(point, bestRotation)));
    }

    let rotationDeg = (bestRotation * 180) / Math.PI;
    rotationDeg = ((rotationDeg % 360) + 360) % 360;

    return { bbox: bestBox, rotationDeg };
};
