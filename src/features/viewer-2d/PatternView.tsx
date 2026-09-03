import React from 'react';
import { useShellStore } from '../../store/useShellStore';
import { ConePatternView } from './ConePatternView';
import { CylinderPatternView } from './CylinderPatternView';
import { EccentricConePatternView } from './EccentricConePatternView';

export const PatternView: React.FC = () => {
    const results = useShellStore((s) => s.results);
    const mode = useShellStore((s) => s.mode);

    if (!results.isValid) {
        return <div className="w-full h-full flex items-center justify-center text-gray-400">Invalid or No Geometry</div>;
    }

    if (mode === 'cylinder') return <CylinderPatternView results={results} />;
    if (mode === 'eccentric-cone') return <EccentricConePatternView results={results} />;
    return <ConePatternView results={results} />;
};
