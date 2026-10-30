import type { jsPDF } from 'jspdf';
import type { CalculationResult, ShellParameters } from '../features/calculator/types';
import { drawFooter, drawFrame, MARGIN, PAGE_WIDTH } from './pdf-sheet';
import {
    computeRolledShell,
    formatDimension,
    formatSeamGap,
    referenceDiameter,
    specDiameter,
    type RolledShell
} from './rolled-shell';

/**
 * "Rolled part" sheet of the PDF report: a dimensioned drawing of the shell
 * after rolling — section A-A through the shell axis (in the eccentricity
 * plane), a top view, a data table and a title block — drawn at a standard
 * drawing scale.
 *
 * Model coordinates follow the 3D preview: X along the eccentricity, Y up the
 * shell axis (top ring at +H/2), plan coordinate P = −Z (the back of the
 * shell is at the top of the plan, as in a projected top view).
 */

interface Point {
    x: number;
    y: number;
}

const CONTOUR = 0.5;
const THIN = 0.18;
const SECTION_STROKE = 0.8;
const ARROW_LENGTH = 2.6;
const ARROW_HALF_WIDTH = 0.45;
const OVERSHOOT = 1.5;
const DIM_STEP = 8;
const DIM_FONT = 8;

// Drawing area of the two views, page millimetres.
const VIEW_TOP = MARGIN + 16;
const VIEW_BOTTOM = 148;
const LABEL_HEIGHT = 7;
const SECTION_BOX = { x: MARGIN + 4, w: 134 };
const PLAN_BOX = { x: 150, w: PAGE_WIDTH - MARGIN - 4 - 150 };
const SECTION_MARGIN = { left: 18, right: 22 };
const PLAN_MARGIN = { side: 15, top: LABEL_HEIGHT + 12, bottom: 10 };

// Bottom band: data table on the left, title block on the right.
const BAND_TOP = 154;
const BAND_BOTTOM = 195;
const TABLE_BOX = { x: MARGIN + 4, w: 162 };
const TITLE_BOX = { x: 180, w: PAGE_WIDTH - MARGIN - 180 };

/** Preferred drawing scales (page mm per model mm), largest first — ISO 5455 / GOST 2.302. */
const STANDARD_SCALES = [
    50, 20, 10, 5, 4, 2.5, 2, 1,
    1 / 2, 1 / 2.5, 1 / 4, 1 / 5, 1 / 10, 1 / 15, 1 / 20, 1 / 25, 1 / 40, 1 / 50, 1 / 75,
    1 / 100, 1 / 200, 1 / 250, 1 / 400, 1 / 500, 1 / 800, 1 / 1000, 1 / 2000, 1 / 5000
];

const MODE_TITLES: Record<RolledShell['mode'], string> = {
    'cylinder': 'Cylindrical shell',
    'cone': 'Conical shell',
    'eccentric-cone': 'Eccentric conical shell'
};

/** Largest standard scale that still fits; falls back to the exact fit for huge parts. */
export const pickDrawingScale = (fit: number): { factor: number; label: string } => {
    const factor = STANDARD_SCALES.find(scale => scale <= fit * (1 + 1e-9)) ?? fit;
    const label = factor >= 1
        ? `${formatDimension(factor)}:1`
        : `1:${formatDimension(1 / factor)}`;
    return { factor, label };
};

const diameter = (value: number) => `Ø${formatDimension(value)}`;

// --- Drawing primitives -------------------------------------------------------

const solid = (doc: jsPDF, width: number) => {
    doc.setLineWidth(width);
    doc.setLineDashPattern([], 0);
};

const centerline = (doc: jsPDF) => {
    doc.setLineWidth(THIN);
    doc.setLineDashPattern([5, 1, 0.8, 1], 0);
};

const hidden = (doc: jsPDF) => {
    doc.setLineWidth(THIN);
    doc.setLineDashPattern([2, 1], 0);
};

/** Filled arrowhead with its tip at `tip`, pointing along the unit vector (dx, dy). */
const arrow = (doc: jsPDF, tip: Point, dx: number, dy: number) => {
    const bx = tip.x - dx * ARROW_LENGTH;
    const by = tip.y - dy * ARROW_LENGTH;
    doc.triangle(
        tip.x, tip.y,
        bx - dy * ARROW_HALF_WIDTH, by + dx * ARROW_HALF_WIDTH,
        bx + dy * ARROW_HALF_WIDTH, by - dx * ARROW_HALF_WIDTH,
        'F'
    );
};

