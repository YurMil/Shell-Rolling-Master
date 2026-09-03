import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import { useShellStore } from '../../store/useShellStore';
import { getEccentricSeam } from '../../features/calculator/math/eccentric-cone';
import { buildEccentricConeGeometry } from './geometry/buildEccentricConeGeometry';
import { ShellMeshBase } from './ShellMeshBase';

export const EccentricConeMesh: React.FC = () => {
    const { h, thickness, kFactor, gap, eccentricity, seamPosition, seamAngleDeg, results } = useShellStore(useShallow((s) => ({
        h: s.h,
        thickness: s.thickness,
        kFactor: s.kFactor,
        gap: s.gap,
        eccentricity: s.eccentricity,
        seamPosition: s.seamPosition,
        seamAngleDeg: s.seamAngleDeg,
        results: s.results,
    })));

    const geometry = useMemo(() => {
        if (!results.isValid || h <= 0 || thickness <= 0) {
            return new THREE.BufferGeometry();
        }

        const rTopNeutral = results.d1_neutral / 2;
        const rBottomNeutral = results.d2_neutral / 2;
        const { seamPhi, gapAngle } = getEccentricSeam(
            { gap, seamPosition, seamAngleDeg },
            rBottomNeutral,
            rTopNeutral
        );

        return buildEccentricConeGeometry({
            rTopNeutral,
            rBottomNeutral,
            height: h,
            thickness,
            kFactor,
            eccentricity,
            gapAngle,
            seamPhi
        });
    }, [h, thickness, kFactor, gap, eccentricity, seamPosition, seamAngleDeg, results]);

    return <ShellMeshBase geometry={geometry} />;
};
