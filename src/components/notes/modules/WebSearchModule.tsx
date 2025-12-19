"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, GripVertical, Search, ExternalLink, Loader2, Globe } from "lucide-react";

interface WebSearchModuleProps {
  id: string;
  onClose: () => void;
  onInsertLink: (url: string, title: string) => void;
}

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export function WebSearchModule({ id, onClose, onInsertLink }: WebSearchModuleProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setSearched(true);
    
    // Simulate search results (in production, this would call a real search API)
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Mock results based on query
    const mockResults: SearchResult[] = [
      {
        title: `${query} - Wikipedia`,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`,
        snippet: `Learn more about ${query} on Wikipedia, the free encyclopedia...`,
      },
      {
        title: `${query} Documentation`,
        url: `https://docs.example.com/${encodeURIComponent(query.toLowerCase())}`,
        snippet: `Official documentation and guides for ${query}...`,
      },
      {
        title: `Understanding ${query} - Medium`,
        url: `https://medium.com/topic/${encodeURIComponent(query.toLowerCase())}`,
        snippet: `A comprehensive guide to understanding ${query} and its applications...`,
      },
      {
        title: `${query} Tutorial - YouTube`,
        url: `https://youtube.com/results?search_query=${encodeURIComponent(query)}`,
        snippet: `Watch tutorials and videos about ${query}...`,
      },
    ];
    
    setResults(mockResults);
    setIsLoading(false);
  }, [query]);

  const handleDragStart = useCallback((e: React.DragEvent, result: SearchResult) => {
    e.dataTransfer.setData("text/plain", `[${result.title}](${result.url})`);
    e.dataTransfer.setData("text/uri-list", result.url);
    e.dataTransfer.effectAllowed = "copy";
  }, []);

  return (
    <Card className="w-80 overflow-hidden shadow-2xl border-border/60">
      {/* Header */}
      <div className="flex items-center justify-between bg-muted/50 px-3 py-2 border-b border-border/40 cursor-move">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <Globe className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium">Web Search</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Search input */}
      <div className="p-3 border-b border-border/40">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex gap-2"
        >
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the web..."
            className="h-9 text-sm"
          />
          <Button type="submit" size="sm" className="h-9 px-3" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>

      {/* Results */}
      <ScrollArea className="h-64">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : results.length > 0 ? (
          <div className="p-2 space-y-2">
            {results.map((result, index) => (
              <div
                key={index}
                draggable
                onDragStart={(e) => handleDragStart(e, result)}
                className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-grab active:cursor-grabbing transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-primary truncate">
                      {result.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {result.snippet}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => window.open(result.url, "_blank")}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : searched ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            No results found
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <Search className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              Search the web and drag results to your note
            </p>
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}
