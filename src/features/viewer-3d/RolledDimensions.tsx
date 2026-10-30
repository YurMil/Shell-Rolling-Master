import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import { useShallow } from 'zustand/react/shallow';
import { useShellStore } from '../../store/useShellStore';
import { computeRolledShell, formatDimension } from '../../utils/rolled-shell';
import { buildRolledDimensionLayout, type DimensionLabel3D, type Vec2 } from './geometry/buildRolledDimensions';

const DIMENSION_COLOR = '#8fe6d0';
const CENTERLINE_COLOR = '#9e9aa6';

const to3 = ([x, y]: Vec2): [number, number, number] => [x, y, 0];

const Label: React.FC<{ position: [number, number, number]; text: string; align: DimensionLabel3D['align']; reference?: boolean }> = ({
    position,
    text,
    align,
    reference
}) => (
    <Html
        position={position}
        center={align === 'center'}
        zIndexRange={[10, 0]}
        style={{ pointerEvents: 'none' }}
    >
        <div
            style={{
                transform: align === 'left' ? 'translate(4px, -50%)' : undefined,
                color: DIMENSION_COLOR,
                opacity: reference ? 0.75 : 1,
                background: 'rgba(20, 18, 24, 0.82)',
                border: `1px solid ${reference ? 'transparent' : 'rgba(143, 230, 208, 0.35)'}`,
                borderRadius: 4,
                padding: '1px 5px',
                font: '600 12px/1.3 Roboto, system-ui, sans-serif',
                whiteSpace: 'nowrap',
                userSelect: 'none'
            }}
        >
            {text}
        </div>
    </Html>
);

/**
 * Dimensions of the rolled part in the 3D view, laid out like the section on
 * a drawing. For revolved shells the dimension plane turns about the axis to
 * face the camera; the eccentric cone keeps it in the eccentricity plane,
 * which is where its offset and true outline are.
 */
export const RolledDimensions: React.FC = () => {
    const params = useShellStore(useShallow((s) => ({
        mode: s.mode,
        specType: s.specType,
        d1: s.d1,
        d2: s.d2,
        h: s.h,
        thickness: s.thickness,
        kFactor: s.kFactor,
        gap: s.gap,
        bendLinesEnabled: s.bendLinesEnabled,
        bendLinesCount: s.bendLinesCount,
        eccentricity: s.eccentricity,
        seamPosition: s.seamPosition,
        seamAngleDeg: s.seamAngleDeg,
        stationCount: s.stationCount,
        density: s.density,
        bendDimensionsEnabled: s.bendDimensionsEnabled,
        bendDimensionOffset: s.bendDimensionOffset,
    })));
    const results = useShellStore((s) => s.results);

    const shell = useMemo(() => computeRolledShell(params, results), [params, results]);
    const layout = useMemo(() => (shell ? buildRolledDimensionLayout(shell) : null), [shell]);

    const arrowGeometry = useMemo(() => {
        const geometry = new THREE.BufferGeometry();
        if (!layout) return geometry;

        const halfWidth = layout.arrowSize * 0.3;
        const vertices: number[] = [];
        for (const { tip, direction } of layout.arrows) {
            const [dx, dy] = direction;
            const bx = tip[0] - dx * layout.arrowSize;
            const by = tip[1] - dy * layout.arrowSize;
            vertices.push(
                tip[0], tip[1], 0,
                bx - dy * halfWidth, by + dx * halfWidth, 0,
                bx + dy * halfWidth, by - dx * halfWidth, 0
            );
        }
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        return geometry;
    }, [layout]);

    useEffect(() => () => arrowGeometry.dispose(), [arrowGeometry]);

    const groupRef = useRef<THREE.Group>(null);
    const faceCamera = shell !== null && shell.eccentricity === 0;

    useFrame(({ camera }) => {
        const group = groupRef.current;
        if (!group) return;
        group.rotation.y = faceCamera ? Math.atan2(camera.position.x, camera.position.z) : 0;
    });

    if (!shell || !layout) return null;

    const dimensionPoints = layout.lines.flatMap(([a, b]) => [to3(a), to3(b)]);
    const centerPoints = layout.centerlines.flatMap(([a, b]) => [to3(a), to3(b)]);

    // Seam note sits on the real seam, outside the turning dimension plane, and
    // below mid-height so it never lands on the height label.
    const seam = (shell.seamAngleDeg * Math.PI) / 180;
    const seamY = -shell.height * 0.3;
    const t = (seamY + shell.height / 2) / shell.height;
    const seamRadius = (t * shell.top.outerDiameter + (1 - t) * shell.bottom.outerDiameter) / 2 + layout.step * 0.3;
    const seamPosition: [number, number, number] = [
        t * shell.eccentricity + seamRadius * Math.cos(seam),
        seamY,
        -seamRadius * Math.sin(seam)
    ];

    return (
        <>
            <group ref={groupRef}>
                <Line points={dimensionPoints} segments color={DIMENSION_COLOR} lineWidth={1.2} />
                <Line
                    points={centerPoints}
                    segments
                    dashed
                    dashSize={layout.step * 0.5}
                    gapSize={layout.step * 0.15}
                    color={CENTERLINE_COLOR}
                    lineWidth={1}
                />
                <mesh geometry={arrowGeometry} userData={{ noFit: true }}>
                    <meshBasicMaterial color={DIMENSION_COLOR} side={THREE.DoubleSide} />
                </mesh>
                {layout.labels.map((label, index) => (
                    <Label
                        key={index}
                        position={to3(label.position)}
                        text={label.text}
                        align={label.align}
                        reference={label.reference}
                    />
                ))}
            </group>
            <Label position={seamPosition} text={`Seam · gap ${formatDimension(shell.gap)}`} align="center" reference />
        </>
    );
};
