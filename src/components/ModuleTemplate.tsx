import { ReactNode, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ArrowLeft, MoreHorizontal, type LucideIcon } from "lucide-react";

export type ModuleStat = {
  label: string;
  value: string;
  helper?: string;
  tone?: "positive" | "neutral" | "negative";
  trend?: number[];
};

export type ModuleSectionItem = {
  title: string;
  meta?: string;
  description?: string;
  badge?: string;
  icon?: ReactNode;
  tone?: ModuleStat["tone"];
  visual?: ModuleVisual;
  density?: "compact" | "open";
  spotlight?: boolean;
};

export type ModuleSection = {
  title: string;
  description?: string;
  variant?: "grid" | "split" | "timeline";
  accent?: ModuleTone;
  items: ModuleSectionItem[];
};

type ModuleTone = NonNullable<ModuleStat["tone"]> | "info";

type ModuleVisual =
  | { type: "progress"; value: number; label?: string; tone?: ModuleTone }
  | { type: "trend"; points: number[]; tone?: ModuleTone }
  | { type: "media"; url: string; alt: string }
  | { type: "pill"; label: string; tone?: ModuleTone };

type ModuleTemplateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  primaryAction: string;
  secondaryAction?: string;
  accent?: "violet" | "amber" | "cyan" | "emerald";
  stats?: ModuleStat[];
  sections: ModuleSection[];
};

const toneText: Record<ModuleTone, string> = {
  positive: "text-emerald-600 dark:text-emerald-400",
  neutral: "text-muted-foreground",
  negative: "text-rose-600 dark:text-rose-400",
  info: "text-sky-600 dark:text-sky-300",
};

const toneBg: Record<ModuleTone, string> = {
  positive: "bg-emerald-100/70 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200",
  neutral: "bg-muted/60 text-foreground",
  negative: "bg-rose-100/70 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200",
  info: "bg-sky-100/70 text-sky-700 dark:bg-sky-500/10 dark:text-sky-200",
};

const accentGradients: Record<NonNullable<ModuleTemplateProps["accent"]>, string> = {
  violet:
    "bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.08),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(109,40,217,0.08),transparent_28%)]",
  amber:
    "bg-[radial-gradient(circle_at_20%_20%,rgba(251,191,36,0.12),transparent_28%),radial-gradient(circle_at_70%_0%,rgba(245,158,11,0.12),transparent_30%)]",
  cyan:
    "bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.1),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(6,182,212,0.12),transparent_26%)]",
  emerald:
    "bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.1),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(5,150,105,0.1),transparent_26%)]",
};

