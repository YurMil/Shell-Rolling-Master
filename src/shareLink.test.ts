import { beforeEach, describe, expect, it } from 'vitest';
import { applySharedState, collectParams } from './shareLink';
import { useShellStore } from './store/useShellStore';
import { SEAM_POSITIONS, SHAPE_TYPES, SPEC_TYPES } from './features/calculator/types';

// Round-trip checks for the share-link protocol.

const PARAMETER_KEYS = [
    'mode', 'specType', 'd1', 'd2', 'h', 'thickness', 'kFactor', 'gap',
    'bendLinesEnabled', 'bendLinesCount', 'eccentricity', 'seamPosition',
    'seamAngleDeg', 'stationCount', 'density', 'bendDimensionsEnabled',
    'bendDimensionOffset'
];

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

beforeEach(resetToDefaults);

describe('payload', () => {
    it('contains every input parameter, and nothing else', () => {
        // Mirrors the compile-time `keyof ShellParameters` guarantee at runtime
        // and catches a parameter the store stopped exposing.
        const payload = collectParams() as Record<string, unknown>;

        expect(Object.keys(payload).sort()).toEqual([...PARAMETER_KEYS].sort());
        expect(PARAMETER_KEYS.filter(key => payload[key] === undefined)).toEqual([]);
    });
});

describe('round trip', () => {
    it('restores an eccentric cone configuration field for field', () => {
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
        expect(useShellStore.getState().mode).toBe('cylinder');

        applySharedState(JSON.parse(JSON.stringify(shared)));

        expect(collectParams()).toEqual(shared);
        expect(useShellStore.getState().results.isValid).toBe(true);
        expect(useShellStore.getState().results.eccentric).toBeDefined();
    });

    it('decodes a real link produced by the utility shell', () => {
        // Payload of https://cadautoscript.com/utilities/cylindrical-shell-rolling/?calc=...
        const encoded = 'eyJ2IjoxLCJzIjp7Im1vZGUiOiJlY2NlbnRyaWMtY29uZSIsInNwZWNUeXBlIjoiT0QiLCJkMSI6MzAwMCwiZDIiOjUwMCwiaCI6MjUwMCwidGhpY2tuZXNzIjoxNSwia0ZhY3RvciI6MC40NCwiZ2FwIjoyLCJiZW5kTGluZXNFbmFibGVkIjpmYWxzZSwiYmVuZExpbmVzQ291bnQiOjAsImVjY2VudHJpY2l0eSI6MjUwLCJzZWFtUG9zaXRpb24iOiJzaG9ydCIsInNlYW1BbmdsZURlZyI6MCwic3RhdGlvbkNvdW50IjoyNCwiZGVuc2l0eSI6Nzg1MCwiYmVuZERpbWVuc2lvbnNFbmFibGVkIjpmYWxzZSwiYmVuZERpbWVuc2lvbk9mZnNldCI6MTIwfX0';
        const decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
            v: number;
            s: Record<string, unknown>;
        };

        applySharedState(decoded.s);
        const state = useShellStore.getState();

        expect(decoded.v).toBe(1);
        expect(state.mode).toBe('eccentric-cone');
        expect(state.d1).toBe(3000);
        expect(state.d2).toBe(500);
        expect(state.h).toBe(2500);
        expect(state.eccentricity).toBe(250);
        expect(state.stationCount).toBe(24);
        expect(state.results.isValid).toBe(true);
    });

    it.each(SHAPE_TYPES)('keeps mode "%s"', mode => {
        applySharedState({ mode });
        expect(useShellStore.getState().mode).toBe(mode);
    });

    it.each(SPEC_TYPES)('keeps specType "%s"', specType => {
        applySharedState({ specType });
        expect(useShellStore.getState().specType).toBe(specType);
    });

    it.each(SEAM_POSITIONS)('keeps seamPosition "%s"', seamPosition => {
        applySharedState({ seamPosition });
        expect(useShellStore.getState().seamPosition).toBe(seamPosition);
    });
});

describe('hostile payloads', () => {
    it('degrade per field instead of rejecting the whole link', () => {
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
        expect(state.mode).toBe('cylinder');
        expect(state.specType).toBe('OD');
        expect(state.d1).toBe(2000);
        expect(state.h).toBe(2500);
        expect(state.thickness).toBe(15);
        expect(state.stationCount).toBe(360);
        expect(state.seamPosition).toBe('short');
        expect(state.d2).toBe(1800);
    });

    it('ignores payloads that are not objects', () => {
        applySharedState(null);
        applySharedState('nope');
        expect(useShellStore.getState().mode).toBe('cylinder');
    });
});
