import React, { useMemo } from 'react';
import type { CalculationResult } from '../calculator/types';
import { buildConeSvgPathData } from '../../utils/cone-pattern';
import { PatternLayout, type PatternViewModel } from './PatternLayout';

export const ConePatternView: React.FC<{ results: CalculationResult }> = ({ results }) => {
    const { rOut, rIn, angle, flatLength, flatWidth, bboxWidth, bboxHeight, bboxMinX, bboxMinY, patternRotationDeg, bendLines } = results;

    const viewModel = useMemo<PatternViewModel | null>(() => {
        if (!rOut || !rIn || !angle || angle <= 0) return null;

        if (!isFinite(angle)) {
            return null;
        }

        const width = flatLength || bboxWidth || 200;
        const height = flatWidth || bboxHeight || 200;
        const minX = bboxMinX ?? -width / 2;
        const minY = bboxMinY ?? -height / 2;

        const padding = Math.max(width, height) * 0.15;
        const fontSize = Math.max(12, Math.max(width, height) * 0.025);

        const viewBoxWidth = width + padding * 2;
        const viewBoxHeight = height + padding * 2;
        const viewBoxX = minX - padding;
        const viewBoxY = minY - padding;

        const pathData = buildConeSvgPathData(rOut, rIn, angle, patternRotationDeg);

        return {
            viewBox: `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`,
            fontSize,
            sheetWidth: width,
            sheetHeight: height,
            elements: (
                <>
                    <rect
                        x={minX}
                        y={minY}
                        width={width}
                        height={height}
                        fill="none"
                        stroke="#3b3640"
                        strokeWidth={fontSize * 0.06}
                        strokeDasharray={`${fontSize * 0.6} ${fontSize * 0.6}`}
                    />

                    <path d={pathData} fill="#2b2930" stroke="#d0bcff" strokeWidth={fontSize * 0.1} />

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

                    <line x1={minX} y1={minY + height + fontSize * 2} x2={minX + width} y2={minY + height + fontSize * 2} stroke="#ff6b6b" strokeWidth={fontSize * 0.08} />
                    <line x1={minX} y1={minY + height + fontSize * 1.5} x2={minX} y2={minY + height + fontSize * 2.5} stroke="#ff6b6b" strokeWidth={fontSize * 0.08} />
                    <line x1={minX + width} y1={minY + height + fontSize * 1.5} x2={minX + width} y2={minY + height + fontSize * 2.5} stroke="#ff6b6b" strokeWidth={fontSize * 0.08} />
                    <text x={minX + width / 2} y={minY + height + fontSize * 3} textAnchor="middle" fill="#ff6b6b" fontSize={fontSize * 0.9} fontFamily="Roboto, sans-serif" fontWeight="bold">
                        Sheet Width: {width.toFixed(1)} mm
                    </text>

                    <line x1={minX + width + fontSize * 2} y1={minY} x2={minX + width + fontSize * 2} y2={minY + height} stroke="#ff6b6b" strokeWidth={fontSize * 0.08} />
                    <line x1={minX + width + fontSize * 1.5} y1={minY} x2={minX + width + fontSize * 2.5} y2={minY} stroke="#ff6b6b" strokeWidth={fontSize * 0.08} />
                    <line x1={minX + width + fontSize * 1.5} y1={minY + height} x2={minX + width + fontSize * 2.5} y2={minY + height} stroke="#ff6b6b" strokeWidth={fontSize * 0.08} />
                    <text x={minX + width + fontSize * 4} y={minY + height / 2} textAnchor="middle" fill="#ff6b6b" fontSize={fontSize * 0.9} fontFamily="Roboto, sans-serif" fontWeight="bold" transform={`rotate(90, ${minX + width + fontSize * 4}, ${minY + height / 2})`}>
                        Sheet Height: {height.toFixed(1)} mm
                    </text>
                </>
            )
        };
    }, [rOut, rIn, angle, flatLength, flatWidth, bboxWidth, bboxHeight, bboxMinX, bboxMinY, patternRotationDeg, bendLines]);

    if (!viewModel) {
        return <div className="w-full h-full flex items-center justify-center text-gray-400">Invalid or No Geometry</div>;
    }

    return <PatternLayout viewModel={viewModel} />;
};
