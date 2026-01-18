import React, { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Page {
  id: string;
  pageNumber: number;
}

interface ContinuousPageScrollProps {
  pages: Page[];
  currentPageIndex: number;
  onPageChange: (pageIndex: number) => void;
  renderPage: (page: Page, isActive: boolean) => React.ReactNode;
  pageWidth?: number;
  pageHeight?: number;
  pageGap?: number;
  className?: string;
  onPointerPositionChange?: (pageIndex: number, localX: number, localY: number) => void;
}

/**
 * Continuous page scroll component that renders all pages in a single
 * vertical scrollable container, similar to Google Docs.
 */
export function ContinuousPageScroll({
  pages,
  currentPageIndex,
  onPageChange,
  renderPage,
  pageWidth = 816,  // Standard US Letter width at 96 DPI
  pageHeight = 1056, // Standard US Letter height at 96 DPI
  pageGap = 24,
  className,
  onPointerPositionChange,
}: ContinuousPageScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [activePageFromScroll, setActivePageFromScroll] = useState(currentPageIndex);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track which page is visible in the center of the viewport
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container || isScrollingRef.current) return;

    const containerRect = container.getBoundingClientRect();
    const viewportCenter = containerRect.top + containerRect.height / 2;

    let closestPage = 0;
    let closestDistance = Infinity;

    pageRefs.current.forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      const pageCenter = rect.top + rect.height / 2;
      const distance = Math.abs(viewportCenter - pageCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestPage = index;
      }
    });

    if (closestPage !== activePageFromScroll) {
      setActivePageFromScroll(closestPage);
      onPageChange(closestPage);
    }
  }, [activePageFromScroll, onPageChange]);

  // Debounced scroll handler
  const debouncedHandleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(handleScroll, 50);
  }, [handleScroll]);

  // Scroll to specific page when currentPageIndex changes programmatically
  useEffect(() => {
    const element = pageRefs.current.get(currentPageIndex);
    if (element && currentPageIndex !== activePageFromScroll) {
      isScrollingRef.current = true;
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Reset scrolling flag after animation completes
      setTimeout(() => {
        isScrollingRef.current = false;
        setActivePageFromScroll(currentPageIndex);
      }, 500);
    }
  }, [currentPageIndex, activePageFromScroll]);

  // Handle pointer move to determine which page is being edited
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!onPointerPositionChange) return;

    const container = containerRef.current;
    if (!container) return;

    let foundPage = false;
    pageRefs.current.forEach((element, index) => {
      if (foundPage) return;

      const rect = element.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        const localX = e.clientX - rect.left;
        const localY = e.clientY - rect.top;
        onPointerPositionChange(index, localX, localY);
        foundPage = true;
      }
    });
  }, [onPointerPositionChange]);

  // Register page ref
  const setPageRef = useCallback((index: number) => (el: HTMLDivElement | null) => {
    if (el) {
      pageRefs.current.set(index, el);
    } else {
      pageRefs.current.delete(index);
    }
  }, []);

  // Calculate total height for virtualization hints
  const totalHeight = useMemo(() => {
    return pages.length * pageHeight + (pages.length - 1) * pageGap;
  }, [pages.length, pageHeight, pageGap]);

  return (
    <ScrollArea 
      className={cn("h-full w-full", className)}
      onScrollCapture={debouncedHandleScroll}
    >
      <div
        ref={containerRef}
        className="relative flex flex-col items-center py-8 min-h-full"
        style={{ 
          paddingBottom: pageGap,
          // Background to simulate the "desk" area around pages
          backgroundColor: 'hsl(var(--muted))',
        }}
        onPointerMove={handlePointerMove}
      >
        {pages.map((page, index) => (
          <div
            key={page.id}
            ref={setPageRef(index)}
            className={cn(
              "relative bg-white shadow-lg transition-shadow duration-200",
              index === currentPageIndex && "ring-2 ring-primary/30"
            )}
            style={{
              width: pageWidth,
              height: pageHeight,
              marginBottom: index < pages.length - 1 ? pageGap : 0,
              // Paper texture/appearance
              boxShadow: index === currentPageIndex 
                ? '0 4px 20px rgba(0, 0, 0, 0.15)' 
                : '0 2px 10px rgba(0, 0, 0, 0.1)',
            }}
          >
            {renderPage(page, index === currentPageIndex)}
            
            {/* Page number indicator */}
            <div 
              className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-muted-foreground"
            >
              Page {page.pageNumber}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

/**
 * Hook for managing continuous page scroll with pointer routing
 */
export function useContinuousPageScroll(
  pages: { id: string; pageNumber: number }[],
  initialPage: number = 0
) {
  const [currentPageIndex, setCurrentPageIndex] = useState(initialPage);
  const [pointerPageIndex, setPointerPageIndex] = useState(initialPage);
  const [localPointerPosition, setLocalPointerPosition] = useState({ x: 0, y: 0 });

  const handlePointerPositionChange = useCallback(
    (pageIndex: number, localX: number, localY: number) => {
      setPointerPageIndex(pageIndex);
      setLocalPointerPosition({ x: localX, y: localY });
    },
    []
  );

  const handlePageChange = useCallback((pageIndex: number) => {
    setCurrentPageIndex(pageIndex);
  }, []);

  // The "active" page for editing is where the pointer currently is
  const activePageForEditing = pointerPageIndex;

  return {
    currentPageIndex,
    setCurrentPageIndex,
    pointerPageIndex,
    localPointerPosition,
    activePageForEditing,
    handlePointerPositionChange,
    handlePageChange,
  };
}
