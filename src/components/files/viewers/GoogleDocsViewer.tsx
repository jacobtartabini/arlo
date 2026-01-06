import { useState, useEffect, useCallback, useRef } from "react";
import { 
  Loader2, Save, RotateCcw, ExternalLink, AlertCircle, 
  Bold, Italic, Underline, List, ListOrdered, AlignLeft, 
  AlignCenter, AlignRight, Heading1, Heading2, Heading3, 
  Link, Check, Cloud, CloudOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getAuthHeaders } from "@/lib/arloAuth";
import { cn } from "@/lib/utils";
import type { DriveFile } from "@/types/files";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface GoogleDocsViewerProps {
  file: DriveFile;
  accountId: string;
  onOpenInDrive: () => void;
}

interface TextStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  link?: { url: string };
}

interface ParagraphElement {
  startIndex?: number;
  endIndex?: number;
  textRun?: {
    content: string;
    textStyle?: TextStyle;
  };
}

interface DocumentElement {
  startIndex?: number;
  endIndex?: number;
  paragraph?: {
    elements: ParagraphElement[];
    paragraphStyle?: {
      namedStyleType?: string;
      alignment?: 'START' | 'CENTER' | 'END' | 'JUSTIFIED';
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

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

export function GoogleDocsViewer({ file, accountId, onOpenInDrive }: GoogleDocsViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>("");

  const fetchDocument = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const headers = await getAuthHeaders();
      if (!headers) throw new Error('Not authenticated');

      const response = await fetch(`${SUPABASE_URL}/functions/v1/google-workspace-api`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_doc',
          accountId,
          fileId: file.drive_file_id,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || 'Failed to load document');
      }

      const data = await response.json();
      if (data?.document) {
        setDocumentData(data.document);
        // Build initial HTML content
        if (editorRef.current) {
          const html = documentToHtml(data.document);
          editorRef.current.innerHTML = html;
          lastSavedContentRef.current = editorRef.current.innerHTML;
        }
      }
    } catch (err) {
      console.error('Failed to fetch document:', err);
      setError('Failed to load document. You may need to reconnect your Google account.');
    } finally {
      setLoading(false);
    }
  }, [file.drive_file_id, accountId]);

  useEffect(() => {
    fetchDocument();
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [fetchDocument]);

  const documentToHtml = (doc: DocumentData): string => {
    if (!doc?.body?.content) return '<p></p>';
    
    let html = '';
    for (const element of doc.body.content) {
      if (element.paragraph) {
        const style = element.paragraph.paragraphStyle?.namedStyleType;
        const alignment = element.paragraph.paragraphStyle?.alignment;
        let tag = 'p';
        
        if (style === 'HEADING_1') tag = 'h1';
        else if (style === 'HEADING_2') tag = 'h2';
        else if (style === 'HEADING_3') tag = 'h3';
        
        let alignStyle = '';
        if (alignment === 'CENTER') alignStyle = ' style="text-align:center"';
        else if (alignment === 'END') alignStyle = ' style="text-align:right"';
        else if (alignment === 'JUSTIFIED') alignStyle = ' style="text-align:justify"';
        
        let content = '';
        for (const elem of element.paragraph.elements) {
          if (elem.textRun?.content) {
            let text = elem.textRun.content.replace(/\n$/, '');
            const ts = elem.textRun.textStyle;
            
            if (ts?.link?.url) text = `<a href="${ts.link.url}" target="_blank" rel="noopener">${text}</a>`;
            if (ts?.bold) text = `<strong>${text}</strong>`;
            if (ts?.italic) text = `<em>${text}</em>`;
            if (ts?.underline) text = `<u>${text}</u>`;
            
            content += text;
          }
        }
        
        html += `<${tag}${alignStyle}>${content || '<br>'}</${tag}>`;
      }
    }
    
    return html || '<p></p>';
  };

  const handleContentChange = useCallback(() => {
    if (!editorRef.current) return;
    
    const currentContent = editorRef.current.innerHTML;
    if (currentContent !== lastSavedContentRef.current) {
      setSaveStatus('unsaved');
      
      // Debounce autosave
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        handleSave();
      }, 2000);
    }
  }, []);

  const handleSave = async () => {
    if (!documentData || !editorRef.current) return;
    
    const currentContent = editorRef.current.innerHTML;
    if (currentContent === lastSavedContentRef.current) {
      setSaveStatus('saved');
      return;
    }
    
    setSaveStatus('saving');
    
    try {
      // Extract plain text for simple save
      const plainText = editorRef.current.innerText || '';
      
      // Get current document length
      const docLength = documentData.body?.content?.reduce((acc, elem) => {
        if (elem.paragraph?.elements) {
          return acc + elem.paragraph.elements.reduce((pAcc, pElem) => 
            pAcc + (pElem.textRun?.content?.length || 0), 0);
        }
        return acc;
      }, 0) || 1;

      const requests: object[] = [];
      
      // Delete existing content
      if (docLength > 1) {
        requests.push({
          deleteContentRange: {
            range: { startIndex: 1, endIndex: docLength },
          },
        });
      }

      // Insert new content
      if (plainText.trim()) {
        requests.push({
          insertText: {
            location: { index: 1 },
            text: plainText,
          },
        });
      }

      const headers = await getAuthHeaders();
      if (!headers) throw new Error('Not authenticated');

      const response = await fetch(`${SUPABASE_URL}/functions/v1/google-workspace-api`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_doc',
          accountId,
          fileId: file.drive_file_id,
          content: { requests },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save document');
      }
      
      lastSavedContentRef.current = currentContent;
      setSaveStatus('saved');
    } catch (err) {
      console.error('Failed to save document:', err);
      setSaveStatus('error');
      toast.error('Failed to save document');
    }
  };

  const execCommand = (command: string, value?: string) => {
    window.document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleContentChange();
  };

  const formatBlock = (tag: string) => {
    window.document.execCommand('formatBlock', false, tag);
    editorRef.current?.focus();
    handleContentChange();
  };

  const handleReset = async () => {
    await fetchDocument();
    setSaveStatus('saved');
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
          <Button variant="outline" onClick={fetchDocument}>Try Again</Button>
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
      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/30 px-3 py-2">
        {/* Headings */}
        <div className="flex items-center gap-0.5 border-r pr-2 mr-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => formatBlock('h1')} title="Heading 1">
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => formatBlock('h2')} title="Heading 2">
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => formatBlock('h3')} title="Heading 3">
            <Heading3 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => formatBlock('p')} title="Normal text">
            P
          </Button>
        </div>

        {/* Text formatting */}
        <div className="flex items-center gap-0.5 border-r pr-2 mr-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCommand('bold')} title="Bold (Ctrl+B)">
            <Bold className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCommand('italic')} title="Italic (Ctrl+I)">
            <Italic className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCommand('underline')} title="Underline (Ctrl+U)">
            <Underline className="h-4 w-4" />
          </Button>
        </div>

        {/* Lists */}
        <div className="flex items-center gap-0.5 border-r pr-2 mr-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCommand('insertUnorderedList')} title="Bullet list">
            <List className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCommand('insertOrderedList')} title="Numbered list">
            <ListOrdered className="h-4 w-4" />
          </Button>
        </div>

        {/* Alignment */}
        <div className="flex items-center gap-0.5 border-r pr-2 mr-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCommand('justifyLeft')} title="Align left">
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCommand('justifyCenter')} title="Align center">
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCommand('justifyRight')} title="Align right">
            <AlignRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Link */}
        <div className="flex items-center gap-0.5 border-r pr-2 mr-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0" 
            onClick={() => {
              const url = prompt('Enter URL:');
              if (url) execCommand('createLink', url);
            }} 
            title="Insert link"
          >
            <Link className="h-4 w-4" />
          </Button>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Save status */}
        <div className="flex items-center gap-2">
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
            <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <CloudOff className="h-3.5 w-3.5" />
              Unsaved
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              Error
            </span>
          )}

          {saveStatus === 'unsaved' && (
            <>
              <Button variant="ghost" size="sm" className="h-7" onClick={handleReset}>
                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                Reset
              </Button>
              <Button size="sm" className="h-7" onClick={handleSave}>
                <Save className="mr-1 h-3.5 w-3.5" />
                Save
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto bg-background">
        <div className="mx-auto max-w-3xl p-8">
          <div className="mb-4 border-b pb-4">
            <h1 className="text-2xl font-semibold text-foreground">{documentData?.title || file.name}</h1>
          </div>
          <div
            ref={editorRef}
            contentEditable
            onInput={handleContentChange}
            onKeyDown={(e) => {
              // Handle Ctrl+S
              if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSave();
              }
            }}
            className={cn(
              "min-h-[500px] outline-none",
              "prose prose-sm dark:prose-invert max-w-none",
              "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-6",
              "[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-3 [&_h2]:mt-5",
              "[&_h3]:text-lg [&_h3]:font-medium [&_h3]:mb-2 [&_h3]:mt-4",
              "[&_p]:mb-3 [&_p]:leading-relaxed",
              "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3",
              "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-3",
              "[&_li]:mb-1",
              "[&_a]:text-primary [&_a]:underline",
              "focus:outline-none"
            )}
            suppressContentEditableWarning
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
        <span>Editing: {file.name}</span>
        <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={onOpenInDrive}>
          <ExternalLink className="mr-1 h-3 w-3" />
          Open in Google Docs
        </Button>
      </div>
    </div>
  );
}
