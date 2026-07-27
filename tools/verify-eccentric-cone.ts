/**
 * Numerical verification of the eccentric cone development (docs/eccentric-cone.md § 7).
 *
 * Run with:  npm run verify:eccentric
 */

import { calculateShell } from '../src/features/calculator/math';
import type { ShellParameters } from '../src/features/calculator/types';

const baseParams: ShellParameters = {
    mode: 'eccentric-cone',
    specType: 'OD',
    d1: 1500,
    d2: 2000,
    h: 2500,
    thickness: 0.0001,
    kFactor: 0.5,
    gap: 0,
    bendLinesEnabled: false,
    bendLinesCount: 0,
    eccentricity: 0,
    seamPosition: 'short',
    seamAngleDeg: 0,
    stationCount: 24,
    density: 7850,
    bendDimensionsEnabled: false,
    bendDimensionOffset: 120
};

let failures = 0;

const check = (label: string, actual: number, expected: number, tolerance: number) => {
    const delta = Math.abs(actual - expected);
    const ok = delta <= tolerance;
    if (!ok) failures += 1;
    console.log(
        `${ok ? 'PASS' : 'FAIL'}  ${label}\n      actual=${actual.toPrecision(12)} expected=${expected.toPrecision(12)} |d|=${delta.toExponential(3)} tol=${tolerance.toExponential(3)}`
    );
};

const develop = (overrides: Partial<ShellParameters>) => {
    const result = calculateShell({ ...baseParams, ...overrides });
    if (!result.isValid || !result.eccentric) {
        throw new Error(`Invalid result: ${result.error ?? 'no development'}`);
    }
    return result;
};

console.log('\n=== 1. e = 0 must reproduce the straight cone sector ===');
{
    const ecc = develop({});
    const dev = ecc.eccentric!;
    const cone = calculateShell({ ...baseParams, mode: 'cone' });

    const rBottom = dev.rBottom;
    const rTop = dev.rTop;
    const slant = Math.hypot(rBottom - rTop, baseParams.h);
    const rhoOuter = (slant * rBottom) / (rBottom - rTop);
    const rhoInner = rhoOuter - slant;

    check('development outer radius', rhoOuter, cone.rOut!, 1e-9);
    check('development inner radius', rhoInner, cone.rIn!, 1e-9);

    // All bottom-edge points must sit on a circle of radius rhoOuter around the
    // developed apex; the apex lies along the first ruling.
    const a0 = dev.bottomEdge[0];
    const b0 = dev.topEdge[0];
    const ux = (b0.x - a0.x) / slant;
    const uy = (b0.y - a0.y) / slant;
    const cx = a0.x + ux * rhoOuter;
    const cy = a0.y + uy * rhoOuter;

    let maxOuterDev = 0;
    let maxInnerDev = 0;
    for (let i = 0; i < dev.bottomEdge.length; i += 1) {
        maxOuterDev = Math.max(maxOuterDev, Math.abs(Math.hypot(dev.bottomEdge[i].x - cx, dev.bottomEdge[i].y - cy) - rhoOuter));
        maxInnerDev = Math.max(maxInnerDev, Math.abs(Math.hypot(dev.topEdge[i].x - cx, dev.topEdge[i].y - cy) - rhoInner));
    }
    check('bottom edge is a perfect arc', maxOuterDev, 0, 1e-6);
    check('top edge is a perfect arc', maxInnerDev, 0, 1e-6);

    // Sector angle from the developed arc length.
    const sectorAngleDeg = (dev.totalBottomArc / rhoOuter) * (180 / Math.PI);
    check('sector angle vs cone module', sectorAngleDeg, cone.angle!, 1e-9);

    // Lateral area of a straight frustum: pi*(R1+R2)*slant.
    check('lateral area', dev.surfaceArea, Math.PI * (rBottom + rTop) * slant, 1e-6);
}

console.log('\n=== 2. Equal diameters => oblique cylinder ===');
{
    const dev = develop({ d1: 1000, d2: 1000, h: 1000, eccentricity: 300 }).eccentric!;
    const expectedRuling = Math.hypot(300, 1000);

    check('bottom developed arc', dev.totalBottomArc, 2 * Math.PI * dev.rBottom, 1e-9);
    check('min ruling', dev.minRuling.length, expectedRuling, 1e-9);
    check('max ruling', dev.maxRuling.length, expectedRuling, 1e-9);

    // All rulings are parallel in the development.
    const dir0 = {
        x: dev.topEdge[0].x - dev.bottomEdge[0].x,
        y: dev.topEdge[0].y - dev.bottomEdge[0].y
    };
    let maxCross = 0;
    for (let i = 0; i < dev.bottomEdge.length; i += 1) {
        const dx = dev.topEdge[i].x - dev.bottomEdge[i].x;
        const dy = dev.topEdge[i].y - dev.bottomEdge[i].y;
        maxCross = Math.max(maxCross, Math.abs(dir0.x * dy - dir0.y * dx) / expectedRuling);
    }
    check('rulings stay parallel', maxCross, 0, 1e-6);

    // The lateral area of an oblique cylinder is (perimeter of the RIGHT cross
    // section) x (ruling length); the right section is an ellipse, so the
    // reference value is an independent elliptic integral, evaluated here by
    // composite Simpson with a very fine step.
    const tilt = 300 / expectedRuling;
    const simpsonSteps = 200000;
    const stepSize = (2 * Math.PI) / simpsonSteps;
    const f = (phi: number) => Math.sqrt(1 - tilt * tilt * Math.sin(phi) * Math.sin(phi));
    let integral = f(0) + f(2 * Math.PI);
    for (let i = 1; i < simpsonSteps; i += 1) {
        integral += (i % 2 === 0 ? 2 : 4) * f(i * stepSize);
    }
    integral = (integral * stepSize) / 3;
    check('lateral area = right-section perimeter * ruling', dev.surfaceArea, dev.rBottom * integral * expectedRuling, 1e-6);
}

