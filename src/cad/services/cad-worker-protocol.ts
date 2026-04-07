import type { ShellCadGeometry } from '../types/cad-types';

export type ShellCadWarmupRequest = {
    type: 'warmup';
    requestId: string;
};

export type ShellCadStepRequest = {
    type: 'generate-step';
    requestId: string;
    geometry: ShellCadGeometry;
};

export type ShellCadWorkerRequest = ShellCadWarmupRequest | ShellCadStepRequest;

export type ShellCadWorkerProgress = {
    type: 'progress';
    requestId: string;
    stage: 'init' | 'geometry' | 'export';
    done: number;
    total: number;
};

export type ShellCadWorkerResult =
    | {
        type: 'result';
        requestId: string;
        ok: true;
        payload: { step: ArrayBuffer };
    }
    | {
        type: 'result';
        requestId: string;
        ok: false;
        payload: { message: string; stack?: string };
    };

export type ShellCadWorkerMessage = ShellCadWorkerProgress | ShellCadWorkerResult;
