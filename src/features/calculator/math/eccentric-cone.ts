import type {
    BendLine,
    CalculationResult,
    EccentricDevelopment,
    EccentricStation,
    Point2D,
    ShellParameters
} from '../types';
import { computeAABB, computeMinimumBoundingBox, rotatePoint } from './mbr';

/**
 * Exact development of an eccentric (oblique) truncated cone.
 *
 * Geometry (mid-surface, see docs/eccentric-cone.md):
 *   bottom edge  A(phi) = (rBottom cos phi,          rBottom sin phi, 0)
 *   top edge     B(phi) = (e + rTop cos phi,         rTop sin phi,    H)
 *
 * B'(phi) is always parallel to A'(phi), so the ruled surface joining A(phi) to
 * B(phi) is developable for every combination of inputs (true oblique cone when
 * rTop != rBottom, oblique cylinder when they are equal).
 *
 * The development is obtained by integrating the isometry ODE
 *
 *   a'(phi) = p·e_hat + q·e_perp,   e_hat'(phi) = omega·e_perp
 *   p = (A'·V)/|V| = -rBottom·e·sin(phi)/|V|
 *   q = sqrt(rBottom^2 - p^2)
 *   omega = q·(rTop - rBottom)/(rBottom·|V|)
 *
 * which preserves |a'| = rBottom and |b'| = rTop exactly. Unlike a chord based
 * triangulation, the developed edge lengths therefore come out as the true
 * 2*pi*R and not systematically short.
 */

// Manufacturing padding for cutting operations (mm), shared with the cone module.
const CUT_MARGIN = 10;
// RK4 substeps per output node.
const SUBSTEPS = 4;
// Target number of contour nodes over the full development.
const TARGET_CONTOUR_NODES = 720;

export const MIN_STATIONS = 8;
export const MAX_STATIONS = 360;

const HALF_ANGLE_WARNING_DEG = 30;

interface Geometry {
    rBottom: number;
    rTop: number;
    height: number;
    eccentricity: number;
}

interface Ruling {
    /** Ruling vector B - A. */
    vx: number;
    vy: number;
    length: number;
    halfAngleDeg: number;
}

const rulingAt = (phi: number, geometry: Geometry): Ruling => {
    const { rBottom, rTop, height, eccentricity } = geometry;
    const dr = rTop - rBottom;
    const vx = eccentricity + dr * Math.cos(phi);
    const vy = dr * Math.sin(phi);
    const horizontal = Math.hypot(vx, vy);

    return {
        vx,
        vy,
        length: Math.hypot(horizontal, height),
        halfAngleDeg: (Math.atan2(horizontal, height) * 180) / Math.PI
    };
};

/** State vector of the development ODE: [a.x, a.y, e_hat.x, e_hat.y]. */
type State = [number, number, number, number];

const derivative = (phi: number, state: State, geometry: Geometry): State => {
    const { rBottom, rTop } = geometry;
    const { length } = rulingAt(phi, geometry);

    const p = (-rBottom * geometry.eccentricity * Math.sin(phi)) / length;
    const q = Math.sqrt(Math.max(0, rBottom * rBottom - p * p));
    const omega = (q * (rTop - rBottom)) / (rBottom * length);

    const [, , ex, ey] = state;
    // e_perp is e_hat rotated by +90 degrees.
    const nx = -ey;
    const ny = ex;

    return [p * ex + q * nx, p * ey + q * ny, omega * nx, omega * ny];
};

const addScaled = (state: State, delta: State, factor: number): State => [
    state[0] + delta[0] * factor,
    state[1] + delta[1] * factor,
    state[2] + delta[2] * factor,
    state[3] + delta[3] * factor
];

