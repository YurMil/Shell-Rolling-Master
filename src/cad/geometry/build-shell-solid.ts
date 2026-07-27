import type { Shape3D } from 'replicad';
import type { RevolvedShellCadGeometry } from '../types/cad-types';

type ReplicadModule = typeof import('replicad');

interface RevolvableProfile {
    revolve(revolutionAxis?: [number, number, number], config?: { origin?: [number, number, number] }): Shape3D;
}

interface ProfileSketchBuilder {
    movePointerTo(point: [number, number]): ProfileSketchBuilder;
    lineTo(point: [number, number]): ProfileSketchBuilder;
    close(): RevolvableProfile;
}

type SketcherConstructor = new (plane?: 'XZ') => {
    movePointerTo(point: [number, number]): ProfileSketchBuilder;
    lineTo(point: [number, number]): ProfileSketchBuilder;
    close(): RevolvableProfile;
};

interface ExtrudableSketch {
    extrude(distance: number): Shape3D;
}

interface ClosedDrawing {
    sketchOnPlane(
        plane?: 'XY',
        origin?: [number, number, number]
    ): ExtrudableSketch;
}

interface DrawingPenLike {
    lineTo(point: [number, number]): DrawingPenLike;
    close(): ClosedDrawing;
}

type DrawFactory = (initialPoint?: [number, number]) => {
    lineTo(point: [number, number]): DrawingPenLike;
    close(): ClosedDrawing;
};

export const getReplicadExport = <TExport,>(
    replicadModule: ReplicadModule,
    exportName: string,
): TExport | undefined => {
    const moduleWithDefault = replicadModule as ReplicadModule & { default?: ReplicadModule };
    return (moduleWithDefault as unknown as Record<string, TExport | undefined>)[exportName] ??
        (moduleWithDefault.default as unknown as Record<string, TExport | undefined> | undefined)?.[exportName];
};

const getSketcherConstructor = (replicadModule: ReplicadModule): SketcherConstructor => {
    const Sketcher = getReplicadExport<SketcherConstructor>(replicadModule, 'Sketcher');

    if (!Sketcher) {
        throw new Error('Replicad Sketcher() export was not found.');
    }

    return Sketcher;
};

const getDrawFactory = (replicadModule: ReplicadModule): DrawFactory => {
    const draw = getReplicadExport<DrawFactory>(replicadModule, 'draw');

    if (!draw) {
        throw new Error('Replicad draw() export was not found.');
    }

    return draw;
};

const buildGapSectorPoints = (
    radius: number,
    startAngle: number,
    endAngle: number,
    segments = 48,
): [number, number][] => {
    const points: [number, number][] = [[0, 0], [radius * Math.cos(startAngle), radius * Math.sin(startAngle)]];

    for (let index = 1; index <= segments; index += 1) {
        const t = index / segments;
        const angle = startAngle + ((endAngle - startAngle) * t);
        points.push([radius * Math.cos(angle), radius * Math.sin(angle)]);
    }

    points.push([0, 0]);
    return points;
};

const buildGapCutter = (
    replicadModule: ReplicadModule,
    geometry: RevolvedShellCadGeometry,
): Shape3D | null => {
    if (geometry.gapAngle <= 0.000001) {
        return null;
    }

    const draw = getDrawFactory(replicadModule);
    const halfHeight = geometry.height / 2;
    const zStart = -halfHeight - 1;
    const cutterHeight = geometry.height + 2;
    const cutterRadius = Math.max(geometry.topOuterRadius, geometry.bottomOuterRadius) + Math.max(geometry.thickness * 4, 20);
    const gapStart = geometry.seamCenterAngle - (geometry.gapAngle / 2);
    const gapEnd = geometry.seamCenterAngle + (geometry.gapAngle / 2);
    const sectorPoints = buildGapSectorPoints(cutterRadius, gapStart, gapEnd);

    let pen = draw(sectorPoints[0]);
    for (let index = 1; index < sectorPoints.length; index += 1) {
        pen = pen.lineTo(sectorPoints[index]);
    }

    const drawing = pen.close();
    const sketch = drawing.sketchOnPlane('XY', [0, 0, zStart]);
    return sketch.extrude(cutterHeight);
};

export const buildShellSolid = (
    replicadModule: ReplicadModule,
    geometry: RevolvedShellCadGeometry,
): Shape3D => {
    const Sketcher = getSketcherConstructor(replicadModule);
    const halfHeight = geometry.height / 2;

    const profile = new Sketcher('XZ')
        .movePointerTo([geometry.topOuterRadius, halfHeight])
        .lineTo([geometry.bottomOuterRadius, -halfHeight])
        .lineTo([geometry.bottomInnerRadius, -halfHeight])
        .lineTo([geometry.topInnerRadius, halfHeight])
        .close();

    let solid = profile.revolve([0, 0, 1], { origin: [0, 0, 0] });

    const gapCutter = buildGapCutter(replicadModule, geometry);
    if (gapCutter) {
        solid = solid.cut(gapCutter);
    }

    return typeof solid.simplify === 'function' ? solid.simplify() : solid;
};
