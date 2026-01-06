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
  account_id?: string;
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

// Breadcrumb item for folder navigation
export interface BreadcrumbItem {
  id: string;
  name: string;
  isRoot?: boolean;
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

export type FileSortField = 'name' | 'modified_time' | 'created_time' | 'size_bytes';
export type FileSortDirection = 'asc' | 'desc';

export interface FileSortOption {
  field: FileSortField;
  direction: FileSortDirection;
}

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

export const SORT_FIELD_LABELS: Record<FileSortField, string> = {
  name: 'Name',
  modified_time: 'Modified',
  created_time: 'Created',
  size_bytes: 'Size',
};

// File preferences stored in localStorage
export interface FilePreferences {
  viewMode: FileViewMode;
  sortField: FileSortField;
  sortDirection: FileSortDirection;
  typeFilter: FileTypeFilter;
}

export const DEFAULT_FILE_PREFERENCES: FilePreferences = {
  viewMode: 'list',
  sortField: 'name',
  sortDirection: 'asc',
  typeFilter: 'all',
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
    mimeType === 'application/pdf' ||
    isGoogleWorkspaceFile(mimeType)
  );
}

// Check if it's a Google Workspace file (Docs, Sheets, Slides)
export function isGoogleWorkspaceFile(mimeType: string): boolean {
  return (
    mimeType === 'application/vnd.google-apps.document' ||
    mimeType === 'application/vnd.google-apps.spreadsheet' ||
    mimeType === 'application/vnd.google-apps.presentation'
  );
}

// Get embedded URL for Google Workspace files
export function getEmbedUrl(file: DriveFile): string | null {
  if (!file.web_view_link) return null;
  
  const mimeType = file.mime_type;
  
  // Google Docs, Sheets, Slides can be embedded
  if (mimeType === 'application/vnd.google-apps.document') {
    // Convert view URL to embedded preview URL
    return file.web_view_link.replace('/edit', '/preview');
  }
  if (mimeType === 'application/vnd.google-apps.spreadsheet') {
    return file.web_view_link.replace('/edit', '/preview');
  }
  if (mimeType === 'application/vnd.google-apps.presentation') {
    return file.web_view_link.replace('/edit', '/embed?start=false&loop=false&delayms=3000');
  }
  
  return null;
}

// Sort files with folders first
export function sortFilesWithFoldersFirst(files: DriveFile[], sortOption: FileSortOption): DriveFile[] {
  return [...files].sort((a, b) => {
    // Folders always come first
    if (a.is_folder && !b.is_folder) return -1;
    if (!a.is_folder && b.is_folder) return 1;
    
    // Then sort by the specified field
    const { field, direction } = sortOption;
    const multiplier = direction === 'asc' ? 1 : -1;
    
    let comparison = 0;
    
    switch (field) {
      case 'name':
        comparison = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        break;
      case 'modified_time':
        const aModified = a.modified_time ? new Date(a.modified_time).getTime() : 0;
        const bModified = b.modified_time ? new Date(b.modified_time).getTime() : 0;
        comparison = aModified - bModified;
        break;
      case 'created_time':
        const aCreated = a.created_time ? new Date(a.created_time).getTime() : 0;
        const bCreated = b.created_time ? new Date(b.created_time).getTime() : 0;
        comparison = aCreated - bCreated;
        break;
      case 'size_bytes':
        comparison = (a.size_bytes || 0) - (b.size_bytes || 0);
        break;
    }
    
    return comparison * multiplier;
  });
}
