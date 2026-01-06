import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Search,
  Grid3X3,
  List,
  RefreshCw,
  HardDrive,
  FolderOpen,
  FileText,
  Table,
  Presentation,
  Image,
  Video,
  File,
  Cloud,
  Mail,
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useFilesPersistence } from "@/hooks/useFilesPersistence";
import type { DriveAccount, DriveFile, FileViewMode, FileTypeFilter } from "@/types/files";
import { FILE_TYPE_LABELS } from "@/types/files";
import { FileCard } from "@/components/files/FileCard";
import { FileListItem } from "@/components/files/FileListItem";
import { FilePreviewPanel } from "@/components/files/FilePreviewPanel";

export default function Files() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const {
    isLoading: filesLoading,
    listAccounts,
    listFiles,
    searchAllFiles,
    syncFiles,
  } = useFilesPersistence();

  // State
  const [accounts, setAccounts] = useState<DriveAccount[]>([]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [viewMode, setViewMode] = useState<FileViewMode>('grid');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<FileTypeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    document.title = "Files - Arlo";
  }, []);

  // Load accounts on mount
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    loadAccounts();
  }, [authLoading, isAuthenticated]);

  // Load files when account or filter changes
  useEffect(() => {
    if (authLoading || !isAuthenticated || accounts.length === 0) return;
    
    const accountId = selectedAccountId || accounts[0]?.id;
    if (accountId) {
      loadFiles(accountId);
    }
  }, [authLoading, isAuthenticated, accounts, selectedAccountId, typeFilter]);

  const loadAccounts = async () => {
    const data = await listAccounts();
    setAccounts(data);
    if (data.length > 0 && !selectedAccountId) {
      setSelectedAccountId(data[0].id);
    }
  };

  const loadFiles = async (accountId: string) => {
    const { files: data } = await listFiles(accountId, { mimeType: typeFilter });
    setFiles(data);
  };

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      if (selectedAccountId) {
        loadFiles(selectedAccountId);
      }
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchAllFiles(accounts, searchQuery, typeFilter);
      setFiles(results);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, accounts, typeFilter, searchAllFiles, selectedAccountId]);

  const handleSync = async () => {
    if (!selectedAccountId) return;
    
    setIsSyncing(true);
    try {
      const count = await syncFiles(selectedAccountId);
      toast.success(`Synced ${count} files`);
      loadFiles(selectedAccountId);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFileClick = (file: DriveFile) => {
    setSelectedFile(file);
  };

  const handleOpenInDrive = (file: DriveFile) => {
    if (file.web_view_link) {
      window.open(file.web_view_link, '_blank');
    }
  };

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8">
        {/* Header */}
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-3 py-1 text-xs font-medium transition hover:border-border"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <HardDrive className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Files</h1>
                <p className="text-sm text-muted-foreground">
                  Your unified file hub across all connected Google Drives
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing || !selectedAccountId}
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", isSyncing && "animate-spin")} />
              Sync
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex gap-6">
          {/* Left Panel - Files */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-medium">All Files</h2>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {/* Search & Filters */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search files across all drives..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  {accounts.length > 1 && (
                    <select
                      value={selectedAccountId || ''}
                      onChange={(e) => setSelectedAccountId(e.target.value || null)}
                      className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">All Accounts</option>
                      {accounts.map(account => (
                        <option key={account.id} value={account.id}>
                          {account.account_email}
                        </option>
                      ))}
                    </select>
                  )}
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as FileTypeFilter)}
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {Object.entries(FILE_TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Account indicator */}
              {selectedAccount && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>Viewing files from</span>
                  <span className="font-medium text-foreground">{selectedAccount.account_email}</span>
                </div>
              )}

              {/* Files Grid/List */}
              {accounts.length === 0 ? (
                <Card className="flex flex-col items-center justify-center gap-4 p-12">
                  <div className="rounded-full bg-muted p-4">
                    <Cloud className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold">No accounts connected</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Connect a Google Drive account in Settings to start browsing your files
                    </p>
                  </div>
                  <Button onClick={() => navigate('/settings')}>
                    Go to Settings
                  </Button>
                </Card>
              ) : filesLoading || isSearching ? (
                <div className={cn(
                  "gap-4",
                  viewMode === 'grid' 
                    ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4" 
                    : "flex flex-col"
                )}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className={viewMode === 'grid' ? "h-40" : "h-16"} />
                  ))}
                </div>
              ) : files.length === 0 ? (
                <Card className="flex flex-col items-center justify-center gap-4 p-12">
                  <FolderOpen className="h-12 w-12 text-muted-foreground" />
                  <div className="text-center">
                    <h3 className="font-semibold">No files found</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {searchQuery ? 'Try a different search term' : 'This account has no files matching the current filter'}
                    </p>
                  </div>
                </Card>
              ) : viewMode === 'grid' ? (
                <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {files.map((file) => (
                    <FileCard
                      key={file.drive_file_id}
                      file={file}
                      isSelected={selectedFile?.drive_file_id === file.drive_file_id}
                      onClick={() => handleFileClick(file)}
                      onOpenInDrive={() => handleOpenInDrive(file)}
                    />
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-border rounded-lg border">
                  {files.map((file) => (
                    <FileListItem
                      key={file.drive_file_id}
                      file={file}
                      isSelected={selectedFile?.drive_file_id === file.drive_file_id}
                      onClick={() => handleFileClick(file)}
                      onOpenInDrive={() => handleOpenInDrive(file)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - File Preview */}
          {selectedFile && (
            <FilePreviewPanel
              file={selectedFile}
              onClose={() => setSelectedFile(null)}
              onOpenInDrive={() => handleOpenInDrive(selectedFile)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
