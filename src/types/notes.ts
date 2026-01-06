// Smart Notes Types

export type NoteId = string;
export type NoteType = "canvas" | "page";
export type PageMode = "type" | "write";
export type BackgroundStyle = "blank" | "lined" | "dotted" | "grid";
export type EraserType = "stroke" | "precision";
export type PenStyle = "fine" | "medium" | "thick" | "brush" | "calligraphy";
export type LassoMode = "freeform" | "rectangle";

export interface NoteElement {
  id: string;
  type: "drawing" | "text" | "image" | "module";
  x: number;
  y: number;
  width?: number;
  height?: number;
  data: unknown;
  zIndex: number;
  locked?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DrawingElement extends NoteElement {
  type: "drawing";
  data: {
    fabricJson: string;
  };
}

export interface TextElement extends NoteElement {
  type: "text";
  data: {
    content: string;
    fontSize: number;
    fontFamily: string;
    color: string;
    bold?: boolean;
    italic?: boolean;
  };
}

export interface ImageElement extends NoteElement {
  type: "image";
  data: {
    src: string;
    alt?: string;
  };
}

export type ModuleType = "calculator" | "web-search" | "pdf-viewer" | "arlo-ai";

export interface ModuleElement extends NoteElement {
  type: "module";
  data: {
    moduleType: ModuleType;
    state: Record<string, unknown>;
  };
}

export interface Note {
  id: NoteId;
  title: string;
  noteType: NoteType;
  thumbnail?: string;
  canvasState: string; // Serialized Fabric.js canvas JSON or page content
  elements: NoteElement[];
  tags: string[];
  folderId?: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  zoom: number;
  panX: number;
  panY: number;
  // Page note specific - LOCKED after creation
  pageMode?: PageMode;
  backgroundStyle?: BackgroundStyle;
  // PDF import
  importedPdfUrl?: string;
}

export interface NoteFolder {
  id: string;
  name: string;
  color: string;
  parentId?: string;
  createdAt: string;
}

export type DrawingTool = 
  | "select"
  | "pen"
  | "highlighter"
  | "eraser"
  | "lasso"
  | "text"
  | "shape"
  | "image"
  | "pan";

export type ShapeType = "line" | "arrow" | "rectangle" | "circle" | "triangle";

export interface DrawingSettings {
  tool: DrawingTool;
  color: string;
  strokeWidth: number;
  opacity: number;
  shape?: ShapeType;
  penStyle?: PenStyle;
  eraserType?: EraserType;
  lassoMode?: LassoMode;
}

export interface CanvasViewport {
  zoom: number;
  panX: number;
  panY: number;
}

export const DEFAULT_DRAWING_SETTINGS: DrawingSettings = {
  tool: "pen",
  color: "#1a1a1a",
  strokeWidth: 2,
  opacity: 1,
  penStyle: "medium",
  eraserType: "stroke",
  lassoMode: "freeform",
};

export const PEN_COLORS = [
  "#1a1a1a",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#ffffff",
];

export const HIGHLIGHTER_COLORS = [
  "#fef08a",
  "#bbf7d0",
  "#bfdbfe",
  "#f5d0fe",
  "#fed7aa",
];

export const STROKE_WIDTHS = [1, 2, 4, 6, 8, 12];