const fillPolygon = (doc: jsPDF, points: Point[]) => {
    const deltas = points.slice(1).map((point, index) => [point.x - points[index].x, point.y - points[index].y]);
    doc.lines(deltas, points[0].x, points[0].y, [1, 1], 'FD', true);
};

const dimensionText = (doc: jsPDF) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(DIM_FONT);
    doc.setTextColor(0);
};

/**
 * Horizontal linear dimension between two points, with the dimension line at
 * `lineY`. Extension lines run from each point to just past the line; arrows go
 * outside when the span is too short to hold them. The text is slid sideways
 * off any of the `keepClear` x positions (centre lines), which must not cross it.
 */
const horizontalDimension = (
    doc: jsPDF,
    from: Point,
    to: Point,
    lineY: number,
    text: string,
    keepClear: number[] = []
) => {
    solid(doc, THIN);
    for (const point of [from, to]) {
        const direction = Math.sign(lineY - point.y) || -1;
        doc.line(point.x, point.y, point.x, lineY + direction * OVERSHOOT);
    }

    const left = Math.min(from.x, to.x);
    const right = Math.max(from.x, to.x);
    doc.line(left, lineY, right, lineY);

    if (right - left >= 2 * ARROW_LENGTH + 2) {
        arrow(doc, { x: left, y: lineY }, -1, 0);
        arrow(doc, { x: right, y: lineY }, 1, 0);
    } else {
        doc.line(left - ARROW_LENGTH - 3, lineY, left, lineY);
        doc.line(right, lineY, right + ARROW_LENGTH + 3, lineY);
        arrow(doc, { x: left, y: lineY }, 1, 0);
        arrow(doc, { x: right, y: lineY }, -1, 0);
    }

    dimensionText(doc);
    const halfWidth = doc.getTextWidth(text) / 2 + 1;
    let textX = (left + right) / 2;
    for (const x of keepClear) {
        if (Math.abs(x - textX) < halfWidth) textX = x + halfWidth + 0.5;
    }
    doc.text(text, textX, lineY - 0.8, { align: 'center' });
};

/** Vertical counterpart of `horizontalDimension`; the text reads bottom-to-top, left of the line. */
const verticalDimension = (doc: jsPDF, from: Point, to: Point, lineX: number, text: string) => {
    solid(doc, THIN);
    for (const point of [from, to]) {
        const direction = Math.sign(lineX - point.x) || -1;
        doc.line(point.x, point.y, lineX + direction * OVERSHOOT, point.y);
    }

    const top = Math.min(from.y, to.y);
    const bottom = Math.max(from.y, to.y);
    doc.line(lineX, top, lineX, bottom);
    arrow(doc, { x: lineX, y: top }, 0, -1);
    arrow(doc, { x: lineX, y: bottom }, 0, 1);

    dimensionText(doc);
    doc.text(text, lineX - 0.8, (top + bottom) / 2, { align: 'center', angle: 90 });
};

/** Leader from `target` to `elbow`, then a shelf with the note on it, towards `side`. */
const leaderNote = (doc: jsPDF, target: Point, elbow: Point, text: string, side: 1 | -1) => {
    dimensionText(doc);
    const shelf = doc.getTextWidth(text) + 2;
    solid(doc, THIN);
    doc.line(elbow.x, elbow.y, target.x, target.y);
    doc.line(elbow.x, elbow.y, elbow.x + side * shelf, elbow.y);

    const length = Math.hypot(target.x - elbow.x, target.y - elbow.y);
    if (length > 1e-6) {
        arrow(doc, target, (target.x - elbow.x) / length, (target.y - elbow.y) / length);
    }

    doc.text(text, elbow.x + side * 1, elbow.y - 0.8, { align: side > 0 ? 'left' : 'right' });
};

// --- Layout -------------------------------------------------------------------

interface Extents {
    minX: number;
    maxX: number;
    /** Largest outer radius, the half-depth of the top view. */
    maxRadius: number;
}

const getExtents = (shell: RolledShell): Extents => {
    const rTop = shell.top.outerDiameter / 2;
    const rBottom = shell.bottom.outerDiameter / 2;
    return {
        minX: Math.min(-rBottom, shell.top.centerX - rTop),
        maxX: Math.max(rBottom, shell.top.centerX + rTop),
        maxRadius: Math.max(rTop, rBottom)
    };
};

