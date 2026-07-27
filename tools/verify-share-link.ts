/**
 * Round-trip checks for the share-link protocol (src/shareLink.ts).
 *
 * Run with:  npm run verify:share-link
 */

import { applySharedState, collectParams } from '../src/shareLink';
import { useShellStore } from '../src/store/useShellStore';
import { SEAM_POSITIONS, SHAPE_TYPES, SPEC_TYPES } from '../src/features/calculator/types';

let failures = 0;

const report = (ok: boolean, label: string, detail = '') => {
    if (!ok) failures += 1;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `\n      ${detail}` : ''}`);
};

const check = (label: string, actual: unknown, expected: unknown) => {
    const ok = Object.is(actual, expected);
    report(ok, label, ok ? '' : `actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`);
};

const resetToDefaults = () => {
    const store = useShellStore.getState();
    store.setMode('cylinder');
    store.setSpecType('OD');
    store.setD1(2000);
    store.setD2(1500);
    store.setHeight(2500);
    store.setThickness(15);
    store.setKFactor(0.44);
    store.setGap(2);
    store.setBendLinesEnabled(false);
    store.setBendLinesCount(0);
    store.setEccentricity(250);
    store.setSeamPosition('short');
    store.setSeamAngle(0);
    store.setStationCount(24);
    store.setDensity(7850);
    store.setBendDimensionsEnabled(false);
    store.setBendDimensionOffset(120);
};

console.log('\n=== 1. Every input parameter is part of the payload ===');
{
    // The applier map is keyed by `keyof ShellParameters`, so this mirrors the
    // compile-time guarantee at runtime and also catches a parameter that the
    // store stopped exposing.
    const payload = collectParams() as Record<string, unknown>;
    const expectedKeys = [
        'mode', 'specType', 'd1', 'd2', 'h', 'thickness', 'kFactor', 'gap',
        'bendLinesEnabled', 'bendLinesCount', 'eccentricity', 'seamPosition',
        'seamAngleDeg', 'stationCount', 'density', 'bendDimensionsEnabled',
        'bendDimensionOffset'
    ];

    const missing = expectedKeys.filter(key => !(key in payload));
    const undefinedValues = expectedKeys.filter(key => payload[key] === undefined);

    report(missing.length === 0, 'no parameter is missing from the payload', missing.join(', '));
    report(undefinedValues.length === 0, 'no parameter serialises as undefined', undefinedValues.join(', '));
    check('payload has no extra keys', Object.keys(payload).length, expectedKeys.length);
}

console.log('\n=== 2. Eccentric cone round trip ===');
{
    const store = useShellStore.getState();
    store.setMode('eccentric-cone');
    store.setSpecType('ID');
    store.setD1(1360);
    store.setD2(2460);
    store.setHeight(1470);
    store.setThickness(20);
    store.setKFactor(0.42);
    store.setGap(3);
    store.setBendLinesEnabled(true);
    store.setEccentricity(550);
    store.setSeamPosition('custom');
    store.setSeamAngle(37);
    store.setStationCount(36);
    store.setDensity(7900);
    store.setBendDimensionsEnabled(true);
    store.setBendDimensionOffset(80);

    const shared = collectParams();
    resetToDefaults();
    check('state really was reset', useShellStore.getState().mode, 'cylinder');

    applySharedState(JSON.parse(JSON.stringify(shared)));
    const restored = collectParams() as Record<string, unknown>;

    for (const [key, value] of Object.entries(shared as Record<string, unknown>)) {
        check(`restored ${key}`, restored[key], value);
    }

    report(useShellStore.getState().results.isValid, 'restored configuration recalculates to a valid result');
    report(
        useShellStore.getState().results.eccentric !== undefined,
        'restored configuration produces an eccentric development'
    );
}

console.log('\n=== 3. The real link from the utility shell ===');
{
    // Payload of https://cadautoscript.com/utilities/cylindrical-shell-rolling/?calc=...
    const encoded = 'eyJ2IjoxLCJzIjp7Im1vZGUiOiJlY2NlbnRyaWMtY29uZSIsInNwZWNUeXBlIjoiT0QiLCJkMSI6MzAwMCwiZDIiOjUwMCwiaCI6MjUwMCwidGhpY2tuZXNzIjoxNSwia0ZhY3RvciI6MC40NCwiZ2FwIjoyLCJiZW5kTGluZXNFbmFibGVkIjpmYWxzZSwiYmVuZExpbmVzQ291bnQiOjAsImVjY2VudHJpY2l0eSI6MjUwLCJzZWFtUG9zaXRpb24iOiJzaG9ydCIsInNlYW1BbmdsZURlZyI6MCwic3RhdGlvbkNvdW50IjoyNCwiZGVuc2l0eSI6Nzg1MCwiYmVuZERpbWVuc2lvbnNFbmFibGVkIjpmYWxzZSwiYmVuZERpbWVuc2lvbk9mZnNldCI6MTIwfX0';
    const decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
        v: number;
        s: Record<string, unknown>;
    };

    resetToDefaults();
    applySharedState(decoded.s);

    const state = useShellStore.getState();
    check('link schema version', decoded.v, 1);
    check('mode', state.mode, 'eccentric-cone');
    check('d1', state.d1, 3000);
    check('d2', state.d2, 500);
    check('height', state.h, 2500);
    check('eccentricity', state.eccentricity, 250);
    check('station count', state.stationCount, 24);
    report(state.results.isValid, 'link restores to a valid calculation', state.results.error ?? '');
}

console.log('\n=== 4. Every enumerated value survives a round trip ===');
{
    for (const mode of SHAPE_TYPES) {
        resetToDefaults();
        applySharedState({ mode });
        check(`mode "${mode}"`, useShellStore.getState().mode, mode);
    }

    for (const specType of SPEC_TYPES) {
        resetToDefaults();
        applySharedState({ specType });
        check(`specType "${specType}"`, useShellStore.getState().specType, specType);
    }

    for (const seamPosition of SEAM_POSITIONS) {
        resetToDefaults();
        applySharedState({ seamPosition });
        check(`seamPosition "${seamPosition}"`, useShellStore.getState().seamPosition, seamPosition);
    }
}

console.log('\n=== 5. Hostile payloads degrade per field ===');
{
    resetToDefaults();
    applySharedState({
        mode: 'trapezoid',
        specType: 42,
        d1: 'huge',
        h: Number.NaN,
        thickness: Infinity,
        stationCount: 99999,
        seamPosition: null,
        somethingElse: { nested: true },
        d2: 1800
    });

    const state = useShellStore.getState();
    check('unknown mode ignored', state.mode, 'cylinder');
    check('non-string specType ignored', state.specType, 'OD');
    check('non-numeric d1 ignored', state.d1, 2000);
    check('NaN height ignored', state.h, 2500);
    check('infinite thickness ignored', state.thickness, 15);
    check('out-of-range stationCount clamped', state.stationCount, 360);
    check('null seamPosition ignored', state.seamPosition, 'short');
    check('valid field still applied', state.d2, 1800);

    applySharedState(null);
    applySharedState('nope');
    report(useShellStore.getState().mode === 'cylinder', 'non-object payloads are no-ops');
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);
