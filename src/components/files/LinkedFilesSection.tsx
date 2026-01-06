import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText, Image, Table2, Presentation, File, Folder,
  ExternalLink, X, Plus, Sparkles, Check, XIcon,
  FileImage
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFilesPersistence } from "@/hooks/useFilesPersistence";
import { LinkFileDialog } from "./LinkFileDialog";
import { EmbeddedFileViewer } from "./EmbeddedFileViewer";
import type { DriveFile, DriveFileLink, DriveAccount } from "@/types/files";

interface LinkedFile extends DriveFile {
  linkId: string;
  accountEmail?: string;
  accountName?: string;
}

interface LinkedFilesSectionProps {
  entityType: 'project' | 'task' | 'trip' | 'event';
  entityId: string;
  entityName?: string;
  entityDescription?: string;
  compact?: boolean;
  className?: string;
}

const FILE_ICONS: Record<string, React.ElementType> = {
  document: FileText,
  spreadsheet: Table2,
  presentation: Presentation,
  image: FileImage,
  pdf: FileText,
  folder: Folder,
  default: File,
};

function getFileIcon(mimeType: string): React.ElementType {
  if (mimeType.includes('document') || mimeType.includes('text') || mimeType.includes('word')) {
    return FILE_ICONS.document;
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return FILE_ICONS.spreadsheet;
  }
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
    return FILE_ICONS.presentation;
  }
  if (mimeType.includes('image')) {
    return FILE_ICONS.image;
  }
  if (mimeType.includes('pdf')) {
    return FILE_ICONS.pdf;
  }
  if (mimeType.includes('folder')) {
    return FILE_ICONS.folder;
  }
  return FILE_ICONS.default;
}