const sectionLevels = (shell: RolledShell) => ({
    // Primary + reference diameter, and the eccentricity above them.
    top: 2 + (shell.eccentricity > 0 ? 1 : 0),
    // A cylinder's bottom ring repeats the top one.
    bottom: shell.mode === 'cylinder' ? 0 : 2
});

const sectionMargins = (shell: RolledShell) => {
    const levels = sectionLevels(shell);
    return {
        top: LABEL_HEIGHT + levels.top * DIM_STEP + 4,
        bottom: levels.bottom * DIM_STEP + 5
    };
};

export const computeDrawingScale = (shell: RolledShell) => {
    const { minX, maxX, maxRadius } = getExtents(shell);
    const span = maxX - minX;
    const viewHeight = VIEW_BOTTOM - VIEW_TOP;
    const margins = sectionMargins(shell);

    const fitSection = Math.min(
        (SECTION_BOX.w - SECTION_MARGIN.left - SECTION_MARGIN.right) / span,
        (viewHeight - margins.top - margins.bottom) / shell.height
    );
    const fitPlan = Math.min(
        (PLAN_BOX.w - 2 * PLAN_MARGIN.side) / span,
        (viewHeight - PLAN_MARGIN.top - PLAN_MARGIN.bottom) / (2 * maxRadius)
    );

    return pickDrawingScale(Math.min(fitSection, fitPlan));
};

const viewLabel = (doc: jsPDF, text: string, centerX: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(text, centerX, VIEW_TOP + 4, { align: 'center' });
};

// --- Section A-A ----------------------------------------------------------------

const drawSection = (doc: jsPDF, shell: RolledShell, scale: number) => {
    const { minX, maxX } = getExtents(shell);
    const margins = sectionMargins(shell);
    const levels = sectionLevels(shell);

    const usableX = SECTION_BOX.x + SECTION_MARGIN.left;
    const usableW = SECTION_BOX.w - SECTION_MARGIN.left - SECTION_MARGIN.right;
    const usableY = VIEW_TOP + margins.top;
    const usableH = VIEW_BOTTOM - VIEW_TOP - margins.top - margins.bottom;

    const left = usableX + (usableW - (maxX - minX) * scale) / 2;
    const top = usableY + (usableH - shell.height * scale) / 2;

    const halfHeight = shell.height / 2;
    const map = (x: number, y: number): Point => ({
        x: left + (x - minX) * scale,
        y: top + (halfHeight - y) * scale
    });

    viewLabel(doc, 'SECTION A-A', SECTION_BOX.x + SECTION_BOX.w / 2);

    const e = shell.eccentricity;
    const rTo = shell.top.outerDiameter / 2;
    const rTi = shell.top.innerDiameter / 2;
    const rBo = shell.bottom.outerDiameter / 2;
    const rBi = shell.bottom.innerDiameter / 2;
    const yT = halfHeight;
    const yB = -halfHeight;

    // Cut walls — thin sections are drawn solid.
    doc.setDrawColor(0);
    doc.setFillColor(0, 0, 0);
    solid(doc, THIN);
    fillPolygon(doc, [map(rBi, yB), map(rBo, yB), map(e + rTo, yT), map(e + rTi, yT)]);
    fillPolygon(doc, [map(-rBo, yB), map(-rBi, yB), map(e - rTi, yT), map(e - rTo, yT)]);

    // Rims of the back half, seen through the cut.
    solid(doc, CONTOUR);
    const topInnerLeft = map(e - rTi, yT);
    const topInnerRight = map(e + rTi, yT);
    const bottomInnerLeft = map(-rBi, yB);
    const bottomInnerRight = map(rBi, yB);
    doc.line(topInnerLeft.x, topInnerLeft.y, topInnerRight.x, topInnerRight.y);
    doc.line(bottomInnerLeft.x, bottomInnerLeft.y, bottomInnerRight.x, bottomInnerRight.y);

    const topLevel = (level: number) => map(0, yT).y - level * DIM_STEP;
    const bottomLevel = (level: number) => map(0, yB).y + level * DIM_STEP;

    // Axes: the bottom ring centre, and for an eccentric cone the top ring centre too.
    centerline(doc);
    const axisBottom = map(0, yB);
    const axisTopY = e > 0 ? topLevel(levels.top) - 2 : map(0, yT).y - 4;
    doc.line(axisBottom.x, axisBottom.y + 4 + levels.bottom * DIM_STEP, axisBottom.x, axisTopY);
    if (e > 0) {
        const topCenter = map(e, yT);
        doc.line(topCenter.x, topCenter.y + 6, topCenter.x, axisTopY);
    }

    // Diameters: the specified one, then the other one as a reference dimension.
    const axes = e > 0 ? [map(0, 0).x, map(e, 0).x] : [map(0, 0).x];
    const ringDimensions = (centerX: number, y: number, ring: RolledShell['top'], lineY: (level: number) => number) => {
        const primary = specDiameter(ring, shell.specType);
        const reference = referenceDiameter(ring, shell.specType);
        horizontalDimension(doc, map(centerX - primary / 2, y), map(centerX + primary / 2, y), lineY(1), diameter(primary), axes);
        horizontalDimension(doc, map(centerX - reference / 2, y), map(centerX + reference / 2, y), lineY(2), `(${diameter(reference)})`, axes);
    };

    ringDimensions(e, yT, shell.top, topLevel);
    if (levels.bottom > 0) {
        ringDimensions(0, yB, shell.bottom, bottomLevel);
    }

    if (e > 0) {
        const lineY = topLevel(3);
        horizontalDimension(doc, { x: map(0, yT).x, y: lineY }, { x: map(e, yT).x, y: lineY }, lineY, formatDimension(e));
    }

    // Height, outside the left wall.
    verticalDimension(doc, map(e - rTo, yT), map(-rBo, yB), map(minX, 0).x - 10, formatDimension(shell.height));

    // Wall thickness, as a note on the right wall.
    const wallPoint = map((rBo + e + rTo) / 2, 0);
    const elbow = { x: map(maxX, 0).x + 5, y: wallPoint.y - 7 };
    leaderNote(doc, wallPoint, elbow, `t = ${formatDimension(shell.thickness)}`, 1);
};

