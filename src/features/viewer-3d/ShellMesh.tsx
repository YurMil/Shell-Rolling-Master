import React from 'react';
import { useShellStore } from '../../store/useShellStore';
import { ConeShellMesh } from './ConeShellMesh';
import { CylinderShellMesh } from './CylinderShellMesh';

export const ShellMesh: React.FC = () => {
    const { mode } = useShellStore();

    return mode === 'cylinder'
        ? <CylinderShellMesh />
        : <ConeShellMesh />;
};
