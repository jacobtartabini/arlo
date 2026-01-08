import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  HardDrive,
  Search,
  RefreshCw,
  Folder,
  FileText,
  Image,
  File,
  ChevronRight,
  X,
  Cloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useFilesPersistence } from "@/hooks/useFilesPersistence";
import type { DriveAccount, DriveFile } from "@/types/files";
import { sortFilesWithFoldersFirst } from "@/types/files";
import { toast } from "sonner";
import { MobilePageLayout } from "../MobilePageLayout";

function getFileIcon(mimeType: string | null, isFolder: boolean) {
  if (isFolder) return Folder;
  if (mimeType?.startsWith('image/')) return Image;
  if (mimeType?.includes('document') || mimeType?.includes('text')) return FileText;
  return File;
}

export function MobileFilesView() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const {
    isLoading: filesLoading,
    listAccounts,
    listFiles,
    syncFiles,
  } = useFilesPersistence();

  const [accounts, setAccounts] = useState<DriveAccount[]>([]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    loadAccounts();
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (authLoading || !isAuthenticated || accounts.length === 0) return;
    
    const accountId = selectedAccountId || accounts[0]?.id;
    if (accountId) {
      loadFiles(accountId, currentFolderId);
    }
  }, [authLoading, isAuthenticated, accounts, selectedAccountId, currentFolderId]);

  const loadAccounts = async () => {
    const data = await listAccounts();
    setAccounts(data);
    if (data.length > 0 && !selectedAccountId) {
      setSelectedAccountId(data[0].id);
    }
  };

  const loadFiles = async (accountId: string, folderId: string | null = null) => {
    const { files: data } = await listFiles(accountId, { 
      folderId: folderId || undefined,
    });
    const sortedFiles = sortFilesWithFoldersFirst(data, 'modified_desc' as any);
    setFiles(sortedFiles);
  };

  const handleSync = async () => {
    if (!selectedAccountId) return;
    
    setIsSyncing(true);
    try {
      const count = await syncFiles(selectedAccountId);
      toast.success(`Synced ${count} files`);
      loadFiles(selectedAccountId, currentFolderId);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenFolder = (folder: DriveFile) => {
    setBreadcrumbs(prev => [...prev, { id: folder.drive_file_id, name: folder.name }]);
    setCurrentFolderId(folder.drive_file_id);
  };

  const handleNavigateUp = () => {
    if (breadcrumbs.length === 0) return;
    
    const newBreadcrumbs = breadcrumbs.slice(0, -1);
    setBreadcrumbs(newBreadcrumbs);
    setCurrentFolderId(newBreadcrumbs.length > 0 ? newBreadcrumbs[newBreadcrumbs.length - 1].id : null);
  };

  const handleFileClick = (file: DriveFile) => {
    if (file.is_folder) {
      handleOpenFolder(file);
    } else if (file.web_view_link) {
      window.open(file.web_view_link, '_blank');
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const filteredFiles = searchQuery
    ? files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : files;

  const isLoading = authLoading || filesLoading;

  if (isLoading && accounts.length === 0) {
    return (
      <MobilePageLayout title="Files" subtitle="Your cloud storage">
        <div className="space-y-4">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      </MobilePageLayout>
    );
  }

  return (
    <MobilePageLayout 
      title="Files"
      subtitle={accounts.length > 0 ? accounts[0].account_email : "Your cloud storage"}
      headerRight={
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9"
          onClick={handleSync}
          disabled={isSyncing}
        >
          <RefreshCw className={cn("h-5 w-5", isSyncing && "animate-spin")} />
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 rounded-xl bg-muted/50 border-0"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => {
                setBreadcrumbs([]);
                setCurrentFolderId(null);
              }}
              className="text-sm text-primary font-medium flex-shrink-0"
            >
              My Drive
            </button>
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.id} className="flex items-center gap-2 flex-shrink-0">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <button
                  onClick={() => {
                    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
                    setBreadcrumbs(newBreadcrumbs);
                    setCurrentFolderId(crumb.id);
                  }}
                  className={cn(
                    "text-sm font-medium",
                    index === breadcrumbs.length - 1 ? "text-foreground" : "text-primary"
                  )}
                >
                  {crumb.name}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* No Accounts */}
        {accounts.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 rounded-2xl border border-dashed bg-muted/20 text-center"
          >
            <Cloud className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <h3 className="font-medium mb-2">Connect Your Drive</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Link Google Drive to browse files
            </p>
            <Button size="sm" onClick={() => navigate('/settings')}>
              Go to Settings
            </Button>
          </motion.div>
        )}

        {/* Files List */}
        {accounts.length > 0 && (
          <div className="space-y-2">
            {filteredFiles.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <HardDrive className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>{searchQuery ? "No files found" : "This folder is empty"}</p>
              </div>
            ) : (
              filteredFiles.map((file, index) => {
                const FileIcon = getFileIcon(file.mime_type, file.is_folder);
                
                return (
                  <motion.button
                    key={file.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    onClick={() => handleFileClick(file)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 text-left active:scale-[0.98] transition-transform"
                  >
                    <div className={cn(
                      "p-2 rounded-lg",
                      file.is_folder ? "bg-amber-500/10" : "bg-primary/10"
                    )}>
                      <FileIcon className={cn(
                        "h-5 w-5",
                        file.is_folder ? "text-amber-500" : "text-primary"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {file.is_folder 
                          ? "Folder" 
                          : formatFileSize(file.size_bytes)
                        }
                      </p>
                    </div>
                    {file.is_folder && (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </motion.button>
                );
              })
            )}
          </div>
        )}
      </div>
    </MobilePageLayout>
  );
}
