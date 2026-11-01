import {
    formatDimension,
    referenceDiameter,
    specDiameter,
    type RolledRim,
    type RolledShell
} from '../../../utils/rolled-shell';

export type Vec2 = [number, number];

export interface DimensionLabel3D {
    position: Vec2;
    text: string;
    /** 'center' sits on the dimension line; 'left' starts at the point (leader notes). */
    align: 'center' | 'left';
    /** Reference dimensions are drawn dimmer, like the parentheses on a drawing. */
    reference?: boolean;
}

/**
 * Drawing-style dimensions of the rolled shell for the 3D preview, laid out in
 * the plane through the shell axis — the same section the PDF "rolled part"
 * sheet shows. Coordinates are (x, y) in that plane: x along the eccentricity,
 * y up the axis, origin at the centre of the shell's height.
 */
export interface RolledDimensionLayout {
    /** Dimension and extension lines. */
    lines: Array<[Vec2, Vec2]>;
    centerlines: Array<[Vec2, Vec2]>;
    /** Arrowheads: tip and unit direction. */
    arrows: Array<{ tip: Vec2; direction: Vec2 }>;
    labels: DimensionLabel3D[];
    arrowSize: number;
    /** Spacing between dimension rows, also used to place free labels. */
    step: number;
}

export const buildRolledDimensionLayout = (shell: RolledShell): RolledDimensionLayout => {
    const e = shell.eccentricity;
    const rTo = shell.top.outerDiameter / 2;
    const rBo = shell.bottom.outerDiameter / 2;
    const yT = shell.height / 2;
    const yB = -shell.height / 2;

    const minX = Math.min(-rBo, e - rTo);
    const maxX = Math.max(rBo, e + rTo);
    const size = Math.max(shell.height, maxX - minX);

    const step = size * 0.08;
    const overshoot = size * 0.015;
    const arrowSize = size * 0.025;

    const layout: RolledDimensionLayout = { lines: [], centerlines: [], arrows: [], labels: [], arrowSize, step };

    const horizontal = (x1: number, y1: number, x2: number, y2: number, lineY: number, text: string, reference = false) => {
        for (const [x, y] of [[x1, y1], [x2, y2]]) {
            const direction = Math.sign(lineY - y) || 1;
            layout.lines.push([[x, y], [x, lineY + direction * overshoot]]);
        }
        const left = Math.min(x1, x2);
        const right = Math.max(x1, x2);
        layout.lines.push([[left, lineY], [right, lineY]]);

        if (right - left > 3 * arrowSize) {
            layout.arrows.push({ tip: [left, lineY], direction: [-1, 0] });
            layout.arrows.push({ tip: [right, lineY], direction: [1, 0] });
        } else {
            layout.lines.push([[left - 2 * arrowSize, lineY], [left, lineY]]);
            layout.lines.push([[right, lineY], [right + 2 * arrowSize, lineY]]);
            layout.arrows.push({ tip: [left, lineY], direction: [1, 0] });
            layout.arrows.push({ tip: [right, lineY], direction: [-1, 0] });
        }
        layout.labels.push({ position: [(left + right) / 2, lineY], text, align: 'center', reference });
    };

    const vertical = (x1: number, y1: number, x2: number, y2: number, lineX: number, text: string) => {
        for (const [x, y] of [[x1, y1], [x2, y2]]) {
            const direction = Math.sign(lineX - x) || -1;
            layout.lines.push([[x, y], [lineX + direction * overshoot, y]]);
        }
        const bottom = Math.min(y1, y2);
        const top = Math.max(y1, y2);
        layout.lines.push([[lineX, bottom], [lineX, top]]);
        layout.arrows.push({ tip: [lineX, top], direction: [0, 1] });
        layout.arrows.push({ tip: [lineX, bottom], direction: [0, -1] });
        layout.labels.push({ position: [lineX, (bottom + top) / 2], text, align: 'center' });
    };

    const ring = (rim: RolledRim, y: number, side: 1 | -1) => {
        const primary = specDiameter(rim, shell.specType);
        const reference = referenceDiameter(rim, shell.specType);
        horizontal(rim.centerX - primary / 2, y, rim.centerX + primary / 2, y, y + side * step, `Ø${formatDimension(primary)}`);
        horizontal(rim.centerX - reference / 2, y, rim.centerX + reference / 2, y, y + side * 2 * step, `(Ø${formatDimension(reference)})`, true);
    };

    ring(shell.top, yT, 1);
    if (shell.mode !== 'cylinder') {
        ring(shell.bottom, yB, -1);
    }

    const bottomReach = shell.mode === 'cylinder' ? step * 0.5 : step * 2.5;
    if (e > 0) {
        const lineY = yT + 3 * step;
        horizontal(0, lineY, e, lineY, lineY, `e = ${formatDimension(e)}`);
        layout.centerlines.push([[0, yB - bottomReach], [0, lineY + overshoot]]);
        layout.centerlines.push([[e, yT - step], [e, lineY + overshoot]]);
    } else {
        layout.centerlines.push([[0, yB - bottomReach], [0, yT + step * 0.5]]);
    }

    vertical(e - rTo, yT, -rBo, yB, minX - step, `H = ${formatDimension(shell.height)}`);

    // Wall thickness as a leader note on the right wall, mid-height.
    const wall: Vec2 = [(rBo + e + rTo) / 2, 0];
    const elbow: Vec2 = [maxX + step, step * 0.6];
    layout.lines.push([wall, elbow]);
    const length = Math.hypot(elbow[0] - wall[0], elbow[1] - wall[1]);
    layout.arrows.push({ tip: wall, direction: [(wall[0] - elbow[0]) / length, (wall[1] - elbow[1]) / length] });
    layout.labels.push({ position: elbow, text: `t = ${formatDimension(shell.thickness)}`, align: 'left' });

    return layout;
};
