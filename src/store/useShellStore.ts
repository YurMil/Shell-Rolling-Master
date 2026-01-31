
import { create } from 'zustand';
import type { ShellParameters, CalculationResult, ShapeType, SpecType } from '../features/calculator/types';
import { calculateShell } from '../features/calculator/math';

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
    setViewMode: (mode: '3d' | '2d') => void;
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
    bendLinesCount: 0
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
        set({ gap });
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
            bendLinesCount: state.bendLinesCount
        };
        set({ results: calculateShell(params) });
    }
}));
