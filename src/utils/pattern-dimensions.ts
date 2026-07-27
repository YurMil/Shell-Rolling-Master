import type { CalculationResult, Point2D, ShellParameters } from '../features/calculator/types';
import { buildDevelopmentDimensions, type AlignedDimension } from './aligned-dimension';
import { dimensionBothEdges, getPatternStations } from './pattern-stations';

/**
 * Bend-line spacing dimensions for the current pattern, in every shape mode.
 *
 * Single entry point for the 2D preview and the DXF writer, so what the user
 * sees on screen is what lands in the file.
 *
 * `transform` maps pattern space into the caller's drawing space — the
 * eccentric cone preview mirrors on Y because SVG is Y-down, and the dimension
 * geometry (including text rotation) has to be built in that same frame.
 */
export const buildPatternDimensions = (
    params: ShellParameters,
    result: CalculationResult,
    textHeight: number,
    transform: (point: Point2D) => Point2D = (point) => point
): AlignedDimension[] => {
    if (!params.bendLinesEnabled || !params.bendDimensionsEnabled) return [];

    const stations = getPatternStations(params, result).map(station => ({
        a: transform(station.a),
        b: transform(station.b)
    }));

    if (stations.length < 2) return [];

    return buildDevelopmentDimensions(stations, {
        offset: params.bendDimensionOffset,
        textHeight,
        bothEdges: dimensionBothEdges(params.mode)
    });
};
