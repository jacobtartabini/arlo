"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  X, 
  GripVertical, 
  FileText, 
  Upload, 
  ZoomIn, 
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Edit,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { renderPdfPageToDataUrl, getPdfInfo } from "@/lib/pdf-renderer";
import { toast } from "sonner";

interface PDFViewerModuleProps {
  id: string;
  onClose: () => void;
  onOpenForAnnotation?: (pdfUrl: string, fileName: string) => void;
}

export function PDFViewerModule({ id, onClose, onOpenForAnnotation }: PDFViewerModuleProps) {
  const navigate = useNavigate();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string>("");
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pageImageUrl, setPageImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please select a PDF file");
      return;
    }

    const url = URL.createObjectURL(file);
    setPdfUrl(url);
    setPdfName(file.name);
    
    // Get PDF info
    setIsLoading(true);
    try {
      const info = await getPdfInfo(url);
      setTotalPages(info.totalPages);
      setCurrentPage(1);
    } catch (error) {
      console.error('Failed to load PDF:', error);
      toast.error('Failed to load PDF');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleUrlInput = useCallback(async (url: string) => {
    if (!url.endsWith(".pdf") && !url.includes("pdf")) return;
    
    setPdfUrl(url);
    setPdfName(url.split("/").pop() || "Document");
    
    setIsLoading(true);
    try {
      const info = await getPdfInfo(url);
      setTotalPages(info.totalPages);
      setCurrentPage(1);
    } catch (error) {
      console.error('Failed to load PDF:', error);
      toast.error('Failed to load PDF');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Render current page
  useEffect(() => {
    if (!pdfUrl) return;

    const renderPage = async () => {
      setIsLoading(true);
      try {
        const dataUrl = await renderPdfPageToDataUrl(pdfUrl, currentPage, zoom / 50);
        setPageImageUrl(dataUrl);
      } catch (error) {
        console.error('Failed to render page:', error);
      } finally {
        setIsLoading(false);
      }
    };

    renderPage();
  }, [pdfUrl, currentPage, zoom]);

  const handleOpenForAnnotation = useCallback(() => {
    if (pdfUrl && onOpenForAnnotation) {
      onOpenForAnnotation(pdfUrl, pdfName);
    } else if (pdfUrl) {
      // Navigate to notes with this PDF for annotation
      toast.info("Opening PDF for annotation...");
      // Store PDF info and navigate
      sessionStorage.setItem('pendingPdfAnnotation', JSON.stringify({ url: pdfUrl, name: pdfName }));
      navigate('/notes', { state: { action: 'annotate-pdf', pdfUrl, pdfName } });
    }
  }, [pdfUrl, pdfName, onOpenForAnnotation, navigate]);

  return (
    <Card className={cn(
      "overflow-hidden shadow-2xl border-border/60 transition-all",
      isExpanded ? "w-[600px] h-[500px]" : "w-80 h-96"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between bg-muted/50 px-3 py-2 border-b border-border/40 cursor-move">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <FileText className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium truncate max-w-[120px]">
            {pdfName || "PDF Viewer"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {!pdfUrl ? (
        /* Upload area */
        <div className="flex flex-col items-center justify-center h-[calc(100%-44px)] p-4">
          <div
            className="flex flex-col items-center justify-center w-full h-full border-2 border-dashed border-border/60 rounded-lg hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium mb-1">Upload PDF</p>
            <p className="text-xs text-muted-foreground">Click or drag file here</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          <div className="flex items-center gap-2 mt-4 w-full">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          
          <Input
            placeholder="Paste PDF URL..."
            className="mt-4 h-9 text-sm"
            onBlur={(e) => handleUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleUrlInput((e.target as HTMLInputElement).value);
              }
            }}
          />
        </div>
      ) : (
        /* PDF viewer with canvas rendering */
        <div className="flex flex-col h-[calc(100%-44px)]">
          {/* PDF Controls */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-muted/30">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground px-2">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages || isLoading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setZoom(Math.max(50, zoom - 25))}
                disabled={isLoading}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground w-12 text-center">
                {zoom}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setZoom(Math.min(200, zoom + 25))}
                disabled={isLoading}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 ml-2"
                onClick={handleOpenForAnnotation}
                disabled={isLoading}
              >
                <Edit className="h-3 w-3" />
                <span className="text-xs">Annotate</span>
              </Button>
            </div>
          </div>
          
          {/* PDF Content - Canvas-based rendering */}
          <div className="flex-1 overflow-auto bg-muted/20 flex items-center justify-center">
            {isLoading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Loading page...</span>
              </div>
            ) : pageImageUrl ? (
              <img 
                src={pageImageUrl} 
                alt={`Page ${currentPage}`}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="text-muted-foreground text-sm">No page to display</div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
