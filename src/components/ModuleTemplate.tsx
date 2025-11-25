import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowLeft, MoreHorizontal, type LucideIcon } from "lucide-react";

export type ModuleStat = {
  label: string;
  value: string;
  helper?: string;
  tone?: "positive" | "neutral" | "negative";
};

export type ModuleSectionItem = {
  title: string;
  meta?: string;
  description?: string;
  badge?: string;
  icon?: ReactNode;
};

export type ModuleSection = {
  title: string;
  description?: string;
  items: ModuleSectionItem[];
};

type ModuleTemplateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  primaryAction: string;
  secondaryAction?: string;
  stats?: ModuleStat[];
  sections: ModuleSection[];
};

const toneClasses: Record<NonNullable<ModuleStat["tone"]>, string> = {
  positive: "text-emerald-600 dark:text-emerald-400",
  neutral: "text-muted-foreground",
  negative: "text-rose-600 dark:text-rose-400",
};

export function ModuleTemplate({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  stats = [],
  sections,
}: ModuleTemplateProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
        <header className="flex flex-col gap-6 rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full border border-border/60"
                onClick={() => navigate("/dashboard")}
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
                  <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {secondaryAction ? (
                <Button variant="outline" className="min-w-[120px]">
                  {secondaryAction}
                </Button>
              ) : null}
              <Button className="min-w-[140px]">{primaryAction}</Button>
            </div>
          </div>

          {stats.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => (
                <Card key={stat.label} className="border-border/60 bg-card/80 p-4 shadow-none">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-xl font-semibold text-foreground">{stat.value}</span>
                    {stat.helper ? (
                      <span className={cn("text-xs font-medium", toneClasses[stat.tone ?? "neutral"])}>
                        {stat.helper}
                      </span>
                    ) : null}
                  </div>
                </Card>
              ))}
            </div>
          ) : null}
        </header>

        <div className="grid gap-4">
          {sections.map((section) => (
            <Card key={section.title} className="border-border/70 bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
                  {section.description ? (
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  ) : null}
                </div>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </div>
              <div className="divide-y divide-border/70">
                {section.items.map((item) => (
                  <div key={item.title} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <div className="flex gap-3">
                      {item.icon ? (
                        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          {item.icon}
                        </div>
                      ) : null}
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{item.title}</p>
                        {item.description ? (
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        ) : null}
                        {item.meta ? <p className="text-xs text-muted-foreground">{item.meta}</p> : null}
                      </div>
                    </div>
                    {item.badge ? (
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        {item.badge}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

