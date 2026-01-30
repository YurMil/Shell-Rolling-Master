
import { jsPDF } from 'jspdf';
import type { ShellParameters, CalculationResult } from '../features/calculator/types';

export const generatePDF = (params: ShellParameters, result: CalculationResult) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = 297;
    // const pageHeight = 210;
    const margin = 10;

    // Background
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, 210, 'F');

    // Border
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(margin, margin, pageWidth - 2 * margin, 210 - 2 * margin);

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

    // Results Table
    y += 5;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("Calculated Pattern", col1, y);
    y += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    if (params.mode === 'cylinder') {
        addRow("Flat Length:", `${result.flatLength.toFixed(2)} mm`);
        addRow("Flat Width:", `${result.flatWidth.toFixed(2)} mm`);
    } else {
        addRow("Development Angle:", `${result.angle?.toFixed(2)} degrees`);
        addRow("Outer Radius (R):", `${result.rOut?.toFixed(2)} mm`);
        addRow("Inner Radius (r):", `${result.rIn?.toFixed(2)} mm`);
    }

    // Visual Area (Right side)
    // We can't easily perform exact geometric drawing without a canvas or complex paths.
    // For now, we will draw a simplified representation using lines/arcs or just a placeholder box
    // showing the dimensions.

    const canvasX = 120;
    const canvasY = 30;
    const canvasW = 160;
    const canvasH = 150;

    doc.setDrawColor(200);
    doc.rect(canvasX, canvasY, canvasW, canvasH);

    doc.setTextColor(100);
    doc.text("Pattern Visualization", canvasX + 5, canvasY + 5);
    doc.setTextColor(0);

    // Draw scaled shape
    const cx = canvasX + canvasW / 2;
    const cy = canvasY + canvasH / 2;

    doc.setLineWidth(0.5);
    doc.setDrawColor(0);

    if (params.mode === 'cylinder') {
        // Draw Rectangle
        // Scale to fit
        const scale = Math.min((canvasW - 40) / result.flatLength, (canvasH - 40) / result.flatLength); // Wait, width vs length?
        // Use max dimension
        const maxDim = Math.max(result.flatLength, result.flatWidth);
        const s = Math.min((canvasW - 40) / maxDim, (canvasH - 40) / maxDim);

        const w = result.flatLength * s;
        const h = result.flatWidth * s;

        doc.rect(cx - w / 2, cy - h / 2, w, h);

        // Dimensions
        doc.setFontSize(8);
        doc.text(`L = ${result.flatLength.toFixed(1)}`, cx, cy - h / 2 - 2, { align: 'center' });
        doc.text(`W = ${result.flatWidth.toFixed(1)}`, cx - w / 2 - 2, cy, { align: 'right', angle: 90 }); // Rotate? jsPDF angle support varies.
        // Basic text
    } else {
        // Cone Sector
        // Drawing logic for arc is complex in raw PDF. 
        // Simplified: Draw approximate lines/arcs or just text description.
        // jsPDF has 'arc' or 'path' support? standard jsPDF: lines, rect, circle, triangle.
        // Advanced geometry needs 'path' or 'lines'.

        // Let's just draw the Bounding Box or some key lines.
        // Or just state "See DXF for exact geometry".
        doc.text("(Cone pattern visualization requires DXF)", cx, cy, { align: 'center' });
    }

    doc.save(`shell-pattern-${params.mode}.pdf`);
};
