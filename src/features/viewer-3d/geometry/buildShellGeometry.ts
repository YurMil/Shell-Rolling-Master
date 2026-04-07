import * as THREE from 'three';
import { computeShellSolidGeometry } from '../../../utils/shell-solid-geometry';

interface ShellGeometryParams {
    r1_neutral: number;
    r2_neutral: number;
    height: number;
    thickness: number;
    gap: number;
    kFactor?: number;
}

const createThickShellGeometry = (
    r1_in: number,
    r1_out: number,
    r2_in: number,
    r2_out: number,
    height: number,
    startAngle: number,
    endAngle: number
) => {
    const isValid = (val: number): boolean => typeof val === 'number' && isFinite(val) && val > 0;

    if (!isValid(r1_in) || !isValid(r1_out) || !isValid(r2_in) || !isValid(r2_out) || !isValid(height) || !isFinite(startAngle) || !isFinite(endAngle)) {
        console.warn('Invalid geometry parameters, returning empty geometry');
        return new THREE.BufferGeometry();
    }

    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const indices: number[] = [];
    const segments = 64;
    const totalAngle = endAngle - startAngle;

    if (!isFinite(totalAngle) || totalAngle <= 0) {
        console.warn('Invalid angle range, returning empty geometry');
        return new THREE.BufferGeometry();
    }

    for (let i = 0; i <= segments; i++) {
        const theta = startAngle + (i / segments) * totalAngle;
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);

        vertices.push(r1_out * cos, height / 2, -r1_out * sin);
        vertices.push(r1_in * cos, height / 2, -r1_in * sin);
        vertices.push(r2_out * cos, -height / 2, -r2_out * sin);
        vertices.push(r2_in * cos, -height / 2, -r2_in * sin);
    }

    for (let i = 0; i < segments; i++) {
        const base = i * 4;
        const next = (i + 1) * 4;

        indices.push(base + 0, base + 2, next + 0);
        indices.push(base + 2, next + 2, next + 0);

        indices.push(base + 1, next + 1, base + 3);
        indices.push(next + 1, next + 3, base + 3);

        indices.push(base + 0, next + 0, base + 1);
        indices.push(next + 0, next + 1, base + 1);

        indices.push(base + 2, base + 3, next + 2);
        indices.push(base + 3, next + 3, next + 2);
    }

    indices.push(0, 1, 2);
    indices.push(1, 3, 2);

    const last = segments * 4;
    indices.push(last + 0, last + 2, last + 1);
    indices.push(last + 2, last + 3, last + 1);

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
};

export const buildShellGeometry = (params: ShellGeometryParams): THREE.BufferGeometry => {
    const { r1_neutral, r2_neutral, height, thickness, gap, kFactor } = params;

    const isValid = (val: number): boolean => typeof val === 'number' && isFinite(val) && val > 0;

    if (!isValid(r1_neutral) || !isValid(r2_neutral) || !isValid(height) || !isValid(thickness)) {
        console.warn('Invalid critical dimensions detected, using empty geometry');
        return new THREE.BufferGeometry();
    }

    const solidGeometry = computeShellSolidGeometry({
        r1Neutral: r1_neutral,
        r2Neutral: r2_neutral,
        height,
        thickness,
        gap,
        kFactor,
    });

    let r1_inner = solidGeometry.topInnerRadius;
    const r1_outer = solidGeometry.topOuterRadius;
    let r2_inner = solidGeometry.bottomInnerRadius;
    const r2_outer = solidGeometry.bottomOuterRadius;

    if (r1_inner < 0.1) r1_inner = 0.1;
    if (r2_inner < 0.1) r2_inner = 0.1;

    if (!isFinite(r1_inner) || !isFinite(r1_outer) || !isFinite(r2_inner) || !isFinite(r2_outer)) {
        console.warn('Invalid radius calculations, using empty geometry');
        return new THREE.BufferGeometry();
    }

    return createThickShellGeometry(
        r1_inner,
        r1_outer,
        r2_inner,
        r2_outer,
        height,
        solidGeometry.thetaStart,
        solidGeometry.thetaEnd
    );
};
