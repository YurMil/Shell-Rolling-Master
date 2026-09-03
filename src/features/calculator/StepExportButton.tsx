import React, { useEffect, useRef, useState } from 'react';
import { Box, Download, Loader2, Info } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useShellStore } from '../../store/useShellStore';
import { computeShellCadGeometry } from '../../cad/geometry/compute-shell-cad-geometry';
import { useShellCad } from '../../cad/hooks/useShellCad';
import type { ShellCadWorkerProgress } from '../../cad/services/cad-worker-protocol';
import { cn } from '../../components/ui/cn';
import type { ShapeType } from './types';

const getProgressLabel = (message: ShellCadWorkerProgress) => {
    if (message.stage === 'init') {
        return message.done >= message.total ? 'CAD kernel ready.' : 'Initializing CAD kernel...';
    }

    if (message.stage === 'export') {
        return message.done >= message.total ? 'STEP export complete.' : 'Exporting STEP file...';
    }

    return message.done >= message.total
        ? '3D shell geometry built.'
        : `Building shell geometry (${Math.min(message.done, message.total)}/${message.total})...`;
};

const downloadStepFile = (
    stepBuffer: ArrayBuffer,
    mode: ShapeType,
    d1: number,
    d2: number,
    height: number,
    thickness: number,
    eccentricity: number,
) => {
    const blob = new Blob([stepBuffer], { type: 'application/step' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const diameterPart = mode === 'cylinder'
        ? `D${Math.round(d1)}`
        : `D${Math.round(d1)}-${Math.round(d2)}`;
    const eccentricPart = mode === 'eccentric-cone' ? `_e${Math.round(eccentricity)}` : '';

    anchor.href = url;
    anchor.download = `shell-rolling-${mode}_${diameterPart}${eccentricPart}_H${Math.round(height)}_T${Math.round(thickness * 100) / 100}.step`;
    anchor.click();
    URL.revokeObjectURL(url);
};

export const StepExportButton: React.FC = () => {
    const { mode, d1, d2, h, thickness, gap, kFactor, eccentricity, seamPosition, seamAngleDeg, results } = useShellStore(useShallow((s) => ({
        mode: s.mode,
        d1: s.d1,
        d2: s.d2,
        h: s.h,
        thickness: s.thickness,
        gap: s.gap,
        kFactor: s.kFactor,
        eccentricity: s.eccentricity,
        seamPosition: s.seamPosition,
        seamAngleDeg: s.seamAngleDeg,
        results: s.results,
    })));
    const { workerStatus, workerError, generateStep } = useShellCad();
    const [isGenerating, setIsGenerating] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [errorText, setErrorText] = useState<string | null>(null);
    const [successText, setSuccessText] = useState<string | null>(null);
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const infoRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handlePointerDown = (event: MouseEvent) => {
            if (!infoRef.current?.contains(event.target as Node)) {
                setIsInfoOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
        };
    }, []);

    const handleDownloadStep = async () => {
        setIsGenerating(true);
        setErrorText(null);
        setSuccessText(null);
        setStatusText('Initializing CAD kernel...');

        try {
            const geometry = computeShellCadGeometry({
                params: { mode, h, thickness, gap, kFactor, eccentricity, seamPosition, seamAngleDeg },
                results,
            });
            const step = await generateStep(geometry, {
                onProgress: (message) => {
                    setStatusText(getProgressLabel(message));
                },
            });

            downloadStepFile(step, mode, d1, d2, h, thickness, eccentricity);
            setSuccessText('STEP file generated successfully.');
            setStatusText('Done');
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setErrorText(message);
            setStatusText('');
        } finally {
            setIsGenerating(false);
        }
    };

    const helperText = (() => {
        if (isGenerating) {
            return statusText || 'Processing shell geometry in the browser...';
        }

        if (workerStatus === 'warming') {
            return 'CAD kernel is warming up in the background...';
        }

        if (successText) {
            return successText;
        }

        if (!results.isValid) {
            return results.error ?? 'Fix the current shell configuration before exporting STEP.';
        }

        return 'Exports the current shell as a 3D STEP solid using the same browser-side CAD pipeline as other tools on the site.';
    })();

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-end gap-2">
                <div ref={infoRef} className="relative">
                    <button
                        type="button"
                        onClick={() => setIsInfoOpen((open) => !open)}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-[#5a5566] bg-[#2b2930] text-[#b9b2ca] transition hover:border-[#8fe6d0]/40 hover:text-[#8fe6d0]"
                        aria-label="STEP export info"
                        aria-expanded={isInfoOpen}
                    >
                        <Info className="h-4 w-4" />
                    </button>

                    {isInfoOpen ? (
                        <div className="absolute bottom-12 right-0 z-30 w-72 rounded-xl border border-[#49454f] bg-[#211f26] p-4 shadow-2xl">
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 rounded-lg border border-[#6dd3b6]/30 bg-[#6dd3b6]/10 p-2 text-[#9af0d7]">
                                    <Box className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-gray-100">3D STEP export</p>
                                    <p className="mt-1 text-xs leading-5 text-gray-400">{helperText}</p>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>

                <button
                    type="button"
                    onClick={handleDownloadStep}
                    disabled={!results.isValid || isGenerating}
                    className={cn(
                        'flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold tracking-[0.02em] transition-all',
                        'border-[#6b6479] bg-[#4f4a5e] text-[#efe7ff] hover:bg-[#5a556b] hover:border-[#8d86a2]',
                        'disabled:cursor-not-allowed disabled:border-[#3b3942] disabled:bg-[#2b2930] disabled:text-[#7e7a88]'
                    )}
                >
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    {isGenerating ? 'Generating STEP...' : 'Download .STEP'}
                </button>
            </div>

            {errorText || workerError ? (
                <div className="text-right text-xs text-amber-200">{errorText ?? workerError}</div>
            ) : null}

            {!errorText && !workerError && (isGenerating || successText) ? (
                <div className="text-right text-xs text-gray-400">
                    {isGenerating ? helperText : successText}
                </div>
            ) : null}
        </div>
    );
};
