import { useState, useEffect, useCallback } from "react";
import { Loader2, Save, RotateCcw, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { DriveFile } from "@/types/files";

interface GoogleDocsViewerProps {
  file: DriveFile;
  accountId: string;
  onOpenInDrive: () => void;
}

interface DocumentElement {
  paragraph?: {
    elements: Array<{
      textRun?: {
        content: string;
        textStyle?: {
          bold?: boolean;
          italic?: boolean;
          underline?: boolean;
        };
      };
    }>;
    paragraphStyle?: {
      namedStyleType?: string;
    };
  };
  sectionBreak?: object;
  table?: object;
}

interface DocumentData {
  title: string;
  body: {
    content: DocumentElement[];
  };
  documentId: string;
}

export function GoogleDocsViewer({ file, accountId, onOpenInDrive }: GoogleDocsViewerProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [document, setDocument] = useState<DocumentData | null>(null);
  const [editableContent, setEditableContent] = useState<string>("");
  const [originalContent, setOriginalContent] = useState<string>("");
  const [hasChanges, setHasChanges] = useState(false);

  const extractTextContent = useCallback((doc: DocumentData): string => {
    if (!doc?.body?.content) return "";
    
    let text = "";
    for (const element of doc.body.content) {
      if (element.paragraph) {
        const style = element.paragraph.paragraphStyle?.namedStyleType;
        let paragraphText = "";
        
        for (const elem of element.paragraph.elements) {
          if (elem.textRun?.content) {
            paragraphText += elem.textRun.content;
          }
        }
        
        // Add markdown-style headings for display
        if (style?.startsWith("HEADING_")) {
          const level = parseInt(style.replace("HEADING_", ""));
          text += "#".repeat(level) + " " + paragraphText.trim() + "\n\n";
        } else if (paragraphText.trim()) {
          text += paragraphText;
        } else if (paragraphText === "\n") {
          text += "\n";
        }
      }
    }
    
    return text.trim();
  }, []);

  const fetchDocument = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('google-workspace-api', {
        body: {
          action: 'get_doc',
          accountId,
          fileId: file.drive_file_id,
        },
      });

      if (fnError) throw fnError;
      if (data?.document) {
        setDocument(data.document);
        const content = extractTextContent(data.document);
        setEditableContent(content);
        setOriginalContent(content);
      }
    } catch (err) {
      console.error('Failed to fetch document:', err);
      setError('Failed to load document. You may need to reconnect your Google account with updated permissions.');
    } finally {
      setLoading(false);
    }
  }, [file.drive_file_id, accountId, extractTextContent]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  useEffect(() => {
    setHasChanges(editableContent !== originalContent);
  }, [editableContent, originalContent]);

  const handleSave = async () => {
    if (!document || !hasChanges) return;
    
    setSaving(true);
    try {
      // Build update requests to replace document content
      // First delete all content except the first newline
      const docLength = document.body?.content?.reduce((acc, elem) => {
        if (elem.paragraph?.elements) {
          return acc + elem.paragraph.elements.reduce((pAcc, pElem) => 
            pAcc + (pElem.textRun?.content?.length || 0), 0);
        }
        return acc;
      }, 0) || 1;

      const requests: object[] = [];
      
      // Delete existing content (leaving the required newline at end)
      if (docLength > 1) {
        requests.push({
          deleteContentRange: {
            range: {
              startIndex: 1,
              endIndex: docLength,
            },
          },
        });
      }

      // Insert new content
      if (editableContent.trim()) {
        requests.push({
          insertText: {
            location: { index: 1 },
            text: editableContent,
          },
        });
      }

      const { error: fnError } = await supabase.functions.invoke('google-workspace-api', {
        body: {
          action: 'update_doc',
          accountId,
          fileId: file.drive_file_id,
          content: { requests },
        },
      });

      if (fnError) throw fnError;
      
      toast.success('Document saved');
      setOriginalContent(editableContent);
      setHasChanges(false);
      
      // Refresh to get updated document structure
      await fetchDocument();
    } catch (err) {
      console.error('Failed to save document:', err);
      toast.error('Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setEditableContent(originalContent);
    setHasChanges(false);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading document...</p>
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
          <Button variant="outline" onClick={fetchDocument}>
            Try Again
          </Button>
          <Button onClick={onOpenInDrive}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in Google Docs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{document?.title || file.name}</span>
          {hasChanges && (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              Unsaved changes
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto p-4">
        <div className="mx-auto max-w-3xl">
          <Textarea
            value={editableContent}
            onChange={(e) => setEditableContent(e.target.value)}
            className="min-h-[500px] resize-none border-none bg-background p-6 text-base leading-relaxed shadow-sm focus-visible:ring-1"
            placeholder="Start typing..."
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
        <span>Editing: {file.name}</span>
        <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={onOpenInDrive}>
          Open in Google Docs for advanced formatting
        </Button>
      </div>
    </div>
  );
}
