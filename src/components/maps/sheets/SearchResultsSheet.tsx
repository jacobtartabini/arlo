import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Place } from '@/types/maps';

interface SearchResultsSheetProps {
  results: Place[];
  onPlaceSelect: (place: Place) => void;
}

export function SearchResultsSheet({ results, onPlaceSelect }: SearchResultsSheetProps) {
  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-14 h-14 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
          <MapPin className="w-6 h-6 text-muted-foreground/50" />
        </div>
        <p className="text-muted-foreground">No results found</p>
        <p className="text-sm text-muted-foreground/70 mt-1">Try a different search</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {results.map((place, index) => (
        <motion.button
          key={place.placeId}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.03 }}
          onClick={() => onPlaceSelect(place)}
          className={cn(
            "w-full flex items-center gap-3 p-3 rounded-xl",
            "hover:bg-accent/50 transition-colors text-left group"
          )}
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{place.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {place.rating && (
                <div className="flex items-center gap-0.5">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <span className="text-xs text-muted-foreground">{place.rating.toFixed(1)}</span>
                </div>
              )}
              <span className="text-xs text-muted-foreground truncate">
                {place.address}
              </span>
            </div>
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Navigation className="w-4 h-4 text-primary" />
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );
}
