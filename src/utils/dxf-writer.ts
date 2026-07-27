
import type { ShellParameters, CalculationResult } from '../features/calculator/types';
import type { AlignedDimension } from './aligned-dimension';
import { getConePatternAngles, getConePatternPoints } from './cone-pattern';
import { buildPatternDimensions } from './pattern-dimensions';

export class DxfWriter {
    private content: string[] = [];

    constructor() {
        this.header();
    }

    private header() {
        this.content.push("0", "SECTION", "2", "HEADER", "0", "ENDSEC");
        this.content.push("0", "SECTION", "2", "TABLES");
        this.content.push("0", "TABLE", "2", "LTYPE", "70", "1");
        this.content.push(
            "0", "LTYPE",
            "2", "DASHED",
            "70", "0",
            "3", "Dashed __ __ __",
            "72", "65",
            "73", "2",
            "40", "0.6",
            "49", "0.3",
            "49", "-0.3"
        );
        this.content.push("0", "ENDTAB");
        this.content.push("0", "ENDSEC");
        this.content.push("0", "SECTION", "2", "BLOCKS", "0", "ENDSEC");
        this.content.push("0", "SECTION", "2", "ENTITIES");
    }

    public addLine(x1: number, y1: number, x2: number, y2: number, layer: string = "0") {
        this.content.push(
            "0", "LINE",
            "8", layer,
            "10", x1.toFixed(4), "20", y1.toFixed(4), "30", "0.0",
            "11", x2.toFixed(4), "21", y2.toFixed(4), "31", "0.0"
        );
    }

    public addBendLine(x1: number, y1: number, x2: number, y2: number, layer: string = "BEND") {
        this.content.push(
            "0", "LINE",
            "8", layer,
            "6", "DASHED",
            "62", "1",
            "10", x1.toFixed(4), "20", y1.toFixed(4), "30", "0.0",
            "11", x2.toFixed(4), "21", y2.toFixed(4), "31", "0.0"
        );
    }

    // Basic Arc implementation (Center, Radius, StartAngle, EndAngle)
    // Angles in degrees, Counter-Clockwise
    public addArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number, layer: string = "0") {
        this.content.push(
            "0", "ARC",
            "8", layer,
            "10", cx.toFixed(4), "20", cy.toFixed(4), "30", "0.0",
            "40", r.toFixed(4),
            "50", startAngle.toFixed(4),
            "51", endAngle.toFixed(4)
        );
    }

    /** R12-compatible POLYLINE/VERTEX/SEQEND sequence. */
    public addPolyline(points: Array<{ x: number; y: number }>, layer: string = "0", closed: boolean = false) {
        if (points.length < 2) return;

        this.content.push(
            "0", "POLYLINE",
            "8", layer,
            "66", "1",
            "70", closed ? "1" : "0",
            "10", "0.0", "20", "0.0", "30", "0.0"
        );

        for (const point of points) {
            this.content.push(
                "0", "VERTEX",
                "8", layer,
                "10", point.x.toFixed(4), "20", point.y.toFixed(4), "30", "0.0"
            );
        }

        this.content.push("0", "SEQEND", "8", layer);
    }

    public addText(
        text: string,
        x: number,
        y: number,
        height: number,
        layer: string = "0",
        rotationDeg: number = 0,
        centered: boolean = false
    ) {
        this.content.push(
            "0", "TEXT",
            "8", layer,
            "10", x.toFixed(4), "20", y.toFixed(4), "30", "0.0",
            "40", height.toFixed(4),
            "1", text,
            "50", rotationDeg.toFixed(4)
        );

        if (centered) {
            // R12 centred text: justification flag plus the alignment point.
            this.content.push(
                "72", "1",
                "11", x.toFixed(4), "21", y.toFixed(4), "31", "0.0"
            );
        }
    }

    /** Aligned (parallel) dimension drawn from plain R12 primitives. */
    public addAlignedDimension(dimension: AlignedDimension, textHeight: number, layer: string = "BEND_DIMS") {
        for (const extension of dimension.extensions) {
            this.addLine(extension.x1, extension.y1, extension.x2, extension.y2, layer);
        }

        this.addLine(dimension.line.x1, dimension.line.y1, dimension.line.x2, dimension.line.y2, layer);

        for (const tick of dimension.ticks) {
            this.addLine(tick.x1, tick.y1, tick.x2, tick.y2, layer);
        }

        this.addText(dimension.text, dimension.textX, dimension.textY, textHeight, layer, dimension.angleDeg, true);
    }

    public addRect(w: number, h: number) {
        // Center at 0,0
        const x = -w / 2;
        const y = -h / 2;
        this.addLine(x, y, x + w, y);
        this.addLine(x + w, y, x + w, y + h);
        this.addLine(x + w, y + h, x, y + h);
        this.addLine(x, y + h, x, y);
    }

    public addConePattern(rOut: number, rIn: number, angle: number, rotationDeg?: number) {
        const { startAngleDeg, endAngleDeg } = getConePatternAngles(angle, rotationDeg);
        const { outerStart, outerEnd, innerStart, innerEnd } = getConePatternPoints(rOut, rIn, angle, rotationDeg);

        this.addArc(0, 0, rOut, startAngleDeg, endAngleDeg);
        this.addArc(0, 0, rIn, startAngleDeg, endAngleDeg);

        this.addLine(innerStart.x, innerStart.y, outerStart.x, outerStart.y);
        this.addLine(innerEnd.x, innerEnd.y, outerEnd.x, outerEnd.y);
    }

    public toDxfString(): string {
        this.content.push("0", "ENDSEC", "0", "EOF");
        return this.content.join("\n");
    }
}

