
import type { ShellParameters, CalculationResult } from './types';

export const calculateShell = (params: ShellParameters): CalculationResult => {
    const { mode, specType, d1, d2, h, thickness, kFactor, gap } = params;

    // Basic validation
    if ([d1, h, thickness, kFactor].some(v => isNaN(v) || v <= 0)) {
        return {
            isValid: false,
            d1_neutral: 0, d2_neutral: 0, flatLength: 0, flatWidth: 0, shape: 'rect',
            error: "Invalid input dimensions."
        };
    }
    if (mode === 'cone' && (isNaN(d2) || d2 <= 0)) {
        return {
            isValid: false,
            d1_neutral: 0, d2_neutral: 0, flatLength: 0, flatWidth: 0, shape: 'rect',
            error: "Invalid input dimensions."
        };
    }

    // Neutral Axis Calculation
    // Offset = 2 * k * t
    // ID mode: D_neutral = ID + Offset
    // OD mode: D_neutral = OD - (2*t - Offset) = OD - 2*t*(1-k)

    const offset = 2 * kFactor * thickness;
    let d1_n, d2_n;

    if (specType === 'ID') {
        d1_n = d1 + offset;
        d2_n = mode === 'cone' ? d2 + offset : d1_n;
    } else {
        // OD
        const sub = 2 * thickness * (1 - kFactor);
        d1_n = d1 - sub;
        d2_n = mode === 'cone' ? d2 - sub : d1_n;
    }

    // Store neutral diameters
    const result: CalculationResult = {
        isValid: true,
        d1_neutral: d1_n,
        d2_neutral: d2_n,
        flatLength: 0,
        flatWidth: h,
        shape: 'rect'
    };

    if (mode === 'cylinder') {
        const circumference = Math.PI * d1_n;
        if (circumference <= gap) {
            return { ...result, isValid: false, error: "Gap is larger than circumference!" };
        }
        result.flatLength = circumference - gap;
        result.shape = 'rect';
    } else {
        // Cone logic
        const R1 = d1_n / 2;
        const R2 = d2_n / 2;

        if (Math.abs(R1 - R2) < 0.001) {
            // Ideally should switch to cylinder, but here we return error or treat as cylinder
            // For safety, warn user.
            return { ...result, isValid: false, error: "Diameters are equal. Use Cylinder mode." };
        }

        const dR = Math.abs(R2 - R1);
        const slantHeight = Math.sqrt(Math.pow(dR, 2) + Math.pow(h, 2));

        // Pattern Radii
        // R_pattern = (SlantHeight * R_large) / (R_large - R_small)
        const R_large = Math.max(R1, R2);
        const R_small = Math.min(R1, R2);
        const PatternRadiusOuter = (slantHeight * R_large) / (R_large - R_small);
        const PatternRadiusInner = PatternRadiusOuter - slantHeight;

        // Development Angle
        // Angle (deg) = (360 * R_large) / PatternRadiusOuter (Initial full cone)
        // We need to subtract the gap. 
        // ArcLength = (Angle/360) * 2 * PI * R_pattern
        // NewArc = ArcLength - Gap
        // NewAngle = (NewArc / (2 * PI * R_pattern)) * 360

        const initialAngle = (360 * R_large) / PatternRadiusOuter;
        const currentArc = (initialAngle / 360) * 2 * Math.PI * PatternRadiusOuter;
        const newArc = currentArc - gap;

        if (newArc <= 0) {
            return { ...result, isValid: false, error: "Gap is too large." };
        }

        const finalAngle = (newArc / (2 * Math.PI * PatternRadiusOuter)) * 360;

        result.rOut = PatternRadiusOuter;
        result.rIn = PatternRadiusInner;
        result.angle = finalAngle;
        result.shape = 'sector';

        // Approximate bounding box could be calculated here or in UI
    }

    return result;
};
