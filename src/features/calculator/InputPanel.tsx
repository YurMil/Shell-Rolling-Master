
import React from 'react';
import { useShellStore } from '../../store/useShellStore';
import { NumberField, Button } from '../../components/ui';
import { cn } from '../../components/ui/cn';
import { ResultsCard } from './ResultsCard';
import { FileText, Download } from 'lucide-react';
import { version } from '../../../package.json';
import { StepExportButton } from './StepExportButton';

export const InputPanel: React.FC = () => {
    const state = useShellStore();

    return (
        <div className="w-full h-full flex flex-col p-6">
            <h1 className="text-xl font-bold flex items-center gap-2 text-md-primary mb-6">
                Shell Rolling Master <span className="text-xs bg-md-primary text-md-onPrimary px-2 py-0.5 rounded-full ml-1">v{version}</span>
            </h1>

            {/* Mode Selector */}
            <div className="bg-md-surface rounded-xl p-1 flex mb-6 border border-[#49454f]">
                <button
                    onClick={() => state.setMode('cylinder')}
                    className={cn(
                        "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                        state.mode === 'cylinder' ? "bg-md-primary text-md-onPrimary shadow-md" : "text-[#ccc2dc] hover:bg-[#36343b]"
                    )}
                >
                    Cylinder
                </button>
                <button
                    onClick={() => state.setMode('cone')}
                    className={cn(
                        "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                        state.mode === 'cone' ? "bg-md-primary text-md-onPrimary shadow-md" : "text-[#ccc2dc] hover:bg-[#36343b]"
                    )}
                >
                    Cone
                </button>
            </div>

            {/* Inputs */}
            <div className="space-y-2">
                {/* Spec Type */}
                <div className="flex items-center justify-between mb-4 px-1">
                    <span className="text-sm text-md-secondary">Diameter Type:</span>
                    <div className="flex gap-2 text-sm">
                        <label className="flex items-center gap-2 cursor-pointer text-gray-200">
                            <input type="radio" checked={state.specType === 'OD'} onChange={() => state.setSpecType('OD')} className="accent-md-primary" />
                            <span>OD (Ext)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-gray-200">
                            <input type="radio" checked={state.specType === 'ID'} onChange={() => state.setSpecType('ID')} className="accent-md-primary" />
                            <span>ID (Int)</span>
                        </label>
                    </div>
                </div>

                <NumberField label="Diameter 1 (Top)" value={state.d1} min={0} onCommit={state.setD1} />

                {state.mode === 'cone' && (
                    <NumberField label="Diameter 2 (Bottom)" value={state.d2} min={0} onCommit={state.setD2} />
                )}

                <NumberField label="Height / Width" value={state.h} min={0} onCommit={state.setHeight} />

                <div className="grid grid-cols-2 gap-4">
                    <NumberField label="Thickness" value={state.thickness} min={0} step={0.1} onCommit={state.setThickness} />
                    <NumberField label="K-Factor" value={state.kFactor} min={0} max={1} step={0.01} onCommit={state.setKFactor} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <NumberField label="Gap" value={state.gap} min={0} step={0.1} onCommit={state.setGap} />
                    <div className="flex items-center gap-2 text-sm text-gray-200">
                        <input
                            type="checkbox"
                            checked={state.bendLinesEnabled}
                            onChange={(e) => state.setBendLinesEnabled(e.target.checked)}
                            className="accent-md-primary"
                        />
                        <span>Add Bend Lines</span>
                    </div>
                </div>

                {state.bendLinesEnabled && (
                    <div className="grid grid-cols-2 gap-4">
                        <NumberField
                            label="Quantity"
                            value={state.bendLinesCount}
                            min={0}
                            step={1}
                            onCommit={state.setBendLinesCount}
                        />
                        <div className="flex items-end text-sm text-gray-300 pb-1">
                            Step: {state.results.bendStep ? state.results.bendStep.toFixed(1) : '—'} mm
                        </div>
                    </div>
                )}
            </div>

            <ResultsCard />

            <div className="mt-6 space-y-3">
                <Button variant="primary" onClick={() => {
                    import('../../utils/pdf-generator').then(mod => mod.generatePDF(state, state.results));
                }}>
                    <FileText className="w-5 h-5" /> Download PDF Report
                </Button>
                <Button variant="secondary" onClick={() => {
                    import('../../utils/dxf-writer').then(mod => {
                        const dxfContent = mod.generateUnfoldedDxf(state, state.results);
                        const blob = new Blob([dxfContent], { type: 'application/dxf' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `shell-pattern-${state.mode}.dxf`;
                        a.click();
                        URL.revokeObjectURL(url);
                    });
                }}>
                    <Download className="w-5 h-5" /> Download DXF
                </Button>
                <StepExportButton />
            </div>

            <div className="mt-auto p-4 text-center text-xs text-gray-600 border-t border-[#36343b]">
                Shell Rolling Master v{version}
            </div>
        </div>
    );
};
