
import React from 'react';
import { useShellStore } from '../../store/useShellStore';

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="flex justify-between items-center border-b border-[#36343b] pb-2">
        <span className="text-sm text-gray-400">{label}</span>
        <span className="font-mono text-white text-right">{value}</span>
    </div>
);

const MODE_LABELS: Record<string, string> = {
    'cylinder': 'Cylinder',
    'cone': 'Cone',
    'eccentric-cone': 'Eccentric cone'
};

export const ResultsCard: React.FC = () => {
    const { results, mode, thickness, density } = useShellStore();
    const { isValid, flatLength, flatWidth, angle, rOut, rIn, error, eccentric } = results;

    if (!isValid) {
        return (
            <div className="mt-4 bg-[#1f1d24] rounded-xl p-4 border border-md-error/50">
                <p className="text-md-error text-sm text-center font-bold">{error || "Invalid Data"}</p>
            </div>
        );
    }

    return (
        <div className="mt-4 bg-[#1f1d24] rounded-xl p-4 border border-[#49454f]">
            <h3 className="text-xs font-bold text-md-secondary uppercase tracking-wider mb-3">Results</h3>
            <div className="space-y-3">
                <div className="flex flex-col gap-1 border-b border-[#36343b] pb-3">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">Required Sheet Spec</span>
                    <div className="text-lg font-bold text-white font-mono">
                        {flatLength.toFixed(1)} × {flatWidth.toFixed(1)} × {thickness.toFixed(1)} mm
                    </div>
                    <div className="text-xs text-gray-500">Width × Height × Thickness</div>
                </div>

                <div className="flex justify-between items-center border-b border-[#36343b] pb-2">
                    <span className="text-sm text-gray-400">Type:</span>
                    <span className="font-mono text-md-primary text-right">{MODE_LABELS[mode] ?? mode}</span>
                </div>

                {mode === 'cone' && (
                    <>
                        <div className="pt-2 text-xs text-gray-400 uppercase tracking-wider">Geometric Details</div>
                        <div className="flex justify-between items-center border-b border-[#36343b] pb-2">
                            <span className="text-sm text-gray-400">Angle (∠):</span>
                            <span className="font-mono font-bold text-white text-lg">{angle?.toFixed(2)}°</span>
                        </div>
                        {rOut !== undefined && (
                            <div className="flex justify-between items-center border-b border-[#36343b] pb-2">
                                <span className="text-sm text-gray-400">Outer R:</span>
                                <span className="font-mono font-bold text-white">{rOut.toFixed(2)} mm</span>
                            </div>
                        )}
                        {rIn !== undefined && (
                            <div className="flex justify-between items-center pb-2">
                                <span className="text-sm text-gray-400">Inner r:</span>
                                <span className="font-mono font-bold text-white">{rIn.toFixed(2)} mm</span>
                            </div>
                        )}
                        <div className="text-xs text-gray-500">
                            Outer R is the development (swing) radius, not the part height.
                        </div>
                    </>
                )}

                {mode === 'eccentric-cone' && eccentric && (
                    <>
                        <div className="pt-2 text-xs text-gray-400 uppercase tracking-wider">Development</div>
                        <Row label="Ruling min:" value={`${eccentric.minRuling.length.toFixed(1)} mm @ ${eccentric.minRuling.phiDeg.toFixed(0)}°`} />
                        <Row label="Ruling max:" value={`${eccentric.maxRuling.length.toFixed(1)} mm @ ${eccentric.maxRuling.phiDeg.toFixed(0)}°`} />
                        <Row label="Bottom edge:" value={`${eccentric.totalBottomArc.toFixed(1)} mm`} />
                        <Row label="Top edge:" value={`${eccentric.totalTopArc.toFixed(1)} mm`} />
                        <Row label="Inclination:" value={`${eccentric.halfAngleMinDeg.toFixed(1)}° … ${eccentric.halfAngleMaxDeg.toFixed(1)}°`} />
                        <Row label="Surface area:" value={`${(eccentric.surfaceArea / 1e6).toFixed(3)} m²`} />
                        <Row
                            label="Blank mass:"
                            value={`${((eccentric.surfaceArea * thickness * density) / 1e9).toFixed(1)} kg`}
                        />
                        <div className="text-xs text-gray-500">
                            Edge lengths are exact developed arcs (2πR), not chord sums.
                        </div>
                        {eccentric.warnings.map((warning, index) => (
                            <div key={index} className="text-xs text-amber-300">{warning}</div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
};
