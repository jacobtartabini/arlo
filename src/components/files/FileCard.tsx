import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ExternalLink, FolderOpen, FileText, Table, Presentation, Image, Video, File } from "lucide-react";
import type { DriveFile } from "@/types/files";
import { formatFileSize } from "@/types/files";
import { format } from "date-fns";

interface FileCardProps {
  file: DriveFile;
  isSelected: boolean;
  onClick: () => void;
  onOpenInDrive: () => void;
}

function getFileIcon(mimeType: string) {
  if (mimeType.includes('folder')) return <FolderOpen className="h-8 w-8 text-amber-500" />;
  if (mimeType.includes('document') || mimeType.includes('text') || mimeType.includes('word')) 
    return <FileText className="h-8 w-8 text-blue-500" />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) 
    return <Table className="h-8 w-8 text-green-500" />;
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) 
    return <Presentation className="h-8 w-8 text-orange-500" />;
  if (mimeType.includes('image')) 
    return <Image className="h-8 w-8 text-purple-500" />;
  if (mimeType.includes('video')) 
    return <Video className="h-8 w-8 text-pink-500" />;
  if (mimeType.includes('pdf')) 
    return <FileText className="h-8 w-8 text-red-500" />;
  return <File className="h-8 w-8 text-muted-foreground" />;
}

export function FileCard({ file, isSelected, onClick, onOpenInDrive }: FileCardProps) {
  const hasThumbnail = file.thumbnail_url && file.mime_type?.includes('image');

  return (
    <Card
      className={cn(
        "group relative cursor-pointer overflow-hidden transition-all hover:shadow-md",
        isSelected && "ring-2 ring-primary"
      )}
      onClick={onClick}
    >
      {/* Thumbnail or Icon */}
      <div className="flex h-24 items-center justify-center bg-muted/30">
        {hasThumbnail ? (
          <img
            src={file.thumbnail_url!}
            alt={file.name}
            className="h-full w-full object-cover"
          />
        ) : (
          getFileIcon(file.mime_type || '')
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h4 className="truncate text-sm font-medium" title={file.name}>
          {file.name}
        </h4>
        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatFileSize(file.size_bytes)}</span>
          {file.modified_time && (
            <span>{format(new Date(file.modified_time), 'MMM d')}</span>
          )}
        </div>
        {file.account_email && (
          <p className="mt-1 truncate text-xs text-muted-foreground/70" title={file.account_email}>
            {file.account_email}
          </p>
        )}
      </div>

      {/* Hover Actions */}
      <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="secondary"
          size="icon"
          className="h-7 w-7 bg-background/80 backdrop-blur"
          onClick={(e) => {
            e.stopPropagation();
            onOpenInDrive();
          }}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}