// --- Top view -------------------------------------------------------------------

const drawPlan = (doc: jsPDF, shell: RolledShell, scale: number) => {
    const { minX, maxX } = getExtents(shell);

    const usableX = PLAN_BOX.x + PLAN_MARGIN.side;
    const usableW = PLAN_BOX.w - 2 * PLAN_MARGIN.side;
    const usableY = VIEW_TOP + PLAN_MARGIN.top;
    const usableH = VIEW_BOTTOM - VIEW_TOP - PLAN_MARGIN.top - PLAN_MARGIN.bottom;

    const left = usableX + (usableW - (maxX - minX) * scale) / 2;
    const centerY = usableY + usableH / 2;
    const map = (x: number, p: number): Point => ({
        x: left + (x - minX) * scale,
        y: centerY - p * scale
    });

    viewLabel(doc, 'TOP VIEW', PLAN_BOX.x + PLAN_BOX.w / 2);

    const e = shell.eccentricity;
    const rTo = shell.top.outerDiameter / 2;
    const rTi = shell.top.innerDiameter / 2;
    const rBo = shell.bottom.outerDiameter / 2;
    const rBi = shell.bottom.innerDiameter / 2;
    const topCenter = map(e, 0);
    const bottomCenter = map(0, 0);
    const eps = 1e-6;

    doc.setDrawColor(0);
    solid(doc, CONTOUR);
    doc.circle(topCenter.x, topCenter.y, rTo * scale, 'S');
    doc.circle(topCenter.x, topCenter.y, rTi * scale, 'S');

    const ringsCoincide = e < eps && Math.abs(rTo - rBo) < eps;
    if (!ringsCoincide) {
        // A bottom circle is hidden when the wall above covers it.
        const bottomOuterHidden = e + rBo <= rTo + eps;
        const bottomInnerVisible = e + rBi <= rTi + eps;

        if (bottomOuterHidden) hidden(doc); else solid(doc, CONTOUR);
        doc.circle(bottomCenter.x, bottomCenter.y, rBo * scale, 'S');
        if (bottomInnerVisible) solid(doc, CONTOUR); else hidden(doc);
        doc.circle(bottomCenter.x, bottomCenter.y, rBi * scale, 'S');
    }

    // Centre lines.
    centerline(doc);
    const xStart = map(minX, 0).x - 3;
    const xEnd = map(maxX, 0).x + 3;
    doc.line(xStart, centerY, xEnd, centerY);
    doc.line(bottomCenter.x, centerY - rBo * scale - 3, bottomCenter.x, centerY + rBo * scale + 3);
    if (e > 0) {
        doc.line(topCenter.x, centerY - rTo * scale - 3, topCenter.x, centerY + rTo * scale + 3);
    }

    // Cutting plane A-A: thick strokes, arrows towards the back (viewing direction).
    for (const [outerX, innerX, side] of [
        [xStart - 7, xStart - 1, -1],
        [xEnd + 7, xEnd + 1, 1]
    ] as const) {
        solid(doc, SECTION_STROKE);
        doc.line(outerX, centerY, innerX, centerY);
        solid(doc, THIN);
        doc.line(outerX, centerY - 0.5, outerX, centerY - 6);
        doc.setFillColor(0, 0, 0);
        arrow(doc, { x: outerX, y: centerY - 7 }, 0, -1);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('A', outerX + side * 1.5, centerY - 4, { align: side > 0 ? 'left' : 'right' });
    }

    // Seam: a tick across the top ring wall and a note in the nearest corner.
    const seam = (shell.seamAngleDeg * Math.PI) / 180;
    const cos = Math.cos(seam);
    const sin = Math.sin(seam);
    const seamInner = map(e + rTi * cos, rTi * sin);
    const seamOuter = map(e + rTo * cos, rTo * sin);
    solid(doc, CONTOUR);
    doc.line(seamInner.x - cos * 1.5, seamInner.y + sin * 1.5, seamOuter.x + cos * 1.5, seamOuter.y - sin * 1.5);

    const side: 1 | -1 = cos >= -eps ? 1 : -1;
    const note = `Seam, gap ${formatSeamGap(shell)}`;
    dimensionText(doc);
    const noteWidth = doc.getTextWidth(note) + 2;
    const elbow = {
        x: side > 0 ? PLAN_BOX.x + PLAN_BOX.w - 2 - noteWidth : PLAN_BOX.x + 2 + noteWidth,
        y: sin >= -eps ? VIEW_TOP + LABEL_HEIGHT + 6 : VIEW_BOTTOM - 3
    };
    const target = { x: seamOuter.x + cos * 1.5, y: seamOuter.y - sin * 1.5 };
    leaderNote(doc, target, elbow, note, side);
};

