import type { Shape3D } from 'replicad';
import type { EccentricConeCadGeometry } from '../types/cad-types';
import { getReplicadExport } from './build-shell-solid';

type ReplicadModule = typeof import('replicad');
type Point2D = [number, number];

interface LoftableSketch {
    loftWith(other: LoftableSketch, config?: { ruled?: boolean }): Shape3D;
}

interface ClosedDrawing {
    sketchOnPlane(plane?: 'XY', origin?: [number, number, number]): LoftableSketch;
}

interface DrawingPenLike {
    lineTo(point: Point2D): DrawingPenLike;
    threePointsArcTo(end: Point2D, innerPoint: Point2D): DrawingPenLike;
    close(): ClosedDrawing;
}

type DrawFactory = (initialPoint?: Point2D) => DrawingPenLike;
type SketchCircleFactory = (
    radius: number,
    planeConfig?: { plane?: 'XY'; origin?: [number, number, number] }
) => LoftableSketch;

const MIN_GAP_ANGLE = 1e-6;

const polar = (radius: number, angle: number): Point2D => [radius * Math.cos(angle), radius * Math.sin(angle)];

/**
 * Closed wire of an annular sector, drawn with true circular arcs so that the
 * lofted lateral faces stay exact conical surfaces (no faceting).
 *
 * The wire structure — 2 outer arcs, radial line, 2 inner arcs, radial line —
 * is identical for the bottom and the top profile and uses the same angular
 * stations, so the ruled loft connects phi to phi: exactly the rulings the
 * development and the 3D preview are built from.
 */
const drawAnnularSector = (
    draw: DrawFactory,
    innerRadius: number,
    outerRadius: number,
    startAngle: number,
    endAngle: number
): ClosedDrawing => {
    const span = endAngle - startAngle;
    const quarter = startAngle + span * 0.25;
    const middle = startAngle + span * 0.5;
    const threeQuarters = startAngle + span * 0.75;

    return draw(polar(outerRadius, startAngle))
        .threePointsArcTo(polar(outerRadius, middle), polar(outerRadius, quarter))
        .threePointsArcTo(polar(outerRadius, endAngle), polar(outerRadius, threeQuarters))
        .lineTo(polar(innerRadius, endAngle))
        .threePointsArcTo(polar(innerRadius, middle), polar(innerRadius, threeQuarters))
        .threePointsArcTo(polar(innerRadius, startAngle), polar(innerRadius, quarter))
        .close();
};

export const buildEccentricConeSolid = (
    replicadModule: ReplicadModule,
    geometry: EccentricConeCadGeometry
): Shape3D => {
    const halfHeight = geometry.height / 2;
    const bottomOrigin: [number, number, number] = [0, 0, -halfHeight];
    const topOrigin: [number, number, number] = [geometry.eccentricity, 0, halfHeight];

    if (geometry.gapAngle > MIN_GAP_ANGLE) {
        const draw = getReplicadExport<DrawFactory>(replicadModule, 'draw');
        if (!draw) {
            throw new Error('Replicad draw() export was not found.');
        }

        const startAngle = geometry.seamPhi + geometry.gapAngle / 2;
        const endAngle = geometry.seamPhi + 2 * Math.PI - geometry.gapAngle / 2;

        // A single ruled loft between the two annular sectors: the seam faces are
        // the radial faces of the loft, so they contain the seam rulings exactly
        // and the gap tapers between the bottom and the top edge just like it
        // does in the flat pattern.
        const bottom = drawAnnularSector(
            draw,
            geometry.bottomInnerRadius,
            geometry.bottomOuterRadius,
            startAngle,
            endAngle
        ).sketchOnPlane('XY', bottomOrigin);

        const top = drawAnnularSector(
            draw,
            geometry.topInnerRadius,
            geometry.topOuterRadius,
            startAngle,
            endAngle
        ).sketchOnPlane('XY', topOrigin);

        const solid = bottom.loftWith(top, { ruled: true });
        return typeof solid.simplify === 'function' ? solid.simplify() : solid;
    }

    // Closed shell: an annulus is not a single wire, so the bore is cut away.
    const sketchCircle = getReplicadExport<SketchCircleFactory>(replicadModule, 'sketchCircle');
    if (!sketchCircle) {
        throw new Error('Replicad sketchCircle() export was not found.');
    }

    const outer = sketchCircle(geometry.bottomOuterRadius, { plane: 'XY', origin: bottomOrigin })
        .loftWith(sketchCircle(geometry.topOuterRadius, { plane: 'XY', origin: topOrigin }), { ruled: true });

    const bore = sketchCircle(geometry.bottomInnerRadius, { plane: 'XY', origin: bottomOrigin })
        .loftWith(sketchCircle(geometry.topInnerRadius, { plane: 'XY', origin: topOrigin }), { ruled: true });

    const solid = outer.cut(bore);
    return typeof solid.simplify === 'function' ? solid.simplify() : solid;
};
