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
  variant?: "default" | "transparent";
}

export function MobilePageLayout({
  title,
  subtitle,
  children,
  showBackButton = true,
  headerRight,
  noPadding = false,
  className,
  variant = "default",
}: MobilePageLayoutProps) {
  const navigate = useNavigate();

  const headerVariants = {
    default: "bg-background/90 backdrop-blur-2xl border-b border-border/20 shadow-sm shadow-foreground/[0.02]",
    transparent: "bg-transparent",
  };

  return (
    <div className={cn("min-h-screen bg-background bg-atmosphere bg-noise pb-28", className)}>
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "sticky top-0 z-40",
          headerVariants[variant]
        )}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {showBackButton && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate(-1)}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-card border border-border/40 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </motion.button>
            )}
            <div>
              <h1 className="text-lg font-display font-semibold text-foreground tracking-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
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
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className={cn(noPadding ? "" : "px-4 py-4", "relative z-10")}
      >
        {children}
      </motion.main>
    </div>
  );
}