// --- Data table & title block ---------------------------------------------------

const dataRows = (shell: RolledShell): Array<[string, string]> => {
    const both = (top: number, bottom: number, format: (value: number) => string) =>
        shell.mode === 'cylinder' ? format(top) : `${format(top)} / ${format(bottom)}`;
    const suffix = shell.mode === 'cylinder' ? '' : ' top / bottom';

    const rows: Array<[string, string]> = [
        ['Diameter spec', shell.specType === 'OD' ? 'Outside (OD)' : 'Inside (ID)'],
        [`Outside diameter${suffix}`, both(shell.top.outerDiameter, shell.bottom.outerDiameter, diameter)],
        [`Inside diameter${suffix}`, both(shell.top.innerDiameter, shell.bottom.innerDiameter, diameter)],
        [`Mean (neutral) diameter${suffix}`, both(shell.top.neutralDiameter, shell.bottom.neutralDiameter, diameter)],
        ['Height H', formatDimension(shell.height)],
        ['Wall thickness t', formatDimension(shell.thickness)]
    ];

    if (shell.mode === 'cylinder') {
        rows.push(['Outside circumference', formatDimension(Math.PI * shell.top.outerDiameter)]);
    } else if (shell.mode === 'cone') {
        rows.push(['Slant height (mean)', formatDimension(shell.slantMax)]);
        rows.push(['Wall angle to axis', `${shell.halfAngleMaxDeg.toFixed(2)}°`]);
    } else {
        rows.push(['Eccentricity e', formatDimension(shell.eccentricity)]);
        rows.push(['Generatrix min / max', `${formatDimension(shell.slantMin)} / ${formatDimension(shell.slantMax)}`]);
        rows.push(['Wall angle min / max', `${shell.halfAngleMinDeg.toFixed(2)}° / ${shell.halfAngleMaxDeg.toFixed(2)}°`]);
        rows.push(['Seam position (plan)', `${(((shell.seamAngleDeg % 360) + 360) % 360).toFixed(1)}°`]);
    }

    rows.push([
        shell.mode === 'cylinder' ? 'Seam gap' : 'Seam gap top / bottom',
        formatSeamGap(shell)
    ]);
    rows.push(['Blank area (mid-surface)', `${(shell.surfaceArea / 1e6).toFixed(3)} m²`]);
    rows.push([`Mass (density ${shell.density} kg/m³)`, `${shell.mass.toFixed(1)} kg`]);
    return rows;
};

