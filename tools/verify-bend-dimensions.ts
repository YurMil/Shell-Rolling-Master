/**
 * Bend-line spacing dimensions across all three shape modes.
 *
 * Run with:  npm run verify:bend-dimensions
 */

import { calculateShell } from '../src/features/calculator/math';
import type { ShellParameters } from '../src/features/calculator/types';
import { buildPatternDimensions } from '../src/utils/pattern-dimensions';
import { getPatternStations } from '../src/utils/pattern-stations';

const baseParams: ShellParameters = {
    mode: 'cylinder',
    specType: 'OD',
    d1: 2000,
    d2: 1500,
    h: 2500,
    thickness: 15,
    kFactor: 0.44,
    gap: 2,
    bendLinesEnabled: true,
    bendLinesCount: 5,
    eccentricity: 250,
    seamPosition: 'short',
    seamAngleDeg: 0,
    stationCount: 24,
    density: 7850,
    bendDimensionsEnabled: true,
    bendDimensionOffset: 120
};

let failures = 0;

const report = (ok: boolean, label: string, detail = '') => {
    if (!ok) failures += 1;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `\n      ${detail}` : ''}`);
};

const close = (label: string, actual: number, expected: number, tolerance: number) => {
    const delta = Math.abs(actual - expected);
    report(delta <= tolerance, label, delta <= tolerance ? '' : `actual=${actual} expected=${expected} |d|=${delta}`);
};

const build = (overrides: Partial<ShellParameters>) => {
    const params = { ...baseParams, ...overrides };
    const result = calculateShell(params);
    if (!result.isValid) throw new Error(`Invalid result: ${result.error}`);

    const stations = getPatternStations(params, result);
    const dimensions = buildPatternDimensions(params, result, 20);
    return { params, result, stations, dimensions };
};

console.log('\n=== 1. Cylinder ===');
{
    const { result, stations, dimensions } = build({ mode: 'cylinder' });

    // 5 bend lines -> 7 stations (both seam edges included) -> 6 gaps.
    report(stations.length === 7, 'stations = bend lines + 2 seam edges', `got ${stations.length}`);
    // One edge only (the two edges of a rectangle are parallel) + 2 seam edges.
    report(dimensions.length === 8, 'one dimension run plus both seam edges', `got ${dimensions.length}`);

    const spacings = dimensions.slice(0, 6).map(dimension => dimension.length);
    for (const [index, spacing] of spacings.entries()) {
        close(`gap ${index + 1} equals bendStep`, spacing, result.bendStep!, 1e-9);
    }
    close('spacing chain covers the blank', spacings.reduce((a, b) => a + b, 0), result.flatLength, 1e-9);
    close('first seam edge = blank height', dimensions[6].length, result.flatWidth, 1e-9);
    close('last seam edge = blank height', dimensions[7].length, result.flatWidth, 1e-9);
}

console.log('\n=== 2. Straight cone ===');
{
    const { result, stations, dimensions } = build({ mode: 'cone' });

    report(stations.length === 7, 'stations = bend lines + 2 seam edges', `got ${stations.length}`);
    // Outer and inner arcs have different chord lengths, so both edges are run.
    report(dimensions.length === 14, 'two dimension runs plus both seam edges', `got ${dimensions.length}`);

    const outer = dimensions.filter((_, index) => index < 12 && index % 2 === 0).map(d => d.length);
    const inner = dimensions.filter((_, index) => index < 12 && index % 2 === 1).map(d => d.length);

    report(outer.every(value => value > inner[0]), 'outer chords are longer than inner ones');
    close('outer chords are equal', Math.max(...outer) - Math.min(...outer), 0, 1e-9);
    close('inner chords are equal', Math.max(...inner) - Math.min(...inner), 0, 1e-9);

    // The neutral-fibre step reported in the UI sits between the two chords.
    const mid = (outer[0] + inner[0]) / 2;
    close('bendStep is bracketed by the two chords', mid, result.bendStep!, result.bendStep! * 0.002);

    const slant = result.rOut! - result.rIn!;
    close('first seam edge = slant height', dimensions[12].length, slant, 1e-9);
    close('last seam edge = slant height', dimensions[13].length, slant, 1e-9);
}

console.log('\n=== 3. Eccentric cone ===');
{
    const { result, stations, dimensions } = build({ mode: 'eccentric-cone', stationCount: 12 });

    report(stations.length === 13, 'stations follow stationCount', `got ${stations.length}`);
    report(dimensions.length === 26, 'two runs (12 gaps x 2) plus both seam edges', `got ${dimensions.length}`);

    const development = result.eccentric!;
    close(
        'first seam edge = ruling length at the seam',
        dimensions[24].length,
        development.stations[0].rulingLength,
        1e-9
    );

    // Chord runs must add up to slightly less than the exact developed arcs.
    const bottom = dimensions.filter((_, index) => index < 24 && index % 2 === 0).reduce((a, d) => a + d.length, 0);
    const top = dimensions.filter((_, index) => index < 24 && index % 2 === 1).reduce((a, d) => a + d.length, 0);
    report(bottom < development.totalBottomArc, 'bottom chord chain is inscribed in the arc');
    report(top < development.totalTopArc, 'top chord chain is inscribed in the arc');
    close('bottom chain is within 0.3% of the arc', bottom, development.totalBottomArc, development.totalBottomArc * 0.003);
}

console.log('\n=== 4. Toggles ===');
{
    for (const mode of ['cylinder', 'cone', 'eccentric-cone'] as const) {
        report(
            build({ mode, bendDimensionsEnabled: false }).dimensions.length === 0,
            `${mode}: no dimensions when the option is off`
        );
        report(
            build({ mode, bendLinesEnabled: false }).dimensions.length === 0,
            `${mode}: no dimensions without bend lines`
        );
    }

    // Without bend lines there is nothing between the seams, but the chain is
    // still well formed for the modes that always sample stations.
    const { dimensions } = build({ mode: 'cylinder', bendLinesCount: 0 });
    report(dimensions.length === 3, 'cylinder without bend lines: one span plus two seam edges', `got ${dimensions.length}`);
}

console.log('\n=== 5. Dimension placement ===');
{
    const { dimensions } = build({ mode: 'cylinder' });

    for (const dimension of dimensions) {
        const dx = dimension.line.x2 - dimension.line.x1;
        const dy = dimension.line.y2 - dimension.line.y1;
        report(
            Math.abs(Math.hypot(dx, dy) - dimension.length) < 1e-9,
            'dimension line length matches the measured value'
        );
        report(dimension.extensions.length === 2 && dimension.ticks.length === 2, 'extension lines and ticks are emitted');
        report(dimension.angleDeg >= -90 && dimension.angleDeg <= 90, 'text is never upside down', `${dimension.angleDeg}`);
        break;
    }

    // The run along the bottom edge must sit below the blank, not on top of it.
    const { result } = build({ mode: 'cylinder' });
    const bottomRun = dimensions[0];
    report(
        bottomRun.line.y1 < -result.flatWidth / 2,
        'the run is offset outside the blank',
        `y=${bottomRun.line.y1} edge=${-result.flatWidth / 2}`
    );
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);
