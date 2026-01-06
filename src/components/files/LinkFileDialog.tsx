import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText, Image, Table2, Presentation, File, Folder,
  Search, Loader2, Check, ChevronRight, HardDrive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFilesPersistence } from "@/hooks/useFilesPersistence";
import { FileBreadcrumbs } from "./FileBreadcrumbs";
import type { DriveFile, DriveAccount, BreadcrumbItem, FileTypeFilter } from "@/types/files";
import { FILE_TYPE_LABELS } from "@/types/files";

interface LinkFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: 'project' | 'task' | 'trip' | 'event';
  entityId: string;
  accounts: DriveAccount[];
  onFileLinked: () => void;
}

const FILE_ICONS: Record<string, React.ElementType> = {
  document: FileText,
  spreadsheet: Table2,
  presentation: Presentation,
  image: Image,
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

export function LinkFileDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  accounts,
  onFileLinked,
}: LinkFileDialogProps) {
  const { listFiles, linkFile, isLoading } = useFilesPersistence();
  
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<FileTypeFilter>('all');
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Load files when dialog opens or filters change
  const loadFiles = useCallback(async () => {
    if (!open || accounts.length === 0) return;
    
    setLoading(true);
    try {
      let allFiles: DriveFile[] = [];
      
      if (selectedAccountId === 'all') {
        // Load from all accounts
        const results = await Promise.all(
          accounts.map(async account => {
            const { files } = await listFiles(account.id, {
              query: searchQuery || undefined,
              folderId: currentFolderId || undefined,
              mimeType: typeFilter,
            });
            return files.map(f => ({ ...f, account_id: account.id, account_email: account.account_email }));
          })
        );
        allFiles = results.flat();
      } else {
        const { files } = await listFiles(selectedAccountId, {
          query: searchQuery || undefined,
          folderId: currentFolderId || undefined,
          mimeType: typeFilter,
        });
        const account = accounts.find(a => a.id === selectedAccountId);
        allFiles = files.map(f => ({ ...f, account_id: selectedAccountId, account_email: account?.account_email }));
      }
      
      // Sort: folders first, then by name
      allFiles.sort((a, b) => {
        if (a.is_folder && !b.is_folder) return -1;
        if (!a.is_folder && b.is_folder) return 1;
        return a.name.localeCompare(b.name);
      });
      
      setFiles(allFiles);
    } finally {
      setLoading(false);
    }
  }, [open, accounts, selectedAccountId, searchQuery, currentFolderId, typeFilter, listFiles]);

  useEffect(() => {
    if (open) {
      loadFiles();
    }
  }, [open, loadFiles]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedAccountId('all');
      setSearchQuery('');
      setTypeFilter('all');
      setCurrentFolderId(null);
      setBreadcrumbs([]);
    }
  }, [open]);

  const handleFolderClick = (folder: DriveFile) => {
    setCurrentFolderId(folder.drive_file_id);
    setBreadcrumbs(prev => [...prev, { id: folder.drive_file_id, name: folder.name }]);
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      // Root
      setCurrentFolderId(null);
      setBreadcrumbs([]);
    } else {
      const crumb = breadcrumbs[index];
      setCurrentFolderId(crumb.id);
      setBreadcrumbs(prev => prev.slice(0, index + 1));
    }
  };

  const handleLinkFile = async (file: DriveFile) => {
    if (!file.account_id || file.is_folder) return;
    
    setLinking(file.drive_file_id);
    try {
      const success = await linkFile(file.account_id, file.drive_file_id, entityType, entityId);
      if (success) {
        onFileLinked();
        onOpenChange(false);
      }
    } finally {
      setLinking(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Link File from Google Drive</DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
            <SelectTrigger className="w-[180px]">
              <HardDrive className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All accounts</SelectItem>
              {accounts.map(account => (
                <SelectItem key={account.id} value={account.id}>
                  {account.account_name || account.account_email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as FileTypeFilter)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(FILE_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <FileBreadcrumbs
            items={[{ id: 'root', name: 'My Drive', isRoot: true }, ...breadcrumbs]}
            onNavigate={(folderId) => {
              if (folderId === null) {
                handleBreadcrumbClick(-1);
              } else {
                const index = breadcrumbs.findIndex(b => b.id === folderId);
                if (index >= 0) handleBreadcrumbClick(index);
              }
            }}
          />
        )}

        {/* File List */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <File className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No files found</p>
              {searchQuery && (
                <p className="text-sm mt-1">Try a different search term</p>
              )}
            </div>
          ) : (
            <div className="space-y-1 pb-4">
              {files.map(file => {
                const Icon = getFileIcon(file.mime_type);
                const isLinking = linking === file.drive_file_id;
                
                return (
                  <div
                    key={file.drive_file_id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg transition-colors",
                      file.is_folder
                        ? "hover:bg-muted/50 cursor-pointer"
                        : "hover:bg-primary/5 cursor-pointer"
                    )}
                    onClick={() => {
                      if (file.is_folder) {
                        handleFolderClick(file);
                      }
                    }}
                  >
                    <div className={cn(
                      "p-2 rounded-lg",
                      file.is_folder ? "bg-amber-500/10" : "bg-muted"
                    )}>
                      <Icon className={cn(
                        "h-4 w-4",
                        file.is_folder ? "text-amber-500" : "text-muted-foreground"
                      )} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      {file.account_email && (
                        <p className="text-xs text-muted-foreground">
                          {file.account_email}
                        </p>
                      )}
                    </div>

                    {file.is_folder ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isLinking}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLinkFile(file);
                        }}
                      >
                        {isLinking ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Link
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
