import { describe, expect, it } from 'vitest';
import { calculateShell } from './index';
import { shellParams } from '../../../test/params';
import type { ShellParameters } from '../types';

// Numerical verification of the eccentric cone development
// (docs/eccentric-cone.md § 7). The reference values are independent of the
// integrator: closed-form cone relations, circle arc lengths, 3D ruling lengths
// and an elliptic integral evaluated separately below.

const develop = (overrides: Partial<ShellParameters>) => {
    const result = calculateShell(
        shellParams({
            mode: 'eccentric-cone',
            d1: 1500,
            d2: 2000,
            h: 2500,
            // A vanishing wall makes the neutral diameters equal the inputs.
            thickness: 0.0001,
            kFactor: 0.5,
            gap: 0,
            eccentricity: 0,
            ...overrides
        })
    );
    if (!result.isValid || !result.eccentric) {
        throw new Error(`Invalid result: ${result.error ?? 'no development'}`);
    }
    return { result, dev: result.eccentric };
};

const maxOf = (values: number[]) => values.reduce((max, value) => Math.max(max, value), 0);

describe('eccentricity 0 reproduces the straight cone', () => {
    const { dev } = develop({});
    const cone = calculateShell(
        shellParams({ mode: 'cone', d1: 1500, d2: 2000, h: 2500, thickness: 0.0001, kFactor: 0.5, gap: 0 })
    );

    const slant = Math.hypot(dev.rBottom - dev.rTop, 2500);
    const rhoOuter = (slant * dev.rBottom) / (dev.rBottom - dev.rTop);
    const rhoInner = rhoOuter - slant;

    it('matches the concentric development radii', () => {
        expect(Math.abs(rhoOuter - cone.rOut!)).toBeLessThan(1e-9);
        expect(Math.abs(rhoInner - cone.rIn!)).toBeLessThan(1e-9);
    });

    it('develops both edges as perfect arcs around the apex', () => {
        const a0 = dev.bottomEdge[0];
        const b0 = dev.topEdge[0];
        const cx = a0.x + ((b0.x - a0.x) / slant) * rhoOuter;
        const cy = a0.y + ((b0.y - a0.y) / slant) * rhoOuter;

        const outer = dev.bottomEdge.map(p => Math.abs(Math.hypot(p.x - cx, p.y - cy) - rhoOuter));
        const inner = dev.topEdge.map(p => Math.abs(Math.hypot(p.x - cx, p.y - cy) - rhoInner));

        expect(maxOf(outer)).toBeLessThan(1e-6);
        expect(maxOf(inner)).toBeLessThan(1e-6);
    });

    it('gives the same sector angle and the frustum lateral area π·(R1 + R2)·s', () => {
        const sectorAngleDeg = (dev.totalBottomArc / rhoOuter) * (180 / Math.PI);
        expect(Math.abs(sectorAngleDeg - cone.angle!)).toBeLessThan(1e-9);
        expect(Math.abs(dev.surfaceArea - Math.PI * (dev.rBottom + dev.rTop) * slant)).toBeLessThan(1e-6);
    });
});

describe('equal diameters develop an oblique cylinder', () => {
    const { dev } = develop({ d1: 1000, d2: 1000, h: 1000, eccentricity: 300 });
    const ruling = Math.hypot(300, 1000);

    it('has constant ruling length and full circumference', () => {
        expect(dev.totalBottomArc).toBeCloseTo(2 * Math.PI * dev.rBottom, 9);
        expect(dev.minRuling.length).toBeCloseTo(ruling, 9);
        expect(dev.maxRuling.length).toBeCloseTo(ruling, 9);
    });

    it('keeps all rulings parallel in the flat pattern', () => {
        const dir = {
            x: dev.topEdge[0].x - dev.bottomEdge[0].x,
            y: dev.topEdge[0].y - dev.bottomEdge[0].y
        };
        const cross = dev.bottomEdge.map((bottom, i) => {
            const dx = dev.topEdge[i].x - bottom.x;
            const dy = dev.topEdge[i].y - bottom.y;
            return Math.abs(dir.x * dy - dir.y * dx) / ruling;
        });
        expect(maxOf(cross)).toBeLessThan(1e-6);
    });

    it('has lateral area = right-section ellipse perimeter × ruling', () => {
        // Independent reference: composite Simpson on the elliptic integral.
        const tilt = 300 / ruling;
        const steps = 200000;
        const step = (2 * Math.PI) / steps;
        const f = (phi: number) => Math.sqrt(1 - tilt * tilt * Math.sin(phi) ** 2);
        let integral = f(0) + f(2 * Math.PI);
        for (let i = 1; i < steps; i += 1) {
            integral += (i % 2 === 0 ? 2 : 4) * f(i * step);
        }
        integral = (integral * step) / 3;

        expect(Math.abs(dev.surfaceArea - dev.rBottom * integral * ruling)).toBeLessThan(1e-6);
    });
});

