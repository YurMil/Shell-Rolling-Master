import React from 'react';
import { useShellStore } from '../../store/useShellStore';
import { ConePatternView } from './ConePatternView';
import { CylinderPatternView } from './CylinderPatternView';

export const PatternView: React.FC = () => {
    const { results, mode } = useShellStore();

    if (!results.isValid) {
        return <div className="w-full h-full flex items-center justify-center text-gray-400">Invalid or No Geometry</div>;
    }

    return mode === 'cylinder'
        ? <CylinderPatternView results={results} />
        : <ConePatternView results={results} />;
};
