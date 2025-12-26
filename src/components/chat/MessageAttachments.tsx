import { FileText, File, ExternalLink } from 'lucide-react';
import type { UploadedFile } from './FileUpload';

interface MessageAttachmentsProps {
  attachments: UploadedFile[];
}

export function MessageAttachments({ attachments }: MessageAttachmentsProps) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {attachments.map((file) => (
        <a
          key={file.id}
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group"
        >
          {file.type === 'image' ? (
            <div className="relative">
              <img
                src={file.url}
                alt={file.name}
                className="max-h-48 max-w-xs rounded-lg object-cover border border-border/50"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-colors flex items-center justify-center">
                <ExternalLink className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-background/50 hover:bg-muted/50 transition-colors">
              {file.type === 'document' ? (
                <FileText className="w-4 h-4 text-muted-foreground" />
              ) : (
                <File className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-xs truncate max-w-[150px]">{file.name}</span>
              <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}
        </a>
      ))}
    </div>
  );
}
