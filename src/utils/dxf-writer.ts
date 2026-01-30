
import type { ShellParameters, CalculationResult } from '../features/calculator/types';

export class DxfWriter {
    private content: string[] = [];

    constructor() {
        this.header();
    }

    private header() {
        this.content.push("0", "SECTION", "2", "HEADER", "0", "ENDSEC");
        this.content.push("0", "SECTION", "2", "TABLES", "0", "ENDSEC");
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

    public addConePattern(rOut: number, rIn: number, angle: number) {
        // Logic for Cone Sector
        // Arc centers at (0,0)
        // Start Angle = -angle/2 + 90 (DXF 0 is East, SVG -90 was top. Let's align with standard math)
        // Standard Math: 0 is East. Top is 90.
        // Our PatternView logic: Top is -90 degrees in SVG rotation?
        // Wait, let's stick to standard 0 = East.
        // If we want the shape centered upwards:
        // Bisector is at 90 deg.
        // Start = 90 + angle/2
        // End = 90 - angle/2 (Wait, Arcs are CCW)
        // So Start = 90 - angle/2
        // End = 90 + angle/2

        const startDeg = 90 - angle / 2;
        const endDeg = 90 + angle / 2;

        // Arcs
        this.addArc(0, 0, rOut, startDeg, endDeg);
        this.addArc(0, 0, rIn, startDeg, endDeg);

        // Lines connecting endpoints
        const rad = (deg: number) => deg * Math.PI / 180;

        const x1_out = rOut * Math.cos(rad(startDeg));
        const y1_out = rOut * Math.sin(rad(startDeg));

        const x1_in = rIn * Math.cos(rad(startDeg));
        const y1_in = rIn * Math.sin(rad(startDeg));

        const x2_out = rOut * Math.cos(rad(endDeg));
        const y2_out = rOut * Math.sin(rad(endDeg));

        const x2_in = rIn * Math.cos(rad(endDeg));
        const y2_in = rIn * Math.sin(rad(endDeg));

        this.addLine(x1_in, y1_in, x1_out, y1_out); // Left Side
        this.addLine(x2_in, y2_in, x2_out, y2_out); // Right Side (Wait, direction matters? No, lines are bidirectional visually)
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
            dxf.addConePattern(result.rOut, result.rIn, result.angle);
        }
    }
    return dxf.toDxfString();
};
