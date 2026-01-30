
import { create } from 'zustand';
import type { ShellParameters, CalculationResult, ShapeType, SpecType } from '../features/calculator/types';
import { calculateShell } from '../features/calculator/math';

interface ShellState extends ShellParameters {
    results: CalculationResult;

    // Actions
    setMode: (mode: ShapeType) => void;
    setSpecType: (type: SpecType) => void;
    setD1: (val: number) => void;
    setD2: (val: number) => void;
    setHeight: (val: number) => void;
    setThickness: (val: number) => void;
    setKFactor: (val: number) => void;
    setGap: (val: number) => void;
    setBendLines: (val: number) => void;
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
    bendLines: 0
};

export const useShellStore = create<ShellState>((set, get) => ({
    ...initialParams,
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
        set({ d1 });
        get().recalc();
    },
    setD2: (d2) => {
        set({ d2 });
        get().recalc();
    },
    setHeight: (h) => {
        set({ h });
        get().recalc();
    },
    setThickness: (thickness) => {
        set({ thickness });
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
    setBendLines: (bendLines) => {
        set({ bendLines });
        // Bend lines don't strictly affect the main geometry calc in our current math, 
        // but might be useful for export. 
        get().recalc();
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
            bendLines: state.bendLines
        };
        set({ results: calculateShell(params) });
    }
}));
