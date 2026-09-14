import { describe, expect, it } from 'vitest';
import { calculateShell } from '../features/calculator/math';
import type { ShellParameters } from '../features/calculator/types';
import { shellParams } from '../test/params';
import { buildPatternDimensions } from './pattern-dimensions';
import { getPatternStations } from './pattern-stations';

// Bend-line spacing dimensions across all three shape modes.

const build = (overrides: Partial<ShellParameters>) => {
    const params = shellParams({
        bendLinesEnabled: true,
        bendLinesCount: 5,
        bendDimensionsEnabled: true,
        ...overrides
    });
    const result = calculateShell(params);
    if (!result.isValid) throw new Error(`Invalid result: ${result.error}`);

    return {
        result,
        stations: getPatternStations(params, result),
        dimensions: buildPatternDimensions(params, result, 20)
    };
};

describe('cylinder', () => {
    const { result, stations, dimensions } = build({ mode: 'cylinder' });

    it('emits one spacing run plus both seam edges', () => {
        // 5 bend lines → 7 stations (seam edges included) → 6 spaces.
        expect(stations).toHaveLength(7);
        expect(dimensions).toHaveLength(8);
    });

    it('spaces equal bendStep and add up to the blank length', () => {
        const spacings = dimensions.slice(0, 6).map(d => d.length);
        for (const spacing of spacings) {
            expect(spacing).toBeCloseTo(result.bendStep!, 9);
        }
        expect(spacings.reduce((a, b) => a + b, 0)).toBeCloseTo(result.flatLength, 9);
    });

    it('dimensions both seam edges at the blank height', () => {
        expect(dimensions[6].length).toBeCloseTo(result.flatWidth, 9);
        expect(dimensions[7].length).toBeCloseTo(result.flatWidth, 9);
    });
});

describe('straight cone', () => {
    const { result, stations, dimensions } = build({ mode: 'cone' });
    const outer = dimensions.filter((_, i) => i < 12 && i % 2 === 0).map(d => d.length);
    const inner = dimensions.filter((_, i) => i < 12 && i % 2 === 1).map(d => d.length);

    it('runs both arcs, since their chords differ', () => {
        expect(stations).toHaveLength(7);
        expect(dimensions).toHaveLength(14);
        expect(outer.every(value => value > inner[0])).toBe(true);
    });

    it('keeps chords equal along each arc', () => {
        expect(Math.max(...outer) - Math.min(...outer)).toBeLessThan(1e-9);
        expect(Math.max(...inner) - Math.min(...inner)).toBeLessThan(1e-9);
    });

    it('brackets the neutral-fibre bendStep between the two chords', () => {
        const mid = (outer[0] + inner[0]) / 2;
        expect(Math.abs(mid - result.bendStep!)).toBeLessThanOrEqual(result.bendStep! * 0.002);
    });

    it('dimensions both seam edges at the slant height', () => {
        const slant = result.rOut! - result.rIn!;
        expect(dimensions[12].length).toBeCloseTo(slant, 9);
        expect(dimensions[13].length).toBeCloseTo(slant, 9);
    });
});

describe('eccentric cone', () => {
    const { result, stations, dimensions } = build({ mode: 'eccentric-cone', stationCount: 12 });
    const development = result.eccentric!;

    it('follows the station count', () => {
        expect(stations).toHaveLength(13);
        expect(dimensions).toHaveLength(26);
    });

    it('dimensions the seam edge at the seam ruling length', () => {
        expect(dimensions[24].length).toBeCloseTo(development.stations[0].rulingLength, 9);
    });

    it('inscribes the chord chains within 0.3 % of the developed arcs', () => {
        const bottom = dimensions.filter((_, i) => i < 24 && i % 2 === 0).reduce((a, d) => a + d.length, 0);
        const top = dimensions.filter((_, i) => i < 24 && i % 2 === 1).reduce((a, d) => a + d.length, 0);

        expect(bottom).toBeLessThan(development.totalBottomArc);
        expect(top).toBeLessThan(development.totalTopArc);
        expect(Math.abs(bottom - development.totalBottomArc)).toBeLessThanOrEqual(development.totalBottomArc * 0.003);
    });
});

describe('toggles', () => {
    it.each(['cylinder', 'cone', 'eccentric-cone'] as const)('%s: no dimensions when disabled or without bend lines', mode => {
        expect(build({ mode, bendDimensionsEnabled: false }).dimensions).toHaveLength(0);
        expect(build({ mode, bendLinesEnabled: false }).dimensions).toHaveLength(0);
    });

    it('cylinder without bend lines: one span plus two seam edges', () => {
        expect(build({ mode: 'cylinder', bendLinesCount: 0 }).dimensions).toHaveLength(3);
    });
});

describe('dimension placement', () => {
    const { result, dimensions } = build({ mode: 'cylinder' });

    it('draws each dimension line at the measured length, readable and complete', () => {
        for (const dimension of dimensions) {
            const { x1, y1, x2, y2 } = dimension.line;
            expect(Math.hypot(x2 - x1, y2 - y1)).toBeCloseTo(dimension.length, 9);
            expect(dimension.extensions).toHaveLength(2);
            expect(dimension.ticks).toHaveLength(2);
            expect(dimension.angleDeg).toBeGreaterThanOrEqual(-90);
            expect(dimension.angleDeg).toBeLessThanOrEqual(90);
        }
    });

    it('offsets the bottom run outside the blank', () => {
        expect(dimensions[0].line.y1).toBeLessThan(-result.flatWidth / 2);
    });
});
