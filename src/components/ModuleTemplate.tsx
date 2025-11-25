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
  span?: 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
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

const spanClassMap: Record<NonNullable<ModuleSection["span"]>, string> = {
  3: "md:col-span-3",
  4: "md:col-span-4",
  5: "md:col-span-5",
  6: "md:col-span-6",
  7: "md:col-span-7",
  8: "md:col-span-8",
  9: "md:col-span-9",
  10: "md:col-span-10",
  11: "md:col-span-11",
  12: "md:col-span-12",
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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-black text-slate-50">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-12 top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute right-10 top-10 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.08),transparent_25%)]" />
      </div>

      <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-6 pb-12 pt-10">
        <header className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_10px_80px_-40px_rgba(15,23,42,0.8)] backdrop-blur">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-2xl border border-white/15 bg-white/5 text-slate-100"
                onClick={() => navigate("/dashboard")}
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 via-primary/20 to-indigo-500/30 text-primary shadow-inner">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Arlo Module
                  </div>
                  <h1 className="text-3xl font-semibold leading-tight text-white">{title}</h1>
                  <p className="max-w-3xl text-base text-slate-300">{description}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {secondaryAction ? (
                <Button
                  variant="outline"
                  className="min-w-[150px] rounded-2xl border-white/20 bg-white/5 text-slate-100 hover:border-primary/40 hover:text-white"
                >
                  {secondaryAction}
                </Button>
              ) : null}
              <Button className="min-w-[160px] rounded-2xl bg-gradient-to-r from-primary to-blue-500 text-white shadow-lg shadow-primary/30">
                {primaryAction}
              </Button>
            </div>
          </div>

          {stats.length ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <Card
                  key={stat.label}
                  className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 text-left shadow-[0_10px_40px_-24px_rgba(15,23,42,0.8)] backdrop-blur"
                >
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{stat.label}</p>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-2xl font-semibold text-white">{stat.value}</span>
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          {sections.map((section) => (
            <Card
              key={section.title}
              className={cn(
                "group relative col-span-12 overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_10px_50px_-38px_rgba(15,23,42,0.9)] backdrop-blur",
                spanClassMap[section.span ?? 6],
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative mb-5 flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold text-white">{section.title}</h2>
                  {section.description ? (
                    <p className="text-sm text-slate-300">{section.description}</p>
                  ) : null}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-2xl border border-white/10 bg-white/5 text-slate-300"
                  aria-label={`More options for ${section.title}`}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
              <div className="relative grid gap-3 sm:grid-cols-2">
                {section.items.map((item) => (
                  <div
                    key={item.title}
                    className="group/item relative flex h-full flex-col justify-between gap-3 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-3 shadow-inner shadow-black/5 transition duration-200 hover:-translate-y-[1px] hover:border-primary/30"
                  >
                    <div className="flex items-start gap-3">
                      {item.icon ? (
                        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-slate-100 shadow-inner">
                          {item.icon}
                        </div>
                      ) : null}
                      <div className="space-y-1">
                        <p className="text-base font-medium text-white">{item.title}</p>
                        {item.description ? (
                          <p className="text-sm text-slate-300">{item.description}</p>
                        ) : null}
                        {item.meta ? <p className="text-xs text-slate-400">{item.meta}</p> : null}
                      </div>
                    </div>
                    {item.badge ? (
                      <span className="inline-flex items-center gap-2 self-start rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {item.badge}
                      </span>
                    ) : null}
                    <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/item:opacity-100">
                      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                    </div>
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
