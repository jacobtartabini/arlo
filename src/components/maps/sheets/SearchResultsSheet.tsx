import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Place } from '@/types/maps';

interface SearchResultsSheetProps {
  results: Place[];
  onPlaceSelect: (place: Place) => void;
}

export function SearchResultsSheet({ results, onPlaceSelect }: SearchResultsSheetProps) {
  if (results.length === 0) {
    return (
      <div className="text-center py-8">
        <MapPin className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">
          No results found
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {results.map((place, index) => (
        <motion.div
          key={place.placeId}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <button
            onClick={() => onPlaceSelect(place)}
            className={cn(
              "w-full flex items-start gap-3 p-3 rounded-xl",
              "hover:bg-accent transition-colors text-left"
            )}
          >
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{place.name}</p>
              <p className="text-sm text-muted-foreground truncate">
                {place.address}
              </p>
              {place.rating && (
                <p className="text-xs text-muted-foreground mt-1">
                  ⭐ {place.rating.toFixed(1)}
                </p>
              )}
            </div>
            <Button variant="ghost" size="icon" className="flex-shrink-0">
              <Navigation className="w-4 h-4" />
            </Button>
          </button>
        </motion.div>
      ))}
    </div>
  );
}
