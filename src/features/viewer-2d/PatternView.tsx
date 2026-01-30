
import React, { useMemo } from 'react';
import { useShellStore } from '../../store/useShellStore';

const Arrow: React.FC<{ x1: number, y1: number, x2: number, y2: number, text: string, fontSize: number, isVertical?: boolean }> = ({ x1, y1, x2, y2, text, fontSize, isVertical }) => {
    const strokeWidth = Math.max(1, fontSize * 0.1);
    const arrowSize = fontSize * 0.8;
    const color = "#938f99";

    const angle = Math.atan2(y2 - y1, x2 - x1);

    const drawHead = (tx: number, ty: number, ang: number) => {
        const h1x = tx - arrowSize * Math.cos(ang - Math.PI / 6);
        const h1y = ty - arrowSize * Math.sin(ang - Math.PI / 6);
        const h2x = tx - arrowSize * Math.cos(ang + Math.PI / 6);
        const h2y = ty - arrowSize * Math.sin(ang + Math.PI / 6);
        return `${h1x},${h1y} ${tx},${ty} ${h2x},${h2y}`;
    };

    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const textOffset = fontSize * 0.8;

    let textProps = {};
    if (isVertical) {
        textProps = {
            transform: `rotate(-90, ${midX}, ${midY}) translate(0, -${textOffset})`,
            x: midX, y: midY,
        };
    } else {
        textProps = { x: midX, y: midY - textOffset, textAnchor: 'middle' };
    }

    return (
        <g>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={strokeWidth} />
            <polyline points={drawHead(x1, y1, angle + Math.PI)} fill="none" stroke={color} strokeWidth={strokeWidth} />
            <polyline points={drawHead(x2, y2, angle)} fill="none" stroke={color} strokeWidth={strokeWidth} />
            <text
                {...textProps}
                fill="#d0bcff" // srm-primary
                fontSize={fontSize}
                fontFamily="Roboto, sans-serif"
                textAnchor="middle"
                style={{ paintOrder: 'stroke', stroke: '#141218', strokeWidth: '3px', strokeLinecap: 'round', strokeLinejoin: 'round' }}
            >
                {text}
            </text>
        </g>
    );
};

export const PatternView: React.FC = () => {
    const { results, mode } = useShellStore();
    const { flatLength, flatWidth, rOut, rIn, angle, isValid } = results;

    const viewModel = useMemo(() => {
        if (!isValid) return null;

        if (mode === 'cylinder') {
            const w = flatLength;
            const h = flatWidth;
            const padding = Math.max(w, h) * 0.2;
            const fontSize = Math.max(12, Math.max(w, h) * 0.025);

            return {
                viewBox: `${-w / 2 - padding} ${-h / 2 - padding} ${w + padding * 2} ${h + padding * 2}`,
                fontSize,
                elements: (
                    <>
                        <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="#2b2930" stroke="#d0bcff" strokeWidth={fontSize * 0.1} />
                        <Arrow x1={-w / 2} y1={h / 2 + fontSize * 2} x2={w / 2} y2={h / 2 + fontSize * 2} text={`L=${w.toFixed(1)}`} fontSize={fontSize} />
                        <Arrow x1={-w / 2 - fontSize * 2} y1={-h / 2} x2={-w / 2 - fontSize * 2} y2={h / 2} text={`W=${h.toFixed(1)}`} fontSize={fontSize} isVertical />
                    </>
                )
            };
        } else {
            // Cone Logic
            if (!rOut || !rIn || !angle) return null;

            const rad = (deg: number) => (deg - 90) * Math.PI / 180;
            const startAngle = -angle / 2;
            const endAngle = angle / 2;

            const x1 = Math.cos(rad(startAngle)) * rOut;
            const y1 = Math.sin(rad(startAngle)) * rOut;
            const x2 = Math.cos(rad(endAngle)) * rOut;
            const y2 = Math.sin(rad(endAngle)) * rOut;
            const x3 = Math.cos(rad(endAngle)) * rIn;
            const y3 = Math.sin(rad(endAngle)) * rIn;
            const x4 = Math.cos(rad(startAngle)) * rIn;
            const y4 = Math.sin(rad(startAngle)) * rIn;

            const largeArc = angle > 180 ? 1 : 0;
            const pathData = [
                `M ${x1} ${y1}`,
                `A ${rOut} ${rOut} 0 ${largeArc} 1 ${x2} ${y2}`,
                `L ${x3} ${y3}`,
                `A ${rIn} ${rIn} 0 ${largeArc} 0 ${x4} ${y4}`,
                `Z`
            ].join(" ");

            const maxR = rOut;
            const padding = maxR * 0.2; // Slightly reduced padding
            const fontSize = Math.max(12, maxR * 0.025);
            const viewBox = `${-maxR - padding} ${-maxR - padding} ${maxR * 2 + padding * 2} ${maxR * 2 + padding * 2}`;

            // Dimensions positions
            // Draw Radius lines at 0 degrees (Upwards/North in logical space, but -90 in svg space?)
            // Our rad func subtracts 90, so 0 deg input -> -90 rad (Top).
            // Let's verify Arrow placement.
            // Angle range is [-angle/2, angle/2]. 0 is the center bisector.
            // We can draw the arrow along the bisector (angle 0).

            const arrowY_Out = - rOut; // Up
            const arrowY_In = - rIn;   // Up
            // Arrow from Center to Inner
            // Arrow from Inner to Outer

            return {
                viewBox,
                fontSize,
                elements: (
                    <>
                        <path d={pathData} fill="#2b2930" stroke="#d0bcff" strokeWidth={fontSize * 0.1} />

                        {/* Inner Radius Dimension */}
                        <line x1="0" y1="0" x2="0" y2={arrowY_In} stroke="#938f99" strokeWidth={fontSize * 0.05} strokeDasharray={`${fontSize} ${fontSize / 2}`} />
                        <Arrow x1={0} y1={0} x2={0} y2={arrowY_In} text={`r=${rIn.toFixed(1)}`} fontSize={fontSize} isVertical />

                        {/* Outer Radius Dimension (offset slightly if needed, or just continuation) */}
                        <Arrow x1={0} y1={0} x2={0} y2={arrowY_Out} text={`R=${rOut.toFixed(1)}`} fontSize={fontSize} isVertical />
                    </>
                )
            };
        }
    }, [results, mode, isValid]);

    if (!isValid || !viewModel) {
        return <div className="srm-text-gray-500">Invalid Geometry</div>;
    }

    return (
        <div className="srm-w-full srm-h-full srm-flex srm-items-center srm-justify-center srm-p-8 srm-bg-[#18181b]">
            <div className="srm-w-full srm-h-full srm-max-w-4xl srm-max-h-[80vh] srm-border srm-border-[#333] srm-rounded-lg srm-bg-[#121212] srm-relative srm-overflow-hidden srm-flex srm-items-center srm-justify-center srm-shadow-2xl">
                <svg width="100%" height="100%" viewBox={viewModel.viewBox} preserveAspectRatio="xMidYMid meet">
                    {viewModel.elements}
                </svg>
            </div>
        </div>
    );
};
