
import React from 'react';
import { useShellStore } from '../../store/useShellStore';
import { cn } from '../../components/ui';

export const ResultsCard: React.FC = () => {
    const { results, mode } = useShellStore();
    const { isValid, flatLength, angle, rOut, rIn, error } = results;

    if (!isValid) {
        return (
            <div className="srm-mt-4 srm-bg-[#1f1d24] srm-rounded-xl srm-p-4 srm-border srm-border-md-error/50">
                <p className="srm-text-md-error srm-text-sm srm-text-center srm-font-bold">{error || "Invalid Data"}</p>
            </div>
        );
    }

    return (
        <div className="srm-mt-4 srm-bg-[#1f1d24] srm-rounded-xl srm-p-4 srm-border srm-border-[#49454f]">
            <h3 className="srm-text-xs srm-font-bold srm-text-md-secondary srm-uppercase srm-tracking-wider srm-mb-3">Results</h3>
            <div className="srm-space-y-3">
                <div className="srm-flex srm-justify-between srm-items-center srm-border-b srm-border-[#36343b] srm-pb-2">
                    <span className="srm-text-sm srm-text-gray-400">Type:</span>
                    <span className="srm-font-mono srm-text-md-primary srm-capitalize srm-text-right">{mode}</span>
                </div>

                {mode === 'cylinder' ? (
                    <div className="srm-flex srm-justify-between srm-items-center srm-border-b srm-border-[#36343b] srm-pb-2">
                        <span className="srm-text-sm srm-text-gray-400">Length (L):</span>
                        <span className="srm-font-mono srm-font-bold srm-text-white srm-text-lg">{flatLength.toFixed(2)} mm</span>
                    </div>
                ) : (
                    <>
                        <div className="srm-flex srm-justify-between srm-items-center srm-border-b srm-border-[#36343b] srm-pb-2">
                            <span className="srm-text-sm srm-text-gray-400">Angle (∠):</span>
                            <span className="srm-font-mono srm-font-bold srm-text-white srm-text-lg">{angle?.toFixed(2)}°</span>
                        </div>
                        {rOut !== undefined && (
                            <div className="srm-flex srm-justify-between srm-items-center srm-border-b srm-border-[#36343b] srm-pb-2">
                                <span className="srm-text-sm srm-text-gray-400">Outer R:</span>
                                <span className="srm-font-mono srm-font-bold srm-text-white">{rOut.toFixed(2)} mm</span>
                            </div>
                        )}
                        {rIn !== undefined && (
                            <div className="srm-flex srm-justify-between srm-items-center srm-pb-2">
                                <span className="srm-text-sm srm-text-gray-400">Inner r:</span>
                                <span className="srm-font-mono srm-font-bold srm-text-white">{rIn.toFixed(2)} mm</span>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
