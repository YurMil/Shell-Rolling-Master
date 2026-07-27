import React from 'react';
import { useShellStore } from '../../store/useShellStore';
import { ConeShellMesh } from './ConeShellMesh';
import { CylinderShellMesh } from './CylinderShellMesh';
import { EccentricConeMesh } from './EccentricConeMesh';

export const ShellMesh: React.FC = () => {
    const { mode } = useShellStore();

    if (mode === 'cylinder') return <CylinderShellMesh />;
    if (mode === 'eccentric-cone') return <EccentricConeMesh />;
    return <ConeShellMesh />;
};
