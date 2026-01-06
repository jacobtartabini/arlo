import { ArrowUpDown, ArrowUp, ArrowDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FileSortField, FileSortDirection, FileSortOption } from "@/types/files";
import { SORT_FIELD_LABELS } from "@/types/files";

interface FileSortDropdownProps {
  sortOption: FileSortOption;
  onSortChange: (option: FileSortOption) => void;
}

export function FileSortDropdown({ sortOption, onSortChange }: FileSortDropdownProps) {
  const sortFields: FileSortField[] = ['name', 'modified_time', 'created_time', 'size_bytes'];
  
  const handleFieldChange = (field: FileSortField) => {
    if (field === sortOption.field) {
      // Toggle direction if same field
      onSortChange({
        field,
        direction: sortOption.direction === 'asc' ? 'desc' : 'asc',
      });
    } else {
      // New field, default to ascending for name, descending for dates/size
      onSortChange({
        field,
        direction: field === 'name' ? 'asc' : 'desc',
      });
    }
  };

  const DirectionIcon = sortOption.direction === 'asc' ? ArrowUp : ArrowDown;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2">
          <ArrowUpDown className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{SORT_FIELD_LABELS[sortOption.field]}</span>
          <DirectionIcon className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {sortFields.map((field) => (
          <DropdownMenuItem
            key={field}
            onClick={() => handleFieldChange(field)}
            className="justify-between"
          >
            <span>{SORT_FIELD_LABELS[field]}</span>
            {sortOption.field === field && (
              <div className="flex items-center gap-1">
                <DirectionIcon className="h-3 w-3" />
                <Check className="h-3.5 w-3.5" />
              </div>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onSortChange({ ...sortOption, direction: 'asc' })}
          className="justify-between"
        >
          <span>Ascending</span>
          {sortOption.direction === 'asc' && <Check className="h-3.5 w-3.5" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onSortChange({ ...sortOption, direction: 'desc' })}
          className="justify-between"
        >
          <span>Descending</span>
          {sortOption.direction === 'desc' && <Check className="h-3.5 w-3.5" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
