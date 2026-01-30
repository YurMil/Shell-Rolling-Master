
export type ShapeType = 'cylinder' | 'cone';
export type SpecType = 'OD' | 'ID';

export interface ShellParameters {
    mode: ShapeType;
    specType: SpecType;
    d1: number; // Diameter 1 (Top/Main)
    d2: number; // Diameter 2 (Bottom, for cone)
    h: number;  // Height / Width
    thickness: number;
    kFactor: number;
    gap: number; // Welding gap
    bendLines: number;
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
    shape: 'rect' | 'sector';
    error?: string;
}
