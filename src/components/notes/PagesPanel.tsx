"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NotePage } from "@/types/notes";

interface PagesPanelProps {
  pages: NotePage[];
  currentPage: number;
  onPageChange: (pageNumber: number) => void;
  onAddPage: () => void;
  showAddButton?: boolean;
  pdfUrl?: string;
  className?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function PagesPanel({
  pages,
  currentPage,
  onPageChange,
  onAddPage,
  showAddButton = true,
  pdfUrl,
  className,
  collapsed = false,
  onToggleCollapse,
}: PagesPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activePageRef = useRef<HTMLButtonElement>(null);

  // Scroll to active page when it changes
  useEffect(() => {
    if (activePageRef.current) {
      activePageRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [currentPage]);

  if (collapsed) {
    return (
      <div className={cn("flex flex-col items-center py-2 bg-card/50 border-r border-border/40", className)}>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="h-8 w-8 mb-2"
          title="Expand pages panel"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="flex flex-col items-center gap-1">
          {pages.slice(0, 5).map((page) => (
            <button
              key={page.id}
              onClick={() => onPageChange(page.pageNumber)}
              className={cn(
                "w-6 h-6 rounded text-xs font-medium transition-colors",
                currentPage === page.pageNumber
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground"
              )}
            >
              {page.pageNumber}
            </button>
          ))}
          {pages.length > 5 && (
            <span className="text-xs text-muted-foreground">+{pages.length - 5}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col w-32 bg-card/50 border-r border-border/40 print:hidden",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-2 border-b border-border/40">
        <span className="text-xs font-medium text-muted-foreground">Pages</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="h-6 w-6"
          title="Collapse pages panel"
        >
          <ChevronLeft className="h-3 w-3" />
        </Button>
      </div>

      {/* Scrollable pages list */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-2 space-y-2">
          {pages.map((page) => (
            <button
              key={page.id}
              ref={currentPage === page.pageNumber ? activePageRef : undefined}
              onClick={() => onPageChange(page.pageNumber)}
              className={cn(
                "w-full aspect-[3/4] rounded-lg border-2 transition-all",
                "flex flex-col items-center justify-center gap-1",
                "hover:border-primary/50 hover:bg-muted/50",
                currentPage === page.pageNumber
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border/60 bg-background"
              )}
              title={`Go to page ${page.pageNumber}`}
            >
              {/* Page thumbnail placeholder */}
              <div className="w-full h-full flex items-center justify-center">
                {pdfUrl ? (
                  <FileText className="h-6 w-6 text-muted-foreground/50" />
                ) : (
                  <div className="w-3/4 h-3/4 bg-muted/30 rounded flex items-center justify-center">
                    {page.canvasState && page.canvasState !== '{}' ? (
                      <div className="w-full h-full bg-gradient-to-br from-muted/20 to-muted/40 rounded" />
                    ) : (
                      <span className="text-[10px] text-muted-foreground/50">Empty</span>
                    )}
                  </div>
                )}
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">
                {page.pageNumber}
              </span>
            </button>
          ))}

          {/* Add page button */}
          {showAddButton && (
            <button
              onClick={onAddPage}
              className={cn(
                "w-full aspect-[3/4] rounded-lg border-2 border-dashed",
                "border-border/60 hover:border-primary/50 hover:bg-muted/30",
                "flex flex-col items-center justify-center gap-1 transition-all"
              )}
              title="Add new page"
            >
              <Plus className="h-5 w-5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Add Page</span>
            </button>
          )}
        </div>
      </ScrollArea>

      {/* Footer with page count */}
      <div className="px-2 py-1.5 border-t border-border/40 text-center">
        <span className="text-[10px] text-muted-foreground">
          {currentPage} of {pages.length}
        </span>
      </div>
    </div>
  );
}
