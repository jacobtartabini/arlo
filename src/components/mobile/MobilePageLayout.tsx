import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MobilePageLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  showBackButton?: boolean;
  headerRight?: ReactNode;
  noPadding?: boolean;
  className?: string;
}

export function MobilePageLayout({
  title,
  subtitle,
  children,
  showBackButton = true,
  headerRight,
  noPadding = false,
  className,
}: MobilePageLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className={cn("min-h-screen bg-background pb-28", className)}>
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {showBackButton && (
              <button
                onClick={() => navigate(-1)}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors active:scale-95"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div>
              <h1 className="text-lg font-semibold text-foreground">{title}</h1>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>
          
          {headerRight && (
            <div className="flex items-center gap-2">
              {headerRight}
            </div>
          )}
        </div>
      </motion.header>

      {/* Content */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
        className={cn(noPadding ? "" : "px-4 py-4")}
      >
        {children}
      </motion.main>
    </div>
  );
}
