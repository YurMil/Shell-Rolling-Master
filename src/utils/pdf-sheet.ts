import type { jsPDF } from 'jspdf';

// Landscape A4, millimetres — the page every report sheet is laid out on.
export const PAGE_WIDTH = 297;
export const PAGE_HEIGHT = 210;
export const MARGIN = 10;

/** White page, drawing border and the sheet title line. */
export const drawFrame = (doc: jsPDF, title: string, subtitle: string) => {
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');

    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.setLineDashPattern([], 0);
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

/** Clickable site link in the bottom-right corner. */
export const drawFooter = (doc: jsPDF) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 64, 175);
    doc.textWithLink('cadautoscript.com', PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 10, {
        url: 'https://cadautoscript.com',
        align: 'right'
    });
    doc.setTextColor(0);
};
