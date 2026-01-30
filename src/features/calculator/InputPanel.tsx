
import React from 'react';
import { useShellStore } from '../../store/useShellStore';
import { NumberInput, Button, cn } from '../../components/ui';
import { ResultsCard } from './ResultsCard';
import { FileText, Download } from 'lucide-react';

export const InputPanel: React.FC = () => {
    const state = useShellStore();

    return (
        <div className="srm-w-full srm-h-full srm-flex srm-flex-col srm-p-6">
            <h1 className="srm-text-xl srm-font-bold srm-flex srm-items-center srm-gap-2 srm-text-md-primary srm-mb-6">
                Shell Rolling Master <span className="srm-text-xs srm-bg-md-primary srm-text-md-onPrimary srm-px-2 srm-py-0.5 srm-rounded-full srm-ml-1">v0.1</span>
            </h1>

            {/* Mode Selector */}
            <div className="srm-bg-md-surface srm-rounded-xl srm-p-1 srm-flex srm-mb-6 srm-border srm-border-[#49454f]">
                <button
                    onClick={() => state.setMode('cylinder')}
                    className={cn(
                        "srm-flex-1 srm-py-2 srm-rounded-lg srm-text-sm srm-font-medium srm-transition-all",
                        state.mode === 'cylinder' ? "srm-bg-md-primary srm-text-md-onPrimary srm-shadow-md" : "srm-text-[#ccc2dc] hover:srm-bg-[#36343b]"
                    )}
                >
                    Cylinder
                </button>
                <button
                    onClick={() => state.setMode('cone')}
                    className={cn(
                        "srm-flex-1 srm-py-2 srm-rounded-lg srm-text-sm srm-font-medium srm-transition-all",
                        state.mode === 'cone' ? "srm-bg-md-primary srm-text-md-onPrimary srm-shadow-md" : "srm-text-[#ccc2dc] hover:srm-bg-[#36343b]"
                    )}
                >
                    Cone
                </button>
            </div>

            {/* Inputs */}
            <div className="srm-space-y-2">
                {/* Spec Type */}
                <div className="srm-flex srm-items-center srm-justify-between srm-mb-4 srm-px-1">
                    <span className="srm-text-sm srm-text-md-secondary">Diameter Type:</span>
                    <div className="srm-flex srm-gap-2 srm-text-sm">
                        <label className="srm-flex srm-items-center srm-gap-2 srm-cursor-pointer srm-text-gray-200">
                            <input type="radio" checked={state.specType === 'OD'} onChange={() => state.setSpecType('OD')} className="srm-accent-md-primary" />
                            <span>OD (Ext)</span>
                        </label>
                        <label className="srm-flex srm-items-center srm-gap-2 srm-cursor-pointer srm-text-gray-200">
                            <input type="radio" checked={state.specType === 'ID'} onChange={() => state.setSpecType('ID')} className="srm-accent-md-primary" />
                            <span>ID (Int)</span>
                        </label>
                    </div>
                </div>

                <NumberInput label="Diameter 1 (Top)" value={state.d1} onChange={(e) => state.setD1(parseFloat(e.target.value))} />

                {state.mode === 'cone' && (
                    <NumberInput label="Diameter 2 (Bottom)" value={state.d2} onChange={(e) => state.setD2(parseFloat(e.target.value))} />
                )}

                <NumberInput label="Height / Width" value={state.h} onChange={(e) => state.setHeight(parseFloat(e.target.value))} />

                <div className="srm-grid srm-grid-cols-2 srm-gap-4">
                    <NumberInput label="Thickness" value={state.thickness} onChange={(e) => state.setThickness(parseFloat(e.target.value))} />
                    <NumberInput label="K-Factor" value={state.kFactor} step={0.01} onChange={(e) => state.setKFactor(parseFloat(e.target.value))} />
                </div>

                <div className="srm-grid srm-grid-cols-2 srm-gap-4">
                    <NumberInput label="Gap" value={state.gap} step={0.1} onChange={(e) => state.setGap(parseFloat(e.target.value))} />
                    <NumberInput label="Bend Lines" value={state.bendLines} min={0} onChange={(e) => state.setBendLines(parseFloat(e.target.value))} />
                </div>
            </div>

            <ResultsCard />

            <div className="srm-mt-6 srm-space-y-3">
                <Button variant="primary" onClick={() => {
                    import('../../utils/pdf-generator').then(mod => mod.generatePDF(state, state.results));
                }}>
                    <FileText className="srm-w-5 srm-h-5" /> Download PDF Report
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
                    <Download className="srm-w-5 srm-h-5" /> Download DXF
                </Button>
            </div>

            <div className="srm-mt-auto srm-p-4 srm-text-center srm-text-xs srm-text-gray-600 srm-border-t srm-border-[#36343b]">
                Shell Rolling Master v0.1
            </div>
        </div>
    );
};
