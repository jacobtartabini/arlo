import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Locate, 
  Plus, 
  Minus, 
  Compass, 
  Layers, 
  Map, 
  Satellite, 
  Mountain,
  Loader2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MapControlsProps {
  onLocateMe: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetBearing: () => void;
  onMapTypeChange: (type: 'roadmap' | 'satellite' | 'hybrid' | 'terrain') => void;
  isFollowing: boolean;
  bearing: number;
  currentMapType: 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
  isLocating: boolean;
  hasLocation: boolean;
}

const mapTypes = [
  { id: 'roadmap' as const, icon: Map, label: 'Map' },
  { id: 'satellite' as const, icon: Satellite, label: 'Satellite' },
  { id: 'hybrid' as const, icon: Layers, label: 'Hybrid' },
  { id: 'terrain' as const, icon: Mountain, label: 'Terrain' },
];

export function MapControls({
  onLocateMe,
  onZoomIn,
  onZoomOut,
  onResetBearing,
  onMapTypeChange,
  isFollowing,
  bearing,
  currentMapType,
  isLocating,
  hasLocation,
}: MapControlsProps) {
  const [showLayers, setShowLayers] = useState(false);

  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2">
      {/* Locate Me Button */}
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          variant="secondary"
          size="icon"
          onClick={onLocateMe}
          className={cn(
            "w-11 h-11 rounded-xl shadow-lg backdrop-blur-xl",
            "bg-background/90 hover:bg-background border border-border",
            isFollowing && "ring-2 ring-primary text-primary"
          )}
          disabled={isLocating}
        >
          {isLocating ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Locate className={cn("w-5 h-5", isFollowing && "fill-current")} />
          )}
        </Button>
      </motion.div>

      {/* Zoom Controls */}
      <div className="flex flex-col rounded-xl overflow-hidden shadow-lg backdrop-blur-xl bg-background/90 border border-border">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            variant="ghost"
            size="icon"
            onClick={onZoomIn}
            className="w-11 h-11 rounded-none hover:bg-accent"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </motion.div>
        <div className="h-px bg-border" />
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            variant="ghost"
            size="icon"
            onClick={onZoomOut}
            className="w-11 h-11 rounded-none hover:bg-accent"
          >
            <Minus className="w-5 h-5" />
          </Button>
        </motion.div>
      </div>

      {/* Compass Button */}
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          variant="secondary"
          size="icon"
          onClick={onResetBearing}
          className={cn(
            "w-11 h-11 rounded-xl shadow-lg backdrop-blur-xl",
            "bg-background/90 hover:bg-background border border-border",
            bearing !== 0 && "ring-2 ring-primary"
          )}
        >
          <motion.div
            animate={{ rotate: -bearing }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <Compass className="w-5 h-5" />
          </motion.div>
        </Button>
      </motion.div>

      {/* Layers Button */}
      <div className="relative">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setShowLayers(!showLayers)}
            className={cn(
              "w-11 h-11 rounded-xl shadow-lg backdrop-blur-xl",
              "bg-background/90 hover:bg-background border border-border",
              showLayers && "ring-2 ring-primary"
            )}
          >
            <Layers className="w-5 h-5" />
          </Button>
        </motion.div>

        {/* Layers Dropdown */}
        <AnimatePresence>
          {showLayers && (
            <motion.div
              initial={{ opacity: 0, x: 8, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "absolute right-full mr-2 top-0",
                "rounded-xl overflow-hidden shadow-xl backdrop-blur-xl",
                "bg-background/95 border border-border"
              )}
            >
              <div className="p-2 flex flex-col gap-1">
                {mapTypes.map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => {
                      onMapTypeChange(id);
                      setShowLayers(false);
                    }}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors whitespace-nowrap",
                      "hover:bg-accent",
                      currentMapType === id && "bg-primary/10 text-primary"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
