import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ExternalLink, FolderOpen, FileText, Table, Presentation, Image, Video, File } from "lucide-react";
import type { DriveFile } from "@/types/files";
import { formatFileSize } from "@/types/files";
import { format } from "date-fns";

interface FileListItemProps {
  file: DriveFile;
  isSelected: boolean;
  onClick: () => void;
  onOpenInDrive: () => void;
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

export function FileListItem({ file, isSelected, onClick, onOpenInDrive }: FileListItemProps) {
  return (
    <div
      className={cn(
        "group flex cursor-pointer items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50",
        isSelected && "bg-primary/5"
      )}
      onClick={onClick}
    >
      {/* Icon */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/50">
        {getFileIcon(file.mime_type || '')}
      </div>

      {/* Name & Account */}
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-sm font-medium" title={file.name}>
          {file.name}
        </h4>
        {file.account_email && (
          <p className="truncate text-xs text-muted-foreground">
            {file.account_email}
          </p>
        )}
      </div>

      {/* Size */}
      <div className="hidden w-20 text-right text-sm text-muted-foreground sm:block">
        {formatFileSize(file.size_bytes)}
      </div>

      {/* Modified */}
      <div className="hidden w-24 text-right text-sm text-muted-foreground md:block">
        {file.modified_time ? format(new Date(file.modified_time), 'MMM d, yyyy') : '—'}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onOpenInDrive();
          }}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
