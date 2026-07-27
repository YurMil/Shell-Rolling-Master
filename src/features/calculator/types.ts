
export type ShapeType = 'cylinder' | 'cone' | 'eccentric-cone';
export type SpecType = 'OD' | 'ID';
export type SeamPosition = 'short' | 'long' | 'custom';

export interface Point2D {
    x: number;
    y: number;
}

export interface ShellParameters {
    mode: ShapeType;
    specType: SpecType;
    d1: number; // Diameter 1 (Top/Main)
    d2: number; // Diameter 2 (Bottom, for cone)
    h: number;  // Height / Width
    thickness: number;
    kFactor: number;
    gap: number; // Welding gap
    bendLinesEnabled: boolean;
    bendLinesCount: number;
    // Eccentric cone only
    eccentricity: number;   // Lateral offset of the top circle centre (mm, along +X)
    seamPosition: SeamPosition;
    seamAngleDeg: number;   // Used when seamPosition === 'custom'
    stationCount: number;   // Number of layout stations (bend lines + 1) along the development
    density: number;        // kg/m^3, used for the blank mass in the report
    bendDimensionsEnabled: boolean; // Chord dimensions between bend-line endpoints
    bendDimensionOffset: number;    // Distance from the edge to the dimension line, mm
}

export interface BendLine {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

/** One marking station of an eccentric cone development. */
export interface EccentricStation {
    index: number;
    phiDeg: number;
    rulingLength: number;
    /** Developed arc length from the seam, along the bottom edge. */
    cumulativeBottom: number;
    cumulativeTop: number;
    /** Straight distance to the next station (what a tape measures on the flat blank). */
    chordBottom: number;
    chordTop: number;
    bottom: Point2D;
    top: Point2D;
}

export interface EccentricDevelopment {
    /** Developed bottom edge (image of the D2 circle), in blank coordinates. */
    bottomEdge: Point2D[];
    /** Developed top edge (image of the D1 circle), in blank coordinates. */
    topEdge: Point2D[];
    stations: EccentricStation[];
    rBottom: number;
    rTop: number;
    totalBottomArc: number;
    totalTopArc: number;
    minRuling: { length: number; phiDeg: number };
    maxRuling: { length: number; phiDeg: number };
    halfAngleMinDeg: number;
    halfAngleMaxDeg: number;
    /** Apex of the oblique cone in the XZ plane; absent when D1 ≈ D2 (oblique cylinder). */
    apex?: { x: number; z: number };
    /** Lateral (mid-surface) area of the development, mm^2. */
    surfaceArea: number;
    gapBottom: number;
    gapTop: number;
    gapAngleDeg: number;
    seamPhiDeg: number;
    /** RK4 self-check: distance between the half-step and full-step solutions, mm. */
    integrationError: number;
    warnings: string[];
}

export interface CalculationResult {
    isValid: boolean;
    d1_neutral: number;
    d2_neutral: number;
    flatLength: number;
    flatWidth: number;
    angle?: number;
    rOut?: number;
    rIn?: number;
    patternRotationDeg?: number;
    shape: 'rect' | 'sector' | 'freeform';
    error?: string;
    bendLines?: BendLine[];
    bendStep?: number;
    // Bounding box for flat pattern
    bboxWidth?: number;
    bboxHeight?: number;
    bboxMinX?: number;
    bboxMinY?: number;
    eccentric?: EccentricDevelopment;
}