export function ModuleTemplate({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  accent = "violet",
  stats = [],
  sections,
}: ModuleTemplateProps) {
  const navigate = useNavigate();

  const heroAccent = useMemo(
    () => accentGradients[accent] ?? accentGradients.violet,
    [accent],
  );

  const statMaxPoints = useMemo(
    () => Math.max(2, ...stats.map((stat) => stat.trend?.length ?? 0)),
    [stats],
  );

  return (
    <div className={cn("min-h-screen bg-background", heroAccent)}>
      <div className="mx-auto flex max-w-6xl flex-col gap-7 px-6 py-10">
        <header className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur">
          <div className="absolute inset-0 opacity-50" aria-hidden>
            <div className="absolute -left-12 top-6 h-24 w-24 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute right-4 top-0 h-28 w-28 rounded-full bg-muted/50 blur-3xl" />
          </div>

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-3 py-1 text-xs font-medium transition hover:border-border"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
                </button>
                <Separator orientation="vertical" className="h-5" />
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  Adaptive module layout
                </span>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h1 className="text-3xl font-semibold text-foreground tracking-tight">{title}</h1>
                  <p className="max-w-2xl text-base text-muted-foreground leading-relaxed">{description}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {secondaryAction ? (
                <Button variant="ghost" className="min-w-[140px] border border-border/70 bg-background/40">
                  {secondaryAction}
                </Button>
              ) : null}
              <Button className="min-w-[150px] shadow-sm">{primaryAction}</Button>
            </div>
          </div>

          {stats.length ? (
            <div className="relative mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => (
                <Card
                  key={stat.label}
                  className="group relative overflow-hidden border-border/50 bg-background/70 p-4 shadow-none backdrop-blur"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-muted/40 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-semibold text-foreground">{stat.value}</span>
                    {stat.helper ? (
                      <span className={cn("text-xs font-semibold", toneText[stat.tone ?? "neutral"])}>
                        {stat.helper}
                      </span>
                    ) : null}
                  </div>
                  {stat.trend?.length ? (
                    <Sparkline points={stat.trend} maxPoints={statMaxPoints} tone={stat.tone ?? "neutral"} />
                  ) : null}
                </Card>
              ))}
            </div>
          ) : null}
        </header>

        <div className="grid gap-4 lg:grid-cols-12">
          {sections.map((section) => {
            const variant = section.variant ?? "grid";
            const baseClass =
              variant === "split"
                ? "lg:col-span-7"
                : variant === "timeline"
                  ? "lg:col-span-5"
                  : "lg:col-span-6";

            return (
              <Card
                key={section.title}
                className={cn(
                  "relative overflow-hidden border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur",
                  baseClass,
                )}
              >
                <div className="absolute inset-0 pointer-events-none opacity-60">
                  <div className="absolute right-6 top-4 h-12 w-12 rounded-full bg-muted/40 blur-2xl" />
                </div>
                <div className="relative mb-4 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
                    {section.description ? (
                      <p className="text-sm text-muted-foreground leading-relaxed">{section.description}</p>
                    ) : null}
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>

                {variant === "timeline" ? (
                  <Timeline items={section.items} accent={section.accent} />
                ) : (
                  <div
                    className={cn(
                      "grid gap-3",
                      variant === "split"
                        ? "md:grid-cols-[1.2fr_1fr]"
                        : "md:grid-cols-2",
                    )}
                  >
                    {section.items.map((item) => (
                      <div
                        key={item.title}
                        className={cn(
                          "relative flex h-full flex-col justify-between gap-3 rounded-2xl border border-border/60 bg-muted/30 p-4",
                          item.density === "compact" ? "py-3" : "py-4",
                          item.spotlight ? "md:col-span-2" : "",
                        )}
                      >
                        <div className="absolute right-4 top-4 h-8 w-8 rounded-full bg-background/30" aria-hidden />
                        <div className="relative flex items-start gap-3">
                          {item.icon ? (
                            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-background/80 text-muted-foreground shadow-inner">
                              {item.icon}
                            </div>
                          ) : null}
                          <div className="space-y-1">
                            <p className="font-semibold text-foreground">{item.title}</p>
                            {item.description ? (
                              <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                            ) : null}
                            {item.meta ? <p className="text-xs text-muted-foreground">{item.meta}</p> : null}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {item.visual ? renderVisual(item.visual) : null}
                          {item.badge ? (
                            <span
                              className={cn(
                                "rounded-full px-3 py-1 text-xs font-semibold",
                                toneBg[item.tone ?? "neutral"],
                              )}
                            >
                              {item.badge}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Sparkline({
  points,
  tone,
  maxPoints,
}: {
  points: number[];
  tone: ModuleTone;
  maxPoints: number;
}) {
  const width = 140;
  const height = 48;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const path = points
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="mt-4 h-14 w-full" viewBox={`0 0 ${width} ${height}`} role="presentation">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={toneText[tone]}
        points={path}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g className="text-muted-foreground/60">
        {Array.from({ length: Math.max(2, maxPoints) }).map((_, index) => (
          <line
            key={index}
            x1={(width / (maxPoints - 1 || 1)) * index}
            x2={(width / (maxPoints - 1 || 1)) * index}
            y1={height}
            y2={height - 6}
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
          />
        ))}
      </g>
    </svg>
  );
}

function renderVisual(visual: ModuleVisual) {
  switch (visual.type) {
    case "progress": {
      const clamped = Math.min(100, Math.max(0, visual.value));
      return (
        <div className="flex min-w-[140px] flex-1 items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-2">
          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "absolute left-0 top-0 h-full rounded-full",
                toneBg[visual.tone ?? "positive"],
              )}
              style={{ width: `${clamped}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-foreground">{clamped}%</span>
          {visual.label ? <span className="text-[11px] text-muted-foreground">{visual.label}</span> : null}
        </div>
      );
    }
    case "trend": {
      return <Sparkline points={visual.points} tone={visual.tone ?? "neutral"} maxPoints={visual.points.length} />;
    }
    case "media": {
      return (
        <div className="overflow-hidden rounded-xl border border-border/50 shadow-sm">
          <img src={visual.url} alt={visual.alt} className="h-20 w-32 object-cover" />
        </div>
      );
    }
    case "pill":
      return (
        <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", toneBg[visual.tone ?? "neutral"])}>
          {visual.label}
        </span>
      );
    default:
      return null;
  }
}

function Timeline({ items, accent }: { items: ModuleSectionItem[]; accent?: ModuleTone }) {
  return (
    <ol className="relative space-y-4 pl-3 before:absolute before:left-0 before:top-0 before:h-full before:w-px before:bg-border">
      {items.map((item, index) => (
        <li key={item.title} className="relative flex gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
          <div
            className={cn(
              "absolute -left-[9px] top-4 h-2.5 w-2.5 rounded-full border-2 border-background",
              toneBg[accent ?? "info"],
            )}
          />
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex items-start gap-3">
              {item.icon ? (
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-background/80 text-muted-foreground">
                  {item.icon}
                </div>
              ) : null}
              <div className="space-y-1">
                <p className="font-semibold text-foreground">{item.title}</p>
                {item.description ? (
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                ) : null}
                {item.meta ? <p className="text-xs text-muted-foreground">{item.meta}</p> : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {item.visual ? renderVisual(item.visual) : null}
              {item.badge ? (
                <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", toneBg[item.tone ?? "neutral"])}>
                  {item.badge}
                </span>
              ) : null}
            </div>
          </div>
          <span className="text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
        </li>
      ))}
    </ol>
  );
}
