import { useState, useRef } from 'react';
import { X, FileText, Image as ImageIcon, File, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface UploadedFile {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'document' | 'other';
  size: number;
}

interface FileUploadProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_FILES = 10;

function getFileType(mimeType: string): 'image' | 'document' | 'other' {
  if (mimeType.startsWith('image/')) return 'image';
  if (
    mimeType === 'application/pdf' ||
    mimeType.includes('document') ||
    mimeType.includes('text/')
  ) {
    return 'document';
  }
  return 'other';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function FileUpload({ files, onFilesChange, disabled }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    // Validate file count
    if (files.length + selectedFiles.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files allowed`);
      return;
    }

    // Validate file sizes
    const oversizedFiles = selectedFiles.filter(f => f.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      toast.error(`Some files exceed the 20MB limit`);
      return;
    }

    setIsUploading(true);

    try {
      const uploadedFiles: UploadedFile[] = [];

      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(filePath);

        uploadedFiles.push({
          id: fileName,
          name: file.name,
          url: urlData.publicUrl,
          type: getFileType(file.type),
          size: file.size,
        });
      }

      if (uploadedFiles.length > 0) {
        onFilesChange([...files, ...uploadedFiles]);
        toast.success(`${uploadedFiles.length} file(s) uploaded`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const removeFile = (fileId: string) => {
    onFilesChange(files.filter(f => f.id !== fileId));
  };

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  const FileIcon = ({ type }: { type: 'image' | 'document' | 'other' }) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="w-4 h-4" />;
      case 'document':
        return <FileText className="w-4 h-4" />;
      default:
        return <File className="w-4 h-4" />;
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.txt,.md,.csv,.json"
        disabled={disabled || isUploading}
      />

      {/* Trigger for file picker - called from parent */}
      <button
        type="button"
        onClick={openFilePicker}
        className="hidden"
        id="file-upload-trigger"
      />

      {/* File previews */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {files.map((file) => (
            <div
              key={file.id}
              className={cn(
                "relative group flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/50",
                file.type === 'image' && "p-1"
              )}
            >
              {file.type === 'image' ? (
                <img
                  src={file.url}
                  alt={file.name}
                  className="h-16 w-16 object-cover rounded"
                />
              ) : (
                <>
                  <FileIcon type={file.type} />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium truncate max-w-[120px]">
                      {file.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                </>
              )}
              <button
                onClick={() => removeFile(file.id)}
                className="absolute -top-1.5 -right-1.5 p-0.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Loading indicator */}
      {isUploading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Uploading...
        </div>
      )}
    </div>
  );
}

export function useFileUpload() {
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const clearFiles = () => setFiles([]);

  const triggerUpload = () => {
    const trigger = document.getElementById('file-upload-trigger');
    trigger?.click();
  };

  return {
    files,
    setFiles,
    clearFiles,
    triggerUpload,
  };
}
