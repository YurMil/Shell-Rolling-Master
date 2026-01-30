
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useShellStore } from '../../store/useShellStore';

// Geometry Generator
function createThickShellGeometry(r1_in: number, r1_out: number, r2_in: number, r2_out: number, h: number, startAngle: number, endAngle: number) {
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const indices: number[] = [];
    const segments = 64;
    const totalAngle = endAngle - startAngle;

    for (let i = 0; i <= segments; i++) {
        const theta = startAngle + (i / segments) * totalAngle;
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);
        // Top Ring (y = h/2)
        vertices.push(r1_out * cos, h / 2, -r1_out * sin); // 0: Top Out
        vertices.push(r1_in * cos, h / 2, -r1_in * sin);   // 1: Top In
        // Bottom Ring (y = -h/2)
        vertices.push(r2_out * cos, -h / 2, -r2_out * sin); // 2: Bot Out
        vertices.push(r2_in * cos, -h / 2, -r2_in * sin);   // 3: Bot In
    }

    // Faces
    for (let i = 0; i < segments; i++) {
        const base = i * 4;
        const next = (i + 1) * 4;

        // Outside (0 -> 2 -> next2 -> next0)
        indices.push(base + 0, base + 2, next + 0);
        indices.push(base + 2, next + 2, next + 0);

        // Inside (1 -> next1 -> next3 -> 3) - winding reversed for inside
        indices.push(base + 1, next + 1, base + 3);
        indices.push(next + 1, next + 3, base + 3);

        // Top Rim (0 -> next0 -> next1 -> 1)
        indices.push(base + 0, next + 0, base + 1);
        indices.push(next + 0, next + 1, base + 1);

        // Bottom Rim (2 -> 3 -> next3 -> next2)
        indices.push(base + 2, base + 3, next + 2);
        indices.push(base + 3, next + 3, next + 2);
    }

    // Closing Faces (Start and End caps)
    // Start Cap (i=0) variables: base=0 implies vertices 0,1,2,3
    // 0(TopOut), 1(TopIn), 2(BotOut), 3(BotIn)
    // Face: 0 -> 1 -> 3 -> 2
    indices.push(0, 1, 2); indices.push(1, 3, 2);

    // End Cap (i=segments) variables: last = segments*4
    // last+0(TopOut), last+1(TopIn), last+2(BotOut), last+3(BotIn)
    // Face: 0->2->3->1 (reverse winding)
    const last = segments * 4;
    indices.push(last + 0, last + 2, last + 1); indices.push(last + 2, last + 3, last + 1);

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
}

export const ShellMesh: React.FC = () => {
    const { mode, specType, d1, d2, h, thickness, gap, results } = useShellStore();
    const meshRef = useRef<THREE.Mesh>(null);

    const geometry = useMemo(() => {
        if (!results.isValid) return new THREE.BufferGeometry();

        let r1_in, r1_out, r2_in, r2_out;

        // Logic from app.html update3D
        if (specType === 'ID') {
            r1_in = d1 / 2;
            r1_out = r1_in + thickness;
            r2_in = mode === 'cone' ? d2 / 2 : r1_in;
            r2_out = r2_in + thickness;
        } else {
            r1_out = d1 / 2;
            r1_in = r1_out - thickness;
            r2_out = mode === 'cone' ? d2 / 2 : r1_out;
            r2_in = r2_out - thickness;
        }

        if (r1_in < 0.1) r1_in = 0.1;
        if (r2_in < 0.1) r2_in = 0.1;

        const avgDiaNeutral = (results.d1_neutral + results.d2_neutral) / 2;
        const circumference = Math.PI * avgDiaNeutral;

        // Gap Angle
        let gapAngle = 0;
        if (circumference > 0) gapAngle = (gap / circumference) * 2 * Math.PI;
        if (gapAngle > 2 * Math.PI - 0.1) gapAngle = 2 * Math.PI - 0.1;

        const thetaLength = 2 * Math.PI - gapAngle;
        const thetaStart = Math.PI / 2 + gapAngle / 2; // Start from side to center gap

        return createThickShellGeometry(r1_in, r1_out, r2_in, r2_out, h, thetaStart, thetaStart + thetaLength);
    }, [mode, specType, d1, d2, h, thickness, gap, results]);

    return (
        <mesh ref={meshRef} geometry={geometry}>
            <meshStandardMaterial
                color="#3b3841"
                metalness={0.6}
                roughness={0.4}
                side={THREE.DoubleSide}
            />
            <lineSegments>
                <edgesGeometry args={[geometry, 15]} />
                <lineBasicMaterial color="#d0bcff" />
            </lineSegments>
        </mesh>
    );
};
