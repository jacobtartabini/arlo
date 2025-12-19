"use client";

import { useState, useCallback, useRef } from "react";
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
  Download,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PDFViewerModuleProps {
  id: string;
  onClose: () => void;
}

export function PDFViewerModule({ id, onClose }: PDFViewerModuleProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string>("");
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      alert("Please select a PDF file");
      return;
    }

    const url = URL.createObjectURL(file);
    setPdfUrl(url);
    setPdfName(file.name);
  }, []);

  const handleUrlInput = useCallback((url: string) => {
    if (url.endsWith(".pdf") || url.includes("pdf")) {
      setPdfUrl(url);
      setPdfName(url.split("/").pop() || "Document");
    }
  }, []);

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
        /* PDF viewer */
        <div className="flex flex-col h-[calc(100%-44px)]">
          {/* PDF Controls */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-muted/30">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
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
                disabled={currentPage >= totalPages}
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
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => window.open(pdfUrl, "_blank")}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* PDF Content */}
          <div className="flex-1 overflow-auto bg-muted/20">
            <iframe
              src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
              className="w-full h-full"
              style={{ 
                transform: `scale(${zoom / 100})`,
                transformOrigin: "top left",
                width: `${10000 / zoom}%`,
                height: `${10000 / zoom}%`,
              }}
              title="PDF Viewer"
            />
          </div>
        </div>
      )}
    </Card>
  );
}
