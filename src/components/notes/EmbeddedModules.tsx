"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { 
  CalculatorModule, 
  WebSearchModule, 
  PDFViewerModule, 
  ArloAIModule 
} from "./modules";
import { cn } from "@/lib/utils";

export type ModuleType = "calculator" | "web-search" | "pdf-viewer" | "arlo-ai";

interface ModuleInstance {
  id: string;
  type: ModuleType;
  x: number;
  y: number;
}

interface EmbeddedModulesProps {
  noteContent?: string;
  onInsertText: (text: string) => void;
  onModuleAdd?: (callback: (type: ModuleType) => void) => void;
}

export function EmbeddedModules({ noteContent, onInsertText, onModuleAdd }: EmbeddedModulesProps) {
  const [modules, setModules] = useState<ModuleInstance[]>([]);
  const [draggingModule, setDraggingModule] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const addModule = useCallback((type: ModuleType) => {
    const id = `${type}-${Date.now()}`;
    const container = containerRef.current;
    const x = container ? (container.clientWidth / 2 - 150) : 100;
    const y = container ? 100 + modules.length * 50 : 100;
    
    setModules(prev => [...prev, { id, type, x, y }]);
  }, [modules.length]);

  const removeModule = useCallback((id: string) => {
    setModules(prev => prev.filter(m => m.id !== id));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, moduleId: string) => {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    setDraggingModule(moduleId);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingModule || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - containerRect.left - dragOffset.x;
    const y = e.clientY - containerRect.top - dragOffset.y;

    setModules(prev => prev.map(m => 
      m.id === draggingModule 
        ? { ...m, x: Math.max(0, x), y: Math.max(0, y) }
        : m
    ));
  }, [draggingModule, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setDraggingModule(null);
  }, []);

  useEffect(() => {
    if (draggingModule) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [draggingModule, handleMouseMove, handleMouseUp]);

  // Expose addModule to parent via callback
  useEffect(() => {
    if (onModuleAdd) {
      onModuleAdd(addModule);
    }
  }, [onModuleAdd, addModule]);

  const handleInsertLink = useCallback((url: string, title: string) => {
    onInsertText(`[${title}](${url})`);
  }, [onInsertText]);

  const handleDragResult = useCallback((result: string) => {
    onInsertText(result);
  }, [onInsertText]);

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-hidden">

      {/* Rendered modules */}
      {modules.map((module) => (
        <div
          key={module.id}
          className={cn(
            "absolute pointer-events-auto",
            draggingModule === module.id && "z-50"
          )}
          style={{
            left: module.x,
            top: module.y,
            cursor: draggingModule === module.id ? "grabbing" : "default",
          }}
          onMouseDown={(e) => {
            // Only start drag from header (the cursor-move element)
            if ((e.target as HTMLElement).closest(".cursor-move")) {
              handleMouseDown(e, module.id);
            }
          }}
        >
          {module.type === "calculator" && (
            <CalculatorModule
              id={module.id}
              onClose={() => removeModule(module.id)}
              onDragResult={handleDragResult}
            />
          )}
          {module.type === "web-search" && (
            <WebSearchModule
              id={module.id}
              onClose={() => removeModule(module.id)}
              onInsertLink={handleInsertLink}
            />
          )}
          {module.type === "pdf-viewer" && (
            <PDFViewerModule
              id={module.id}
              onClose={() => removeModule(module.id)}
            />
          )}
          {module.type === "arlo-ai" && (
            <ArloAIModule
              id={module.id}
              onClose={() => removeModule(module.id)}
              noteContent={noteContent}
              onInsertText={onInsertText}
            />
          )}
        </div>
      ))}
    </div>
  );
}