const rk4Step = (phi: number, state: State, step: number, geometry: Geometry): State => {
    const k1 = derivative(phi, state, geometry);
    const k2 = derivative(phi + step / 2, addScaled(state, k1, step / 2), geometry);
    const k3 = derivative(phi + step / 2, addScaled(state, k2, step / 2), geometry);
    const k4 = derivative(phi + step, addScaled(state, k3, step), geometry);

    return [
        state[0] + (step / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
        state[1] + (step / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
        state[2] + (step / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]),
        state[3] + (step / 6) * (k1[3] + 2 * k2[3] + 2 * k3[3] + k4[3])
    ];
};

const normalizeDirection = (state: State): State => {
    const norm = Math.hypot(state[2], state[3]);
    if (norm < 1e-12) return state;
    return [state[0], state[1], state[2] / norm, state[3] / norm];
};

interface IntegrationResult {
    bottom: Point2D[];
    top: Point2D[];
    rulings: Ruling[];
    phis: number[];
    endState: State;
}

const integrate = (
    geometry: Geometry,
    phiStart: number,
    phiEnd: number,
    nodes: number,
    substeps: number
): IntegrationResult => {
    const nodeStep = (phiEnd - phiStart) / nodes;
    const microStep = nodeStep / substeps;

    // The development is defined up to a rigid motion: start at the origin with
    // the seam ruling pointing along +X.
    let state: State = [0, 0, 1, 0];

    const bottom: Point2D[] = [];
    const top: Point2D[] = [];
    const rulings: Ruling[] = [];
    const phis: number[] = [];

    for (let node = 0; node <= nodes; node += 1) {
        const phi = phiStart + node * nodeStep;
        const ruling = rulingAt(phi, geometry);

        bottom.push({ x: state[0], y: state[1] });
        top.push({
            x: state[0] + state[2] * ruling.length,
            y: state[1] + state[3] * ruling.length
        });
        rulings.push(ruling);
        phis.push(phi);

        if (node === nodes) break;

        for (let sub = 0; sub < substeps; sub += 1) {
            state = rk4Step(phi + sub * microStep, state, microStep, geometry);
        }
        state = normalizeDirection(state);
    }

    return { bottom, top, rulings, phis, endState: state };
};

/**
 * Exact lateral (mid-surface) area of the development.
 *
 * For the ruled strip X(phi, u) = a + u·(b − a) the Jacobian reduces, in the
 * (e_hat, e_perp) frame, to |(a' + b') × (b − a)| / 2 = ℓ·q·(1 + rTop/rBottom)/2,
 * which depends on phi alone — so it integrates exactly with Simpson's rule
 * instead of being approximated by the chord polygon.
 */
const surfaceAreaIntegrand = (phi: number, geometry: Geometry): number => {
    const { rBottom, rTop, eccentricity } = geometry;
    const { length } = rulingAt(phi, geometry);
    const p = (-rBottom * eccentricity * Math.sin(phi)) / length;
    const q = Math.sqrt(Math.max(0, rBottom * rBottom - p * p));

    return (length * q * (1 + rTop / rBottom)) / 2;
};

const computeSurfaceArea = (
    geometry: Geometry,
    phiStart: number,
    phiEnd: number,
    intervals: number
): number => {
    const steps = intervals % 2 === 0 ? intervals : intervals + 1;
    const step = (phiEnd - phiStart) / steps;

    let sum = surfaceAreaIntegrand(phiStart, geometry) + surfaceAreaIntegrand(phiEnd, geometry);
    for (let i = 1; i < steps; i += 1) {
        sum += (i % 2 === 0 ? 2 : 4) * surfaceAreaIntegrand(phiStart + i * step, geometry);
    }

    return (sum * step) / 3;
};

const distance = (a: Point2D, b: Point2D): number => Math.hypot(b.x - a.x, b.y - a.y);

const clampStations = (value: number): number => {
    if (!isFinite(value)) return 24;
    return Math.min(MAX_STATIONS, Math.max(MIN_STATIONS, Math.round(value)));
};

/**
 * The extreme rulings always sit at phi = 0 and phi = pi (the eccentricity is
 * along +X). Which one is the short one depends on the sign of rTop - rBottom:
 * the horizontal span of a ruling is |e + (rTop - rBottom)·cos(phi)|, so the
 * offset and the radius difference cancel on the phi = 0 side only when the top
 * circle is the smaller one.
 */
const resolveSeamPhi = (
    params: Pick<ShellParameters, 'seamPosition' | 'seamAngleDeg'>,
    rBottom: number,
    rTop: number
): number => {
    if (params.seamPosition === 'short' || params.seamPosition === 'long') {
        const shortPhi = rTop <= rBottom ? 0 : Math.PI;
        return params.seamPosition === 'short' ? shortPhi : Math.PI - shortPhi;
    }

    const raw = isFinite(params.seamAngleDeg) ? params.seamAngleDeg : 0;
    return (raw * Math.PI) / 180;
};

/**
 * Seam placement shared by the development, the 3D preview and the STEP solid,
 * so all three cut the shell at exactly the same rulings.
 *
 * The gap is removed as a single angular slice; that keeps both seam edges true
 * rulings, at the price of the removed width being `gap` only on average over
 * the two edges (see docs/eccentric-cone.md § 2.5).
 */
export const getEccentricSeam = (
    params: Pick<ShellParameters, 'gap' | 'seamPosition' | 'seamAngleDeg'>,
    rBottomNeutral: number,
    rTopNeutral: number
): { seamPhi: number; gapAngle: number } => {
    const sum = rBottomNeutral + rTopNeutral;
    const gapAngle = params.gap > 0 && sum > 0 ? (2 * params.gap) / sum : 0;

    return { seamPhi: resolveSeamPhi(params, rBottomNeutral, rTopNeutral), gapAngle };
};

export const calculateEccentricCone = (
    params: ShellParameters,
    base: CalculationResult
): CalculationResult => {
    const { d1_neutral, d2_neutral } = base;
    const { h } = params;

    // Repo convention: d1 is the top diameter, d2 the bottom one.
    const rTop = d1_neutral / 2;
    const rBottom = d2_neutral / 2;
    const eccentricity = Math.abs(params.eccentricity);

    if (!isFinite(eccentricity)) {
        return { ...base, isValid: false, error: 'Invalid eccentricity value.' };
    }

    if (Math.abs(rTop - rBottom) < 1e-9 && eccentricity < 1e-9) {
        return {
            ...base,
            isValid: false,
            error: 'Equal diameters with zero eccentricity — use Cylinder mode.'
        };
    }

    const geometry: Geometry = { rBottom, rTop, height: h, eccentricity };

    const { seamPhi, gapAngle } = getEccentricSeam(params, rBottom, rTop);

    if (gapAngle >= 2 * Math.PI) {
        return { ...base, isValid: false, error: 'Gap is too large for this geometry.' };
    }

    const phiStart = seamPhi + gapAngle / 2;
    const phiEnd = seamPhi + 2 * Math.PI - gapAngle / 2;

    const stationCount = clampStations(params.stationCount);
    const nodesPerStation = Math.max(1, Math.round(TARGET_CONTOUR_NODES / stationCount));
    const contourNodes = stationCount * nodesPerStation;

    const coarse = integrate(geometry, phiStart, phiEnd, contourNodes, SUBSTEPS);
    const fine = integrate(geometry, phiStart, phiEnd, contourNodes, SUBSTEPS * 2);

    const integrationError = Math.hypot(
        coarse.endState[0] - fine.endState[0],
        coarse.endState[1] - fine.endState[1]
    );

    // Use the more accurate run for the actual output.
    const { bottom, top, rulings, phis } = fine;

    if (bottom.some(point => !isFinite(point.x) || !isFinite(point.y))) {
        return { ...base, isValid: false, error: 'Development failed to converge for these inputs.' };
    }

    const { rotationDeg } = computeMinimumBoundingBox([...bottom, ...top]);
    const rotationRad = (rotationDeg * Math.PI) / 180;

    const bottomEdge = bottom.map(point => rotatePoint(point, rotationRad));
    const topEdge = top.map(point => rotatePoint(point, rotationRad));

    const laidOut = computeAABB([...bottomEdge, ...topEdge]);
    const finalWidth = laidOut.width + CUT_MARGIN;
    const finalHeight = laidOut.height + CUT_MARGIN;
    const finalMinX = laidOut.minX - CUT_MARGIN / 2;
    const finalMinY = laidOut.minY - CUT_MARGIN / 2;

    // Stations
    const stations: EccentricStation[] = [];
    for (let index = 0; index <= stationCount; index += 1) {
        const node = index * nodesPerStation;
        const phi = phis[node];
        const nextNode = (index + 1) * nodesPerStation;

        stations.push({
            index,
            phiDeg: ((phi * 180) / Math.PI) % 360,
            rulingLength: rulings[node].length,
            cumulativeBottom: rBottom * (phi - phiStart),
            cumulativeTop: rTop * (phi - phiStart),
            chordBottom: nextNode <= contourNodes ? distance(bottomEdge[node], bottomEdge[nextNode]) : 0,
            chordTop: nextNode <= contourNodes ? distance(topEdge[node], topEdge[nextNode]) : 0,
            bottom: bottomEdge[node],
            top: topEdge[node]
        });
    }

    // Ruling extremes and cone angle range, sampled on the full contour grid.
    let minRuling = { length: Infinity, phiDeg: 0 };
    let maxRuling = { length: -Infinity, phiDeg: 0 };
    let halfAngleMinDeg = Infinity;
    let halfAngleMaxDeg = -Infinity;

    for (let node = 0; node <= contourNodes; node += 1) {
        const ruling = rulings[node];
        const phiDeg = (((phis[node] * 180) / Math.PI) % 360 + 360) % 360;

        if (ruling.length < minRuling.length) minRuling = { length: ruling.length, phiDeg };
        if (ruling.length > maxRuling.length) maxRuling = { length: ruling.length, phiDeg };
        if (ruling.halfAngleDeg < halfAngleMinDeg) halfAngleMinDeg = ruling.halfAngleDeg;
        if (ruling.halfAngleDeg > halfAngleMaxDeg) halfAngleMaxDeg = ruling.halfAngleDeg;
    }

    const surfaceArea = computeSurfaceArea(geometry, phiStart, phiEnd, contourNodes * SUBSTEPS);

    const dr = rBottom - rTop;
    const apex = Math.abs(dr) > 1e-6
        ? { x: (eccentricity * rBottom) / dr, z: (h * rBottom) / dr }
        : undefined;

    const warnings: string[] = [];
    if (halfAngleMaxDeg > HALF_ANGLE_WARNING_DEG) {
        warnings.push(
            `Ruling inclination reaches ${halfAngleMaxDeg.toFixed(1)}°; the radial thickness offset ` +
            'deviates from a true normal offset by more than 15%.'
        );
    }
    if (integrationError > 1e-4) {
        warnings.push(`Integration self-check residual is ${integrationError.toFixed(6)} mm.`);
    }

    const bendLines: BendLine[] = params.bendLinesEnabled
        ? stations.slice(1, -1).map(station => ({
            x1: station.bottom.x,
            y1: station.bottom.y,
            x2: station.top.x,
            y2: station.top.y
        }))
        : [];

    const totalBottomArc = rBottom * (phiEnd - phiStart);
    const totalTopArc = rTop * (phiEnd - phiStart);

    const development: EccentricDevelopment = {
        bottomEdge,
        topEdge,
        stations,
        rBottom,
        rTop,
        totalBottomArc,
        totalTopArc,
        minRuling,
        maxRuling,
        halfAngleMinDeg,
        halfAngleMaxDeg,
        apex,
        surfaceArea,
        gapBottom: gapAngle * rBottom,
        gapTop: gapAngle * rTop,
        gapAngleDeg: (gapAngle * 180) / Math.PI,
        seamPhiDeg: (seamPhi * 180) / Math.PI,
        integrationError,
        warnings
    };

    return {
        ...base,
        flatLength: finalWidth,
        flatWidth: finalHeight,
        shape: 'freeform',
        patternRotationDeg: rotationDeg,
        bendLines,
        bendStep: totalBottomArc / stationCount,
        bboxWidth: finalWidth,
        bboxHeight: finalHeight,
        bboxMinX: finalMinX,
        bboxMinY: finalMinY,
        eccentric: development
    };
};
