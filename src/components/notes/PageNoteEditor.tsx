"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Note } from "@/types/notes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  Minus,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PageNoteEditorProps {
  note: Note;
  onSave: (content: string) => void;
}

interface FormatState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  heading: string | null;
  list: string | null;
  align: string;
}

export function PageNoteEditor({ note, onSave }: PageNoteEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [formatState, setFormatState] = useState<FormatState>({
    bold: false,
    italic: false,
    underline: false,
    heading: null,
    list: null,
    align: "left",
  });

  // Load initial content
  useEffect(() => {
    if (editorRef.current && note.canvasState) {
      try {
        const content = JSON.parse(note.canvasState);
        if (content.html) {
          editorRef.current.innerHTML = content.html;
        }
      } catch {
        // If not JSON, treat as plain text
        editorRef.current.innerHTML = note.canvasState || "";
      }
    }
  }, [note.id]);

  // Update format state based on current selection
  const updateFormatState = useCallback(() => {
    setFormatState({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      heading: null,
      list: document.queryCommandState("insertUnorderedList")
        ? "ul"
        : document.queryCommandState("insertOrderedList")
        ? "ol"
        : null,
      align: document.queryCommandState("justifyCenter")
        ? "center"
        : document.queryCommandState("justifyRight")
        ? "right"
        : "left",
    });
  }, []);

  // Auto-save on content change
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const content = JSON.stringify({ html: editorRef.current.innerHTML });
      onSave(content);
    }
    updateFormatState();
  }, [onSave, updateFormatState]);

  // Execute formatting command
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  // Format heading
  const formatHeading = (level: string) => {
    execCommand("formatBlock", level);
  };

  // Toolbar button component
  const ToolbarButton = ({
    icon: Icon,
    label,
    isActive,
    onClick,
  }: {
    icon: React.ElementType;
    label: string;
    isActive?: boolean;
    onClick: () => void;
  }) => (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            size="sm"
            pressed={isActive}
            onPressedChange={onClick}
            className="h-8 w-8 p-0"
          >
            <Icon className="h-4 w-4" />
          </Toggle>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-border/60 bg-card/50 px-4 py-2 flex-wrap">
        {/* Undo/Redo */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => execCommand("undo")}
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => execCommand("redo")}
        >
          <Redo className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="mx-2 h-6" />

        {/* Text formatting */}
        <ToolbarButton
          icon={Bold}
          label="Bold (Ctrl+B)"
          isActive={formatState.bold}
          onClick={() => execCommand("bold")}
        />
        <ToolbarButton
          icon={Italic}
          label="Italic (Ctrl+I)"
          isActive={formatState.italic}
          onClick={() => execCommand("italic")}
        />
        <ToolbarButton
          icon={Underline}
          label="Underline (Ctrl+U)"
          isActive={formatState.underline}
          onClick={() => execCommand("underline")}
        />

        <Separator orientation="vertical" className="mx-2 h-6" />

        {/* Headings */}
        <ToolbarButton
          icon={Heading1}
          label="Heading 1"
          onClick={() => formatHeading("h1")}
        />
        <ToolbarButton
          icon={Heading2}
          label="Heading 2"
          onClick={() => formatHeading("h2")}
        />
        <ToolbarButton
          icon={Heading3}
          label="Heading 3"
          onClick={() => formatHeading("h3")}
        />

        <Separator orientation="vertical" className="mx-2 h-6" />

        {/* Lists */}
        <ToolbarButton
          icon={List}
          label="Bullet List"
          isActive={formatState.list === "ul"}
          onClick={() => execCommand("insertUnorderedList")}
        />
        <ToolbarButton
          icon={ListOrdered}
          label="Numbered List"
          isActive={formatState.list === "ol"}
          onClick={() => execCommand("insertOrderedList")}
        />

        <Separator orientation="vertical" className="mx-2 h-6" />

        {/* Special blocks */}
        <ToolbarButton
          icon={Quote}
          label="Quote"
          onClick={() => formatHeading("blockquote")}
        />
        <ToolbarButton
          icon={Code}
          label="Code"
          onClick={() => formatHeading("pre")}
        />
        <ToolbarButton
          icon={Minus}
          label="Horizontal Rule"
          onClick={() => execCommand("insertHorizontalRule")}
        />

        <Separator orientation="vertical" className="mx-2 h-6" />

        {/* Alignment */}
        <ToolbarButton
          icon={AlignLeft}
          label="Align Left"
          isActive={formatState.align === "left"}
          onClick={() => execCommand("justifyLeft")}
        />
        <ToolbarButton
          icon={AlignCenter}
          label="Align Center"
          isActive={formatState.align === "center"}
          onClick={() => execCommand("justifyCenter")}
        />
        <ToolbarButton
          icon={AlignRight}
          label="Align Right"
          isActive={formatState.align === "right"}
          onClick={() => execCommand("justifyRight")}
        />
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl px-8 py-8">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onMouseUp={updateFormatState}
            onKeyUp={updateFormatState}
            className={cn(
              "min-h-[calc(100vh-12rem)] outline-none",
              "prose prose-sm dark:prose-invert max-w-none",
              "[&>*:first-child]:mt-0",
              "[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-8",
              "[&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mb-3 [&_h2]:mt-6",
              "[&_h3]:text-xl [&_h3]:font-medium [&_h3]:mb-2 [&_h3]:mt-4",
              "[&_p]:text-base [&_p]:leading-relaxed [&_p]:mb-4",
              "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4",
              "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4",
              "[&_li]:mb-1",
              "[&_blockquote]:border-l-4 [&_blockquote]:border-primary/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:my-4",
              "[&_pre]:bg-muted [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:font-mono [&_pre]:text-sm [&_pre]:my-4",
              "[&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-sm",
              "[&_hr]:border-border [&_hr]:my-6"
            )}
            data-placeholder="Start writing..."
          />
        </div>
      </div>

      {/* Styles for placeholder */}
      <style>{`
        [data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          opacity: 0.5;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
