import { useState, useEffect, useCallback } from "react";
import { Loader2, Save, ExternalLink, AlertCircle, ChevronLeft, ChevronRight, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
    };
  };
  image?: {
    contentUrl: string;
    sourceUrl?: string;
  };
}

interface Slide {
  objectId: string;
  pageElements?: PageElement[];
  slideProperties?: {
    layoutObjectId?: string;
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

export function GoogleSlidesViewer({ file, accountId, onOpenInDrive }: GoogleSlidesViewerProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presentation, setPresentation] = useState<PresentationData | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [editingElement, setEditingElement] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [pendingEdits, setPendingEdits] = useState<TextEdit[]>([]);

  const fetchPresentation = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/google-workspace-api`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
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
      setError('Failed to load presentation. You may need to reconnect your Google account with updated permissions.');
    } finally {
      setLoading(false);
    }
  }, [file.drive_file_id, accountId]);

  useEffect(() => {
    fetchPresentation();
  }, [fetchPresentation]);

  const extractText = (textContent: TextContent | undefined): string => {
    if (!textContent?.textElements) return "";
    return textContent.textElements
      .filter(el => el.textRun?.content)
      .map(el => el.textRun!.content)
      .join("")
      .trim();
  };

  const getElementStyle = (element: PageElement): React.CSSProperties => {
    const style: React.CSSProperties = {
      position: 'absolute',
    };

    if (element.transform) {
      const { translateX = 0, translateY = 0, scaleX = 1, scaleY = 1 } = element.transform;
      // Convert EMU to percentage (assuming 914400 EMU per inch, 96 DPI)
      const x = (translateX / 914400) * 96;
      const y = (translateY / 914400) * 96;
      style.left = `${(x / 720) * 100}%`;
      style.top = `${(y / 540) * 100}%`;
    }

    if (element.size) {
      const w = (element.size.width.magnitude / 914400) * 96;
      const h = (element.size.height.magnitude / 914400) * 96;
      style.width = `${(w / 720) * 100}%`;
      style.height = `${(h / 540) * 100}%`;
    }

    return style;
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
    }
    setEditingElement(null);
  };

  const handleSave = async () => {
    if (!presentation || pendingEdits.length === 0) return;
    
    setSaving(true);
    try {
      const requests: object[] = [];

      for (const edit of pendingEdits) {
        // Delete existing text
        if (edit.originalText) {
          requests.push({
            deleteText: {
              objectId: edit.elementId,
              textRange: {
                type: 'ALL',
              },
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
        if (!headers) {
          throw new Error('Not authenticated');
        }

        const response = await fetch(`${SUPABASE_URL}/functions/v1/google-workspace-api`, {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'update_slides',
            accountId,
            fileId: file.drive_file_id,
            content: { requests },
          }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: 'Request failed' }));
          throw new Error(err.error || 'Failed to save presentation');
        }
      }
      
      toast.success('Presentation saved');
      setPendingEdits([]);
      await fetchPresentation();
    } catch (err) {
      console.error('Failed to save presentation:', err);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const goToSlide = (index: number) => {
    if (presentation && index >= 0 && index < presentation.slides.length) {
      setCurrentSlideIndex(index);
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
          <Button variant="outline" onClick={fetchPresentation}>
            Try Again
          </Button>
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

  return (
    <div className="flex h-full flex-col bg-muted/30">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b bg-background px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{presentation?.title || file.name}</span>
          {pendingEdits.length > 0 && (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              {pendingEdits.length} unsaved {pendingEdits.length === 1 ? 'change' : 'changes'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {pendingEdits.length > 0 && (
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save
            </Button>
          )}
        </div>
      </div>

      {/* Slide View */}
      <div className="flex flex-1 overflow-hidden">
        {/* Slide Thumbnails */}
        <div className="w-32 flex-shrink-0 overflow-y-auto border-r bg-background p-2">
          {presentation?.slides.map((slide, idx) => (
            <button
              key={slide.objectId}
              onClick={() => goToSlide(idx)}
              className={cn(
                "mb-2 w-full rounded border-2 bg-white p-1 transition-colors",
                idx === currentSlideIndex
                  ? "border-primary"
                  : "border-transparent hover:border-muted-foreground/30"
              )}
            >
              <div className="aspect-video w-full bg-muted/30 text-center text-xs text-muted-foreground">
                {idx + 1}
              </div>
            </button>
          ))}
        </div>

        {/* Main Slide */}
        <div className="flex flex-1 flex-col items-center justify-center p-8">
          <div className="relative aspect-video w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-lg">
            {currentSlide?.pageElements?.map((element) => {
              const text = element.shape?.text ? extractText(element.shape.text) : null;
              const isTitle = element.shape?.placeholder?.type === 'TITLE' || 
                element.shape?.placeholder?.type === 'CENTERED_TITLE';
              const style = getElementStyle(element);
              const hasPendingEdit = pendingEdits.some(e => e.elementId === element.objectId);

              if (element.image) {
                return (
                  <div key={element.objectId} style={style} className="overflow-hidden">
                    <img
                      src={element.image.contentUrl}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  </div>
                );
              }

              if (text !== null) {
                const isEditing = editingElement === element.objectId;
                
                return (
                  <div
                    key={element.objectId}
                    style={style}
                    className={cn(
                      "flex items-center p-2",
                      hasPendingEdit && "bg-amber-50"
                    )}
                  >
                    {isEditing ? (
                      <Textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleTextBlur(element.objectId, text)}
                        autoFocus
                        className={cn(
                          "h-full w-full resize-none border-primary",
                          isTitle ? "text-2xl font-bold" : "text-base"
                        )}
                      />
                    ) : (
                      <div
                        onClick={() => handleTextClick(element.objectId, text)}
                        className={cn(
                          "w-full cursor-text rounded p-1 hover:bg-muted/50",
                          isTitle ? "text-2xl font-bold" : "text-base"
                        )}
                      >
                        {text || <span className="text-muted-foreground italic">Click to add text</span>}
                      </div>
                    )}
                  </div>
                );
              }

              return null;
            })}
          </div>

          {/* Navigation */}
          <div className="mt-4 flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => goToSlide(currentSlideIndex - 1)}
              disabled={currentSlideIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Slide {currentSlideIndex + 1} of {totalSlides}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => goToSlide(currentSlideIndex + 1)}
              disabled={currentSlideIndex >= totalSlides - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t bg-background px-4 py-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <Edit2 className="h-3 w-3" />
          Click text to edit
        </span>
        <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={onOpenInDrive}>
          Open in Google Slides for advanced editing
        </Button>
      </div>
    </div>
  );
}
