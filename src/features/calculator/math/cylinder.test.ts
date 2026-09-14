import { describe, expect, it } from 'vitest';
import { calculateShell } from './index';
import { shellParams } from '../../../test/params';

// Reference values are derived by hand from the two relations the engine
// implements (docs/calculations.md), not by running the code:
//
//   from OD:  Dn = OD − 2·t·(1 − K)        from ID:  Dn = ID + 2·K·t
//   developed length  L = π·Dn − gap

const cylinder = (overrides: Parameters<typeof shellParams>[0] = {}) =>
    calculateShell(shellParams({ mode: 'cylinder', ...overrides }));

describe('cylinder developed length', () => {
    it('worked example: OD 2000, t 15, K 0.44, gap 2', () => {
        // Dn = 2000 − 2·15·0.56 = 1983.2 mm
        const result = cylinder();

        expect(result.isValid).toBe(true);
        expect(result.d1_neutral).toBeCloseTo(1983.2, 9);
        expect(result.d2_neutral).toBeCloseTo(1983.2, 9);
        expect(result.flatLength).toBeCloseTo(Math.PI * 1983.2 - 2, 9);
        expect(result.flatLength).toBeCloseTo(6228.41, 2);
        expect(result.flatWidth).toBe(2500);
        expect(result.shape).toBe('rect');
    });

    it('from ID: ID 2000, t 15, K 0.44, gap 2', () => {
        // Dn = 2000 + 2·0.44·15 = 2013.2 mm
        const result = cylinder({ specType: 'ID' });

        expect(result.isValid).toBe(true);
        expect(result.d1_neutral).toBeCloseTo(2013.2, 9);
        expect(result.flatLength).toBeCloseTo(Math.PI * 2013.2 - 2, 9);
        expect(result.flatLength).toBeCloseTo(6322.65, 2);
    });

    it('reading the same number as ID instead of OD adds exactly π·2t, independent of K', () => {
        // Dn(ID) − Dn(OD) = 2Kt + 2t(1 − K) = 2t, so ΔL = 2πt = 94.25 mm at t = 15.
        for (const kFactor of [0.33, 0.44, 0.5, 1]) {
            const od = cylinder({ specType: 'OD', kFactor });
            const id = cylinder({ specType: 'ID', kFactor });
            expect(id.flatLength - od.flatLength).toBeCloseTo(2 * Math.PI * 15, 9);
        }
        expect(cylinder({ specType: 'ID' }).flatLength - cylinder().flatLength).toBeCloseTo(94.25, 2);
    });

    it('wall thickness 15 → 20 mm shortens an OD-specified blank', () => {
        // Dn = 2000 − 2·20·0.56 = 1977.6 mm
        const result = cylinder({ thickness: 20 });
        expect(result.flatLength).toBeCloseTo(Math.PI * 1977.6 - 2, 9);
        expect(result.flatLength).toBeCloseTo(6210.81, 2);
    });

    it('the weld gap is subtracted one-for-one', () => {
        const base = cylinder({ gap: 2 });
        const wider = cylinder({ gap: 4 });
        const closed = cylinder({ gap: 0 });

        expect(base.flatLength - wider.flatLength).toBeCloseTo(2, 9);
        expect(closed.flatLength).toBeCloseTo(Math.PI * 1983.2, 9);
    });

    it('is unit-agnostic: scaling every length scales the blank', () => {
        const mm = cylinder({ d1: 2000, thickness: 15, h: 2500, gap: 2 });
        const scaled = cylinder({ d1: 200, thickness: 1.5, h: 250, gap: 0.2 });
        expect(scaled.flatLength).toBeCloseTo(mm.flatLength / 10, 9);
    });
});

describe('K-factor', () => {
    it('K 0.44 → 0.33 moves the neutral axis inwards', () => {
        // Dn = 2000 − 2·15·0.67 = 1979.9 mm; ΔL = π·3.3 = 10.37 mm
        const result = cylinder({ kFactor: 0.33 });
        expect(result.flatLength).toBeCloseTo(Math.PI * 1979.9 - 2, 9);
        expect(cylinder().flatLength - result.flatLength).toBeCloseTo(Math.PI * 3.3, 9);
    });

    it('K = 1 puts the neutral axis on the outer surface', () => {
        expect(cylinder({ specType: 'OD', kFactor: 1 }).d1_neutral).toBeCloseTo(2000, 9);
        expect(cylinder({ specType: 'ID', kFactor: 1 }).d1_neutral).toBeCloseTo(2030, 9);
    });

    it('K → 0 approaches the inner surface', () => {
        const result = cylinder({ specType: 'OD', kFactor: 1e-6 });
        expect(result.isValid).toBe(true);
        expect(result.d1_neutral).toBeCloseTo(1970, 3);
    });

    it('the developed length grows linearly with K at 2πt per unit of K', () => {
        const low = cylinder({ kFactor: 0.3 });
        const high = cylinder({ kFactor: 0.5 });
        expect(high.flatLength - low.flatLength).toBeCloseTo(2 * Math.PI * 15 * 0.2, 9);
    });
});

describe('bend lines', () => {
    it('divides the blank into equal spaces', () => {
        const result = cylinder({ bendLinesEnabled: true, bendLinesCount: 5 });

        expect(result.bendLines).toHaveLength(5);
        expect(result.bendStep).toBeCloseTo(result.flatLength / 6, 9);
    });

    it('reports no bend lines when the option is off', () => {
        const result = cylinder({ bendLinesEnabled: false, bendLinesCount: 5 });
        expect(result.bendLines).toEqual([]);
        expect(result.bendStep).toBeUndefined();
    });

    it('centres the blank bounding box on the origin', () => {
        const result = cylinder();
        expect(result.bboxWidth).toBeCloseTo(result.flatLength, 9);
        expect(result.bboxHeight).toBe(2500);
        expect(result.bboxMinX).toBeCloseTo(-result.flatLength / 2, 9);
        expect(result.bboxMinY).toBe(-1250);
    });
});
