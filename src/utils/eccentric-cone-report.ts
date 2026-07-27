import { jsPDF } from 'jspdf';
import type { CalculationResult, Point2D, ShellParameters } from '../features/calculator/types';

const PAGE_WIDTH = 297;
const PAGE_HEIGHT = 210;
const MARGIN = 10;

const drawFrame = (doc: jsPDF, title: string, subtitle: string) => {
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');

    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(MARGIN, MARGIN, PAGE_WIDTH - 2 * MARGIN, PAGE_HEIGHT - 2 * MARGIN);

    doc.setTextColor(0);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text(title, MARGIN + 5, MARGIN + 11);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90);
    doc.text(subtitle, PAGE_WIDTH - MARGIN - 5, MARGIN + 11, { align: 'right' });
    doc.setTextColor(0);
};

const drawFooter = (doc: jsPDF) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 64, 175);
    doc.textWithLink('cadautoscript.com', PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 10, {
        url: 'https://cadautoscript.com',
        align: 'right'
    });
    doc.setTextColor(0);
};

/** Draws the development inside the given box, keeping the aspect ratio (fit, not 1:1). */
const drawDevelopment = (
    doc: jsPDF,
    result: CalculationResult,
    box: { x: number; y: number; w: number; h: number }
) => {
    const development = result.eccentric;
    if (!development) return;

    doc.setDrawColor(200);
    doc.setLineWidth(0.3);
    doc.rect(box.x, box.y, box.w, box.h);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100);
    doc.text('Flat pattern (not to scale)', box.x + 3, box.y + 5);
    doc.setTextColor(0);

    const width = result.flatLength;
    const height = result.flatWidth;
    const minX = result.bboxMinX ?? 0;
    const minY = result.bboxMinY ?? 0;

    if (!(width > 0) || !(height > 0)) return;

    const scale = Math.min((box.w - 16) / width, (box.h - 22) / height);
    const originX = box.x + box.w / 2 - (width * scale) / 2;
    const originY = box.y + 8 + (box.h - 16 - height * scale) / 2;

    // PDF y grows downwards, the development is y-up: mirror on Y.
    const map = (point: Point2D) => ({
        x: originX + (point.x - minX) * scale,
        y: originY + (height - (point.y - minY)) * scale
    });

    const polyline = (points: Point2D[]) => {
        for (let i = 1; i < points.length; i += 1) {
            const from = map(points[i - 1]);
            const to = map(points[i]);
            doc.line(from.x, from.y, to.x, to.y);
        }
    };

    // Blank outline
    doc.setDrawColor(170);
    doc.setLineWidth(0.2);
    doc.rect(originX, originY, width * scale, height * scale);

    // Rulings
    if (result.bendLines?.length) {
        doc.setDrawColor(220, 120, 120);
        doc.setLineWidth(0.15);
        for (const line of result.bendLines) {
            const from = map({ x: line.x1, y: line.y1 });
            const to = map({ x: line.x2, y: line.y2 });
            doc.line(from.x, from.y, to.x, to.y);
        }
    }

    // Contour
    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    polyline(development.bottomEdge);
    polyline(development.topEdge);
    polyline([development.bottomEdge[0], development.topEdge[0]]);
    polyline([
        development.bottomEdge[development.bottomEdge.length - 1],
        development.topEdge[development.topEdge.length - 1]
    ]);

    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text(`${width.toFixed(1)} x ${height.toFixed(1)} mm`, box.x + box.w / 2, box.y + box.h - 3, { align: 'center' });
    doc.setTextColor(0);
};

const STATION_COLUMNS: Array<{ header: string; width: number }> = [
    { header: '#', width: 12 },
    { header: 'phi, deg', width: 26 },
    { header: 'Ruling, mm', width: 32 },
    { header: 'Sum bottom', width: 32 },
    { header: 'Chord bot.', width: 30 },
    { header: 'Sum top', width: 32 },
    { header: 'Chord top', width: 30 },
    { header: 'X, mm', width: 32 },
    { header: 'Y, mm', width: 32 }
];