/**
 * Text height for annotations, scaled to the blank so a 7 m development and a
 * 300 mm one both come out readable at 1:1.
 */
const annotationTextHeight = (result: CalculationResult): number =>
    Math.max(4, Math.min(result.flatLength, result.flatWidth) * 0.012);

/**
 * Spacing dimensions between the bend lines, available in every mode.
 *
 * The run goes seam edge -> bend lines -> seam edge along the pattern edges,
 * plus the length of both seam edges.
 */
const addBendLineDimensions = (dxf: DxfWriter, state: ShellParameters, result: CalculationResult) => {
    const textHeight = annotationTextHeight(result) * 1.6;

    for (const dimension of buildPatternDimensions(state, result, textHeight)) {
        dxf.addAlignedDimension(dimension, textHeight);
    }
};

/**
 * Eccentric cone development: one closed contour (bottom edge, seam, top edge,
 * seam) plus optional ruling lines and station numbers, 1:1 in millimetres.
 */
export const generateEccentricConeDxf = (state: ShellParameters, result: CalculationResult): string => {
    const dxf = new DxfWriter();
    const development = result.eccentric;

    if (!development) return dxf.toDxfString();

    const contour = [...development.bottomEdge, ...[...development.topEdge].reverse()];
    dxf.addPolyline(contour, "CONTOUR", true);

    if (result.bendLines) {
        for (const line of result.bendLines) {
            dxf.addBendLine(line.x1, line.y1, line.x2, line.y2);
        }
    }

    // Station numbers, placed just outside the bottom edge.
    const textHeight = annotationTextHeight(result);
    for (const station of development.stations) {
        const dx = station.bottom.x - station.top.x;
        const dy = station.bottom.y - station.top.y;
        const length = Math.hypot(dx, dy) || 1;
        const offset = textHeight * 1.2;

        dxf.addText(
            String(station.index),
            station.bottom.x + (dx / length) * offset,
            station.bottom.y + (dy / length) * offset,
            textHeight,
            "MARKS"
        );
    }

    addBendLineDimensions(dxf, state, result);

    // Reference blank outline.
    if (result.bboxMinX !== undefined && result.bboxMinY !== undefined) {
        const x0 = result.bboxMinX;
        const y0 = result.bboxMinY;
        const x1 = x0 + result.flatLength;
        const y1 = y0 + result.flatWidth;
        dxf.addPolyline(
            [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }],
            "SHEET",
            true
        );
    }

    return dxf.toDxfString();
};

export const generateUnfoldedDxf = (state: ShellParameters, result: CalculationResult): string => {
    if (state.mode === 'eccentric-cone') {
        return generateEccentricConeDxf(state, result);
    }

    const dxf = new DxfWriter();

    if (state.mode === 'cylinder') {
        dxf.addRect(result.flatLength, result.flatWidth);
    } else {
        if (result.rOut && result.rIn && result.angle) {
            dxf.addConePattern(result.rOut, result.rIn, result.angle, result.patternRotationDeg);
        }
    }

    if (result.bendLines && result.bendLines.length > 0) {
        for (const line of result.bendLines) {
            dxf.addBendLine(line.x1, line.y1, line.x2, line.y2);
        }
    }

    addBendLineDimensions(dxf, state, result);

    return dxf.toDxfString();
};
