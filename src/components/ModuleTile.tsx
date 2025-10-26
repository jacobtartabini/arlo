import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Module } from "./BentoGrid";

interface ModuleTileProps {
  module: Module;
  onClick: () => void;
}

export function ModuleTile({ module, onClick }: ModuleTileProps) {
  const Icon = module.icon;

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="h-full cursor-pointer"
    >
      <Card className="glass h-full p-6 relative overflow-hidden group">
        {/* Gradient background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${module.color} opacity-10 group-hover:opacity-20 transition-opacity`} />
        
        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-between">
          <div className="space-y-2">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${module.color} flex items-center justify-center`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">{module.title}</h3>
          </div>
          
          {module.summary && (
            <p className="text-sm text-muted-foreground mt-4">{module.summary}</p>
          )}
        </div>

        {/* Glow effect */}
        <div className={`absolute -bottom-10 -right-10 w-40 h-40 bg-gradient-to-br ${module.color} opacity-0 group-hover:opacity-20 blur-3xl transition-opacity`} />
      </Card>
    </motion.div>
  );
}