const drawStationTable = (doc: jsPDF, params: ShellParameters, result: CalculationResult) => {
    const development = result.eccentric;
    if (!development) return;

    const rowHeight = 5.6;
    const tableTop = MARGIN + 22;
    const maxRows = Math.floor((PAGE_HEIGHT - MARGIN - 18 - tableTop) / rowHeight);
    const startX = MARGIN + 6;

    let row = 0;
    let page = 0;

    const drawHeader = () => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        let x = startX;
        for (const column of STATION_COLUMNS) {
            doc.text(column.header, x, tableTop - 2);
            x += column.width;
        }
        doc.setLineWidth(0.3);
        doc.setDrawColor(120);
        doc.line(startX, tableTop, x, tableTop);
        doc.setFont('helvetica', 'normal');
    };

    for (const station of development.stations) {
        if (row % maxRows === 0) {
            page += 1;
            doc.addPage();
            drawFrame(
                doc,
                'Eccentric cone - layout stations',
                `${params.d1} / ${params.d2} x ${params.h}, e = ${params.eccentricity} mm - sheet ${page}`
            );
            drawFooter(doc);
            drawHeader();
        }

        const y = tableTop + (row % maxRows) * rowHeight + 4;
        const isLast = station.index === development.stations.length - 1;
        const values = [
            String(station.index),
            station.phiDeg.toFixed(2),
            station.rulingLength.toFixed(2),
            station.cumulativeBottom.toFixed(2),
            isLast ? '-' : station.chordBottom.toFixed(2),
            station.cumulativeTop.toFixed(2),
            isLast ? '-' : station.chordTop.toFixed(2),
            station.bottom.x.toFixed(2),
            station.bottom.y.toFixed(2)
        ];

        doc.setFontSize(8);
        let x = startX;
        values.forEach((value, index) => {
            doc.text(value, x, y);
            x += STATION_COLUMNS[index].width;
        });

        row += 1;
    }
};

export const generateEccentricConeReport = (params: ShellParameters, result: CalculationResult) => {
    const development = result.eccentric;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    drawFrame(
        doc,
        'Shell Rolling Master - Eccentric Cone',
        `Date: ${new Date().toLocaleDateString()}`
    );

    const col1 = MARGIN + 8;
    const col2 = MARGIN + 62;
    let y = MARGIN + 24;

    const heading = (text: string) => {
        y += 3;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(text, col1, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        y += 6;
    };

    const row = (label: string, value: string) => {
        doc.setFontSize(9);
        doc.text(label, col1, y);
        doc.text(value, col2, y);
        y += 5;
    };

    heading('Input');
    row('Diameter spec:', params.specType === 'OD' ? 'Outside (OD)' : 'Inside (ID)');
    row('D1 (top):', `${params.d1} mm`);
    row('D2 (bottom):', `${params.d2} mm`);
    row('Height H:', `${params.h} mm`);
    row('Eccentricity e:', `${params.eccentricity} mm`);
    row('Thickness t:', `${params.thickness} mm`);
    row('K-factor:', params.kFactor.toString());
    row('Weld gap:', `${params.gap} mm`);
    row('Seam:', `${params.seamPosition} (${development?.seamPhiDeg.toFixed(1) ?? '-'}°)`);
    row('Stations:', String(params.stationCount));

    heading('Development');
    if (development) {
        row('Neutral D1 / D2:', `${result.d1_neutral.toFixed(2)} / ${result.d2_neutral.toFixed(2)} mm`);
        row('Bottom edge length:', `${development.totalBottomArc.toFixed(2)} mm`);
        row('Top edge length:', `${development.totalTopArc.toFixed(2)} mm`);
        row('Ruling min / max:', `${development.minRuling.length.toFixed(2)} / ${development.maxRuling.length.toFixed(2)} mm`);
        row('Inclination min / max:', `${development.halfAngleMinDeg.toFixed(2)}° / ${development.halfAngleMaxDeg.toFixed(2)}°`);
        row('Actual gap bottom/top:', `${development.gapBottom.toFixed(2)} / ${development.gapTop.toFixed(2)} mm`);
        row('Surface area:', `${(development.surfaceArea / 1e6).toFixed(4)} m²`);
        row('Blank mass:', `${((development.surfaceArea * params.thickness * params.density) / 1e9).toFixed(2)} kg (${params.density} kg/m³)`);
        row('Blank size:', `${result.flatLength.toFixed(1)} x ${result.flatWidth.toFixed(1)} mm`);
        row('Solver residual:', `${development.integrationError.toExponential(2)} mm`);
    }

    drawDevelopment(doc, result, { x: 150, y: MARGIN + 16, w: 137, h: 150 });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100);
    doc.text(
        'Edge lengths are exact developed arcs; rulings are true generatrices. Cut from the DXF (1:1).',
        col1,
        PAGE_HEIGHT - MARGIN - 12
    );

    if (development?.warnings.length) {
        doc.setTextColor(170, 90, 0);
        development.warnings.forEach((warning, index) => {
            doc.text(warning, col1, PAGE_HEIGHT - MARGIN - 8 + index * 4);
        });
    }
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    drawFooter(doc);

    drawStationTable(doc, params, result);

    doc.save(`eccentric-cone_D${Math.round(params.d1)}-${Math.round(params.d2)}_H${Math.round(params.h)}_e${Math.round(params.eccentricity)}.pdf`);
};
