import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ExternalLink, FolderOpen, FileText, Table, Presentation, Image, Video, File, ChevronRight } from "lucide-react";
import type { DriveFile } from "@/types/files";
import { formatFileSize, canPreviewInApp } from "@/types/files";
import { format } from "date-fns";

interface FileListItemProps {
  file: DriveFile;
  isSelected: boolean;
  onClick: () => void;
  onOpenInDrive: () => void;
  onOpenFolder?: (file: DriveFile) => void;
}

function getFileIcon(mimeType: string) {
  const iconClass = "h-5 w-5";
  if (mimeType.includes('folder')) return <FolderOpen className={cn(iconClass, "text-amber-500")} />;
  if (mimeType.includes('document') || mimeType.includes('text') || mimeType.includes('word')) 
    return <FileText className={cn(iconClass, "text-blue-500")} />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) 
    return <Table className={cn(iconClass, "text-green-500")} />;
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) 
    return <Presentation className={cn(iconClass, "text-orange-500")} />;
  if (mimeType.includes('image')) 
    return <Image className={cn(iconClass, "text-purple-500")} />;
  if (mimeType.includes('video')) 
    return <Video className={cn(iconClass, "text-pink-500")} />;
  if (mimeType.includes('pdf')) 
    return <FileText className={cn(iconClass, "text-red-500")} />;
  return <File className={cn(iconClass, "text-muted-foreground")} />;
}

export function FileListItem({ file, isSelected, onClick, onOpenInDrive, onOpenFolder }: FileListItemProps) {
  const isFolder = file.is_folder;
  const canPreview = canPreviewInApp(file.mime_type || '');

  const handleClick = () => {
    if (isFolder && onOpenFolder) {
      onOpenFolder(file);
    } else {
      onClick();
    }
  };

  return (
    <div
      className={cn(
        "group flex cursor-pointer items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50",
        isSelected && "bg-primary/5",
        isFolder && "bg-amber-500/5 hover:bg-amber-500/10"
      )}
      onClick={handleClick}
    >
      {/* Icon */}
      <div className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
        isFolder ? "bg-amber-500/10" : "bg-muted/50"
      )}>
        {getFileIcon(file.mime_type || '')}
      </div>

      {/* Name & Account */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="truncate text-sm font-medium" title={file.name}>
            {file.name}
          </h4>
          {!isFolder && canPreview && (
            <span className="hidden shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary group-hover:inline">
              Preview
            </span>
          )}
        </div>
        {file.account_email && (
          <p className="truncate text-xs text-muted-foreground">
            {file.account_email}
          </p>
        )}
      </div>

      {/* Type */}
      <div className="hidden w-20 text-right text-xs text-muted-foreground lg:block">
        {isFolder ? 'Folder' : file.file_extension?.toUpperCase() || '—'}
      </div>

      {/* Size */}
      <div className="hidden w-20 text-right text-sm text-muted-foreground sm:block">
        {isFolder ? '—' : formatFileSize(file.size_bytes)}
      </div>

      {/* Modified */}
      <div className="hidden w-28 text-right text-sm text-muted-foreground md:block">
        {file.modified_time ? format(new Date(file.modified_time), 'MMM d, yyyy') : '—'}
      </div>

      {/* Actions or Folder Indicator */}
      <div className="flex w-16 shrink-0 justify-end">
        {isFolder ? (
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        ) : (
          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onOpenInDrive();
              }}
              title="Open in Google Drive"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
