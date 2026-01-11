import { ReactNode } from "react";
import { motion } from "framer-motion";
import { ChevronRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileModuleCardProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  onClick?: () => void;
  children: ReactNode;
  actionLabel?: string;
  className?: string;
  noPadding?: boolean;
  variant?: "default" | "elevated" | "outlined";
}

export function MobileModuleCard({
  title,
  subtitle,
  icon: Icon,
  onClick,
  children,
  actionLabel,
  className,
  noPadding = false,
  variant = "default",
}: MobileModuleCardProps) {
  const variants = {
    default: "bg-card border-border/40",
    elevated: "bg-card border-border/30 shadow-lg shadow-foreground/[0.03]",
    outlined: "bg-transparent border-border",
  };

  return (
    <motion.div
      whileTap={onClick ? { scale: 0.985 } : undefined}
      onClick={onClick}
      className={cn(
        "rounded-2xl overflow-hidden border",
        "transition-all duration-300",
        variants[variant],
        onClick && "cursor-pointer active:bg-muted/30",
        className
      )}
    >
      <div className={cn(noPadding ? "" : "p-4")}>
        {/* Header - only show if title exists */}
        {title && (
          <div className={cn(
            "flex items-center justify-between",
            noPadding ? "px-4 pt-4" : "",
            "mb-3"
          )}>
            <div className="flex items-center gap-3">
              {Icon && (
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/10">
                  <Icon className="h-4.5 w-4.5 text-primary" strokeWidth={2} />
                </div>
              )}
              <div>
                <h3 className="text-sm font-semibold text-foreground tracking-tight">
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
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
        )}

        {/* Content */}
        <div className={cn(noPadding && !title ? "" : "")}>
          {children}
        </div>
      </div>
    </motion.div>
  );
}
