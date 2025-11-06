"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  components: userComponents,
  ...props
}: CalendarProps) {
  const defaultClassNames = {
    months:
      "flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm",
    month: "space-y-4",
    month_caption: "flex items-center justify-between",
    caption_label: "text-sm font-semibold text-foreground",
    nav: "flex items-center gap-2",
    button_previous:
      "inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
    button_next:
      "inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
    table: "w-full border-collapse",
    head_row: "grid grid-cols-7 gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70",
    head_cell: "text-center",
    row: "mt-2 grid grid-cols-7 gap-1",
    cell: "text-center",
    weekday: "text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70",
    week: "grid grid-cols-7 gap-1",
    week_number: "text-xs text-muted-foreground/70",
    day: "group relative h-8",
    day_button:
      "inline-flex h-8 w-full items-center justify-center rounded-full text-xs font-medium text-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 data-[disabled]:pointer-events-none data-[disabled]:opacity-30 data-[outside-month]:text-muted-foreground/50 data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[today]:ring-1 data-[today]:ring-primary/60 data-[today]:text-primary hover:bg-muted",
    day_selected: "rounded-full",
    day_today: "text-primary",
    range_start: "rounded-s-full",
    range_end: "rounded-e-full",
    range_middle: "rounded-none",
    outside:
      "text-muted-foreground/50 data-[selected]:bg-primary/20 data-[selected]:text-primary",
    hidden: "invisible",
  } as const;

  const mergedClassNames: typeof defaultClassNames = Object.keys(defaultClassNames).reduce(
    (acc, key) => ({
      ...acc,
      [key]: classNames?.[key as keyof typeof classNames]
        ? cn(
            defaultClassNames[key as keyof typeof defaultClassNames],
            classNames[key as keyof typeof classNames],
          )
        : defaultClassNames[key as keyof typeof defaultClassNames],
    }),
    {} as typeof defaultClassNames,
  );

  const defaultComponents = {
    Chevron: ({ orientation, ...props }: { orientation: "left" | "right" } & React.SVGProps<SVGSVGElement>) => {
      if (orientation === "left") {
        return <ChevronLeft size={16} strokeWidth={2} {...props} aria-hidden="true" />;
      }
      return <ChevronRight size={16} strokeWidth={2} {...props} aria-hidden="true" />;
    },
  };

  const mergedComponents = {
    ...defaultComponents,
    ...userComponents,
  };

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("w-full", className)}
      classNames={mergedClassNames}
      components={mergedComponents}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
