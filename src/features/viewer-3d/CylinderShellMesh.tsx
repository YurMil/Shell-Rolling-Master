import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useShellStore } from '../../store/useShellStore';
import { buildShellGeometry } from './geometry/buildShellGeometry';
import { ShellMeshBase } from './ShellMeshBase';

export const CylinderShellMesh: React.FC = () => {
    const { d1, h, thickness, gap, kFactor, results } = useShellStore();

    const geometry = useMemo(() => {
        if (!results.isValid) {
            console.warn('Calculation results invalid, using empty geometry');
            return new THREE.BufferGeometry();
        }

        if (d1 <= 0 || h <= 0 || thickness <= 0) {
            console.warn('Invalid critical dimensions detected, using empty geometry');
            return new THREE.BufferGeometry();
        }

        const r1_neutral = results.d1_neutral / 2;
        const r2_neutral = results.d2_neutral / 2;

        return buildShellGeometry({
            r1_neutral,
            r2_neutral,
            height: h,
            thickness,
            gap,
            kFactor
        });
    }, [d1, h, thickness, gap, kFactor, results]);

    return <ShellMeshBase geometry={geometry} />;
};
