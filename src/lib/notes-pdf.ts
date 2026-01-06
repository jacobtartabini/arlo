// PDF generation utilities for Notes
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface ExportOptions {
  title: string;
  format?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
}

/**
 * Generate a PDF from a DOM element (content only, no UI)
 */
export async function generatePdfFromElement(
  element: HTMLElement,
  options: ExportOptions
): Promise<Blob> {
  const { title, format = 'a4', orientation = 'portrait' } = options;

  // Create canvas from element
  const canvas = await html2canvas(element, {
    scale: 2, // Higher resolution
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    // Remove any elements with print:hidden class
    ignoreElements: (el) => {
      return el.classList?.contains('print-hidden') || 
             el.classList?.contains('print:hidden') ||
             el.getAttribute('data-print-hidden') === 'true';
    },
  });

  // Calculate dimensions
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10; // 10mm margins

  const contentWidth = pageWidth - (margin * 2);
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const ratio = contentWidth / imgWidth;
  const scaledHeight = imgHeight * ratio;

  // Handle multi-page if content is longer than one page
  const maxContentHeight = pageHeight - (margin * 2);
  let remainingHeight = scaledHeight;
  let yOffset = 0;
  let currentPage = 0;

  while (remainingHeight > 0) {
    if (currentPage > 0) {
      pdf.addPage();
    }

    // Calculate source and destination rectangles
    const sourceY = (yOffset / ratio);
    const sourceHeight = Math.min((maxContentHeight / ratio), imgHeight - sourceY);
    const destHeight = Math.min(maxContentHeight, remainingHeight);

    // Add image slice
    pdf.addImage(
      imgData,
      'PNG',
      margin,
      margin,
      contentWidth,
      scaledHeight,
      undefined,
      'FAST',
      0
    );

    // For multi-page, we need to crop - simplified approach for now
    // In practice, we'd slice the canvas properly
    
    remainingHeight -= maxContentHeight;
    yOffset += maxContentHeight;
    currentPage++;

    // Safety limit
    if (currentPage > 50) break;
  }

  // Set document properties
  pdf.setProperties({
    title,
    subject: 'Arlo Note',
    creator: 'Arlo Notes',
  });

  return pdf.output('blob');
}

/**
 * Generate a PDF from Fabric.js canvas
 */
export async function generatePdfFromCanvas(
  fabricCanvas: any,
  options: ExportOptions
): Promise<Blob> {
  const { title, format = 'a4', orientation = 'portrait' } = options;

  // Export Fabric canvas to data URL
  const dataUrl = fabricCanvas.toDataURL({
    format: 'png',
    quality: 1,
    multiplier: 2,
  });

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - (margin * 2);
  const contentHeight = pageHeight - (margin * 2);

  // Add image to PDF
  pdf.addImage(dataUrl, 'PNG', margin, margin, contentWidth, contentHeight, undefined, 'FAST');

  pdf.setProperties({
    title,
    subject: 'Arlo Note',
    creator: 'Arlo Notes',
  });

  return pdf.output('blob');
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Share a PDF using the native share API
 */
export async function sharePdf(blob: Blob, title: string): Promise<boolean> {
  const filename = `${title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
  const file = new File([blob], filename, { type: 'application/pdf' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title,
      });
      return true;
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return false; // User cancelled
      }
      throw err;
    }
  }

  // Fallback: download the file
  downloadBlob(blob, filename);
  return true;
}
