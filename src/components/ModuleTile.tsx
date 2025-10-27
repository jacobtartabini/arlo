import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Module } from "./BentoGrid";
import {
  ArrowRight,
  ThermometerSun,
  CloudRain,
  ShieldCheck,
  Activity,
  Play,
  Pause,
  Sparkles,
  Search,
  Newspaper,
  Workflow,
  RefreshCcw,
  BellRing,
  CheckCircle2,
  TrendingUp,
  Clock3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface ModuleTileProps {
  module: Module;
  onClick: () => void;
}

export function ModuleTile({ module, onClick }: ModuleTileProps) {
  const Icon = module.icon;

  // Render different content based on module type
  const renderModuleContent = () => {
    switch (module.id) {
      case "finance":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-semibold text-foreground">$128,450</p>
                <p className="text-xs text-muted-foreground">Total net worth</p>
              </div>
              <Badge variant="outline" className="text-[11px] border-primary/30 text-primary">
                You saved 12% more
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Spend vs budget</span>
                <span className="text-foreground font-medium">$3.2k / $4k</span>
              </div>
              <div className="h-16 grid grid-cols-12 gap-1">
                {[45, 62, 58, 52, 70, 66, 60, 54, 48, 72, 68, 61].map((height, index) => (
                  <motion.div
                    key={index}
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ delay: index * 0.05, duration: 0.4 }}
                    className={`rounded-sm ${index > 8 ? "bg-primary/70" : "bg-primary/30"}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Next bill</span>
              <span className="text-foreground">Design Tools • $42 on Apr 28</span>
            </div>
          </div>
        );

      case "productivity":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative w-14 h-14">
                <svg className="w-14 h-14 -rotate-90">
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    stroke="hsl(var(--accent) / 0.1)"
                    strokeWidth="4"
                    fill="none"
                  />
                  <motion.circle
                    cx="28"
                    cy="28"
                    r="24"
                    stroke="hsl(var(--accent))"
                    strokeWidth="4"
                    fill="none"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: "0 150.8" }}
                    animate={{ strokeDasharray: "93 150.8" }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-xs font-semibold text-accent-foregroun
d">
                  62%
                  <span className="text-[10px] text-muted-foreground">tasks</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Today</p>
                <p className="text-xs text-muted-foreground">Focus block 2–4 PM • Prep design review</p>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { time: "09:30", label: "Product Standup" },
                { time: "12:00", label: "Lunch w/ Taylor" },
                { time: "15:00", label: "Deep work" }
              ].map((item) => (
                <div key={item.time} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{item.time}</span>
                  <span className="text-foreground">{item.label}</span>
                </div>
              ))}
            </div>
            <div className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
              <span className="text-accent-foreground font-medium flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" /> AI Suggestion
              </span>
              <p className="mt-1 leading-relaxed">
                Block 20 minutes after the review to capture decisions and send recap.
              </p>
            </div>
          </div>
        );

      case "travel":
        return (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Flight DL204</p>
                <p className="text-lg font-semibold text-foreground">On Time — 18:45</p>
              </div>
              <Badge variant="secondary" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/20">
                Boarding in 42m
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg bg-primary/5 p-2 text-center">
                <p className="font-semibold text-foreground">SFO</p>
                <p className="text-muted-foreground">Gate C12</p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <ThermometerSun className="w-4 h-4 text-primary mb-1" />
                <span className="text-foreground font-medium">72°F</span>
                <span className="text-[10px] text-muted-foreground">Clear</span>
              </div>
              <div className="flex flex-col items-center justify-center">
                <CloudRain className="w-4 h-4 text-primary mb-1" />
                <span className="text-foreground font-medium">64°F</span>
                <span className="text-[10px] text-muted-foreground">NYC</span>
              </div>
            </div>
            <Button size="sm" className="w-full" variant="outline" onClick={(event) => event.stopPropagation()}>
              Book trip
            </Button>
          </div>
        );

      case "system":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">All systems secure</p>
                <p className="text-lg font-semibold text-foreground">6 active devices</p>
              </div>
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="space-y-2">
              {[{ label: "CPU", value: 42 }, { label: "GPU", value: 35 }, { label: "RAM", value: 68 }].map((metric) => (
                <div key={metric.label} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{metric.label}</span>
                    <span className="text-foreground font-medium">{metric.value}%</span>
                  </div>
                  <Progress value={metric.value} className="h-1.5" />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Uptime</span>
              <span className="text-foreground">12d 4h 18m</span>
            </div>
          </div>
        );

      case "automations":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">3 active playbooks</p>
                <p className="text-lg font-semibold text-foreground">6.4 hrs saved</p>
              </div>
              <Workflow className="w-5 h-5 text-accent" />
            </div>
            <div className="space-y-2 text-xs">
              <div className="rounded-md border border-border/40 p-2 flex items-center justify-between">
                <span className="text-muted-foreground">Finance digest</span>
                <span className="text-foreground">Fri · 09:00</span>
              </div>
              <div className="rounded-md border border-border/40 p-2 flex items-center justify-between">
                <span className="text-muted-foreground">System health check</span>
                <span className="text-emerald-400">Running</span>
              </div>
              <div className="rounded-md border border-border/40 p-2 flex items-center justify-between">
                <span className="text-muted-foreground">Investor brief draft</span>
                <span className="text-amber-400">Queued</span>
              </div>
            </div>
            <Button size="sm" variant="outline" className="w-full" onClick={(event) => event.stopPropagation()}>
              <RefreshCcw className="w-4 h-4 mr-2" /> Run quick fixes
            </Button>
          </div>
        );

      case "insights":
        return (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Weekly intelligence</p>
                <p className="text-lg font-semibold text-foreground">Productivity up 12%</p>
              </div>
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Focus mode streaks aligned with calendar locks gave you the boost. Arlo queued 3 follow-up actions.
            </p>
            <div className="rounded-md bg-primary/10 p-3 text-xs text-primary flex items-center gap-2">
              <Clock3 className="w-4 h-4" /> Last refreshed moments ago — tap for full insight board.
            </div>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unified alerts</p>
                <p className="text-lg font-semibold text-foreground">3 waiting</p>
              </div>
              <BellRing className="w-5 h-5 text-accent" />
            </div>
            <div className="space-y-2 text-xs">
              <div className="rounded-md border border-border/40 p-2 flex items-center justify-between">
                <span className="text-muted-foreground">Finance · Bill Apr 28</span>
                <span className="text-foreground">Queued</span>
              </div>
              <div className="rounded-md border border-border/40 p-2 flex items-center justify-between">
                <span className="text-muted-foreground">System · Quick fixes</span>
                <span className="text-emerald-400">Healthy</span>
              </div>
              <div className="rounded-md border border-border/40 p-2 flex items-center justify-between">
                <span className="text-muted-foreground">Focus block</span>
                <span className="text-amber-400">Starts 10m</span>
              </div>
            </div>
            <div className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Snooze active — urgent alerts still break through.
            </div>
          </div>
        );

      case "health":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative w-14 h-14">
                <svg className="w-14 h-14 -rotate-90">
                  <circle cx="28" cy="28" r="24" stroke="hsl(var(--primary) / 0.12)" strokeWidth="4" fill="none" />
                  <motion.circle
                    cx="28"
                    cy="28"
                    r="24"
                    stroke="hsl(var(--primary))"
                    strokeWidth="4"
                    fill="none"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: "0 150.8" }}
                    animate={{ strokeDasharray: "123 150.8" }}
                    transition={{ duration: 1.1, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-xs font-semibold text-primary">
                  1,840
                  <span className="text-[10px] text-muted-foreground">/ 2,250</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Activity streak</p>
                <p className="text-xs text-muted-foreground">9 days • 6,420 steps today</p>
              </div>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Workout goal</span>
                <span className="text-foreground font-medium">45 / 60 min</span>
              </div>
              <Progress value={75} className="h-1.5" />
            </div>
            <div className="rounded-lg bg-muted/20 p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <div className="text-xs">
                <p className="text-foreground font-medium">Now playing</p>
                <p className="text-muted-foreground">Chill Vibes — Spotify</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(event) => event.stopPropagation()}>
                  <Play className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(event) => event.stopPropagation()}>
                  <Pause className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        );

      case "creation":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {["Lunar concept", "Deck draft", "PCB rev"].map((label, index) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="aspect-video rounded-lg bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-border/40 flex items-end p-2"
                >
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                </motion.div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={(event) => event.stopPropagation()}>
                New Doc
              </Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={(event) => event.stopPropagation()}>
                Generate image
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              2 drafts awaiting review • 1 render in queue
            </div>
          </div>
        );

      case "knowledge":
        return (
          <div className="space-y-4">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Newspaper className="w-3.5 h-3.5 text-primary" />
                Today’s News Summary
              </div>
              <p className="mt-2 text-sm text-foreground font-medium leading-snug">
                Markets rebound as green-tech funding hits a new record.
              </p>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                readOnly
                className="pl-10 text-xs"
                value="Search research, archives, or experts"
                onFocus={(event) => event.currentTarget.blur()}
              />
            </div>
            <div className="text-xs text-muted-foreground leading-relaxed">
              Fun fact: The archivist indexed 1.2M documents with AI citations this week.
            </div>
          </div>
        );

      default:
        return (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {module.summary}
          </p>
        );
    }
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="h-full cursor-pointer group"
    >
      <Card className="glass-module h-full p-5 relative overflow-hidden">
        {/* Subtle accent line */}
        <div 
          className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: `linear-gradient(90deg, transparent, hsl(var(--${module.color})), transparent)`
          }}
        />
        
        {/* Content */}
        <div className="relative z-10 h-full flex flex-col">
          <div className="space-y-2 mb-3">
            {/* Icon with subtle background */}
            <div className="w-10 h-10 rounded-lg bg-primary/8 flex items-center justify-center group-hover:bg-primary/12 transition-colors">
              <Icon className="w-4 h-4 text-primary" strokeWidth={2} />
            </div>

            {/* Title */}
            <h3 className="text-base font-semibold text-foreground tracking-tight">
              {module.title}
            </h3>
          </div>

          {/* Rich widget content */}
          <div className="flex-1">
            {renderModuleContent()}
          </div>

          {/* Action hint */}
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 group-hover:text-primary/80 transition-colors mt-3 pt-2 border-t border-border/30">
            <span className="font-medium">View details</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Subtle corner accent */}
        <div 
          className="absolute bottom-0 right-0 w-24 h-24 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: `radial-gradient(circle at bottom right, hsl(var(--${module.color}) / 0.08), transparent 70%)`
          }}
        />
      </Card>
    </motion.div>
  );
}
