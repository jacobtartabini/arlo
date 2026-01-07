import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Cloud,
  Mail,
  X,
  Users,
  Building2,
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useFilesPersistence } from "@/hooks/useFilesPersistence";
import { useFilePreferences } from "@/hooks/useFilePreferences";
import type { DriveAccount, DriveFile, BreadcrumbItem, DriveSection, SharedDrive } from "@/types/files";
import { FILE_TYPE_LABELS, sortFilesWithFoldersFirst, canPreviewInApp } from "@/types/files";
import { FileCard } from "@/components/files/FileCard";
import { FileListItem } from "@/components/files/FileListItem";
import { FilePreviewPanel } from "@/components/files/FilePreviewPanel";
import { FileBreadcrumbs } from "@/components/files/FileBreadcrumbs";
import { FileSortDropdown } from "@/components/files/FileSortDropdown";
import { EmbeddedFileViewer } from "@/components/files/EmbeddedFileViewer";
import { FileConversionSection } from "@/components/files/FileConversionSection";

export default function Files() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const {
    isLoading: filesLoading,
    listAccounts,
    listFiles,
    listSharedDrives,
    searchAllFiles,
    syncFiles,
    getFileLinks,
  } = useFilesPersistence();

  const {
    preferences,
    setViewMode,
    setSortOption,
    setTypeFilter,
    sortOption,
  } = useFilePreferences();

  // State
  const [accounts, setAccounts] = useState<DriveAccount[]>([]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [fileLinks, setFileLinks] = useState<Map<string, Array<{ link_type: string; linked_entity_id: string }>>>(new Map());
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [viewingFile, setViewingFile] = useState<DriveFile | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Section state (My Drive / Shared with me / Shared Drives)
  const [driveSection, setDriveSection] = useState<DriveSection>('my_drive');
  const [sharedDrives, setSharedDrives] = useState<SharedDrive[]>([]);
  const [selectedSharedDriveId, setSelectedSharedDriveId] = useState<string | null>(null);
  
  // Folder navigation state
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);

  useEffect(() => {
    document.title = "Files - Arlo";
  }, []);

  // Load accounts on mount
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    loadAccounts();
  }, [authLoading, isAuthenticated]);

  // Load files when account, folder, section, or filter changes
  useEffect(() => {
    if (authLoading || !isAuthenticated || accounts.length === 0) return;
    
    const accountId = selectedAccountId || accounts[0]?.id;
    if (accountId) {
      loadFiles(accountId, currentFolderId);
      // Load shared drives when switching to an account
      loadSharedDrivesForAccount(accountId);
    }
  }, [authLoading, isAuthenticated, accounts, selectedAccountId, preferences.typeFilter, currentFolderId, driveSection, selectedSharedDriveId]);

  const loadAccounts = async () => {
    const data = await listAccounts();
    setAccounts(data);
    if (data.length > 0 && !selectedAccountId) {
      setSelectedAccountId(data[0].id);
      // Load shared drives for the first account
      loadSharedDrivesForAccount(data[0].id);
    }
  };

  const loadSharedDrivesForAccount = async (accountId: string) => {
    const drives = await listSharedDrives(accountId);
    setSharedDrives(drives);
  };

  const loadFiles = async (accountId: string, folderId: string | null = null) => {
    const { files: data } = await listFiles(accountId, { 
      mimeType: preferences.typeFilter,
      folderId: folderId || undefined,
      driveSection,
      sharedDriveId: driveSection === 'shared_drive' ? selectedSharedDriveId || undefined : undefined,
    });
    // Sort with folders first
    const sortedFiles = sortFilesWithFoldersFirst(data, sortOption);
    setFiles(sortedFiles);
    
    // Load links for these files
    const driveFileIds = data.filter(f => !f.is_folder).map(f => f.drive_file_id);
    if (driveFileIds.length > 0) {
      const links = await getFileLinks(driveFileIds);
      const linkMap = new Map<string, Array<{ link_type: string; linked_entity_id: string }>>();
      for (const link of links) {
        const key = link.drive_file_id_external;
        if (!linkMap.has(key)) {
          linkMap.set(key, []);
        }
        linkMap.get(key)!.push({ link_type: link.link_type, linked_entity_id: link.linked_entity_id });
      }
      setFileLinks(linkMap);
    } else {
      setFileLinks(new Map());
    }
  };

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      if (selectedAccountId) {
        loadFiles(selectedAccountId, currentFolderId);
      }
      return;
    }

    // Clear folder navigation when searching
    setCurrentFolderId(null);
    setBreadcrumbs([]);
    
    setIsSearching(true);
    try {
      const results = await searchAllFiles(accounts, searchQuery, preferences.typeFilter);
      const sortedResults = sortFilesWithFoldersFirst(results, sortOption);
      setFiles(sortedResults);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, accounts, preferences.typeFilter, searchAllFiles, selectedAccountId, currentFolderId, sortOption]);

  const handleClearSearch = () => {
    setSearchQuery('');
    if (selectedAccountId) {
      loadFiles(selectedAccountId, currentFolderId);
    }
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

  const handleFileClick = (file: DriveFile) => {
    if (canPreviewInApp(file.mime_type || '')) {
      // Open in embedded viewer - find account for this file
      const fileAccount = accounts.find(a => a.account_email === file.account_email);
      if (fileAccount) {
        setViewingFile({ ...file, _accountId: fileAccount.id } as DriveFile & { _accountId: string });
      } else {
        setViewingFile(file);
      }
    } else {
      // Show details panel
      setSelectedFile(file);
    }
  };

  const handleOpenFolder = (folder: DriveFile) => {
    // Add to breadcrumbs
    setBreadcrumbs(prev => [...prev, { id: folder.drive_file_id, name: folder.name }]);
    setCurrentFolderId(folder.drive_file_id);
    setSelectedFile(null);
    // Clear search when navigating folders
    if (searchQuery) {
      setSearchQuery('');
    }
  };

  const handleBreadcrumbNavigate = (folderId: string | null, name: string) => {
    if (folderId === null) {
      // Navigate to root
      setBreadcrumbs([]);
      setCurrentFolderId(null);
    } else {
      // Navigate to specific folder in breadcrumb
      const index = breadcrumbs.findIndex(b => b.id === folderId);
      if (index !== -1) {
        setBreadcrumbs(breadcrumbs.slice(0, index + 1));
        setCurrentFolderId(folderId);
      }
    }
    setSelectedFile(null);
  };

  const handleOpenInDrive = (file: DriveFile) => {
    if (file.web_view_link) {
      window.open(file.web_view_link, '_blank');
    }
  };

  const handleSortChange = (newSortOption: typeof sortOption) => {
    setSortOption(newSortOption);
    // Re-sort current files
    setFiles(prev => sortFilesWithFoldersFirst(prev, newSortOption));
  };

  const handleAccountChange = (accountId: string | null) => {
    setSelectedAccountId(accountId);
    // Reset folder navigation and section when switching accounts
    setCurrentFolderId(null);
    setBreadcrumbs([]);
    setSelectedFile(null);
    setDriveSection('my_drive');
    setSelectedSharedDriveId(null);
    // Load shared drives for new account
    if (accountId) {
      loadSharedDrivesForAccount(accountId);
    }
  };

  const handleSectionChange = (section: DriveSection) => {
    setDriveSection(section);
    setCurrentFolderId(null);
    setBreadcrumbs([]);
    setSelectedFile(null);
    if (section !== 'shared_drive') {
      setSelectedSharedDriveId(null);
    }
  };

  const handleSharedDriveSelect = (driveId: string) => {
    setSelectedSharedDriveId(driveId);
    setDriveSection('shared_drive');
    setCurrentFolderId(null);
    setBreadcrumbs([]);
    setSelectedFile(null);
  };

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  // Count folders and files
  const folderCount = files.filter(f => f.is_folder).length;
  const fileCount = files.filter(f => !f.is_folder).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Embedded File Viewer */}
      {viewingFile && (
        <EmbeddedFileViewer
          file={viewingFile}
          accountId={(viewingFile as DriveFile & { _accountId?: string })._accountId || selectedAccountId || undefined}
          onClose={() => setViewingFile(null)}
        />
      )}

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
            {/* Breadcrumbs */}
            {accounts.length > 0 && (
              <div className="flex items-center justify-between">
                <FileBreadcrumbs
                  items={breadcrumbs}
                  onNavigate={handleBreadcrumbNavigate}
                />
                <div className="flex items-center gap-2">
                  <FileSortDropdown
                    sortOption={sortOption}
                    onSortChange={handleSortChange}
                  />
                  <Button
                    variant={preferences.viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={preferences.viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Section Tabs (My Drive / Shared with me / Shared Drives) */}
              {selectedAccountId && (
                <div className="space-y-3">
                  <Tabs value={driveSection} onValueChange={(v) => handleSectionChange(v as DriveSection)}>
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="my_drive" className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4" />
                        <span className="hidden sm:inline">My Drive</span>
                      </TabsTrigger>
                      <TabsTrigger value="shared_with_me" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span className="hidden sm:inline">Shared with me</span>
                      </TabsTrigger>
                      <TabsTrigger 
                        value="shared_drive" 
                        className="flex items-center gap-2"
                        disabled={sharedDrives.length === 0}
                      >
                        <Building2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Shared Drives</span>
                        {sharedDrives.length > 0 && (
                          <span className="text-xs text-muted-foreground">({sharedDrives.length})</span>
                        )}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* Shared Drives selector */}
                  {driveSection === 'shared_drive' && sharedDrives.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {sharedDrives.map(drive => (
                        <Button
                          key={drive.id}
                          variant={selectedSharedDriveId === drive.id ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleSharedDriveSelect(drive.id)}
                          className="gap-2"
                        >
                          <Building2 className="h-3.5 w-3.5" />
                          {drive.name}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Search & Filters */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10 pr-10"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  {accounts.length > 1 && (
                    <select
                      value={selectedAccountId || ''}
                      onChange={(e) => handleAccountChange(e.target.value || null)}
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
                    value={preferences.typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as typeof preferences.typeFilter)}
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {Object.entries(FILE_TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Account & Section indicator & counts */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  {selectedAccount && (
                    <>
                      <Mail className="h-4 w-4" />
                      <span>
                        {driveSection === 'my_drive' && 'My Drive'}
                        {driveSection === 'shared_with_me' && 'Shared with me'}
                        {driveSection === 'shared_drive' && selectedSharedDriveId && (
                          <>Shared Drive: {sharedDrives.find(d => d.id === selectedSharedDriveId)?.name}</>
                        )}
                      </span>
                      <span className="text-muted-foreground/60">•</span>
                      <span className="font-medium text-foreground">{selectedAccount.account_email}</span>
                    </>
                  )}
                </div>
                {files.length > 0 && (
                  <span>
                    {folderCount > 0 && `${folderCount} folder${folderCount !== 1 ? 's' : ''}`}
                    {folderCount > 0 && fileCount > 0 && ', '}
                    {fileCount > 0 && `${fileCount} file${fileCount !== 1 ? 's' : ''}`}
                  </span>
                )}
              </div>

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
                  preferences.viewMode === 'grid' 
                    ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4" 
                    : "flex flex-col"
                )}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className={preferences.viewMode === 'grid' ? "h-40" : "h-16"} />
                  ))}
                </div>
              ) : files.length === 0 ? (
                <Card className="flex flex-col items-center justify-center gap-4 p-12">
                  <FolderOpen className="h-12 w-12 text-muted-foreground" />
                  <div className="text-center">
                    <h3 className="font-semibold">No files found</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {searchQuery 
                        ? 'Try a different search term' 
                        : currentFolderId 
                          ? 'This folder is empty' 
                          : 'This account has no files matching the current filter'}
                    </p>
                  </div>
                </Card>
              ) : preferences.viewMode === 'grid' ? (
                <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {files.map((file) => (
                    <FileCard
                      key={`${file.drive_file_id}-${file.account_email}`}
                      file={file}
                      isSelected={selectedFile?.drive_file_id === file.drive_file_id}
                      onClick={() => handleFileClick(file)}
                      onOpenInDrive={() => handleOpenInDrive(file)}
                      onOpenFolder={handleOpenFolder}
                    />
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-border rounded-lg border">
                  {files.map((file) => (
                    <FileListItem
                      key={`${file.drive_file_id}-${file.account_email}`}
                      file={file}
                      isSelected={selectedFile?.drive_file_id === file.drive_file_id}
                      onClick={() => handleFileClick(file)}
                      onOpenInDrive={() => handleOpenInDrive(file)}
                      onOpenFolder={handleOpenFolder}
                      links={(fileLinks.get(file.drive_file_id) || []) as Array<{ link_type: 'project' | 'task' | 'trip' | 'event'; linked_entity_id: string }>}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - File Preview */}
          {selectedFile && !viewingFile && (
            <FilePreviewPanel
              file={selectedFile}
              onClose={() => setSelectedFile(null)}
              onOpenInDrive={() => handleOpenInDrive(selectedFile)}
              onPreview={() => {
                if (canPreviewInApp(selectedFile.mime_type || '')) {
                  const fileAccount = accounts.find(a => a.account_email === selectedFile.account_email);
                  if (fileAccount) {
                    setViewingFile({ ...selectedFile, _accountId: fileAccount.id } as DriveFile & { _accountId: string });
                  } else {
                    setViewingFile(selectedFile);
                  }
                }
              }}
            />
          )}
        </div>

        {/* File Conversion - Secondary tool */}
        <FileConversionSection />
      </div>
    </div>
  );
}
