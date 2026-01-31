
import type { ShellParameters, CalculationResult } from '../features/calculator/types';
import { getConePatternAngles, getConePatternPoints } from './cone-pattern';

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

export const generateUnfoldedDxf = (state: ShellParameters, result: CalculationResult): string => {
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
    return dxf.toDxfString();
};
