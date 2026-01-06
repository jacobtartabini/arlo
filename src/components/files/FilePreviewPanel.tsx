import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { X, ExternalLink, Eye, Link2, FolderOpen, FileText, Table, Presentation, Image, Video, File, Download } from "lucide-react";
import type { DriveFile } from "@/types/files";
import { formatFileSize, canPreviewInApp } from "@/types/files";
import { format } from "date-fns";

interface FilePreviewPanelProps {
  file: DriveFile;
  onClose: () => void;
  onOpenInDrive: () => void;
  onPreview?: () => void;
}

function getFileIcon(mimeType: string) {
  const iconClass = "h-12 w-12";
  if (mimeType.includes('folder')) return <FolderOpen className={`${iconClass} text-amber-500`} />;
  if (mimeType.includes('document') || mimeType.includes('text') || mimeType.includes('word')) 
    return <FileText className={`${iconClass} text-blue-500`} />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) 
    return <Table className={`${iconClass} text-green-500`} />;
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) 
    return <Presentation className={`${iconClass} text-orange-500`} />;
  if (mimeType.includes('image')) 
    return <Image className={`${iconClass} text-purple-500`} />;
  if (mimeType.includes('video')) 
    return <Video className={`${iconClass} text-pink-500`} />;
  if (mimeType.includes('pdf')) 
    return <FileText className={`${iconClass} text-red-500`} />;
  return <File className={`${iconClass} text-muted-foreground`} />;
}

export function FilePreviewPanel({ file, onClose, onOpenInDrive, onPreview }: FilePreviewPanelProps) {
  const canPreview = canPreviewInApp(file.mime_type || '');
  const isImage = file.mime_type?.includes('image');

  return (
    <Card className="hidden w-80 shrink-0 overflow-hidden lg:block xl:w-96">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="font-semibold">File Details</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Preview Area */}
      <div className="flex h-48 items-center justify-center bg-muted/30">
        {isImage && file.thumbnail_url ? (
          <img
            src={file.thumbnail_url.replace('=s220', '=s400')}
            alt={file.name}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          getFileIcon(file.mime_type || '')
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 border-b p-4">
        {canPreview && onPreview ? (
          <Button className="flex-1" onClick={onPreview}>
            <Eye className="mr-2 h-4 w-4" />
            Preview in Arlo
          </Button>
        ) : (
          <Button className="flex-1" onClick={onOpenInDrive}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in Drive
          </Button>
        )}
        {file.web_content_link && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => window.open(file.web_content_link!, '_blank')}
          >
            <Download className="h-4 w-4" />
          </Button>
        )}
        {canPreview && onPreview && (
          <Button
            variant="outline"
            size="icon"
            onClick={onOpenInDrive}
            title="Open in Google Drive"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Metadata */}
      <div className="space-y-4 p-4">
        <div>
          <h4 className="mb-2 truncate font-medium" title={file.name}>
            {file.name}
          </h4>
          {file.file_extension && (
            <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium uppercase">
              {file.file_extension}
            </span>
          )}
        </div>

        <Separator />

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Size</span>
            <span className="font-medium">{formatFileSize(file.size_bytes)}</span>
          </div>
          
          {file.owner_name && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Owner</span>
              <span className="font-medium">{file.owner_name}</span>
            </div>
          )}

          {file.modified_time && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Modified</span>
              <span className="font-medium">
                {format(new Date(file.modified_time), 'MMM d, yyyy')}
              </span>
            </div>
          )}

          {file.created_time && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span className="font-medium">
                {format(new Date(file.created_time), 'MMM d, yyyy')}
              </span>
            </div>
          )}

          {file.account_email && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Account</span>
              <span className="truncate font-medium" title={file.account_email}>
                {file.account_email}
              </span>
            </div>
          )}
        </div>

        <Separator />

        {/* Link to Projects/Trips - Placeholder for now */}
        <div>
          <h5 className="mb-2 text-sm font-medium">Linked to</h5>
          <p className="text-sm text-muted-foreground">
            Not linked to any projects or trips yet.
          </p>
          <Button variant="outline" size="sm" className="mt-2 w-full">
            <Link2 className="mr-2 h-4 w-4" />
            Link to Project or Trip
          </Button>
        </div>
      </div>
    </Card>
  );
}
