
import { create } from 'zustand';
import type { ShellParameters, CalculationResult, ShapeType, SpecType, SeamPosition } from '../features/calculator/types';
import { calculateShell } from '../features/calculator/math';
import { MAX_STATIONS, MIN_STATIONS } from '../features/calculator/math/eccentric-cone';

interface ShellState extends ShellParameters {
    results: CalculationResult;
    viewMode: '3d' | '2d';

    // Actions
    setMode: (mode: ShapeType) => void;
    setSpecType: (type: SpecType) => void;
    setD1: (val: number) => void;
    setD2: (val: number) => void;
    setHeight: (val: number) => void;
    setThickness: (val: number) => void;
    setKFactor: (val: number) => void;
    setGap: (val: number) => void;
    setBendLinesEnabled: (val: boolean) => void;
    setBendLinesCount: (val: number) => void;
    setEccentricity: (val: number) => void;
    setSeamPosition: (val: SeamPosition) => void;
    setSeamAngle: (val: number) => void;
    setStationCount: (val: number) => void;
    setDensity: (val: number) => void;
    setBendDimensionsEnabled: (val: boolean) => void;
    setBendDimensionOffset: (val: number) => void;
    setViewMode: (mode: '3d' | '2d') => void;
    recalc: () => void;
}

const initialParams: ShellParameters = {
    mode: 'cylinder',
    specType: 'OD',
    d1: 2000,
    d2: 1500,
    h: 2500,
    thickness: 15,
    kFactor: 0.44,
    gap: 2.0,
    bendLinesEnabled: false,
    bendLinesCount: 0,
    eccentricity: 250,
    seamPosition: 'short',
    seamAngleDeg: 0,
    stationCount: 24,
    density: 7850,
    bendDimensionsEnabled: false,
    bendDimensionOffset: 120
};

export const useShellStore = create<ShellState>((set, get) => ({
    ...initialParams,
    viewMode: '3d',
    results: calculateShell(initialParams),

    setMode: (mode) => {
        set({ mode });
        get().recalc();
    },
    setSpecType: (specType) => {
        set({ specType });
        get().recalc();
    },
    setD1: (d1) => {
        // Sanitize: ensure non-negative, fallback to 1.0 if invalid
        const sanitized = isNaN(d1) || d1 <= 0 ? 1.0 : d1;
        set({ d1: sanitized });
        get().recalc();
    },
    setD2: (d2) => {
        // Sanitize: ensure non-negative, fallback to 1.0 if invalid
        const sanitized = isNaN(d2) || d2 <= 0 ? 1.0 : d2;
        set({ d2: sanitized });
        get().recalc();
    },
    setHeight: (h) => {
        // Sanitize: ensure non-negative, fallback to 1.0 if invalid
        const sanitized = isNaN(h) || h <= 0 ? 1.0 : h;
        set({ h: sanitized });
        get().recalc();
    },
    setThickness: (thickness) => {
        // Sanitize: ensure non-negative, fallback to 1.0 if invalid
        const sanitized = isNaN(thickness) || thickness <= 0 ? 1.0 : thickness;
        set({ thickness: sanitized });
        get().recalc();
    },
    setKFactor: (kFactor) => {
        set({ kFactor });
        get().recalc();
    },
    setGap: (gap) => {
        // Sanitize: ensure non-negative and finite, fallback to 0 if invalid
        const sanitized = isNaN(gap) || !isFinite(gap) || gap < 0 ? 0 : gap;
        set({ gap: sanitized });
        get().recalc();
    },
    setBendLinesEnabled: (bendLinesEnabled) => {
        set({ bendLinesEnabled });
        get().recalc();
    },
    setBendLinesCount: (bendLinesCount) => {
        const sanitized = isNaN(bendLinesCount) || bendLinesCount < 0 ? 0 : Math.floor(bendLinesCount);
        set({ bendLinesCount: sanitized });
        get().recalc();
    },

    setEccentricity: (eccentricity) => {
        // Negative eccentricity is the mirrored part, so it is normalised to |e|.
        const sanitized = isNaN(eccentricity) || !isFinite(eccentricity) ? 0 : Math.abs(eccentricity);
        set({ eccentricity: sanitized });
        get().recalc();
    },
    setSeamPosition: (seamPosition) => {
        set({ seamPosition });
        get().recalc();
    },
    setSeamAngle: (seamAngleDeg) => {
        const sanitized = isNaN(seamAngleDeg) || !isFinite(seamAngleDeg) ? 0 : ((seamAngleDeg % 360) + 360) % 360;
        set({ seamAngleDeg: sanitized });
        get().recalc();
    },
    setStationCount: (stationCount) => {
        const sanitized = isNaN(stationCount) || !isFinite(stationCount)
            ? MIN_STATIONS
            : Math.min(MAX_STATIONS, Math.max(MIN_STATIONS, Math.round(stationCount)));
        set({ stationCount: sanitized });
        get().recalc();
    },
    setDensity: (density) => {
        const sanitized = isNaN(density) || !isFinite(density) || density <= 0 ? 7850 : density;
        set({ density: sanitized });
        get().recalc();
    },
    setBendDimensionsEnabled: (bendDimensionsEnabled) => {
        set({ bendDimensionsEnabled });
    },
    setBendDimensionOffset: (bendDimensionOffset) => {
        const sanitized = isNaN(bendDimensionOffset) || !isFinite(bendDimensionOffset) || bendDimensionOffset <= 0
            ? 1
            : bendDimensionOffset;
        set({ bendDimensionOffset: sanitized });
    },

    setViewMode: (viewMode) => {
        set({ viewMode });
    },

    recalc: () => {
        const state = get();
        const params: ShellParameters = {
            mode: state.mode,
            specType: state.specType,
            d1: state.d1,
            d2: state.d2,
            h: state.h,
            thickness: state.thickness,
            kFactor: state.kFactor,
            gap: state.gap,
            bendLinesEnabled: state.bendLinesEnabled,
            bendLinesCount: state.bendLinesCount,
            eccentricity: state.eccentricity,
            seamPosition: state.seamPosition,
            seamAngleDeg: state.seamAngleDeg,
            stationCount: state.stationCount,
            density: state.density,
            bendDimensionsEnabled: state.bendDimensionsEnabled,
            bendDimensionOffset: state.bendDimensionOffset
        };
        set({ results: calculateShell(params) });
    }
}));
