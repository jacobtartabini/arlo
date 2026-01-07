/**
 * Browser-based file converters for Arlo
 * Handles: PDF→Image, Image→PDF, HEIC→Image
 */

import type { ConversionOptions, ConversionFormat, InputFormat } from '@/types/conversion';

// PDF.js setup - using CDN worker for compatibility
const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168';

let pdfjsLib: typeof import('pdfjs-dist') | null = null;

async function getPdfJs() {
  if (pdfjsLib) return pdfjsLib;
  
  pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/pdf.worker.min.mjs`;
  return pdfjsLib;
}

/**
 * Convert PDF to images (PNG or JPG)
 */
export async function convertPdfToImages(
  file: File,
  outputFormat: 'png' | 'jpg',
  options: ConversionOptions = {},
  onProgress?: (progress: number) => void
): Promise<Blob[]> {
  const pdfjs = await getPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  
  const totalPages = pdf.numPages;
  const pagesToConvert = options.pages === 'all' || !options.pages
    ? Array.from({ length: totalPages }, (_, i) => i + 1)
    : options.pages;
  
  const dpi = options.dpi || 150;
  const scale = dpi / 72; // PDF default is 72 DPI
  const quality = (options.quality || 90) / 100;
  
  const results: Blob[] = [];
  
  for (let i = 0; i < pagesToConvert.length; i++) {
    const pageNum = pagesToConvert[i];
    if (pageNum > totalPages) continue;
    
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    const context = canvas.getContext('2d')!;
    await page.render({ canvasContext: context, viewport }).promise;
    
    const mimeType = outputFormat === 'png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
        mimeType,
        quality
      );
    });
    
    results.push(blob);
    onProgress?.((i + 1) / pagesToConvert.length * 100);
  }
  
  return results;
}

/**
 * Convert images to PDF
 */
export async function convertImagesToPdf(
  files: File[],
  options: ConversionOptions = {},
  onProgress?: (progress: number) => void
): Promise<Blob> {
  // Dynamic import of jsPDF (already installed)
  const { jsPDF } = await import('jspdf');
  
  const doc = new jsPDF();
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    // Convert file to data URL
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
    
    // Get image dimensions
    const img = await new Promise<HTMLImageElement>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = dataUrl;
    });
    
    // Calculate dimensions to fit page (A4)
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    let width = img.width;
    let height = img.height;
    
    // Scale to fit page
    const widthRatio = pageWidth / width;
    const heightRatio = pageHeight / height;
    const ratio = Math.min(widthRatio, heightRatio, 1);
    
    width *= ratio;
    height *= ratio;
    
    // Center on page
    const x = (pageWidth - width) / 2;
    const y = (pageHeight - height) / 2;
    
    if (i > 0) {
      doc.addPage();
    }
    
    doc.addImage(dataUrl, 'JPEG', x, y, width, height);
    onProgress?.((i + 1) / files.length * 100);
  }
  
  return doc.output('blob');
}

/**
 * Convert HEIC to PNG or JPG
 */
export async function convertHeicToImage(
  file: File,
  outputFormat: 'png' | 'jpg',
  options: ConversionOptions = {},
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const heic2any = (await import('heic2any')).default;
  
  onProgress?.(20);
  
  const result = await heic2any({
    blob: file,
    toType: outputFormat === 'png' ? 'image/png' : 'image/jpeg',
    quality: (options.quality || 90) / 100,
  });
  
  onProgress?.(100);
  
  // heic2any can return array for multi-frame HEIC, we take first
  return Array.isArray(result) ? result[0] : result;
}

/**
 * Convert image format (PNG <-> JPG <-> WebP)
 */
export async function convertImageFormat(
  file: File,
  outputFormat: ConversionFormat,
  options: ConversionOptions = {},
  onProgress?: (progress: number) => void
): Promise<Blob> {
  onProgress?.(20);
  
  const img = await createImageBitmap(file);
  
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  
  onProgress?.(60);
  
  const mimeType = outputFormat === 'png' ? 'image/png' 
    : outputFormat === 'webp' ? 'image/webp'
    : 'image/jpeg';
  
  const quality = (options.quality || 90) / 100;
  
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
      mimeType,
      quality
    );
  });
  
  onProgress?.(100);
  
  return blob;
}

/**
 * Check if a conversion can be done in browser
 */
export function canConvertInBrowser(inputFormat: InputFormat, outputFormat: ConversionFormat): boolean {
  // PDF to image
  if (inputFormat === 'pdf' && (outputFormat === 'png' || outputFormat === 'jpg')) {
    return true;
  }
  
  // Image to PDF
  if (['png', 'jpg', 'jpeg', 'webp'].includes(inputFormat) && outputFormat === 'pdf') {
    return true;
  }
  
  // HEIC to image
  if (['heic', 'heif'].includes(inputFormat) && (outputFormat === 'png' || outputFormat === 'jpg')) {
    return true;
  }
  
  // Image format conversion
  if (['png', 'jpg', 'jpeg', 'webp'].includes(inputFormat) && 
      ['png', 'jpg', 'webp'].includes(outputFormat)) {
    return true;
  }
  
  return false;
}
