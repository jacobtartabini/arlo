/**
 * File Conversion Section for Arlo Files module
 * Compact collapsible panel for file conversion
 */

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileType, 
  ArrowRight, 
  X, 
  Check, 
  AlertCircle,
  Download,
  Trash2,
  Loader2,
  FileImage,
  FileText,
  Table,
  Presentation,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useFileConversion } from '@/hooks/useFileConversion';
import type { 
  ConversionFormat, 
  InputFormat, 
  ConversionJob, 
  ConversionOptions 
} from '@/types/conversion';
import { 
  getInputFormatFromMime, 
  getInputFormatFromExtension,
  getAvailableOutputFormats,
  FORMAT_LABELS,
  isOfficeFormat,
} from '@/types/conversion';
import { formatDistanceToNow } from 'date-fns';

interface FileConversionSectionProps {
  preloadedFile?: File;
  onClearPreload?: () => void;
}

function formatFileSize(bytes: number | undefined): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFormatIcon(format: InputFormat | ConversionFormat, size = 'h-4 w-4') {
  if (['png', 'jpg', 'jpeg', 'webp', 'heic', 'heif'].includes(format)) {
    return <FileImage className={cn(size, "text-purple-500")} />;
  }
  if (format === 'pdf') {
    return <FileText className={cn(size, "text-red-500")} />;
  }
  if (format === 'docx') {
    return <FileText className={cn(size, "text-blue-500")} />;
  }
  if (format === 'xlsx') {
    return <Table className={cn(size, "text-green-500")} />;
  }
  if (format === 'pptx') {
    return <Presentation className={cn(size, "text-orange-500")} />;
  }
  return <FileType className={cn(size, "text-muted-foreground")} />;
}

