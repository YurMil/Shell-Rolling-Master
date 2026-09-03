import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import { useShellStore } from '../../store/useShellStore';
import { buildShellGeometry } from './geometry/buildShellGeometry';
import { ShellMeshBase } from './ShellMeshBase';

export const CylinderShellMesh: React.FC = () => {
    const { d1, h, thickness, gap, kFactor, results } = useShellStore(useShallow((s) => ({
        d1: s.d1,
        h: s.h,
        thickness: s.thickness,
        gap: s.gap,
        kFactor: s.kFactor,
        results: s.results,
    })));

    const geometry = useMemo(() => {
        if (!results.isValid || d1 <= 0 || h <= 0 || thickness <= 0) {
            return new THREE.BufferGeometry();
        }

        return buildShellGeometry({
            r1_neutral: results.d1_neutral / 2,
            r2_neutral: results.d2_neutral / 2,
            height: h,
            thickness,
            gap,
            kFactor
        });
    }, [d1, h, thickness, gap, kFactor, results]);

    return <ShellMeshBase geometry={geometry} />;
};
