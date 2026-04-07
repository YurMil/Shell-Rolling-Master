import { useCallback, useEffect, useRef, useState } from 'react';
import type { ShellCadGeometry } from '../types/cad-types';
import { generateStepInWorker, warmupCadWorker } from '../services/cad-worker-client';
import type { ShellCadWorkerProgress } from '../services/cad-worker-protocol';

type WorkerStatus = 'idle' | 'warming' | 'ready' | 'error';

export type UseShellCadResult = {
    workerStatus: WorkerStatus;
    workerError: string | null;
    warmupWorker: () => Promise<void>;
    generateStep: (
        geometry: ShellCadGeometry,
        options?: { onProgress?: (message: ShellCadWorkerProgress) => void },
    ) => Promise<ArrayBuffer>;
};

export const useShellCad = (): UseShellCadResult => {
    const [workerStatus, setWorkerStatus] = useState<WorkerStatus>('idle');
    const [workerError, setWorkerError] = useState<string | null>(null);
    const warmupStarted = useRef(false);

    const warmupWorker = useCallback(async () => {
        if (typeof window === 'undefined') {
            return;
        }

        if (workerStatus === 'warming' || workerStatus === 'ready') {
            return;
        }

        setWorkerStatus('warming');
        setWorkerError(null);

        try {
            await warmupCadWorker();
            setWorkerStatus('ready');
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setWorkerError(message);
            setWorkerStatus('error');
            throw error;
        }
    }, [workerStatus]);

    useEffect(() => {
        if (typeof window === 'undefined' || warmupStarted.current) {
            return;
        }

        warmupStarted.current = true;
        const timerId = window.setTimeout(() => {
            void warmupWorker();
        }, 0);

        return () => {
            window.clearTimeout(timerId);
        };
    }, [warmupWorker]);

    const generateStep = useCallback(
        async (
            geometry: ShellCadGeometry,
            options?: { onProgress?: (message: ShellCadWorkerProgress) => void },
        ) => {
            if (workerStatus !== 'ready') {
                await warmupWorker();
            }

            return generateStepInWorker(geometry, options);
        },
        [warmupWorker, workerStatus],
    );

    return {
        workerStatus,
        workerError,
        warmupWorker,
        generateStep,
    };
};
