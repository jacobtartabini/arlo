import { Button } from "@/components/ui/button";
import { TimeRange } from "../finance-data";

type TimeRangeTabsProps = {
  ranges: TimeRange[];
  activeRange: string;
  onSelect: (value: string) => void;
};

export function TimeRangeTabs({ ranges, activeRange, onSelect }: TimeRangeTabsProps) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/40 border border-border/60 w-fit">
      {ranges.map((range) => {
        const isActive = activeRange === range.value;

        return (
          <Button
            key={range.value}
            variant={isActive ? "default" : "ghost"}
            size="sm"
            className={
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }
            onClick={() => onSelect(range.value)}
          >
            <div className="flex flex-col items-start leading-tight">
              <span className="text-xs uppercase tracking-wide">{range.label}</span>
              {range.description && <span className="text-[10px] text-muted-foreground">{range.description}</span>}
            </div>
          </Button>
        );
      })}
    </div>
  );
}
