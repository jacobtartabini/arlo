import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Locate, 
  Compass, 
  Layers, 
  Map, 
  Satellite, 
  Mountain,
  Loader2 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MapFloatingControlsProps {
  onLocateMe: () => void;
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
  { id: 'terrain' as const, icon: Mountain, label: 'Terrain' },
];

export function MapFloatingControls({
  onLocateMe,
  onResetBearing,
  onMapTypeChange,
  isFollowing,
  bearing,
  currentMapType,
  isLocating,
}: MapFloatingControlsProps) {
  const [showLayers, setShowLayers] = useState(false);

  const buttonBase = cn(
    "w-11 h-11 rounded-full flex items-center justify-center",
    "bg-background/80 backdrop-blur-xl shadow-lg",
    "border border-white/10 dark:border-white/5",
    "hover:bg-background/95 active:scale-95 transition-all duration-200"
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="absolute bottom-36 right-4 z-40 flex flex-col gap-3"
    >
      {/* Layers Toggle */}
      <div className="relative">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowLayers(!showLayers)}
          className={cn(
            buttonBase,
            showLayers && "ring-2 ring-primary/50 bg-background"
          )}
        >
          <Layers className="w-5 h-5 text-foreground/80" />
        </motion.button>

        <AnimatePresence>
          {showLayers && (
            <motion.div
              initial={{ opacity: 0, x: 10, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "absolute right-full mr-3 top-1/2 -translate-y-1/2",
                "flex gap-2 p-2 rounded-full",
                "bg-background/95 backdrop-blur-xl shadow-xl",
                "border border-white/10 dark:border-white/5"
              )}
            >
              {mapTypes.map(({ id, icon: Icon }) => (
                <motion.button
                  key={id}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    onMapTypeChange(id);
                    setShowLayers(false);
                  }}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                    currentMapType === id 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-accent"
                  )}
                  title={id}
                >
                  <Icon className="w-4 h-4" />
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Compass - only show when bearing is not 0 */}
      <AnimatePresence>
        {bearing !== 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileTap={{ scale: 0.95 }}
            onClick={onResetBearing}
            className={buttonBase}
          >
            <motion.div
              animate={{ rotate: -bearing }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <Compass className="w-5 h-5 text-foreground/80" />
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Locate Me */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onLocateMe}
        disabled={isLocating}
        className={cn(
          buttonBase,
          isFollowing && "ring-2 ring-primary/50 bg-primary/10"
        )}
      >
        {isLocating ? (
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        ) : (
          <Locate className={cn(
            "w-5 h-5 transition-colors",
            isFollowing ? "text-primary fill-primary/20" : "text-foreground/80"
          )} />
        )}
      </motion.button>
    </motion.div>
  );
}
