"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  X,
  ExternalLink,
  Copy,
  Loader2,
  ChevronRight,
  ChevronLeft,
  GripVertical,
  Globe,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getArloToken } from "@/lib/arloAuth";

interface SearchResult {
  url: string;
  title: string;
  snippet: string;
  favicon: string | null;
}

interface SearchResponse {
  success: boolean;
  configured: boolean;
  error?: string;
  query?: string;
  results: SearchResult[];
}

interface ResearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertLink?: (url: string, title: string) => void;
}

const MIN_WIDTH = 280;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 360;

export function ResearchPanel({ isOpen, onClose, onInsertLink }: ResearchPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(true);
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const token = await getArloToken();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/web-search?q=${encodeURIComponent(query.trim())}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data: SearchResponse = await response.json();

      if (!data.success) {
        if (!data.configured) {
          setIsConfigured(false);
          setError("Search provider not configured");
        } else {
          setError(data.error || "Search failed");
        }
        return;
      }

      setIsConfigured(true);
      setResults(data.results);

      if (data.results.length === 0) {
        setError("No results found");
      }
    } catch (err) {
      console.error("Search error:", err);
      setError("Failed to search. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !isLoading) {
        handleSearch();
      }
    },
    [handleSearch, isLoading]
  );

  const handleCopyLink = useCallback((url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  }, []);

  const handleInsertLink = useCallback(
    (result: SearchResult) => {
      if (onInsertLink) {
        onInsertLink(result.url, result.title);
        toast.success("Link inserted");
      }
    },
    [onInsertLink]
  );

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = panelWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = startX - moveEvent.clientX;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta));
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [panelWidth]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className={cn(
        "absolute top-0 right-0 h-full bg-card border-l border-border/60 shadow-xl z-40 flex flex-col",
        isResizing && "select-none"
      )}
      style={{ width: panelWidth }}
    >
      {/* Resize handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-primary/20 transition-colors group"
        onMouseDown={handleResizeStart}
      >
        <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/30">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Research</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Search input */}
      <div className="p-3 border-b border-border/40">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search the web..."
            className="pl-9 pr-20 h-9 bg-muted/50"
            disabled={isLoading}
          />
          <Button
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-3"
            onClick={handleSearch}
            disabled={isLoading || !query.trim()}
          >
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Search"}
          </Button>
        </div>
      </div>

      {/* Results area */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {/* Empty state */}
          {!isLoading && results.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Search the web from here...</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Results will appear in this panel
              </p>
            </div>
          )}

          {/* Not configured state */}
          {!isConfigured && (
            <Card className="p-4 bg-amber-500/10 border-amber-500/30">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Search provider not configured
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Connect a search provider in Settings → Connectors to enable web search.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Error state */}
          {error && isConfigured && (
            <Card className="p-4 bg-destructive/10 border-destructive/30">
              <p className="text-sm text-destructive">{error}</p>
            </Card>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Searching...</p>
            </div>
          )}

          {/* Results */}
          {results.map((result, index) => (
            <Card
              key={`${result.url}-${index}`}
              className="p-3 hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-start gap-3">
                {result.favicon ? (
                  <img
                    src={result.favicon}
                    alt=""
                    className="w-4 h-4 mt-0.5 rounded-sm"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <Globe className="w-4 h-4 mt-0.5 text-muted-foreground" />
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-foreground line-clamp-2 leading-snug">
                    {result.title}
                  </h4>
                  <p className="text-xs text-primary/80 truncate mt-0.5">{result.url}</p>
                  {result.snippet && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5">
                      {result.snippet}
                    </p>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs gap-1"
                      onClick={() => window.open(result.url, "_blank", "noopener,noreferrer")}
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs gap-1"
                      onClick={() => handleCopyLink(result.url)}
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </Button>
                    {onInsertLink && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs gap-1"
                        onClick={() => handleInsertLink(result)}
                      >
                        <ChevronLeft className="h-3 w-3" />
                        Insert
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-border/40 bg-muted/20">
        <p className="text-[10px] text-muted-foreground text-center">
          Powered by Firecrawl • Opens in new tab
        </p>
      </div>
    </div>
  );
}

// Toggle button for the panel
export function ResearchPanelToggle({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={cn(
        "h-8 gap-2 transition-colors",
        isOpen && "bg-primary/10 border-primary/30"
      )}
      onClick={onClick}
    >
      <Globe className="h-3.5 w-3.5" />
      Research
      {isOpen ? (
        <ChevronRight className="h-3 w-3" />
      ) : (
        <ChevronLeft className="h-3 w-3" />
      )}
    </Button>
  );
}
