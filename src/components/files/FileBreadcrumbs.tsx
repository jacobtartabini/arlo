import { ChevronRight, Home, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BreadcrumbItem } from "@/types/files";

interface FileBreadcrumbsProps {
  items: BreadcrumbItem[];
  onNavigate: (folderId: string | null, name: string) => void;
}

export function FileBreadcrumbs({ items, onNavigate }: FileBreadcrumbsProps) {
  if (items.length === 0) {
    return (
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Home className="h-4 w-4" />
        <span>My Drive</span>
      </div>
    );
  }

  return (
    <nav className="flex items-center gap-1 overflow-x-auto text-sm">
      {/* Root */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
        onClick={() => onNavigate(null, 'My Drive')}
      >
        <Home className="h-3.5 w-3.5" />
        <span>My Drive</span>
      </Button>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <div key={item.id} className="flex items-center">
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            {isLast ? (
              <div className="flex items-center gap-1.5 px-2 py-1 font-medium">
                <FolderOpen className="h-3.5 w-3.5 text-amber-500" />
                <span className="max-w-[150px] truncate">{item.name}</span>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
                onClick={() => onNavigate(item.id, item.name)}
              >
                <FolderOpen className="h-3.5 w-3.5 text-amber-500" />
                <span className="max-w-[150px] truncate">{item.name}</span>
              </Button>
            )}
          </div>
        );
      })}
    </nav>
  );
}
