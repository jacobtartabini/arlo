import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Module } from "./BentoGrid";
import { ArrowRight, TrendingUp } from "lucide-react";

interface ModuleTileProps {
  module: Module;
  onClick: () => void;
}

export function ModuleTile({ module, onClick }: ModuleTileProps) {
  const Icon = module.icon;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="h-full cursor-pointer group"
    >
      <Card className="glass-module h-full p-6 relative overflow-hidden">
        {/* Subtle accent line */}
        <div 
          className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: `linear-gradient(90deg, transparent, hsl(var(--${module.color})), transparent)`
          }}
        />
        
        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-between">
          <div className="space-y-3">
            {/* Icon with subtle background */}
            <div className="w-11 h-11 rounded-lg bg-primary/8 flex items-center justify-center group-hover:bg-primary/12 transition-colors">
              <Icon className="w-5 h-5 text-primary" strokeWidth={2} />
            </div>
            
            {/* Title */}
            <h3 className="text-lg font-semibold text-foreground tracking-tight">
              {module.title}
            </h3>
          </div>
          
          {/* Summary with icon */}
          {module.summary && (
            <div className="space-y-3 mt-auto pt-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {module.summary}
              </p>
              
              {/* Action hint */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground/60 group-hover:text-primary/80 transition-colors">
                <span className="font-medium">Open</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          )}
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