const drawDataTable = (doc: jsPDF, shell: RolledShell) => {
    const rows = dataRows(shell);
    const rowHeight = 5;
    const headerY = BAND_TOP + 2;
    const firstRowTop = headerY + 2;
    const perColumn = Math.ceil(rows.length / 2);
    const columnWidth = TABLE_BOX.w / 2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text('Rolled part data, mm', TABLE_BOX.x, headerY);

    rows.forEach(([label, value], index) => {
        const column = Math.floor(index / perColumn);
        const row = index % perColumn;
        const x = TABLE_BOX.x + column * columnWidth;
        const y = firstRowTop + row * rowHeight;

        doc.setDrawColor(200);
        solid(doc, THIN);
        doc.line(x, y + rowHeight, x + columnWidth - 4, y + rowHeight);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(70);
        doc.text(label, x + 1, y + 3.6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text(value, x + columnWidth - 5, y + 3.6, { align: 'right' });
    });
    doc.setDrawColor(0);
};

const drawTitleBlock = (doc: jsPDF, shell: RolledShell, scaleLabel: string, sheet: number) => {
    const x = TITLE_BOX.x;
    const w = TITLE_BOX.w;
    const y = BAND_TOP;
    const nameHeight = 14;
    const cellHeight = 9;
    const cellWidth = w / 3;

    doc.setDrawColor(0);
    solid(doc, CONTOUR);
    doc.rect(x, y, w, BAND_BOTTOM - y);
    doc.line(x, y + nameHeight, x + w, y + nameHeight);
    doc.line(x, y + nameHeight + cellHeight, x + w, y + nameHeight + cellHeight);
    doc.line(x, y + nameHeight + 2 * cellHeight, x + w, y + nameHeight + 2 * cellHeight);
    for (let column = 1; column < 3; column += 1) {
        doc.line(x + column * cellWidth, y + nameHeight, x + column * cellWidth, y + nameHeight + 2 * cellHeight);
    }

    const size = shell.mode === 'cylinder'
        ? `${diameter(specDiameter(shell.top, shell.specType))} x ${formatDimension(shell.height)}`
        : `${diameter(specDiameter(shell.top, shell.specType))} / ${diameter(specDiameter(shell.bottom, shell.specType))} x ${formatDimension(shell.height)}`;

    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(MODE_TITLES[shell.mode], x + 3, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`${size}, t = ${formatDimension(shell.thickness)}`, x + 3, y + 11.5);

    const cell = (column: number, row: number, label: string, value: string) => {
        const cx = x + column * cellWidth;
        const cy = y + nameHeight + row * cellHeight;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(110);
        doc.text(label, cx + 1.5, cy + 2.8);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(0);
        doc.text(value, cx + cellWidth / 2, cy + 7, { align: 'center' });
    };

    cell(0, 0, 'Scale', scaleLabel);
    cell(1, 0, 'Mass, kg', shell.mass.toFixed(1));
    cell(2, 0, 'Sheet', String(sheet));
    cell(0, 1, 'Diameters', shell.specType === 'OD' ? 'Outside (OD)' : 'Inside (ID)');
    cell(1, 1, 'State', 'After rolling');
    cell(2, 1, 'Date', new Date().toLocaleDateString());

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(110);
    doc.text('Shell Rolling Master - rolled part drawing', x + 3, BAND_BOTTOM - 3);
    doc.setTextColor(0);
};

/**
 * Draws the rolled-part sheet on the current page. The caller adds the page,
 * so the sheet can sit anywhere in a report.
 */
export const drawRolledPartSheet = (doc: jsPDF, params: ShellParameters, result: CalculationResult) => {
    const sheet = doc.getNumberOfPages();
    drawFrame(doc, 'Rolled part - dimensions after rolling', `Date: ${new Date().toLocaleDateString()} - sheet ${sheet}`);
    drawFooter(doc);

    const shell = computeRolledShell(params, result);
    if (!shell) {
        doc.setFontSize(11);
        doc.text(result.error ?? 'The current shell configuration is invalid.', MARGIN + 5, MARGIN + 30);
        return;
    }

    const { factor, label } = computeDrawingScale(shell);

    drawSection(doc, shell, factor);
    drawPlan(doc, shell, factor);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text(
        `All dimensions in mm, after rolling. Dimensions in ( ) are for reference. Scale ${label}.`,
        MARGIN + 4,
        BAND_TOP - 2.5
    );
    doc.setTextColor(0);

    drawDataTable(doc, shell);
    drawTitleBlock(doc, shell, label, sheet);

    // Leave the shared drawing state as the other sheets expect it.
    doc.setLineDashPattern([], 0);
    doc.setDrawColor(0);
    doc.setFillColor(255, 255, 255);
};