console.log('\n=== 3. Isometry of a genuinely eccentric cone ===');
{
    const result = develop({ d1: 1360, d2: 2460, h: 1470, eccentricity: 550, thickness: 20, kFactor: 0.44, specType: 'OD' });
    const dev = result.eccentric!;

    // Edge lengths of the development must equal the true circle arcs.
    check('bottom arc = 2*pi*R_bottom', dev.totalBottomArc, 2 * Math.PI * dev.rBottom, 1e-9);
    check('top arc = 2*pi*R_top', dev.totalTopArc, 2 * Math.PI * dev.rTop, 1e-9);

    // The polyline through the developed nodes is inscribed, so it must be
    // slightly shorter than the true arc but converge to it.
    let polyBottom = 0;
    let polyTop = 0;
    for (let i = 1; i < dev.bottomEdge.length; i += 1) {
        polyBottom += Math.hypot(dev.bottomEdge[i].x - dev.bottomEdge[i - 1].x, dev.bottomEdge[i].y - dev.bottomEdge[i - 1].y);
        polyTop += Math.hypot(dev.topEdge[i].x - dev.topEdge[i - 1].x, dev.topEdge[i].y - dev.topEdge[i - 1].y);
    }
    console.log(`      contour polyline bottom=${polyBottom.toFixed(4)} (arc ${dev.totalBottomArc.toFixed(4)}), top=${polyTop.toFixed(4)} (arc ${dev.totalTopArc.toFixed(4)})`);
    check('bottom contour chord error', dev.totalBottomArc - polyBottom, 0, 0.02);
    check('top contour chord error', dev.totalTopArc - polyTop, 0, 0.02);

    // Ruling lengths in the development must match the 3D ruling lengths.
    const rBottom = dev.rBottom;
    const rTop = dev.rTop;
    let maxRulingError = 0;
    for (const station of dev.stations) {
        const phi = (station.phiDeg * Math.PI) / 180;
        const vx = 550 + (rTop - rBottom) * Math.cos(phi);
        const vy = (rTop - rBottom) * Math.sin(phi);
        const expected = Math.hypot(vx, vy, 1470);
        const planar = Math.hypot(station.top.x - station.bottom.x, station.top.y - station.bottom.y);
        maxRulingError = Math.max(maxRulingError, Math.abs(planar - expected));
    }
    check('planar ruling == 3D ruling', maxRulingError, 0, 1e-6);
    check('RK4 self-check residual', dev.integrationError, 0, 1e-6);

    console.log(`      ruling min=${dev.minRuling.length.toFixed(3)} @ ${dev.minRuling.phiDeg.toFixed(1)}°, max=${dev.maxRuling.length.toFixed(3)} @ ${dev.maxRuling.phiDeg.toFixed(1)}°`);
    console.log(`      blank ${result.flatLength.toFixed(1)} x ${result.flatWidth.toFixed(1)} mm, rotation ${result.patternRotationDeg?.toFixed(2)}°`);
}

console.log('\n=== 4. Weld gap ===');
{
    const gap = 6;
    const dev = develop({ d1: 1360, d2: 2460, h: 1470, eccentricity: 550, gap }).eccentric!;
    check('average removed edge length', (dev.gapBottom + dev.gapTop) / 2, gap, 1e-9);
    check('bottom arc reduced by gapBottom', dev.totalBottomArc, 2 * Math.PI * dev.rBottom - dev.gapBottom, 1e-9);
    check('top arc reduced by gapTop', dev.totalTopArc, 2 * Math.PI * dev.rTop - dev.gapTop, 1e-9);
}

console.log('\n=== 5. Seam placement ===');
{
    const shortSeam = develop({ d1: 1360, d2: 2460, h: 1470, eccentricity: 550, seamPosition: 'short' }).eccentric!;
    const longSeam = develop({ d1: 1360, d2: 2460, h: 1470, eccentricity: 550, seamPosition: 'long' }).eccentric!;

    check('short seam starts on the short ruling', shortSeam.stations[0].rulingLength, shortSeam.minRuling.length, 1e-6);
    check('long seam starts on the long ruling', longSeam.stations[0].rulingLength, longSeam.maxRuling.length, 1e-6);
    check('seam choice does not change the blank area', shortSeam.surfaceArea, longSeam.surfaceArea, 1e-3);

    // Same check with the wide end on top: the short ruling moves to phi = 180.
    const flippedShort = develop({ d1: 2460, d2: 1360, h: 1470, eccentricity: 550, seamPosition: 'short' }).eccentric!;
    const flippedLong = develop({ d1: 2460, d2: 1360, h: 1470, eccentricity: 550, seamPosition: 'long' }).eccentric!;
    check('flipped: short seam picks the short ruling', flippedShort.stations[0].rulingLength, flippedShort.minRuling.length, 1e-6);
    check('flipped: long seam picks the long ruling', flippedLong.stations[0].rulingLength, flippedLong.maxRuling.length, 1e-6);
    check('flipped: short seam sits at 180 deg', flippedShort.seamPhiDeg, 180, 1e-9);
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);
