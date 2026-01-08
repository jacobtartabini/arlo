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
}: MobileModuleCardProps) {
  return (
    <motion.div
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={cn(
        "rounded-2xl overflow-hidden",
        "bg-card border border-border/50",
        onClick && "cursor-pointer active:bg-card/90",
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
            <div className="flex items-center gap-2.5">
              {Icon && (
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" strokeWidth={2} />
                </div>
              )}
              <div>
                <h3 className="text-[15px] font-semibold text-foreground">
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-[12px] text-muted-foreground">{subtitle}</p>
                )}
              </div>
            </div>
            
            {actionLabel && (
              <button 
                className="flex items-center gap-0.5 text-[12px] font-medium text-primary"
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
