import { describe, expect, it } from 'vitest';
import { calculateShell } from '../features/calculator/math';
import type { ShellParameters } from '../features/calculator/types';
import { buildRolledDimensionLayout } from '../features/viewer-3d/geometry/buildRolledDimensions';
import { shellParams } from '../test/params';
import { computeDrawingScale, pickDrawingScale } from './rolled-part-sheet';
import { computeRolledShell, formatDimension, formatSeamGap } from './rolled-shell';

// Finished-part dimensions shown in the 3D overlay and on the PDF "rolled part" sheet.

const rolled = (overrides: Partial<ShellParameters>) => {
    const params = shellParams(overrides);
    const shell = computeRolledShell(params, calculateShell(params));
    if (!shell) throw new Error('Expected a valid rolled shell');
    return shell;
};

describe('computeRolledShell', () => {
    it('gives back the specified OD and derives the ID from the thickness', () => {
        const shell = rolled({ mode: 'cylinder', specType: 'OD', d1: 2000, thickness: 15 });
        expect(shell.top.outerDiameter).toBeCloseTo(2000, 9);
        expect(shell.top.innerDiameter).toBeCloseTo(1970, 9);
        expect(shell.bottom.outerDiameter).toBeCloseTo(2000, 9);
    });

    it('gives back the specified ID and derives the OD from the thickness', () => {
        const shell = rolled({ mode: 'cone', specType: 'ID', d1: 800, d2: 2400, thickness: 10 });
        expect(shell.top.innerDiameter).toBeCloseTo(800, 9);
        expect(shell.top.outerDiameter).toBeCloseTo(820, 9);
        expect(shell.bottom.innerDiameter).toBeCloseTo(2400, 9);
        expect(shell.bottom.outerDiameter).toBeCloseTo(2420, 9);
    });

    it('reports cylinder mass from the developed blank', () => {
        const params = shellParams({ mode: 'cylinder' });
        const result = calculateShell(params);
        const shell = computeRolledShell(params, result)!;
        const expected = (result.flatLength * params.h * params.thickness * params.density) / 1e9;
        expect(shell.mass).toBeCloseTo(expected, 9);
        expect(shell.halfAngleMaxDeg).toBe(0);
        expect(shell.seamAngleDeg).toBeCloseTo(90, 9);
    });

    it('cone slant height and wall angle follow the neutral radii', () => {
        const params = shellParams({ mode: 'cone' });
        const result = calculateShell(params);
        const shell = computeRolledShell(params, result)!;
        const dr = (result.d1_neutral - result.d2_neutral) / 2;
        expect(shell.slantMax).toBeCloseTo(Math.hypot(params.h, dr), 9);
        expect(Math.tan((shell.halfAngleMaxDeg * Math.PI) / 180)).toBeCloseTo(Math.abs(dr) / params.h, 9);
        // Sector area equals the frustum mid-surface area minus the gap strip.
        const frustum = Math.PI * (result.d1_neutral + result.d2_neutral) / 2 * shell.slantMax;
        expect(shell.surfaceArea).toBeLessThan(frustum);
        expect(shell.surfaceArea).toBeGreaterThan(frustum * 0.99);
    });

    it('offsets the top ring of an eccentric cone by e', () => {
        const shell = rolled({ mode: 'eccentric-cone', eccentricity: 250 });
        expect(shell.top.centerX).toBe(250);
        expect(shell.bottom.centerX).toBe(0);
        expect(shell.slantMax).toBeGreaterThan(shell.slantMin);
    });

    it('reports the actual seam opening at each end, not just the nominal gap', () => {
        const params = shellParams({ mode: 'eccentric-cone', gap: 2 });
        const result = calculateShell(params);
        const shell = computeRolledShell(params, result)!;
        expect(shell.gapTop).toBeCloseTo(result.eccentric!.gapTop, 9);
        expect(shell.gapBottom).toBeCloseTo(result.eccentric!.gapBottom, 9);
        expect(formatSeamGap(shell)).toBe('2.3 / 1.7');

        // A regular cone removes the gap as a constant development angle too:
        // the opening scales with the ring radius at each end.
        const cone = rolled({ mode: 'cone', gap: 2 });
        const rTop = cone.top.neutralDiameter / 2;
        const rBottom = cone.bottom.neutralDiameter / 2;
        expect(cone.gapTop / cone.gapBottom).toBeCloseTo(rTop / rBottom, 9);
        expect((cone.gapTop + cone.gapBottom) / 2).toBeCloseTo(2, 9);

        expect(formatSeamGap(rolled({ mode: 'cylinder', gap: 2 }))).toBe('2');
    });

    it('ignores the eccentricity outside eccentric mode', () => {
        expect(rolled({ mode: 'cone', eccentricity: 250 }).eccentricity).toBe(0);
    });

    it('returns null for an invalid configuration', () => {
        const params = shellParams({ thickness: 5000 });
        expect(computeRolledShell(params, calculateShell(params))).toBeNull();
    });
});

describe('drawing scale', () => {
    it('picks the largest standard scale that fits', () => {
        expect(pickDrawingScale(0.03).label).toBe('1:40');
        expect(pickDrawingScale(0.05).label).toBe('1:20');
        expect(pickDrawingScale(1).label).toBe('1:1');
        expect(pickDrawingScale(3).label).toBe('2.5:1');
    });

    it('fits the default shells on the sheet', () => {
        expect(computeDrawingScale(rolled({ mode: 'cylinder' })).label).toBe('1:40');
        expect(computeDrawingScale(rolled({ mode: 'cylinder', d1: 120, h: 60, thickness: 3 })).label).toBe('1:2');
    });
});

describe('3D dimension layout', () => {
    const texts = (overrides: Partial<ShellParameters>) =>
        buildRolledDimensionLayout(rolled(overrides)).labels.map(label => label.text);

    it('dimensions a cylinder once: diameter, reference diameter, height, thickness', () => {
        expect(texts({ mode: 'cylinder' })).toEqual(['Ø2000', '(Ø1970)', 'H = 2500', 't = 15']);
    });

    it('dimensions both rings of a cone', () => {
        expect(texts({ mode: 'cone' })).toEqual(['Ø2000', '(Ø1970)', 'Ø1500', '(Ø1470)', 'H = 2500', 't = 15']);
    });

    it('adds the eccentricity on an eccentric cone', () => {
        expect(texts({ mode: 'eccentric-cone', eccentricity: 250 })).toContain('e = 250');
    });

    it('anchors the top diameter on the top ring corners', () => {
        const layout = buildRolledDimensionLayout(rolled({ mode: 'eccentric-cone', eccentricity: 250 }));
        const [left, right] = layout.lines;
        expect(left[0]).toEqual([250 - 1000, 1250]);
        expect(right[0]).toEqual([250 + 1000, 1250]);
        expect(layout.arrows.length).toBe(2 * 6 + 1);
    });
});

describe('formatDimension', () => {
    it('drops a zero decimal and keeps one otherwise', () => {
        expect(formatDimension(2000)).toBe('2000');
        expect(formatDimension(1983.2)).toBe('1983.2');
        expect(formatDimension(1983.24)).toBe('1983.2');
    });
});
