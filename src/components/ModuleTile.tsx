import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { type Module, type ModuleSize } from "@/lib/app-navigation";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModuleMiniContent } from "@/components/dashboard/ModuleMiniContent";
import { useDashboardData } from "@/hooks/useDashboardData";

interface ModuleTileProps {
  module: Module;
  onClick: () => void;
  sizeClass?: ModuleSize;
}

export function ModuleTile({ module, onClick, sizeClass }: ModuleTileProps) {
  const Icon = module.icon;
  const size = sizeClass || module.size;
  const isPrimary = size === "primary";
  const isTertiary = size === "tertiary";
  const { refresh, isLoading, ...dashboardData } = useDashboardData();

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="h-full cursor-pointer group"
    >
      <Card 
        className={cn(
          "glass-module h-full relative overflow-hidden transition-all duration-200",
          isPrimary ? "p-5" : isTertiary ? "p-3" : "p-4"
        )}
      >
        {/* Subtle accent line on hover */}
        <div 
          className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: `linear-gradient(90deg, transparent, hsl(var(--${module.color})), transparent)`
          }}
        />
        
        {/* Content */}
        <div className="relative z-10 h-full flex flex-col">
          {/* Header */}
          <div className={cn(
            "flex items-start gap-3",
            isPrimary ? "mb-2" : isTertiary ? "mb-1" : "mb-2"
          )}>
            {/* Icon */}
            <div className={cn(
              "rounded-lg bg-primary/8 flex items-center justify-center shrink-0 group-hover:bg-primary/12 transition-colors",
              isPrimary ? "w-10 h-10" : isTertiary ? "w-7 h-7" : "w-8 h-8"
            )}>
              <Icon 
                className={cn(
                  "text-primary",
                  isPrimary ? "w-5 h-5" : isTertiary ? "w-3.5 h-3.5" : "w-4 h-4"
                )} 
                strokeWidth={2} 
              />
            </div>

            {/* Title only - summary removed to make room for mini content */}
            <div className="min-w-0 flex-1">
              <h3 className={cn(
                "font-semibold text-foreground tracking-tight leading-tight",
                isPrimary ? "text-base" : isTertiary ? "text-xs" : "text-sm"
              )}>
                {module.title}
              </h3>
              {isTertiary && module.summary && (
                <p className="text-[10px] text-muted-foreground truncate">
                  {module.summary}
                </p>
              )}
            </div>
          </div>

          {/* Mini interaction content */}
          {!isLoading && (
            <ModuleMiniContent
              moduleId={module.id}
              size={size}
              data={dashboardData}
            />
          )}

          {/* Spacer */}
          <div className="flex-1 min-h-1" />

          {/* Action hint - only on primary/secondary */}
          {!isTertiary && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 group-hover:text-primary/80 transition-colors pt-2 border-t border-border/30">
              <span className="font-medium">{module.actionLabel}</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          )}
        </div>

        {/* Subtle corner accent on hover */}
        <div 
          className="absolute bottom-0 right-0 w-16 h-16 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `radial-gradient(circle at bottom right, hsl(var(--${module.color}) / 0.1), transparent 70%)`
          }}
        />
      </Card>
    </motion.div>
  );
}
