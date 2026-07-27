import React, { useMemo } from 'react';
import type { CalculationResult, Point2D } from '../calculator/types';
import { useShellStore } from '../../store/useShellStore';
import { buildDevelopmentDimensions } from '../../utils/aligned-dimension';
import { PatternLayout, type PatternViewModel } from './PatternLayout';

/**
 * SVG preview of the eccentric cone development.
 *
 * The development is computed in a Y-up frame while SVG is Y-down, so every
 * point is mirrored on Y before drawing. Without that, an asymmetric blank
 * would be shown mirrored relative to the exported DXF.
 */
const flip = (point: Point2D): Point2D => ({ x: point.x, y: -point.y });

const toPath = (bottom: Point2D[], top: Point2D[]): string => {
    const forward = bottom.map(flip);
    const backward = [...top].reverse().map(flip);

    const segments = [
        `M ${forward[0].x.toFixed(3)} ${forward[0].y.toFixed(3)}`,
        ...forward.slice(1).map(point => `L ${point.x.toFixed(3)} ${point.y.toFixed(3)}`),
        ...backward.map(point => `L ${point.x.toFixed(3)} ${point.y.toFixed(3)}`),
        'Z'
    ];

    return segments.join(' ');
};

export const EccentricConePatternView: React.FC<{ results: CalculationResult }> = ({ results }) => {
    const { eccentric, flatLength, flatWidth, bboxMinX, bboxMinY, bendLines } = results;
    const { bendLinesEnabled, bendDimensionsEnabled, bendDimensionOffset } = useShellStore();
    const showDimensions = bendLinesEnabled && bendDimensionsEnabled;

    const viewModel = useMemo<PatternViewModel | null>(() => {
        if (!eccentric || eccentric.bottomEdge.length < 2) return null;

        const width = flatLength;
        const height = flatWidth;
        if (!isFinite(width) || !isFinite(height) || width <= 0 || height <= 0) return null;

        const minX = bboxMinX ?? 0;
        // Mirrored frame: the top of the sheet in display space is -(minY + height).
        const minY = -((bboxMinY ?? 0) + height);

        const padding = Math.max(width, height) * 0.15;
        const fontSize = Math.max(12, Math.max(width, height) * 0.025);
        const dimFontSize = fontSize * 0.65;

        // Dimensions are computed in the mirrored (display) frame, so the helper's
        // text angles can be handed straight to SVG's rotate().
        const dimensions = showDimensions
            ? buildDevelopmentDimensions(
                eccentric.stations.map(station => flip(station.bottom)),
                eccentric.stations.map(station => flip(station.top)),
                bendDimensionOffset,
                dimFontSize
            )
            : [];

        return {
            viewBox: `${minX - padding} ${minY - padding} ${width + padding * 2} ${height + padding * 2}`,
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

                    <path
                        d={toPath(eccentric.bottomEdge, eccentric.topEdge)}
                        fill="#2b2930"
                        stroke="#d0bcff"
                        strokeWidth={fontSize * 0.1}
                    />

                    {bendLines?.map((line, index) => (
                        <line
                            key={`ruling-${index}`}
                            x1={line.x1}
                            y1={-line.y1}
                            x2={line.x2}
                            y2={-line.y2}
                            stroke="#ff6b6b"
                            strokeDasharray={`${fontSize * 0.5} ${fontSize * 0.35}`}
                            strokeWidth={Math.max(1, fontSize * 0.05)}
                        />
                    ))}

                    {dimensions.map((dimension, index) => (
                        <g key={`dim-${index}`} stroke="#8fe6d0" strokeWidth={Math.max(0.5, dimFontSize * 0.05)}>
                            {[...dimension.extensions, dimension.line, ...dimension.ticks].map((segment, segmentIndex) => (
                                <line
                                    key={segmentIndex}
                                    x1={segment.x1}
                                    y1={segment.y1}
                                    x2={segment.x2}
                                    y2={segment.y2}
                                />
                            ))}
                            <text
                                x={dimension.textX}
                                y={dimension.textY}
                                textAnchor="middle"
                                stroke="none"
                                fill="#8fe6d0"
                                fontSize={dimFontSize}
                                fontFamily="Roboto, sans-serif"
                                transform={`rotate(${dimension.angleDeg}, ${dimension.textX}, ${dimension.textY})`}
                            >
                                {dimension.text}
                            </text>
                        </g>
                    ))}

                    {/* Seam markers: first and last ruling of the development. */}
                    <text
                        x={eccentric.bottomEdge[0].x}
                        y={-eccentric.bottomEdge[0].y + fontSize * 1.4}
                        textAnchor="middle"
                        fill="#8fe6d0"
                        fontSize={fontSize * 0.9}
                        fontFamily="Roboto, sans-serif"
                    >
                        SEAM
                    </text>
                    <text
                        x={eccentric.bottomEdge[eccentric.bottomEdge.length - 1].x}
                        y={-eccentric.bottomEdge[eccentric.bottomEdge.length - 1].y + fontSize * 1.4}
                        textAnchor="middle"
                        fill="#8fe6d0"
                        fontSize={fontSize * 0.9}
                        fontFamily="Roboto, sans-serif"
                    >
                        SEAM
                    </text>

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
    }, [eccentric, flatLength, flatWidth, bboxMinX, bboxMinY, bendLines, showDimensions, bendDimensionOffset]);

    if (!viewModel) {
        return <div className="w-full h-full flex items-center justify-center text-gray-400">Invalid or No Geometry</div>;
    }

    return <PatternLayout viewModel={viewModel} />;
};
