import { describe, expect, it } from 'vitest';
import { calculateShell } from './index';
import { shellParams } from '../../../test/params';
import type { ShellParameters } from '../types';

// A concentric frustum develops into an annular sector. With neutral radii
// R_L > R_S, height h and slant s = √((R_L − R_S)² + h²):
//
//   outer development radius  ρo = s·R_L / (R_L − R_S)
//   inner development radius  ρi = ρo − s
//   sector angle              θ  = 360·R_L / ρo = 360·(R_L − R_S) / s
//
// The weld gap is removed as an arc length on the neutral fibre, i.e. at the
// mean radius (ρo + ρi) / 2. The blank reported for cutting is the minimum
// bounding rectangle plus a 10 mm cutting margin in each direction.

const CUT_MARGIN = 10;

const cone = (overrides: Partial<ShellParameters> = {}) =>
    calculateShell(shellParams({ mode: 'cone', ...overrides }));

// Reference case: OD 2000 / 1500, t 15, K 0.44, h 2500, closed seam.
// Neutral diameters 1983.2 / 1483.2 → R_L = 991.6, R_S = 741.6, ΔR = 250.
const R_L = 991.6;
const R_S = 741.6;
const H = 2500;
const SLANT = Math.sqrt(250 ** 2 + H ** 2); // 2512.4689 mm
const RHO_OUT = (SLANT * R_L) / (R_L - R_S); // 9965.4567 mm
const RHO_IN = RHO_OUT - SLANT; // 7452.9878 mm
const THETA = (360 * (R_L - R_S)) / SLANT; // 35.8213°

describe('concentric cone development', () => {
    it('reference case: OD 2000 → 1500, h 2500, t 15, K 0.44', () => {
        const result = cone({ gap: 0 });

        expect(result.isValid).toBe(true);
        expect(result.shape).toBe('sector');
        expect(result.d1_neutral).toBeCloseTo(1983.2, 9);
        expect(result.d2_neutral).toBeCloseTo(1483.2, 9);
        expect(result.rOut).toBeCloseTo(RHO_OUT, 6);
        expect(result.rIn).toBeCloseTo(RHO_IN, 6);
        expect(result.angle).toBeCloseTo(THETA, 9);

        // Published rounded values.
        expect(result.rOut).toBeCloseTo(9965.46, 2);
        expect(result.rIn).toBeCloseTo(7452.99, 2);
        expect(result.angle).toBeCloseTo(35.821, 3);
    });

    it('both developed arcs equal the true neutral circumferences with a closed seam', () => {
        const result = cone({ gap: 0 });
        const angleRad = (result.angle! * Math.PI) / 180;

        expect(result.rOut! * angleRad).toBeCloseTo(2 * Math.PI * R_L, 6);
        expect(result.rIn! * angleRad).toBeCloseTo(2 * Math.PI * R_S, 6);
    });

    it('the seam edge is the slant height', () => {
        const result = cone();
        expect(result.rOut! - result.rIn!).toBeCloseTo(SLANT, 9);
    });

    it('is independent of which end is on top', () => {
        const wideTop = cone({ d1: 2000, d2: 1500 });
        const wideBottom = cone({ d1: 1500, d2: 2000 });

        expect(wideBottom.rOut).toBeCloseTo(wideTop.rOut!, 9);
        expect(wideBottom.rIn).toBeCloseTo(wideTop.rIn!, 9);
        expect(wideBottom.angle).toBeCloseTo(wideTop.angle!, 9);
    });

    it('from ID adds 2·K·t to both diameters', () => {
        const result = cone({ specType: 'ID' });
        expect(result.d1_neutral).toBeCloseTo(2013.2, 9);
        expect(result.d2_neutral).toBeCloseTo(1513.2, 9);
    });

    it('a full cone (small end → 0) develops to a sector starting at the apex', () => {
        // D2 such that R_S is small but the wall still fits; ρi stays ≥ 0.
        const result = cone({ d1: 2000, d2: 100, thickness: 5, h: 1000 });
        expect(result.isValid).toBe(true);
        expect(result.rIn!).toBeGreaterThanOrEqual(0);
        expect(result.angle!).toBeLessThan(360);
    });
});

describe('cone weld gap', () => {
    it('removes the gap as arc length on the neutral fibre', () => {
        const gap = 6;
        const result = cone({ gap });
        const rhoMid = (RHO_OUT + RHO_IN) / 2;
        const expectedAngle = THETA - (gap / rhoMid) * (180 / Math.PI);

        expect(result.angle).toBeCloseTo(expectedAngle, 9);

        // Equivalently: the neutral arc is the mean circumference minus the gap,
        // exactly as for a cylinder.
        const neutralArc = ((result.angle! * Math.PI) / 180) * rhoMid;
        expect(neutralArc).toBeCloseTo(Math.PI * (R_L + R_S) - gap, 6);
    });

    it('agrees with the cylinder in the near-cylindrical limit', () => {
        const nearCylinder = cone({ d1: 2000, d2: 1998, gap: 2 });
        const cylinder = calculateShell(shellParams({ mode: 'cylinder', d1: 1999, gap: 2 }));
        const rhoMid = (nearCylinder.rOut! + nearCylinder.rIn!) / 2;
        const neutralArc = ((nearCylinder.angle! * Math.PI) / 180) * rhoMid;

        expect(neutralArc).toBeCloseTo(cylinder.flatLength, 6);
    });
});

describe('cone blank rectangle', () => {
    it('is landscape and includes the cutting margin', () => {
        const result = cone();
        expect(result.flatLength).toBeGreaterThanOrEqual(result.flatWidth);
        expect(result.bboxWidth).toBe(result.flatLength);
        expect(result.bboxHeight).toBe(result.flatWidth);
    });

    it('encloses the sector and is no larger than the upright bounding box', () => {
        const result = cone({ gap: 0 });
        const half = (THETA * Math.PI) / 360;

        const blankArea = (result.flatLength - CUT_MARGIN) * (result.flatWidth - CUT_MARGIN);
        const sectorArea = (THETA / 360) * Math.PI * (RHO_OUT ** 2 - RHO_IN ** 2);
        // Sector symmetric about the x axis (θ < 180°): exact axis-aligned box.
        const uprightArea = (RHO_OUT - RHO_IN * Math.cos(half)) * (2 * RHO_OUT * Math.sin(half));

        expect(blankArea).toBeGreaterThan(sectorArea);
        expect(blankArea).toBeLessThanOrEqual(uprightArea + 1e-6);
    });

    it('spaces bend lines evenly along the neutral arc', () => {
        const result = cone({ bendLinesEnabled: true, bendLinesCount: 5, gap: 0 });
        const rhoMid = (RHO_OUT + RHO_IN) / 2;
        const neutralArc = ((THETA * Math.PI) / 180) * rhoMid;

        expect(result.bendLines).toHaveLength(5);
        expect(result.bendStep).toBeCloseTo(neutralArc / 6, 6);
    });
});