export function FileConversionSection({ preloadedFile, onClearPreload }: FileConversionSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { jobs, isConverting, convert, downloadResult, removeJob, clearCompletedJobs } = useFileConversion();
  
  // Collapsible state
  const [isOpen, setIsOpen] = useState(false);
  
  // Selected file state
  const [selectedFile, setSelectedFile] = useState<File | null>(preloadedFile || null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Conversion options
  const [outputFormat, setOutputFormat] = useState<ConversionFormat | null>(null);
  const [quality, setQuality] = useState(90);
  const [dpi, setDpi] = useState(150);
  
  // Derive input format
  const inputFormat = selectedFile 
    ? getInputFormatFromMime(selectedFile.type) || getInputFormatFromExtension(selectedFile.name)
    : null;
  
  const availableFormats = inputFormat ? getAvailableOutputFormats(inputFormat) : [];
  
  const activeJobs = jobs.filter(j => j.status === 'queued' || j.status === 'converting');
  const completedJobs = jobs.filter(j => j.status === 'done' || j.status === 'failed');
  
  // Reset output format when file changes
  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setOutputFormat(null);
    setIsOpen(true);
    onClearPreload?.();
  }, [onClearPreload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleConvert = useCallback(async () => {
    if (!selectedFile || !outputFormat) return;
    
    const options: ConversionOptions = {
      quality,
      dpi,
      pages: 'all',
    };
    
    await convert(selectedFile, outputFormat, options);
    
    // Clear selection after conversion starts
    setSelectedFile(null);
    setOutputFormat(null);
  }, [selectedFile, outputFormat, quality, dpi, convert]);

  const handleClearFile = useCallback(() => {
    setSelectedFile(null);
    setOutputFormat(null);
    onClearPreload?.();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onClearPreload]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border border-border/60 bg-muted/20">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <FileType className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Convert Files</p>
                <p className="text-xs text-muted-foreground">
                  PDF, images, Office documents
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeJobs.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  {activeJobs.length}
                </Badge>
              )}
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="border-t border-border/40 px-4 py-4 space-y-4">
            {/* Compact drop zone or file selection */}
            {!selectedFile ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={cn(
                  "relative flex items-center justify-center gap-3 rounded-lg border-2 border-dashed p-4 transition-colors cursor-pointer",
                  isDragging 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50 hover:bg-muted/30"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileInputChange}
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.heif,.docx,.xlsx,.pptx"
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm">
                  Drop file or <span className="text-primary font-medium">browse</span>
                </span>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                {/* Selected file row */}
                <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                  {inputFormat && getFormatIcon(inputFormat)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(selectedFile.size)} • {FORMAT_LABELS[inputFormat!] || 'Unknown'}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleClearFile}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Conversion controls inline */}
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Convert to</Label>
                    <Select 
                      value={outputFormat || ''} 
                      onValueChange={(v) => setOutputFormat(v as ConversionFormat)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableFormats.map(format => (
                          <SelectItem key={format} value={format}>
                            <div className="flex items-center gap-2">
                              {getFormatIcon(format, 'h-3.5 w-3.5')}
                              {FORMAT_LABELS[format]}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button 
                    onClick={handleConvert}
                    disabled={!outputFormat || isConverting}
                    size="sm"
                    className="gap-1.5"
                  >
                    {isConverting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ArrowRight className="h-3.5 w-3.5" />
                    )}
                    Convert
                  </Button>
                </div>

                {/* Compact options */}
                {outputFormat && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-3 rounded-md border bg-muted/20 p-3"
                  >
                    {['png', 'jpg', 'webp'].includes(outputFormat) && (
                      <div className="flex items-center gap-3">
                        <Label className="text-xs w-16">Quality</Label>
                        <Slider
                          value={[quality]}
                          onValueChange={([v]) => setQuality(v)}
                          min={10}
                          max={100}
                          step={5}
                          className="flex-1"
                        />
                        <span className="text-xs text-muted-foreground w-8 text-right">{quality}%</span>
                      </div>
                    )}

                    {inputFormat === 'pdf' && ['png', 'jpg'].includes(outputFormat) && (
                      <div className="flex items-center gap-3">
                        <Label className="text-xs w-16">DPI</Label>
                        <Slider
                          value={[dpi]}
                          onValueChange={([v]) => setDpi(v)}
                          min={72}
                          max={300}
                          step={18}
                          className="flex-1"
                        />
                        <span className="text-xs text-muted-foreground w-8 text-right">{dpi}</span>
                      </div>
                    )}

                    {isOfficeFormat(inputFormat!) && (
                      <p className="text-xs text-muted-foreground">
                        Office documents are converted securely in the cloud.
                      </p>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Active conversions */}
            <AnimatePresence>
              {activeJobs.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-2"
                >
                  <p className="text-xs font-medium text-muted-foreground">Converting</p>
                  {activeJobs.map(job => (
                    <CompactJobRow key={job.id} job={job} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Completed conversions */}
            <AnimatePresence>
              {completedJobs.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">Recent</p>
                    <button 
                      type="button"
                      onClick={clearCompletedJobs}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                  </div>
                  {completedJobs.slice(0, 3).map(job => (
                    <CompactJobRow 
                      key={job.id} 
                      job={job} 
                      onDownload={() => downloadResult(job)}
                      onRemove={() => removeJob(job.id)}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function CompactJobRow({ 
  job, 
  onDownload,
  onRemove,
}: { 
  job: ConversionJob;
  onDownload?: () => void;
  onRemove?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -5 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 5 }}
      className={cn(
        "flex items-center gap-2 rounded-md border bg-background p-2",
        job.status === 'failed' && "border-destructive/50 bg-destructive/5"
      )}
    >
      {getFormatIcon(job.inputFormat, 'h-3.5 w-3.5')}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium truncate max-w-[120px]">{job.fileName}</p>
          <ArrowRight className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
          <Badge variant="secondary" className="text-[10px] px-1 py-0">
            {FORMAT_LABELS[job.outputFormat]}
          </Badge>
        </div>
        
        {job.status === 'converting' && (
          <Progress value={job.progress} className="mt-1 h-0.5" />
        )}
        
        {job.status === 'failed' && job.errorMessage && (
          <p className="text-[10px] text-destructive truncate">{job.errorMessage}</p>
        )}
      </div>

      <div className="flex items-center gap-0.5">
        {job.status === 'converting' && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        )}
        
        {job.status === 'done' && (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-500" />
            {onDownload && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDownload}>
                <Download className="h-3 w-3" />
              </Button>
            )}
          </>
        )}
        
        {job.status === 'failed' && (
          <AlertCircle className="h-3.5 w-3.5 text-destructive" />
        )}
        
        {onRemove && (job.status === 'done' || job.status === 'failed') && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRemove}>
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}
