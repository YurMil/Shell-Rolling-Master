import type { ShapeType, ShellParameters, CalculationResult } from '../../features/calculator/types';
import type { ShellSolidGeometry } from '../../utils/shell-solid-geometry';

export type ShellCadGeometry = ShellSolidGeometry & {
    mode: ShapeType;
};

export interface ShellCadSource {
    params: Pick<ShellParameters, 'mode' | 'h' | 'thickness' | 'gap' | 'kFactor'>;
    results: CalculationResult;
}
