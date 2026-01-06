import { useState } from "react";
import { X, ExternalLink, Download, Maximize2, Minimize2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DriveFile } from "@/types/files";
import { getEmbedUrl, isGoogleWorkspaceFile } from "@/types/files";

interface EmbeddedFileViewerProps {
  file: DriveFile;
  onClose: () => void;
}

export function EmbeddedFileViewer({ file, onClose }: EmbeddedFileViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const mimeType = file.mime_type || '';
  const isImage = mimeType.includes('image');
  const isPdf = mimeType === 'application/pdf';
  const isGoogleFile = isGoogleWorkspaceFile(mimeType);
  
  const embedUrl = getEmbedUrl(file);
  
  const handleOpenInDrive = () => {
    if (file.web_view_link) {
      window.open(file.web_view_link, '_blank');
    }
  };

  const handleDownload = () => {
    if (file.web_content_link) {
      window.open(file.web_content_link, '_blank');
    }
  };

  // Get the file type label for display
  const getFileTypeLabel = () => {
    if (mimeType.includes('document')) return 'Google Doc';
    if (mimeType.includes('spreadsheet')) return 'Google Sheet';
    if (mimeType.includes('presentation')) return 'Google Slides';
    if (isPdf) return 'PDF';
    if (isImage) return 'Image';
    return 'File';
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col bg-background",
        isFullscreen ? "p-0" : "p-4 md:p-8"
      )}
    >
      {/* Header */}
      <header className={cn(
        "flex items-center justify-between gap-4 border-b bg-background px-4 py-3",
        isFullscreen && "absolute left-0 right-0 top-0 z-10"
      )}>
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h2 className="truncate font-medium">{file.name}</h2>
            <p className="text-xs text-muted-foreground">{getFileTypeLabel()}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {file.web_content_link && !isGoogleFile && (
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:flex"
              onClick={handleDownload}
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenInDrive}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Open in Drive</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className={cn(
        "relative flex-1 overflow-hidden bg-muted/30",
        isFullscreen && "pt-14"
      )}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {isImage ? (
          <div className="flex h-full items-center justify-center p-4">
            <img
              src={file.thumbnail_url?.replace('=s220', '=s1600') || file.web_content_link || ''}
              alt={file.name}
              className="max-h-full max-w-full object-contain"
              onLoad={() => setIsLoading(false)}
              onError={() => setIsLoading(false)}
            />
          </div>
        ) : isPdf && file.web_view_link ? (
          <iframe
            src={`${file.web_view_link.replace('/view', '/preview')}`}
            className="h-full w-full border-0"
            title={file.name}
            onLoad={() => setIsLoading(false)}
            allow="autoplay"
          />
        ) : isGoogleFile && embedUrl ? (
          <iframe
            src={embedUrl}
            className="h-full w-full border-0"
            title={file.name}
            onLoad={() => setIsLoading(false)}
            allow="autoplay"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="text-muted-foreground">
              This file type cannot be previewed directly.
            </p>
            <Button onClick={handleOpenInDrive}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in Google Drive
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
