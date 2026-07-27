import React, { useMemo } from 'react';
import type { CalculationResult } from '../calculator/types';
import { useShellStore } from '../../store/useShellStore';
import { buildPatternDimensions } from '../../utils/pattern-dimensions';
import { DimensionOverlay } from './DimensionOverlay';
import { PatternLayout, type PatternViewModel } from './PatternLayout';

export const CylinderPatternView: React.FC<{ results: CalculationResult }> = ({ results }) => {
    const { flatLength, flatWidth, bendLines } = results;
    const params = useShellStore();

    const viewModel = useMemo<PatternViewModel | null>(() => {
        const w = flatLength;
        const h = flatWidth;

        if (!isFinite(w) || !isFinite(h) || w <= 0 || h <= 0) {
            return null;
        }

        const fontSize = Math.max(12, Math.max(w, h) * 0.025);
        const dimFontSize = fontSize * 0.65;
        const dimensions = buildPatternDimensions(params, results, dimFontSize);
        // Dimensions sit outside the blank, so the viewport has to make room for them.
        const padding = Math.max(w, h) * 0.15 + (dimensions.length > 0 ? params.bendDimensionOffset * 2 : 0);

        const viewBoxX = -w / 2 - padding;
        const viewBoxY = -h / 2 - padding;
        const viewBoxWidth = w + padding * 2;
        const viewBoxHeight = h + padding * 2;

        return {
            viewBox: `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`,
            fontSize,
            sheetWidth: w,
            sheetHeight: h,
            elements: (
                <>
                    <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="#2b2930" stroke="#d0bcff" strokeWidth={fontSize * 0.1} />

                    {bendLines?.map((line, idx) => (
                        <line
                            key={`bend-${idx}`}
                            x1={line.x1}
                            y1={line.y1}
                            x2={line.x2}
                            y2={line.y2}
                            stroke="red"
                            strokeDasharray="4 4"
                            strokeWidth={Math.max(1, fontSize * 0.05)}
                        />
                    ))}

                    <DimensionOverlay dimensions={dimensions} fontSize={dimFontSize} />

                    <line x1={-w / 2} y1={h / 2 + fontSize * 1.5} x2={w / 2} y2={h / 2 + fontSize * 1.5} stroke="#938f99" strokeWidth={fontSize * 0.05} />
                    <line x1={-w / 2} y1={h / 2 + fontSize} x2={-w / 2} y2={h / 2 + fontSize * 2} stroke="#938f99" strokeWidth={fontSize * 0.05} />
                    <line x1={w / 2} y1={h / 2 + fontSize} x2={w / 2} y2={h / 2 + fontSize * 2} stroke="#938f99" strokeWidth={fontSize * 0.05} />
                    <text x={0} y={h / 2 + fontSize * 3} textAnchor="middle" fill="#d0bcff" fontSize={fontSize} fontFamily="Roboto, sans-serif" fontWeight="bold">
                        W: {w.toFixed(1)} mm
                    </text>

                    <line x1={-w / 2 - fontSize * 1.5} y1={-h / 2} x2={-w / 2 - fontSize * 1.5} y2={h / 2} stroke="#938f99" strokeWidth={fontSize * 0.05} />
                    <line x1={-w / 2 - fontSize} y1={-h / 2} x2={-w / 2 - fontSize * 2} y2={-h / 2} stroke="#938f99" strokeWidth={fontSize * 0.05} />
                    <line x1={-w / 2 - fontSize} y1={h / 2} x2={-w / 2 - fontSize * 2} y2={h / 2} stroke="#938f99" strokeWidth={fontSize * 0.05} />
                    <text x={-w / 2 - fontSize * 3.5} y={0} textAnchor="middle" fill="#d0bcff" fontSize={fontSize} fontFamily="Roboto, sans-serif" fontWeight="bold" transform={`rotate(-90, ${-w / 2 - fontSize * 3.5}, 0)`}>
                        H: {h.toFixed(1)} mm
                    </text>
                </>
            )
        };
    }, [params, results, flatLength, flatWidth, bendLines]);

    if (!viewModel) {
        return <div className="w-full h-full flex items-center justify-center text-gray-400">Invalid or No Geometry</div>;
    }

    return <PatternLayout viewModel={viewModel} />;
};
