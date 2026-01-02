"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, GripVertical, Globe, ExternalLink, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface WebSearchModuleProps {
  id: string;
  onClose: () => void;
  onInsertLink: (url: string, title: string) => void;
}

export function WebSearchModule({ id, onClose, onInsertLink }: WebSearchModuleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [iframeSrc] = useState("https://www.google.com/webhp?igu=1");

  const handleOpenExternal = useCallback(() => {
    window.open("https://www.google.com", "_blank");
  }, []);

  return (
    <Card 
      className={cn(
        "overflow-hidden shadow-2xl border-border/60 transition-all duration-200",
        isExpanded ? "w-[600px] h-[500px]" : "w-80 h-96"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between bg-muted/50 px-3 py-2 border-b border-border/40 cursor-move">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <Globe className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium">Google Search</span>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            onClick={handleOpenExternal}
            title="Open in new tab"
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "Minimize" : "Expand"}
          >
            {isExpanded ? (
              <Minimize2 className="h-3 w-3" />
            ) : (
              <Maximize2 className="h-3 w-3" />
            )}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Embedded Google Search */}
      <div className="flex-1 h-[calc(100%-40px)] bg-white">
        <iframe
          src={iframeSrc}
          title="Google Search"
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Tip */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent px-3 py-2 pointer-events-none">
        <p className="text-[10px] text-muted-foreground text-center">
          Tip: Right-click links to copy or drag to your note
        </p>
      </div>
    </Card>
  );
}
