import React from 'react';

export interface PatternViewModel {
    viewBox: string;
    fontSize: number;
    sheetWidth: number;
    sheetHeight: number;
    elements: React.ReactNode;
}

export const PatternLayout: React.FC<{ viewModel: PatternViewModel }> = ({ viewModel }) => {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-[#141218]">
            <div className="mb-2 text-sm text-[#d0bcff] font-bold">
                Sheet Required: {viewModel.sheetWidth.toFixed(1)} mm × {viewModel.sheetHeight.toFixed(1)} mm
            </div>

            <div className="w-full h-full border border-[#49454f] rounded-lg bg-[#1d1b20] relative overflow-hidden flex items-center justify-center shadow-2xl">
                <svg width="100%" height="100%" viewBox={viewModel.viewBox} preserveAspectRatio="xMidYMid meet">
                    <defs>
                        <style>{`
                            text { user-select: none; pointer-events: none; }
                        `}</style>
                    </defs>
                    {viewModel.elements}
                </svg>
            </div>
        </div>
    );
};
