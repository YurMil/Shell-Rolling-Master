import * as THREE from 'three';

export interface EccentricConeGeometryParams {
    /** Neutral radius of the top edge (D1). */
    rTopNeutral: number;
    /** Neutral radius of the bottom edge (D2). */
    rBottomNeutral: number;
    height: number;
    thickness: number;
    kFactor: number;
    /** Lateral offset of the top circle centre along +X. */
    eccentricity: number;
    /** Angular width of the weld gap (rad). */
    gapAngle: number;
    /** Angular position of the seam centre (rad). */
    seamPhi: number;
}

const SEGMENTS = 128;

const isValid = (value: number): boolean => typeof value === 'number' && isFinite(value);

/**
 * Thick-walled eccentric cone shell for the 3D preview.
 *
 * The top ring is offset by `eccentricity` along +X, so each quad column of the
 * mesh is one true ruling of the oblique cone — the same rulings the
 * development and the STEP solid are built from.
 */
export const buildEccentricConeGeometry = (params: EccentricConeGeometryParams): THREE.BufferGeometry => {
    const { rTopNeutral, rBottomNeutral, height, thickness, kFactor, eccentricity, gapAngle, seamPhi } = params;

    if (![rTopNeutral, rBottomNeutral, height, thickness, kFactor, eccentricity, gapAngle, seamPhi].every(isValid)) {
        console.warn('Invalid eccentric cone parameters, using empty geometry');
        return new THREE.BufferGeometry();
    }

    const innerOffset = kFactor * thickness;
    const outerOffset = (1 - kFactor) * thickness;

    const topInner = Math.max(0.1, rTopNeutral - innerOffset);
    const topOuter = rTopNeutral + outerOffset;
    const bottomInner = Math.max(0.1, rBottomNeutral - innerOffset);
    const bottomOuter = rBottomNeutral + outerOffset;

    const totalAngle = 2 * Math.PI - gapAngle;
    if (!(totalAngle > 0) || bottomOuter <= 0 || topOuter <= 0) {
        return new THREE.BufferGeometry();
    }

    const startAngle = seamPhi + gapAngle / 2;
    const halfHeight = height / 2;

    const vertices: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= SEGMENTS; i += 1) {
        const theta = startAngle + (i / SEGMENTS) * totalAngle;
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);

        // Same handedness as the cylinder/cone meshes: X to the right, Y up, Z = -r*sin.
        vertices.push(eccentricity + topOuter * cos, halfHeight, -topOuter * sin);
        vertices.push(eccentricity + topInner * cos, halfHeight, -topInner * sin);
        vertices.push(bottomOuter * cos, -halfHeight, -bottomOuter * sin);
        vertices.push(bottomInner * cos, -halfHeight, -bottomInner * sin);
    }

    for (let i = 0; i < SEGMENTS; i += 1) {
        const base = i * 4;
        const next = (i + 1) * 4;

        // Outer skin
        indices.push(base + 0, base + 2, next + 0);
        indices.push(base + 2, next + 2, next + 0);
        // Inner skin
        indices.push(base + 1, next + 1, base + 3);
        indices.push(next + 1, next + 3, base + 3);
        // Top rim
        indices.push(base + 0, next + 0, base + 1);
        indices.push(next + 0, next + 1, base + 1);
        // Bottom rim
        indices.push(base + 2, base + 3, next + 2);
        indices.push(base + 3, next + 3, next + 2);
    }

    // Seam faces
    indices.push(0, 1, 2);
    indices.push(1, 3, 2);

    const last = SEGMENTS * 4;
    indices.push(last + 0, last + 2, last + 1);
    indices.push(last + 2, last + 3, last + 1);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
};
