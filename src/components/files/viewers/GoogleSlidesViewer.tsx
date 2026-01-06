import { useState, useEffect, useCallback, useRef } from "react";
import { 
  Loader2, Save, ExternalLink, AlertCircle, ChevronLeft, ChevronRight, 
  Edit2, Cloud, CloudOff, Maximize2, Grid3X3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { getAuthHeaders } from "@/lib/arloAuth";
import { cn } from "@/lib/utils";
import type { DriveFile } from "@/types/files";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface GoogleSlidesViewerProps {
  file: DriveFile;
  accountId: string;
  onOpenInDrive: () => void;
}

interface TextRun {
  content: string;
  style?: {
    bold?: boolean;
    italic?: boolean;
    fontSize?: { magnitude: number; unit: string };
    foregroundColor?: { opaqueColor?: { rgbColor?: { red?: number; green?: number; blue?: number } } };
  };
}

interface TextElement {
  startIndex?: number;
  endIndex?: number;
  textRun?: TextRun;
  paragraphMarker?: {
    style?: {
      alignment?: string;
      bulletPreset?: string;
    };
    bullet?: {
      listId?: string;
      glyph?: string;
    };
  };
}

interface TextContent {
  textElements: TextElement[];
}

interface PageElement {
  objectId: string;
  size?: {
    width: { magnitude: number; unit: string };
    height: { magnitude: number; unit: string };
  };
  transform?: {
    scaleX: number;
    scaleY: number;
    translateX: number;
    translateY: number;
    unit?: string;
  };
  shape?: {
    shapeType: string;
    text?: TextContent;
    placeholder?: {
      type: string;
      index?: number;
    };
    shapeProperties?: {
      shapeBackgroundFill?: {
        solidFill?: {
          color?: { rgbColor?: { red?: number; green?: number; blue?: number } };
        };
      };
    };
  };
  image?: {
    contentUrl: string;
    sourceUrl?: string;
  };
  table?: {
    rows: number;
    columns: number;
    tableRows?: Array<{
      tableCells?: Array<{
        text?: TextContent;
      }>;
    }>;
  };
}

interface Slide {
  objectId: string;
  pageElements?: PageElement[];
  slideProperties?: {
    layoutObjectId?: string;
  };
  pageProperties?: {
    pageBackgroundFill?: {
      solidFill?: {
        color?: { rgbColor?: { red?: number; green?: number; blue?: number } };
      };
    };
  };
}

interface PresentationData {
  presentationId: string;
  title: string;
  slides: Slide[];
  pageSize?: {
    width: { magnitude: number; unit: string };
    height: { magnitude: number; unit: string };
  };
}

interface TextEdit {
  slideIndex: number;
  elementId: string;
  newText: string;
  originalText: string;
}

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

export function GoogleSlidesViewer({ file, accountId, onOpenInDrive }: GoogleSlidesViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [presentation, setPresentation] = useState<PresentationData | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [editingElement, setEditingElement] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [pendingEdits, setPendingEdits] = useState<TextEdit[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [showThumbnails, setShowThumbnails] = useState(true);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchPresentation = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const headers = await getAuthHeaders();
      if (!headers) throw new Error('Not authenticated');

      const response = await fetch(`${SUPABASE_URL}/functions/v1/google-workspace-api`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_slides',
          accountId,
          fileId: file.drive_file_id,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || 'Failed to load presentation');
      }

      const data = await response.json();
      if (data?.presentation) {
        setPresentation(data.presentation);
      }
    } catch (err) {
      console.error('Failed to fetch presentation:', err);
      setError('Failed to load presentation. You may need to reconnect your Google account.');
    } finally {
      setLoading(false);
    }
  }, [file.drive_file_id, accountId]);

  useEffect(() => {
    fetchPresentation();
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [fetchPresentation]);

  useEffect(() => {
    if (editingElement && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editingElement]);

  const extractText = (textContent: TextContent | undefined): string => {
    if (!textContent?.textElements) return "";
    return textContent.textElements
      .filter(el => el.textRun?.content)
      .map(el => el.textRun!.content)
      .join("")
      .trim();
  };

  const getElementPosition = (element: PageElement): React.CSSProperties => {
    const style: React.CSSProperties = {
      position: 'absolute',
    };

    // Standard slide is 720x540 points (10x7.5 inches at 72 DPI)
    const slideWidth = 720;
    const slideHeight = 540;

    if (element.transform) {
      const { translateX = 0, translateY = 0 } = element.transform;
      // Convert EMU to points (914400 EMU per inch, 72 points per inch)
      const x = (translateX / 914400) * 72;
      const y = (translateY / 914400) * 72;
      style.left = `${(x / slideWidth) * 100}%`;
      style.top = `${(y / slideHeight) * 100}%`;
    }

    if (element.size) {
      const w = (element.size.width.magnitude / 914400) * 72;
      const h = (element.size.height.magnitude / 914400) * 72;
      style.width = `${(w / slideWidth) * 100}%`;
      style.height = `${(h / slideHeight) * 100}%`;
    }

    return style;
  };

  const getPlaceholderType = (element: PageElement): string | null => {
    return element.shape?.placeholder?.type || null;
  };

  const handleTextClick = (elementId: string, currentText: string) => {
    setEditingElement(elementId);
    setEditValue(currentText);
  };

  const handleTextBlur = (elementId: string, originalText: string) => {
    if (editValue !== originalText) {
      setPendingEdits(prev => {
        const existing = prev.findIndex(e => e.elementId === elementId);
        const newEdit: TextEdit = {
          slideIndex: currentSlideIndex,
          elementId,
          newText: editValue,
          originalText,
        };
        
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = newEdit;
          return updated;
        }
        return [...prev, newEdit];
      });
      
      setSaveStatus('unsaved');
      
      // Trigger autosave
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        handleSave();
      }, 2000);
    }
    setEditingElement(null);
  };

  const handleSave = async () => {
    if (!presentation || pendingEdits.length === 0) return;
    
    setSaveStatus('saving');
    
    try {
      const requests: object[] = [];

      for (const edit of pendingEdits) {
        // Delete existing text
        if (edit.originalText) {
          requests.push({
            deleteText: {
              objectId: edit.elementId,
              textRange: { type: 'ALL' },
            },
          });
        }

        // Insert new text
        if (edit.newText) {
          requests.push({
            insertText: {
              objectId: edit.elementId,
              insertionIndex: 0,
              text: edit.newText,
            },
          });
        }
      }

      if (requests.length > 0) {
        const headers = await getAuthHeaders();
        if (!headers) throw new Error('Not authenticated');

        const response = await fetch(`${SUPABASE_URL}/functions/v1/google-workspace-api`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_slides',
            accountId,
            fileId: file.drive_file_id,
            content: { requests },
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save presentation');
        }
      }
      
      setSaveStatus('saved');
      setPendingEdits([]);
      toast.success('Presentation saved');
      await fetchPresentation();
    } catch (err) {
      console.error('Failed to save presentation:', err);
      setSaveStatus('error');
      toast.error('Failed to save changes');
    }
  };

  const goToSlide = (index: number) => {
    if (presentation && index >= 0 && index < presentation.slides.length) {
      setCurrentSlideIndex(index);
      setEditingElement(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (editingElement) return;
    
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      goToSlide(currentSlideIndex - 1);
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
      e.preventDefault();
      goToSlide(currentSlideIndex + 1);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading presentation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-center text-muted-foreground">{error}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchPresentation}>Try Again</Button>
          <Button onClick={onOpenInDrive}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in Google Slides
          </Button>
        </div>
      </div>
    );
  }

  const currentSlide = presentation?.slides[currentSlideIndex];
  const totalSlides = presentation?.slides.length || 0;

  const renderSlideContent = (slide: Slide, isPreview: boolean = false) => {
    const bgColor = slide.pageProperties?.pageBackgroundFill?.solidFill?.color?.rgbColor;
    const bgStyle = bgColor 
      ? { backgroundColor: `rgb(${(bgColor.red || 0) * 255}, ${(bgColor.green || 0) * 255}, ${(bgColor.blue || 0) * 255})` }
      : { backgroundColor: 'white' };

    return (
      <div className="relative h-full w-full" style={bgStyle}>
        {slide.pageElements?.map((element) => {
          const text = element.shape?.text ? extractText(element.shape.text) : null;
          const placeholderType = getPlaceholderType(element);
          const style = getElementPosition(element);
          const hasPendingEdit = pendingEdits.some(e => e.elementId === element.objectId);
          
          const isTitle = placeholderType === 'TITLE' || placeholderType === 'CENTERED_TITLE';
          const isSubtitle = placeholderType === 'SUBTITLE';
          const isBody = placeholderType === 'BODY';

          if (element.image) {
            return (
              <div key={element.objectId} style={style} className="overflow-hidden">
                <img
                  src={element.image.contentUrl}
                  alt=""
                  className="h-full w-full object-contain"
                  crossOrigin="anonymous"
                />
              </div>
            );
          }

          if (text !== null && !isPreview) {
            const isEditing = editingElement === element.objectId;
            
            return (
              <div
                key={element.objectId}
                style={style}
                className={cn(
                  "flex p-2 overflow-hidden",
                  isTitle && "items-start",
                  isSubtitle && "items-center",
                  isBody && "items-start",
                  hasPendingEdit && !isEditing && "ring-2 ring-amber-400 ring-offset-1"
                )}
              >
                {isEditing ? (
                  <Textarea
                    ref={textareaRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleTextBlur(element.objectId, text)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setEditingElement(null);
                      }
                    }}
                    className={cn(
                      "h-full w-full resize-none border-2 border-primary bg-white/90 dark:bg-background/90",
                      isTitle && "text-2xl font-bold",
                      isSubtitle && "text-lg",
                      isBody && "text-base"
                    )}
                  />
                ) : (
                  <div
                    onClick={() => handleTextClick(element.objectId, text)}
                    className={cn(
                      "w-full cursor-text rounded px-1 transition-colors",
                      "hover:bg-primary/10",
                      isTitle && "text-2xl font-bold leading-tight",
                      isSubtitle && "text-lg text-muted-foreground",
                      isBody && "text-base leading-relaxed whitespace-pre-wrap"
                    )}
                  >
                    {text || <span className="italic text-muted-foreground/50">Click to add text</span>}
                  </div>
                )}
              </div>
            );
          }

          // Preview mode - just show text
          if (text !== null && isPreview) {
            return (
              <div
                key={element.objectId}
                style={style}
                className={cn(
                  "flex overflow-hidden p-1",
                  isTitle && "items-start",
                )}
              >
                <div className={cn(
                  "truncate text-[6px] leading-tight",
                  isTitle && "font-bold"
                )}>
                  {text}
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>
    );
  };

  return (
    <div 
      className="flex h-full flex-col bg-muted/50" 
      onKeyDown={handleKeyDown} 
      tabIndex={0}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b bg-background px-3 py-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium truncate max-w-[200px]">
            {presentation?.title || file.name}
          </span>
          <span className="text-xs text-muted-foreground">
            Slide {currentSlideIndex + 1} of {totalSlides}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 w-7 p-0"
            onClick={() => setShowThumbnails(!showThumbnails)}
            title={showThumbnails ? "Hide thumbnails" : "Show thumbnails"}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <Cloud className="h-3.5 w-3.5" />
              Saved
            </span>
          )}
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving...
            </span>
          )}
          {saveStatus === 'unsaved' && (
            <>
              <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <CloudOff className="h-3.5 w-3.5" />
                Unsaved
              </span>
              <Button size="sm" className="h-7" onClick={handleSave}>
                <Save className="mr-1 h-3.5 w-3.5" />
                Save
              </Button>
            </>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              Error
            </span>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Slide Thumbnails */}
        {showThumbnails && (
          <ScrollArea className="w-40 flex-shrink-0 border-r bg-background">
            <div className="p-2 space-y-2">
              {presentation?.slides.map((slide, idx) => (
                <button
                  key={slide.objectId}
                  onClick={() => goToSlide(idx)}
                  className={cn(
                    "relative w-full rounded-md border-2 overflow-hidden transition-all",
                    "hover:border-primary/50",
                    idx === currentSlideIndex
                      ? "border-primary shadow-md"
                      : "border-transparent"
                  )}
                >
                  <div className="aspect-video bg-white shadow-sm">
                    {renderSlideContent(slide, true)}
                  </div>
                  <div className={cn(
                    "absolute bottom-1 left-1 flex h-5 min-w-[20px] items-center justify-center rounded px-1 text-[10px] font-medium",
                    idx === currentSlideIndex
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {idx + 1}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Main Slide View */}
        <div className="flex flex-1 flex-col items-center justify-center p-6">
          <div className="relative w-full max-w-4xl">
            {/* Slide */}
            <div className="aspect-video w-full overflow-hidden rounded-lg bg-white shadow-xl ring-1 ring-black/5">
              {currentSlide && renderSlideContent(currentSlide)}
            </div>

            {/* Navigation Arrows */}
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-0 top-1/2 -translate-x-12 -translate-y-1/2 rounded-full shadow-lg"
              onClick={() => goToSlide(currentSlideIndex - 1)}
              disabled={currentSlideIndex === 0}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-0 top-1/2 translate-x-12 -translate-y-1/2 rounded-full shadow-lg"
              onClick={() => goToSlide(currentSlideIndex + 1)}
              disabled={currentSlideIndex >= totalSlides - 1}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Slide Counter */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-full bg-background px-4 py-1.5 shadow">
              {Array.from({ length: Math.min(totalSlides, 10) }, (_, i) => (
                <button
                  key={i}
                  onClick={() => goToSlide(i)}
                  className={cn(
                    "h-2 w-2 rounded-full transition-all",
                    i === currentSlideIndex
                      ? "bg-primary w-4"
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  )}
                />
              ))}
              {totalSlides > 10 && (
                <span className="ml-1 text-xs text-muted-foreground">+{totalSlides - 10}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t bg-background px-4 py-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <Edit2 className="h-3 w-3" />
          Click text to edit • Use arrow keys to navigate
        </span>
        <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={onOpenInDrive}>
          <ExternalLink className="mr-1 h-3 w-3" />
          Open in Google Slides
        </Button>
      </div>
    </div>
  );
}
