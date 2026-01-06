import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  ExternalLink, FolderOpen, FileText, Table, Presentation, 
  Image, Video, File, ChevronRight, Link as LinkIcon,
  Briefcase, Plane, Calendar, ListTodo
} from "lucide-react";
import type { DriveFile } from "@/types/files";
import { formatFileSize, canPreviewInApp } from "@/types/files";
import { format } from "date-fns";

interface FileLink {
  link_type: 'project' | 'task' | 'trip' | 'event';
  linked_entity_id: string;
  entity_name?: string;
}

interface FileListItemProps {
  file: DriveFile;
  isSelected: boolean;
  onClick: () => void;
  onOpenInDrive: () => void;
  onOpenFolder?: (file: DriveFile) => void;
  links?: FileLink[];
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

const LINK_ICONS: Record<string, React.ElementType> = {
  project: Briefcase,
  task: ListTodo,
  trip: Plane,
  event: Calendar,
};

const LINK_COLORS: Record<string, string> = {
  project: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  task: 'bg-green-500/10 text-green-600 border-green-500/20',
  trip: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  event: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
};

export function FileListItem({ file, isSelected, onClick, onOpenInDrive, onOpenFolder, links = [] }: FileListItemProps) {
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

      {/* Name & Account & Links */}
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
        <div className="flex items-center gap-2 mt-0.5">
          {file.account_email && (
            <p className="truncate text-xs text-muted-foreground">
              {file.account_email}
            </p>
          )}
          {/* Linked entity badges */}
          {links.length > 0 && (
            <div className="flex items-center gap-1">
              {links.slice(0, 2).map((link, i) => {
                const Icon = LINK_ICONS[link.link_type] || LinkIcon;
                return (
                  <Badge
                    key={`${link.link_type}-${link.linked_entity_id}-${i}`}
                    variant="outline"
                    className={cn("h-5 gap-1 px-1.5 text-[10px]", LINK_COLORS[link.link_type])}
                  >
                    <Icon className="h-3 w-3" />
                    {link.link_type === 'project' && 'Project'}
                    {link.link_type === 'task' && 'Task'}
                    {link.link_type === 'trip' && 'Trip'}
                    {link.link_type === 'event' && 'Event'}
                  </Badge>
                );
              })}
              {links.length > 2 && (
                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                  +{links.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>
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
