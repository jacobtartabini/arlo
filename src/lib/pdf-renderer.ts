// PDF rendering utilities using pdfjs-dist
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker - use CDN for the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

export interface PdfInfo {
  totalPages: number;
  title?: string;
}

export interface PdfPageDimensions {
  width: number;
  height: number;
}

// Cache for loaded PDF documents
const pdfDocCache = new Map<string, pdfjsLib.PDFDocumentProxy>();

/**
 * Load a PDF document and cache it
 */
async function loadPdfDocument(pdfUrl: string): Promise<pdfjsLib.PDFDocumentProxy> {
  if (pdfDocCache.has(pdfUrl)) {
    return pdfDocCache.get(pdfUrl)!;
  }

  const loadingTask = pdfjsLib.getDocument({
    url: pdfUrl,
    cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/cmaps/',
    cMapPacked: true,
  });

  const pdfDoc = await loadingTask.promise;
  pdfDocCache.set(pdfUrl, pdfDoc);
  return pdfDoc;
}

/**
 * Get information about a PDF file
 */
export async function getPdfInfo(pdfUrl: string): Promise<PdfInfo> {
  try {
    const pdfDoc = await loadPdfDocument(pdfUrl);
    const metadata = await pdfDoc.getMetadata().catch(() => null);
    
    return {
      totalPages: pdfDoc.numPages,
      title: (metadata?.info as any)?.Title || undefined,
    };
  } catch (error) {
    console.error('Failed to get PDF info:', error);
    throw new Error('Failed to load PDF');
  }
}

/**
 * Get dimensions of a specific PDF page
 */
export async function getPdfPageDimensions(
  pdfUrl: string, 
  pageNum: number
): Promise<PdfPageDimensions> {
  const pdfDoc = await loadPdfDocument(pdfUrl);
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1 });
  
  return {
    width: viewport.width,
    height: viewport.height,
  };
}

/**
 * Render a PDF page to a data URL (image)
 * @param pdfUrl - URL of the PDF file
 * @param pageNum - Page number (1-indexed)
 * @param scale - Scale factor (default 2 for good quality on retina displays)
 * @returns Data URL of the rendered page as PNG
 */
export async function renderPdfPageToDataUrl(
  pdfUrl: string,
  pageNum: number,
  scale: number = 2
): Promise<string> {
  try {
    const pdfDoc = await loadPdfDocument(pdfUrl);
    
    if (pageNum < 1 || pageNum > pdfDoc.numPages) {
      throw new Error(`Invalid page number: ${pageNum}. PDF has ${pdfDoc.numPages} pages.`);
    }

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    // Create an offscreen canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Could not get canvas context');
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Render the PDF page to the canvas
    await page.render({
      canvasContext: context,
      viewport,
    }).promise;

    // Convert to data URL
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Failed to render PDF page:', error);
    throw error;
  }
}

/**
 * Render multiple PDF pages to data URLs
 * @param pdfUrl - URL of the PDF file
 * @param startPage - First page to render (1-indexed)
 * @param endPage - Last page to render (1-indexed)
 * @param scale - Scale factor
 * @returns Array of data URLs
 */
export async function renderPdfPagesToDataUrls(
  pdfUrl: string,
  startPage: number,
  endPage: number,
  scale: number = 2
): Promise<string[]> {
  const pdfDoc = await loadPdfDocument(pdfUrl);
  const validEnd = Math.min(endPage, pdfDoc.numPages);
  const validStart = Math.max(startPage, 1);
  
  const dataUrls: string[] = [];
  
  for (let pageNum = validStart; pageNum <= validEnd; pageNum++) {
    const dataUrl = await renderPdfPageToDataUrl(pdfUrl, pageNum, scale);
    dataUrls.push(dataUrl);
  }
  
  return dataUrls;
}

/**
 * Clear the PDF document cache
 */
export function clearPdfCache(): void {
  pdfDocCache.forEach(doc => doc.destroy());
  pdfDocCache.clear();
}

/**
 * Remove a specific PDF from cache
 */
export function removePdfFromCache(pdfUrl: string): void {
  const doc = pdfDocCache.get(pdfUrl);
  if (doc) {
    doc.destroy();
    pdfDocCache.delete(pdfUrl);
  }
}
