/**
 * Hook for file conversion functionality in Arlo
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { 
  ConversionJob, 
  ConversionOptions, 
  ConversionFormat, 
  InputFormat 
} from '@/types/conversion';
import { 
  getInputFormatFromMime, 
  getInputFormatFromExtension,
  getAvailableOutputFormats,
  isOfficeFormat 
} from '@/types/conversion';
import {
  convertPdfToImages,
  convertImagesToPdf,
  convertHeicToImage,
  convertImageFormat,
  canConvertInBrowser,
} from '@/lib/conversion/browser-converters';
import { getArloToken } from '@/lib/arloAuth';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

// Generate simple unique ID
function generateId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function useFileConversion() {
  const [jobs, setJobs] = useState<ConversionJob[]>([]);
  const [isConverting, setIsConverting] = useState(false);

  const updateJob = useCallback((id: string, updates: Partial<ConversionJob>) => {
    setJobs(prev => prev.map(job => 
      job.id === id ? { ...job, ...updates } : job
    ));
  }, []);

  const addJob = useCallback((job: ConversionJob) => {
    setJobs(prev => [job, ...prev]);
  }, []);

  const removeJob = useCallback((id: string) => {
    setJobs(prev => prev.filter(job => job.id !== id));
  }, []);

  const clearCompletedJobs = useCallback(() => {
    setJobs(prev => prev.filter(job => job.status !== 'done' && job.status !== 'failed'));
  }, []);

  /**
   * Start a conversion job
   */
  const convert = useCallback(async (
    file: File,
    outputFormat: ConversionFormat,
    options: ConversionOptions = {}
  ): Promise<ConversionJob | null> => {
    // Determine input format
    const inputFormat = getInputFormatFromMime(file.type) || 
                        getInputFormatFromExtension(file.name);
    
    if (!inputFormat) {
      toast.error('Unsupported file format');
      return null;
    }

    // Validate conversion is possible
    const availableFormats = getAvailableOutputFormats(inputFormat);
    if (!availableFormats.includes(outputFormat)) {
      toast.error(`Cannot convert ${inputFormat.toUpperCase()} to ${outputFormat.toUpperCase()}`);
      return null;
    }

    // Create job
    const job: ConversionJob = {
      id: generateId(),
      fileName: file.name,
      inputFormat,
      outputFormat,
      status: 'queued',
      progress: 0,
      createdAt: new Date(),
      options,
    };

    addJob(job);
    setIsConverting(true);

    try {
      updateJob(job.id, { status: 'converting', progress: 5 });

      let results: Blob[];
      const baseName = file.name.replace(/\.[^/.]+$/, '');

      // Check if we can convert in browser
      if (canConvertInBrowser(inputFormat, outputFormat)) {
        // Browser-based conversion
        if (inputFormat === 'pdf' && (outputFormat === 'png' || outputFormat === 'jpg')) {
          // PDF to images
          results = await convertPdfToImages(
            file, 
            outputFormat, 
            options,
            (progress) => updateJob(job.id, { progress: 5 + progress * 0.9 })
          );
        } else if (['heic', 'heif'].includes(inputFormat) && (outputFormat === 'png' || outputFormat === 'jpg')) {
          // HEIC to image
          const blob = await convertHeicToImage(
            file, 
            outputFormat, 
            options,
            (progress) => updateJob(job.id, { progress: 5 + progress * 0.9 })
          );
          results = [blob];
        } else if (outputFormat === 'pdf') {
          // Images to PDF
          const blob = await convertImagesToPdf(
            [file], 
            options,
            (progress) => updateJob(job.id, { progress: 5 + progress * 0.9 })
          );
          results = [blob];
        } else {
          // Image format conversion
          const blob = await convertImageFormat(
            file, 
            outputFormat, 
            options,
            (progress) => updateJob(job.id, { progress: 5 + progress * 0.9 })
          );
          results = [blob];
        }
      } else if (isOfficeFormat(inputFormat)) {
        // Office documents need server-side conversion via CloudConvert
        updateJob(job.id, { progress: 10 });
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('outputFormat', outputFormat);
        
        const token = await getArloToken();
        if (!token) throw new Error('Authentication required');
        
        const response = await fetch(`${SUPABASE_URL}/functions/v1/file-convert`, {
          method: 'POST',
          headers: {
            'X-Arlo-Authorization': `Bearer ${token}`,
          },
          body: formData,
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Conversion failed');
        }
        
        const result = await response.json();
        
        // Download the converted file from the URL
        const downloadResponse = await fetch(result.downloadUrl);
        const blob = await downloadResponse.blob();
        results = [blob];
        
        updateJob(job.id, { progress: 95 });
      } else {
        throw new Error('Conversion not supported');
      }

      // Generate output file names and create download URLs
      const outputFiles: { url: string; name: string }[] = [];
      
      for (let i = 0; i < results.length; i++) {
        const blob = results[i];
        const suffix = results.length > 1 ? `_page${i + 1}` : '';
        const outputName = `${baseName}${suffix}.${outputFormat}`;
        const url = URL.createObjectURL(blob);
        outputFiles.push({ url, name: outputName });
      }

      // Update job as complete
      updateJob(job.id, {
        status: 'done',
        progress: 100,
        completedAt: new Date(),
        outputFileUrl: outputFiles[0]?.url,
        outputFileName: outputFiles[0]?.name,
      });

      toast.success(`Converted ${file.name} successfully`);
      
      return { ...job, status: 'done' as const, progress: 100 };

    } catch (error) {
      console.error('Conversion error:', error);
      const message = error instanceof Error ? error.message : 'Conversion failed';
      
      updateJob(job.id, {
        status: 'failed',
        progress: 0,
        errorMessage: message,
      });

      toast.error(message);
      return null;
    } finally {
      setIsConverting(false);
    }
  }, [addJob, updateJob]);

  /**
   * Download a completed conversion
   */
  const downloadResult = useCallback((job: ConversionJob) => {
    if (!job.outputFileUrl || !job.outputFileName) return;
    
    const link = document.createElement('a');
    link.href = job.outputFileUrl;
    link.download = job.outputFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  /**
   * Retry a failed conversion
   */
  const retryJob = useCallback(async (job: ConversionJob, originalFile: File) => {
    removeJob(job.id);
    return convert(originalFile, job.outputFormat, job.options);
  }, [convert, removeJob]);

  return {
    jobs,
    isConverting,
    convert,
    downloadResult,
    retryJob,
    removeJob,
    clearCompletedJobs,
  };
}
