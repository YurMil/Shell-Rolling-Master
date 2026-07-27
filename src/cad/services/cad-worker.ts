/// <reference lib="webworker" />

import type { OpenCascadeInstance } from 'replicad-opencascadejs';
import { buildEccentricConeSolid } from '../geometry/build-eccentric-cone-solid';
import { buildShellSolid } from '../geometry/build-shell-solid';
import { assertValidShellCadGeometry } from '../geometry/validation';
import type {
    ShellCadWorkerMessage,
    ShellCadWorkerRequest,
    ShellCadWorkerResult,
} from './cad-worker-protocol';

type ReplicadModule = typeof import('replicad');

let replicadPromise: Promise<ReplicadModule> | null = null;
let ocInitPromise: Promise<OpenCascadeInstance> | null = null;

const loadReplicad = () => {
    if (!replicadPromise) {
        replicadPromise = import('replicad');
    }

    return replicadPromise;
};

const ensureOpenCascade = async () => {
    if (!ocInitPromise) {
        ocInitPromise = (async () => {
            const [replicadModule, ocModule] = await Promise.all([loadReplicad(), import('replicad-opencascadejs')]);
            const wasmUrl = new URL('replicad-opencascadejs/src/replicad_single.wasm', import.meta.url).toString();
            const ocFactory = ocModule.default as unknown as (options?: {
                locateFile?: (path: string, scriptDir: string) => string;
            }) => Promise<OpenCascadeInstance>;
            const oc = await ocFactory({
                locateFile: (path) => (path.endsWith('.wasm') ? wasmUrl : path),
            });

            replicadModule.setOC(oc);
            return oc;
        })();
    }

    try {
        return await ocInitPromise;
    } catch (error) {
        ocInitPromise = null;
        throw error;
    }
};

const ctx = self as unknown as DedicatedWorkerGlobalScope;

const post = (message: ShellCadWorkerMessage, transfer?: Transferable[]) => {
    ctx.postMessage(message, transfer ?? []);
};

const postError = (requestId: string, error: unknown) => {
    const resolvedError = error instanceof Error ? error : new Error(String(error));
    const message: ShellCadWorkerResult = {
        type: 'result',
        requestId,
        ok: false,
        payload: {
            message: resolvedError.message,
            stack: resolvedError.stack,
        },
    };
    post(message);
};

ctx.onmessage = async (event: MessageEvent<ShellCadWorkerRequest>) => {
    const request = event.data;
    if (!request || typeof request !== 'object') {
        return;
    }

    const { requestId } = request;

    try {
        if (request.type === 'warmup') {
            post({ type: 'progress', requestId, stage: 'init', done: 0, total: 1 });
            await ensureOpenCascade();
            post({ type: 'progress', requestId, stage: 'init', done: 1, total: 1 });

            const result: ShellCadWorkerResult = {
                type: 'result',
                requestId,
                ok: true,
                payload: { step: new ArrayBuffer(0) },
            };
            post(result, [result.payload.step]);
            return;
        }

        if (request.type !== 'generate-step') {
            throw new Error(`Unknown cad-worker request type: ${(request as { type?: string }).type ?? 'undefined'}`);
        }

        post({ type: 'progress', requestId, stage: 'init', done: 0, total: 1 });
        await ensureOpenCascade();
        post({ type: 'progress', requestId, stage: 'init', done: 1, total: 1 });

        const replicadModule = await loadReplicad();

        post({ type: 'progress', requestId, stage: 'geometry', done: 0, total: 2 });
        assertValidShellCadGeometry(request.geometry);
        post({ type: 'progress', requestId, stage: 'geometry', done: 1, total: 2 });

        const solid = request.geometry.kind === 'eccentric'
            ? buildEccentricConeSolid(replicadModule, request.geometry)
            : buildShellSolid(replicadModule, request.geometry);
        if (!solid || solid.isNull) {
            throw new Error('Failed to build a valid shell solid.');
        }
        post({ type: 'progress', requestId, stage: 'geometry', done: 2, total: 2 });

        post({ type: 'progress', requestId, stage: 'export', done: 0, total: 1 });
        const blob = solid.blobSTEP();
        const buffer = await blob.arrayBuffer();
        post({ type: 'progress', requestId, stage: 'export', done: 1, total: 1 });

        const result: ShellCadWorkerResult = {
            type: 'result',
            requestId,
            ok: true,
            payload: { step: buffer },
        };
        post(result, [buffer]);
    } catch (error) {
        postError(requestId, error);
    }
};