export function LinkedFilesSection({
  entityType,
  entityId,
  entityName,
  entityDescription,
  compact = false,
  className,
}: LinkedFilesSectionProps) {
  const { getLinkedFiles, unlinkFile, listAccounts, searchAllFiles, isLoading } = useFilesPersistence();
  
  const [linkedFiles, setLinkedFiles] = useState<LinkedFile[]>([]);
  const [accounts, setAccounts] = useState<DriveAccount[]>([]);
  const [suggestions, setSuggestions] = useState<DriveFile[]>([]);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [viewingFile, setViewingFile] = useState<DriveFile | null>(null);

  // Load linked files and accounts
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [linksData, accountsData] = await Promise.all([
        getLinkedFiles(entityType, entityId),
        listAccounts(),
      ]);
      
      // Transform links to LinkedFile format
      const files: LinkedFile[] = linksData
        .filter(link => link.drive_files)
        .map(link => ({
          ...link.drive_files!,
          linkId: link.id,
          accountEmail: link.drive_files?.account_email,
          accountName: link.drive_files?.account_name,
        }));
      
      setLinkedFiles(files);
      setAccounts(accountsData);
    } catch (error) {
      console.error('Failed to load linked files:', error);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, getLinkedFiles, listAccounts]);

  // Load suggestions based on entity name/description
  const loadSuggestions = useCallback(async () => {
    if (!entityName || accounts.length === 0) return;
    
    // Build search query from entity name and description
    const searchTerms: string[] = [];
    
    // Extract words from name (skip common words)
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'for', 'to', 'of', 'in', 'on', 'at']);
    const nameWords = entityName.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
    searchTerms.push(...nameWords.slice(0, 3)); // Top 3 words from name
    
    if (entityDescription) {
      const descWords = entityDescription.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));
      searchTerms.push(...descWords.slice(0, 2)); // Top 2 words from description
    }
    
    if (searchTerms.length === 0) return;
    
    // Search for each term
    const searchPromises = searchTerms.slice(0, 3).map(term => 
      searchAllFiles(accounts, term)
    );
    
    const results = await Promise.all(searchPromises);
    const allFiles = results.flat();
    
    // Deduplicate and filter out already linked files
    const linkedIds = new Set(linkedFiles.map(f => f.drive_file_id));
    const uniqueFiles = new Map<string, DriveFile>();
    
    for (const file of allFiles) {
      if (!linkedIds.has(file.drive_file_id) && !file.is_folder) {
        uniqueFiles.set(file.drive_file_id, file);
      }
    }
    
    // Score and rank suggestions
    const scored = Array.from(uniqueFiles.values()).map(file => {
      let score = 0;
      const fileName = file.name.toLowerCase();
      
      // Exact name match gets highest score
      if (entityName && fileName.includes(entityName.toLowerCase())) {
        score += 10;
      }
      
      // Partial word matches
      for (const term of searchTerms) {
        if (fileName.includes(term)) {
          score += 3;
        }
      }
      
      // Recent files get bonus
      if (file.modified_time) {
        const daysAgo = (Date.now() - new Date(file.modified_time).getTime()) / (1000 * 60 * 60 * 24);
        if (daysAgo < 7) score += 2;
        else if (daysAgo < 30) score += 1;
      }
      
      return { file, score };
    });
    
    const topSuggestions = scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => s.file);
    
    setSuggestions(topSuggestions);
  }, [entityName, entityDescription, accounts, linkedFiles, searchAllFiles]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!loading && accounts.length > 0) {
      loadSuggestions();
    }
  }, [loading, accounts.length, loadSuggestions]);

  const handleUnlink = async (linkId: string, driveFileId: string) => {
    const success = await unlinkFile(driveFileId, entityType, entityId);
    if (success) {
      setLinkedFiles(prev => prev.filter(f => f.linkId !== linkId));
    }
  };

  const handleFileLinked = () => {
    loadData();
    // Remove from suggestions if it was suggested
    setSuggestions(prev => prev.filter(s => !linkedFiles.some(l => l.drive_file_id === s.drive_file_id)));
  };

  const handleAcceptSuggestion = async (file: DriveFile) => {
    // The LinkFileDialog will handle the actual linking
    // For now, just open it with the file pre-selected
    setLinkDialogOpen(true);
  };

  const handleDismissSuggestion = (fileId: string) => {
    setDismissedSuggestions(prev => new Set(prev).add(fileId));
  };

  const visibleSuggestions = suggestions.filter(s => !dismissedSuggestions.has(s.drive_file_id));

  if (loading) {
    return (
      <div className={cn("space-y-2", className)}>
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  // Compact mode for task/small contexts
  if (compact) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Files ({linkedFiles.length})
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() => setLinkDialogOpen(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Link
          </Button>
        </div>
        
        {linkedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {linkedFiles.map(file => {
              const Icon = getFileIcon(file.mime_type);
              return (
                <Badge
                  key={file.linkId}
                  variant="secondary"
                  className="gap-1.5 pr-1 cursor-pointer hover:bg-muted"
                  onClick={() => setViewingFile(file)}
                >
                  <Icon className="h-3 w-3" />
                  <span className="max-w-[120px] truncate">{file.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnlink(file.linkId, file.id || file.drive_file_id);
                    }}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        )}

        <LinkFileDialog
          open={linkDialogOpen}
          onOpenChange={setLinkDialogOpen}
          entityType={entityType}
          entityId={entityId}
          accounts={accounts}
          onFileLinked={handleFileLinked}
        />

        {viewingFile && (
          <EmbeddedFileViewer
            file={viewingFile}
            onClose={() => setViewingFile(null)}
          />
        )}
      </div>
    );
  }

  // Full section for project/trip
  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Folder className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Files</h3>
          {linkedFiles.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {linkedFiles.length}
            </Badge>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => setLinkDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Link File
        </Button>
      </div>

      {/* Suggestions */}
      {visibleSuggestions.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Suggested files</span>
          </div>
          <div className="space-y-2">
            {visibleSuggestions.slice(0, 3).map(file => {
              const Icon = getFileIcon(file.mime_type);
              return (
                <div
                  key={file.drive_file_id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-background/50"
                >
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm flex-1 truncate">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {file.account_email?.split('@')[0]}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => handleAcceptSuggestion(file)}
                  >
                    <Check className="h-4 w-4 text-green-500" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => handleDismissSuggestion(file.drive_file_id)}
                  >
                    <XIcon className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Linked Files */}
      {linkedFiles.length > 0 ? (
        <div className="space-y-2">
          {linkedFiles.map(file => {
            const Icon = getFileIcon(file.mime_type);
            return (
              <div
                key={file.linkId}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group cursor-pointer"
                onClick={() => setViewingFile(file)}
              >
                <div className="p-2 rounded-lg bg-background">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {file.account_name || file.account_email}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {file.web_view_link && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(file.web_view_link!, '_blank');
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnlink(file.linkId, file.id || file.drive_file_id);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground">
          <File className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No files linked yet</p>
          <Button
            variant="link"
            size="sm"
            className="mt-1"
            onClick={() => setLinkDialogOpen(true)}
          >
            Link a file from Google Drive
          </Button>
        </div>
      )}

      <LinkFileDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        entityType={entityType}
        entityId={entityId}
        accounts={accounts}
        onFileLinked={handleFileLinked}
      />

      {viewingFile && (
        <EmbeddedFileViewer
          file={viewingFile}
          onClose={() => setViewingFile(null)}
        />
      )}
    </Card>
  );
}