describe('genuinely eccentric cone is an isometry', () => {
    const e = 550;
    const h = 1470;
    const { dev } = develop({ d1: 1360, d2: 2460, h, eccentricity: e, thickness: 20, kFactor: 0.44 });

    it('preserves both edge lengths', () => {
        expect(dev.totalBottomArc).toBeCloseTo(2 * Math.PI * dev.rBottom, 9);
        expect(dev.totalTopArc).toBeCloseTo(2 * Math.PI * dev.rTop, 9);
    });

    it('inscribes the contour polyline within 0.02 mm of the true arcs', () => {
        const length = (points: { x: number; y: number }[]) =>
            points.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - points[i].x, p.y - points[i].y), 0);

        const bottomError = dev.totalBottomArc - length(dev.bottomEdge);
        const topError = dev.totalTopArc - length(dev.topEdge);

        expect(bottomError).toBeGreaterThanOrEqual(0);
        expect(bottomError).toBeLessThan(0.02);
        expect(topError).toBeGreaterThanOrEqual(0);
        expect(topError).toBeLessThan(0.02);
    });

    it('lays every ruling out at its true 3D length', () => {
        const errors = dev.stations.map(station => {
            const phi = (station.phiDeg * Math.PI) / 180;
            const vx = e + (dev.rTop - dev.rBottom) * Math.cos(phi);
            const vy = (dev.rTop - dev.rBottom) * Math.sin(phi);
            const expected = Math.hypot(vx, vy, h);
            const planar = Math.hypot(station.top.x - station.bottom.x, station.top.y - station.bottom.y);
            return Math.abs(planar - expected);
        });

        expect(maxOf(errors)).toBeLessThan(1e-6);
        expect(dev.integrationError).toBeLessThan(1e-6);
    });
});

describe('eccentric cone weld gap', () => {
    it('removes the gap as the mean of the two edge reductions', () => {
        const gap = 6;
        const { dev } = develop({ d1: 1360, d2: 2460, h: 1470, eccentricity: 550, gap });

        expect((dev.gapBottom + dev.gapTop) / 2).toBeCloseTo(gap, 9);
        expect(dev.totalBottomArc).toBeCloseTo(2 * Math.PI * dev.rBottom - dev.gapBottom, 9);
        expect(dev.totalTopArc).toBeCloseTo(2 * Math.PI * dev.rTop - dev.gapTop, 9);
    });
});

describe('seam placement', () => {
    const shape = { d1: 1360, d2: 2460, h: 1470, eccentricity: 550 };

    it('starts the short seam on the shortest ruling and the long seam on the longest', () => {
        const short = develop({ ...shape, seamPosition: 'short' }).dev;
        const long = develop({ ...shape, seamPosition: 'long' }).dev;

        expect(short.stations[0].rulingLength).toBeCloseTo(short.minRuling.length, 6);
        expect(long.stations[0].rulingLength).toBeCloseTo(long.maxRuling.length, 6);
        expect(Math.abs(short.surfaceArea - long.surfaceArea)).toBeLessThan(1e-3);
    });

    it('moves the short ruling to 180° when the wide end is on top', () => {
        const flipped = { ...shape, d1: 2460, d2: 1360 };
        const short = develop({ ...flipped, seamPosition: 'short' }).dev;
        const long = develop({ ...flipped, seamPosition: 'long' }).dev;

        expect(short.stations[0].rulingLength).toBeCloseTo(short.minRuling.length, 6);
        expect(long.stations[0].rulingLength).toBeCloseTo(long.maxRuling.length, 6);
        expect(short.seamPhiDeg).toBeCloseTo(180, 9);
    });
});
