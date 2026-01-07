/**
 * File conversion types for Arlo Files module
 */

export type ConversionFormat = 
  | 'png' 
  | 'jpg' 
  | 'pdf' 
  | 'webp';

export type InputFormat = 
  | 'pdf' 
  | 'png' 
  | 'jpg' 
  | 'jpeg'
  | 'webp'
  | 'heic' 
  | 'heif'
  | 'docx' 
  | 'xlsx' 
  | 'pptx';

export type ConversionStatus = 'queued' | 'converting' | 'done' | 'failed';

export interface ConversionJob {
  id: string;
  fileName: string;
  inputFormat: InputFormat;
  outputFormat: ConversionFormat;
  status: ConversionStatus;
  progress: number; // 0-100
  errorMessage?: string;
  outputFileUrl?: string;
  outputFileName?: string;
  createdAt: Date;
  completedAt?: Date;
  // Options
  options?: ConversionOptions;
}

export interface ConversionOptions {
  // PDF to image options
  pages?: 'all' | number[]; // All pages or specific page numbers
  quality?: number; // 1-100 for image quality
  dpi?: number; // DPI for PDF rendering
  
  // Images to PDF options
  combineMode?: 'single' | 'combine'; // Each image as separate PDF or combine all
}

export interface ConversionCapability {
  inputFormat: InputFormat;
  outputFormats: ConversionFormat[];
  label: string;
  icon: string;
}

// Define what formats can convert to what
export const CONVERSION_MAP: Record<InputFormat, ConversionFormat[]> = {
  pdf: ['png', 'jpg'],
  png: ['pdf', 'jpg', 'webp'],
  jpg: ['pdf', 'png', 'webp'],
  jpeg: ['pdf', 'png', 'webp'],
  webp: ['pdf', 'png', 'jpg'],
  heic: ['png', 'jpg'],
  heif: ['png', 'jpg'],
  docx: ['pdf'],
  xlsx: ['pdf'],
  pptx: ['pdf'],
};

export const FORMAT_LABELS: Record<InputFormat | ConversionFormat, string> = {
  pdf: 'PDF',
  png: 'PNG',
  jpg: 'JPG',
  jpeg: 'JPEG',
  webp: 'WebP',
  heic: 'HEIC',
  heif: 'HEIF',
  docx: 'Word Document',
  xlsx: 'Excel Spreadsheet',
  pptx: 'PowerPoint',
};

export const MIME_TO_FORMAT: Record<string, InputFormat> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
};

export function getInputFormatFromMime(mimeType: string): InputFormat | null {
  return MIME_TO_FORMAT[mimeType] || null;
}

export function getInputFormatFromExtension(filename: string): InputFormat | null {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext) return null;
  
  const extMap: Record<string, InputFormat> = {
    pdf: 'pdf',
    png: 'png',
    jpg: 'jpg',
    jpeg: 'jpeg',
    webp: 'webp',
    heic: 'heic',
    heif: 'heif',
    docx: 'docx',
    xlsx: 'xlsx',
    pptx: 'pptx',
  };
  
  return extMap[ext] || null;
}

export function getAvailableOutputFormats(inputFormat: InputFormat): ConversionFormat[] {
  return CONVERSION_MAP[inputFormat] || [];
}

export function isOfficeFormat(format: InputFormat): boolean {
  return ['docx', 'xlsx', 'pptx'].includes(format);
}

export function isImageFormat(format: InputFormat | ConversionFormat): boolean {
  return ['png', 'jpg', 'jpeg', 'webp', 'heic', 'heif'].includes(format);
}
