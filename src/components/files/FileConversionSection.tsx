/**
 * File Conversion Section for Arlo Files module
 * Provides drag-drop interface for converting files
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
  RefreshCw,
  Loader2,
  FileImage,
  FileText,
  Table,
  Presentation,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
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

function getFormatIcon(format: InputFormat | ConversionFormat) {
  if (['png', 'jpg', 'jpeg', 'webp', 'heic', 'heif'].includes(format)) {
    return <FileImage className="h-5 w-5 text-purple-500" />;
  }
  if (format === 'pdf') {
    return <FileText className="h-5 w-5 text-red-500" />;
  }
  if (format === 'docx') {
    return <FileText className="h-5 w-5 text-blue-500" />;
  }
  if (format === 'xlsx') {
    return <Table className="h-5 w-5 text-green-500" />;
  }
  if (format === 'pptx') {
    return <Presentation className="h-5 w-5 text-orange-500" />;
  }
  return <FileType className="h-5 w-5 text-muted-foreground" />;
}

export function FileConversionSection({ preloadedFile, onClearPreload }: FileConversionSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { jobs, isConverting, convert, downloadResult, removeJob, clearCompletedJobs } = useFileConversion();
  
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
  
  // Reset output format when file changes
  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setOutputFormat(null);
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

  const completedJobs = jobs.filter(j => j.status === 'done' || j.status === 'failed');
  const activeJobs = jobs.filter(j => j.status === 'queued' || j.status === 'converting');

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileType className="h-5 w-5 text-primary" />
            File Conversion
          </CardTitle>
          {completedJobs.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={clearCompletedJobs}
              className="text-xs"
            >
              Clear history
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Drop zone / File selection */}
        {!selectedFile ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cn(
              "relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-8 transition-colors",
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
            <div className="rounded-full bg-primary/10 p-4">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-medium">
                Drop a file here or <span className="text-primary">browse</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Supports PDF, Images (PNG, JPG, HEIC), Word, Excel, PowerPoint
              </p>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Selected file info */}
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-4">
              {inputFormat && getFormatIcon(inputFormat)}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(selectedFile.size)} • {FORMAT_LABELS[inputFormat!] || 'Unknown'}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleClearFile}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Output format selection */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label>Convert to</Label>
                <Select 
                  value={outputFormat || ''} 
                  onValueChange={(v) => setOutputFormat(v as ConversionFormat)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select output format" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFormats.map(format => (
                      <SelectItem key={format} value={format}>
                        <div className="flex items-center gap-2">
                          {getFormatIcon(format)}
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
                className="gap-2"
              >
                {isConverting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                Convert
              </Button>
            </div>

            {/* Advanced options */}
            {outputFormat && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 rounded-lg border bg-muted/20 p-4"
              >
                <p className="text-sm font-medium">Options</p>
                
                {/* Quality slider for images */}
                {['png', 'jpg', 'webp'].includes(outputFormat) && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Quality</Label>
                      <span className="text-sm text-muted-foreground">{quality}%</span>
                    </div>
                    <Slider
                      value={[quality]}
                      onValueChange={([v]) => setQuality(v)}
                      min={10}
                      max={100}
                      step={5}
                    />
                  </div>
                )}

                {/* DPI for PDF to image */}
                {inputFormat === 'pdf' && ['png', 'jpg'].includes(outputFormat) && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Resolution (DPI)</Label>
                      <span className="text-sm text-muted-foreground">{dpi}</span>
                    </div>
                    <Slider
                      value={[dpi]}
                      onValueChange={([v]) => setDpi(v)}
                      min={72}
                      max={300}
                      step={18}
                    />
                  </div>
                )}

                {/* Office conversion note */}
                {isOfficeFormat(inputFormat!) && (
                  <p className="text-xs text-muted-foreground">
                    Office documents are converted using a secure cloud service.
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
              <p className="text-sm font-medium">Converting</p>
              {activeJobs.map(job => (
                <ConversionJobRow key={job.id} job={job} />
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
              <p className="text-sm font-medium">Recent</p>
              {completedJobs.slice(0, 5).map(job => (
                <ConversionJobRow 
                  key={job.id} 
                  job={job} 
                  onDownload={() => downloadResult(job)}
                  onRemove={() => removeJob(job.id)}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

function ConversionJobRow({ 
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
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3",
        job.status === 'failed' && "border-destructive/50 bg-destructive/5"
      )}
    >
      {getFormatIcon(job.inputFormat)}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{job.fileName}</p>
          <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
          <Badge variant="secondary" className="text-xs">
            {FORMAT_LABELS[job.outputFormat]}
          </Badge>
        </div>
        
        {job.status === 'converting' && (
          <Progress value={job.progress} className="mt-2 h-1" />
        )}
        
        {job.status === 'failed' && job.errorMessage && (
          <p className="mt-1 text-xs text-destructive">{job.errorMessage}</p>
        )}
        
        {job.status === 'done' && job.completedAt && (
          <p className="mt-1 text-xs text-muted-foreground">
            Completed {formatDistanceToNow(job.completedAt, { addSuffix: true })}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1">
        {job.status === 'converting' && (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        )}
        
        {job.status === 'done' && (
          <>
            <Check className="h-4 w-4 text-emerald-500" />
            {onDownload && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDownload}>
                <Download className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
        
        {job.status === 'failed' && (
          <AlertCircle className="h-4 w-4 text-destructive" />
        )}
        
        {onRemove && (job.status === 'done' || job.status === 'failed') && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}
