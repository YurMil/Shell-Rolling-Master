
import { jsPDF } from 'jspdf';
import type { ShellParameters, CalculationResult } from '../features/calculator/types';
import { getConePatternAngles, getConePatternPoints } from './cone-pattern';
import { generateEccentricConeReport } from './eccentric-cone-report';

const drawPolyline = (doc: jsPDF, points: Array<{ x: number; y: number }>) => {
    for (let i = 1; i < points.length; i += 1) {
        const prev = points[i - 1];
        const next = points[i];
        doc.line(prev.x, prev.y, next.x, next.y);
    }
};

const sampleArcPoints = (r: number, startAngle: number, endAngle: number, segments: number) => {
    const points: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= segments; i += 1) {
        const t = i / segments;
        const angle = startAngle + (endAngle - startAngle) * t;
        points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
    }
    return points;
};

export const generatePDF = (params: ShellParameters, result: CalculationResult) => {
    if (params.mode === 'eccentric-cone') {
        generateEccentricConeReport(params, result);
        return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = 297;
    const pageHeight = 210;
    const margin = 10;

    // Background
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Border
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin);

    // Title Block
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("Shell Rolling Master - Fabrication Report", margin + 5, margin + 12);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const dateStr = new Date().toLocaleDateString();
    doc.text(`Date: ${dateStr}`, pageWidth - margin - 50, margin + 12);

    // Parameters Table
    const startY = 30;
    const col1 = margin + 10;
    const col2 = margin + 60;
    const lineHeight = 7;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("Parameters", col1, startY);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    let y = startY + 10;
    const addRow = (label: string, value: string) => {
        doc.text(label, col1, y);
        doc.text(value, col2, y);
        y += lineHeight;
    };

    addRow("Shape:", params.mode.toUpperCase());
    addRow("Diameter Type:", params.specType);
    if (params.mode === 'cylinder') {
        addRow("Diameter:", `${params.d1} mm`);
    } else {
        addRow("Top Diameter:", `${params.d1} mm`);
        addRow("Bottom Diameter:", `${params.d2} mm`);
    }
    addRow("Height/Width:", `${params.h} mm`);
    addRow("Thickness:", `${params.thickness} mm`);
    addRow("Material K-Factor:", params.kFactor.toString());
    addRow("Weld Gap:", `${params.gap} mm`);

    // Bill of Materials / Cutting Spec
    y += 5;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("Bill of Materials / Cutting Spec", col1, y);
    y += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    addRow("Sheet Width:", `${result.flatLength.toFixed(2)} mm`);
    addRow("Sheet Height:", `${result.flatWidth.toFixed(2)} mm`);
    addRow("Thickness:", `${params.thickness} mm`);
    if (result.bendStep !== undefined) {
        addRow("Bend Line Step:", `${result.bendStep.toFixed(2)} mm`);
    }

    // Results Table
    y += 5;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("Calculated Pattern", col1, y);
    y += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    if (params.mode === 'cylinder') {
        addRow("Neutral Diameter:", `${result.d1_neutral.toFixed(2)} mm`);
        addRow("Flat Length:", `${result.flatLength.toFixed(2)} mm`);
        addRow("Flat Width:", `${result.flatWidth.toFixed(2)} mm`);
    } else {
        addRow("Top Neutral Diameter:", `${result.d1_neutral.toFixed(2)} mm`);
        addRow("Bottom Neutral Diameter:", `${result.d2_neutral.toFixed(2)} mm`);
        addRow("Development Angle:", `${result.angle?.toFixed(2)} degrees`);
        addRow("Outer Radius (R):", `${result.rOut?.toFixed(2)} mm`);
        addRow("Inner Radius (r):", `${result.rIn?.toFixed(2)} mm`);
    }

    // Visual Area (Right side) - Pattern representation
    const canvasX = 130;
    const canvasY = 30;
    const canvasW = 157;
    const canvasH = 150;

    doc.setDrawColor(200);
    doc.setLineWidth(0.5);
    doc.rect(canvasX, canvasY, canvasW, canvasH);

    doc.setTextColor(100);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("Pattern Visualization", canvasX + 5, canvasY + 5);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');

    const cx = canvasX + canvasW / 2;
    const cy = canvasY + canvasH / 2;

    doc.setLineWidth(0.3);
    doc.setDrawColor(0);

    if (params.mode === 'cylinder') {
        const s = Math.min((canvasW - 20) / result.flatLength, (canvasH - 20) / result.flatWidth);

        const w = result.flatLength * s;
        const h = result.flatWidth * s;

        doc.rect(cx - w / 2, cy - h / 2, w, h);

        if (result.bendLines && result.bendLines.length > 0) {
            doc.setDrawColor(255, 0, 0);
            doc.setLineDashPattern([3, 3], 0);
            for (const line of result.bendLines) {
                doc.line(cx + line.x1 * s, cy + line.y1 * s, cx + line.x2 * s, cy + line.y2 * s);
            }
            doc.setLineDashPattern([], 0);
            doc.setDrawColor(0);
        }

        doc.setFontSize(8);
        doc.text(`L = ${result.flatLength.toFixed(0)}`, cx, cy - h / 2 - 3, { align: 'center' });
        doc.text(`W = ${result.flatWidth.toFixed(0)}`, cx - w / 2 - 3, cy, { align: 'right' });
    } else {
        if (result.rOut && result.rIn && result.angle) {
            const { startAngleRad, endAngleRad } = getConePatternAngles(result.angle, result.patternRotationDeg);
            const { outerStart, outerEnd, innerStart, innerEnd } = getConePatternPoints(result.rOut, result.rIn, result.angle, result.patternRotationDeg);

            const width = result.flatLength || result.bboxWidth || result.rOut * 2;
            const height = result.flatWidth || result.bboxHeight || result.rOut * 2;
            const minX = result.bboxMinX ?? -width / 2;
            const minY = result.bboxMinY ?? -height / 2;

            const scale = Math.min((canvasW - 20) / width, (canvasH - 20) / height);
            const centerX = minX + width / 2;
            const centerY = minY + height / 2;

            const mapPoint = (pt: { x: number; y: number }) => ({
                x: cx + (pt.x - centerX) * scale,
                y: cy + (pt.y - centerY) * scale
            });

            doc.setDrawColor(0);
            doc.setLineWidth(0.4);

            const arcSegments = Math.max(18, Math.ceil(Math.abs(endAngleRad - startAngleRad) / (Math.PI / 18)));
            const outerArc = sampleArcPoints(result.rOut, startAngleRad, endAngleRad, arcSegments).map(mapPoint);
            const innerArc = sampleArcPoints(result.rIn, endAngleRad, startAngleRad, arcSegments).map(mapPoint);

            drawPolyline(doc, outerArc);
            drawPolyline(doc, [mapPoint(outerEnd), mapPoint(innerEnd)]);
            drawPolyline(doc, innerArc);
            drawPolyline(doc, [mapPoint(innerStart), mapPoint(outerStart)]);

            if (result.bendLines && result.bendLines.length > 0) {
                doc.setDrawColor(255, 0, 0);
                doc.setLineDashPattern([3, 3], 0);
                for (const line of result.bendLines) {
                    const p1 = mapPoint({ x: line.x1, y: line.y1 });
                    const p2 = mapPoint({ x: line.x2, y: line.y2 });
                    doc.line(p1.x, p1.y, p2.x, p2.y);
                }
                doc.setLineDashPattern([], 0);
                doc.setDrawColor(0);
            }

            const topLeft = mapPoint({ x: minX, y: minY });
            const bottomRight = mapPoint({ x: minX + width, y: minY + height });
            const sheetX = topLeft.x;
            const sheetY = topLeft.y;
            const sheetW = bottomRight.x - topLeft.x;
            const sheetH = bottomRight.y - topLeft.y;

            doc.setDrawColor(120);
            doc.setLineWidth(0.3);
            doc.rect(sheetX, sheetY, sheetW, sheetH);

            const dimOffset = 6;
            doc.setDrawColor(200);
            doc.setLineWidth(0.3);

            doc.line(sheetX, sheetY - dimOffset, sheetX + sheetW, sheetY - dimOffset);
            doc.line(sheetX, sheetY - dimOffset + 2, sheetX, sheetY - dimOffset - 2);
            doc.line(sheetX + sheetW, sheetY - dimOffset + 2, sheetX + sheetW, sheetY - dimOffset - 2);

            doc.line(sheetX + sheetW + dimOffset, sheetY, sheetX + sheetW + dimOffset, sheetY + sheetH);
            doc.line(sheetX + sheetW + dimOffset - 2, sheetY, sheetX + sheetW + dimOffset + 2, sheetY);
            doc.line(sheetX + sheetW + dimOffset - 2, sheetY + sheetH, sheetX + sheetW + dimOffset + 2, sheetY + sheetH);

            doc.setFontSize(7);
            doc.setTextColor(120);
            doc.text(`W = ${width.toFixed(0)} mm`, sheetX + sheetW / 2, sheetY - dimOffset - 2, { align: 'center' });
            doc.text(`H = ${height.toFixed(0)} mm`, sheetX + sheetW + dimOffset + 3, sheetY + sheetH / 2, { align: 'center', angle: 90 });
        }
    }

    // Footer
    y = pageHeight - margin - 10;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100);
    doc.text("For precise fabrication, refer to DXF file or 2D SVG pattern view", margin + 5, y);

    // Footer Branding (clickable link)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 64, 175);
    doc.textWithLink("cadautoscript.com", pageWidth - margin, pageHeight - 10, {
        url: "https://cadautoscript.com",
        align: "right"
    });
    doc.setTextColor(0, 0, 0);

    doc.save(`shell-pattern-${params.mode}.pdf`);
};
