import { ReactNode } from "react";
import { motion } from "framer-motion";
import { ChevronRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileModuleCardProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  accentColor?: string;
  onClick?: () => void;
  children: ReactNode;
  actionLabel?: string;
  isCompact?: boolean;
  className?: string;
}

export function MobileModuleCard({
  title,
  subtitle,
  icon: Icon,
  accentColor = "primary",
  onClick,
  children,
  actionLabel,
  isCompact = false,
  className,
}: MobileModuleCardProps) {
  return (
    <motion.div
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className={cn(
        "relative rounded-2xl overflow-hidden",
        "bg-card/60 backdrop-blur-xl",
        "border border-border/50",
        "shadow-sm",
        onClick && "cursor-pointer active:bg-card/80",
        className
      )}
    >
      {/* Accent gradient at top */}
      <div 
        className="absolute top-0 inset-x-0 h-0.5 opacity-60"
        style={{
          background: `linear-gradient(90deg, transparent, hsl(var(--${accentColor})), transparent)`
        }}
      />

      <div className={cn(isCompact ? "p-3" : "p-4")}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "flex items-center justify-center rounded-xl",
              "bg-primary/10",
              isCompact ? "w-8 h-8" : "w-9 h-9"
            )}>
              <Icon className={cn(
                "text-primary",
                isCompact ? "h-4 w-4" : "h-4.5 w-4.5"
              )} strokeWidth={2} />
            </div>
            <div>
              <h3 className={cn(
                "font-semibold text-foreground",
                isCompact ? "text-sm" : "text-base"
              )}>
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>
          
          {actionLabel && (
            <button 
              className="flex items-center gap-0.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onClick?.();
              }}
            >
              {actionLabel}
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className={cn(isCompact ? "space-y-2" : "space-y-3")}>
          {children}
        </div>
      </div>
    </motion.div>
  );
}
