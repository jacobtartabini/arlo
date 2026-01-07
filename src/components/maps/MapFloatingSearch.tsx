import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import type { Place, RecentSearch, SavedPlace, LatLng, PlacePrediction } from '@/types/maps';

interface MapFloatingSearchProps {
  value: string;
  onChange: (value: string) => void;
  onResultSelect: (place: Place) => void;
  onFocusChange: (focused: boolean) => void;
  recentSearches: RecentSearch[];
  onClearRecent: () => void;
  homePlace?: SavedPlace;
  workPlace?: SavedPlace;
  currentLocation: LatLng | null;
  isNavigating?: boolean;
}

export function MapFloatingSearch({
  value,
  onChange,
  onResultSelect,
  onFocusChange,
  recentSearches,
  onClearRecent,
  homePlace,
  workPlace,
  currentLocation,
  isNavigating,
}: MapFloatingSearchProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [sessionToken] = useState(() => crypto.randomUUID());

  // Fetch predictions
  const fetchPredictions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setPredictions([]);
      return;
    }

    setIsLoading(true);
    try {
      const body: Record<string, unknown> = { query, sessionToken };
      if (currentLocation) {
        body.location = `${currentLocation.lat},${currentLocation.lng}`;
        body.radius = 50000;
      }

      const { data, error } = await supabase.functions.invoke('places-autocomplete', { body });

      if (!error && data?.predictions) {
        setPredictions(data.predictions);
      } else {
        setPredictions([]);
      }
    } catch {
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentLocation, sessionToken]);

  // Debounced input
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(newValue), 300);
  }, [onChange, fetchPredictions]);

  // Select prediction
  const handlePredictionSelect = useCallback(async (prediction: PlacePrediction) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('maps-api/place-details', {
        body: { placeId: prediction.placeId },
      });

      if (!error && data?.place) {
        onResultSelect(data.place);
        setPredictions([]);
        setIsFocused(false);
        onChange('');
      }
    } finally {
      setIsLoading(false);
    }
  }, [onResultSelect, onChange]);

  // Handle saved place
  const handleSavedPlaceSelect = useCallback((place: SavedPlace) => {
    onResultSelect({
      placeId: place.placeId,
      name: place.name,
      address: place.address,
      location: place.location,
    });
    setIsFocused(false);
  }, [onResultSelect]);

  // Handle recent search
  const handleRecentSelect = useCallback((search: RecentSearch) => {
    if (search.location) {
      onResultSelect({
        placeId: search.placeId || '',
        name: search.placeName || search.query,
        address: search.placeAddress || '',
        location: search.location,
      });
      setIsFocused(false);
    }
  }, [onResultSelect]);

  // Handle focus change
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onFocusChange(true);
  }, [onFocusChange]);

  const handleBlur = useCallback(() => {
    // Delay to allow click events
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setIsFocused(false);
        onFocusChange(false);
      }
    }, 150);
  }, [onFocusChange]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
        onFocusChange(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onFocusChange]);

  // Hide during navigation
  if (isNavigating) return null;

  const showDropdown = isFocused && (predictions.length > 0 || recentSearches.length > 0 || homePlace || workPlace || value.length === 0);

  return (
    <div 
      ref={containerRef}
      className="absolute top-4 left-4 right-4 z-50 max-w-md mx-auto"
    >
      {/* Search Bar */}
      <motion.div
        initial={false}
        animate={{ 
          y: 0,
          scale: isFocused ? 1.02 : 1,
        }}
        className="relative"
      >
        <div className={cn(
          "flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300",
          "bg-background/80 backdrop-blur-2xl shadow-lg border",
          isFocused 
            ? "border-primary/30 shadow-xl bg-background/95" 
            : "border-white/10 dark:border-white/5"
        )}>
          <Search className={cn(
            "w-5 h-5 flex-shrink-0 transition-colors",
            isFocused ? "text-primary" : "text-muted-foreground"
          )} />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="Search places"
            className="flex-1 bg-transparent border-0 outline-none text-base placeholder:text-muted-foreground/60"
          />
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loader"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </motion.div>
            ) : value ? (
              <motion.button
                key="clear"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => {
                  onChange('');
                  setPredictions([]);
                  inputRef.current?.focus();
                }}
                className="p-1 rounded-full hover:bg-accent transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </motion.button>
            ) : null}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className={cn(
              "mt-2 rounded-2xl overflow-hidden",
              "bg-background/95 backdrop-blur-2xl shadow-2xl",
              "border border-white/10 dark:border-white/5"
            )}
          >
            <div className="max-h-[50vh] overflow-y-auto overscroll-contain">
              {/* Quick Access Chips */}
              {!value && (homePlace || workPlace) && (
                <div className="p-3 flex gap-2">
                  {homePlace && (
                    <button
                      onClick={() => handleSavedPlaceSelect(homePlace)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-secondary/80 hover:bg-secondary transition-colors"
                    >
                      <span className="text-base">🏠</span>
                      <span className="text-sm font-medium">Home</span>
                    </button>
                  )}
                  {workPlace && (
                    <button
                      onClick={() => handleSavedPlaceSelect(workPlace)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-secondary/80 hover:bg-secondary transition-colors"
                    >
                      <span className="text-base">💼</span>
                      <span className="text-sm font-medium">Work</span>
                    </button>
                  )}
                </div>
              )}

              {/* Predictions */}
              {predictions.length > 0 && (
                <div className="py-1">
                  {predictions.map((prediction, index) => (
                    <motion.button
                      key={prediction.placeId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => handlePredictionSelect(prediction)}
                      className="flex items-start gap-3 w-full px-4 py-3 hover:bg-accent/50 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Search className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{prediction.mainText}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {prediction.secondaryText}
                        </p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Recent Searches */}
              {!value && recentSearches.length > 0 && (
                <div className="py-1 border-t border-border/50">
                  <div className="flex items-center justify-between px-4 py-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Recent
                    </span>
                    <button
                      onClick={onClearRecent}
                      className="text-xs text-primary hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                  {recentSearches.slice(0, 4).map((search, index) => (
                    <motion.button
                      key={search.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => handleRecentSelect(search)}
                      className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-accent/50 transition-colors text-left"
                    >
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <span className="text-xs">🕐</span>
                      </div>
                      <span className="text-sm truncate">{search.placeName || search.query}</span>
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Empty state when focused but no content */}
              {!value && predictions.length === 0 && recentSearches.length === 0 && !homePlace && !workPlace && (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    Search for a place or address
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
