export interface DriveAccount {
  id: string;
  user_key: string;
  account_email: string;
  account_name: string | null;
  root_folder_id: string | null;
  storage_quota_used: number | null;
  storage_quota_total: number | null;
  enabled: boolean;
  last_sync_at: string | null;
  last_sync_error: string | null;
  created_at: string;
  updated_at: string;
  is_connected: boolean;
}

export interface DriveFile {
  id?: string;
  drive_file_id: string;
  name: string;
  mime_type: string;
  file_extension: string | null;
  size_bytes: number | null;
  thumbnail_url: string | null;
  web_view_link: string | null;
  web_content_link: string | null;
  icon_link: string | null;
  owner_email: string | null;
  owner_name: string | null;
  is_folder: boolean;
  parent_folder_id: string | null;
  starred: boolean;
  created_time: string | null;
  modified_time: string | null;
  account_email?: string;
  account_name?: string;
}

export interface DriveFileLink {
  id: string;
  drive_file_id: string;
  link_type: 'project' | 'task' | 'trip' | 'event';
  linked_entity_id: string;
  notes: string | null;
  created_at: string;
  drive_files?: DriveFile;
}

export type FileViewMode = 'grid' | 'list';

export type FileTypeFilter = 
  | 'all' 
  | 'folder' 
  | 'document' 
  | 'spreadsheet' 
  | 'presentation' 
  | 'image' 
  | 'pdf' 
  | 'video';

export const FILE_TYPE_LABELS: Record<FileTypeFilter, string> = {
  all: 'All Files',
  folder: 'Folders',
  document: 'Documents',
  spreadsheet: 'Spreadsheets',
  presentation: 'Presentations',
  image: 'Images',
  pdf: 'PDFs',
  video: 'Videos',
};

// Helper to get file type icon name
export function getFileTypeIcon(mimeType: string): string {
  if (mimeType.includes('folder')) return 'folder';
  if (mimeType.includes('document') || mimeType.includes('text') || mimeType.includes('word')) return 'file-text';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'table';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation';
  if (mimeType.includes('image')) return 'image';
  if (mimeType.includes('pdf')) return 'file-text';
  if (mimeType.includes('video')) return 'video';
  if (mimeType.includes('audio')) return 'music';
  if (mimeType.includes('zip') || mimeType.includes('archive')) return 'archive';
  return 'file';
}

// Format file size
export function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// Check if file can be previewed in Arlo
export function canPreviewInApp(mimeType: string): boolean {
  return (
    mimeType.includes('image') ||
    mimeType === 'application/pdf'
  );
}
