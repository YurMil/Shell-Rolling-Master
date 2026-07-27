import React from 'react';
import type { AlignedDimension } from '../../utils/aligned-dimension';

/**
 * Renders aligned dimensions in the 2D pattern preview.
 *
 * The dimensions come from the same builder the DXF writer uses, so the numbers
 * and their placement on screen match the exported file.
 */
export const DimensionOverlay: React.FC<{ dimensions: AlignedDimension[]; fontSize: number }> = ({
    dimensions,
    fontSize
}) => (
    <>
        {dimensions.map((dimension, index) => (
            <g key={`dim-${index}`} stroke="#8fe6d0" strokeWidth={Math.max(0.5, fontSize * 0.05)}>
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
                    fontSize={fontSize}
                    fontFamily="Roboto, sans-serif"
                    transform={`rotate(${dimension.angleDeg}, ${dimension.textX}, ${dimension.textY})`}
                >
                    {dimension.text}
                </text>
            </g>
        ))}
    </>
);
