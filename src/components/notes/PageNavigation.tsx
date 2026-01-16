"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageNavigationProps {
  currentPage: number;
  totalPages: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onAddPage: () => void;
  onGoToPage?: (pageNum: number) => void;
  className?: string;
  showAddButton?: boolean;
  disabled?: boolean;
}

export function PageNavigation({
  currentPage,
  totalPages,
  onPreviousPage,
  onNextPage,
  onAddPage,
  onGoToPage,
  className,
  showAddButton = true,
  disabled = false,
}: PageNavigationProps) {
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;
  const isLastPage = currentPage === totalPages;

  return (
    <div 
      className={cn(
        "flex items-center justify-center gap-2 px-4 py-2",
        "bg-background/80 backdrop-blur-sm border-t border-border/40",
        "safe-area-inset-bottom",
        className
      )}
    >
      {/* Previous Page */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onPreviousPage}
        disabled={!canGoPrevious || disabled}
        className="h-8 w-8 p-0"
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Page Indicator */}
      <button
        type="button"
        onClick={() => onGoToPage?.(currentPage)}
        className={cn(
          "px-3 py-1 text-sm font-medium rounded-md",
          "bg-muted/50 hover:bg-muted transition-colors",
          "min-w-[80px] text-center",
          onGoToPage ? "cursor-pointer" : "cursor-default"
        )}
        disabled={disabled}
      >
        Page {currentPage} of {totalPages}
      </button>

      {/* Next Page */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onNextPage}
        disabled={!canGoNext || disabled}
        className="h-8 w-8 p-0"
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Add Page Button - only show on last page or always based on prop */}
      {showAddButton && (
        <Button
          variant="outline"
          size="sm"
          onClick={onAddPage}
          disabled={disabled}
          className={cn(
            "h-8 gap-1 ml-2 transition-opacity",
            !isLastPage && "opacity-50"
          )}
          aria-label="Add new page"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="text-xs">Add Page</span>
        </Button>
      )}
    </div>
  );
}
