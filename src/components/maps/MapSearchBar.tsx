import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, MapPin, Clock, Home, Briefcase, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import type { Place, RecentSearch, SavedPlace, LatLng, PlacePrediction } from '@/types/maps';

interface MapSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onResultSelect: (place: Place) => void;
  recentSearches: RecentSearch[];
  onClearRecent: () => void;
  homePlace?: SavedPlace;
  workPlace?: SavedPlace;
  currentLocation: LatLng | null;
}

export function MapSearchBar({
  value,
  onChange,
  onResultSelect,
  recentSearches,
  onClearRecent,
  homePlace,
  workPlace,
  currentLocation,
}: MapSearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [sessionToken] = useState(() => crypto.randomUUID());

  // Fetch predictions from places-autocomplete edge function
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
        body.radius = 50000; // 50km bias
      }

      const { data, error } = await supabase.functions.invoke('places-autocomplete', {
        body,
      });

      if (error) {
        console.error('[MapSearchBar] Autocomplete error:', error);
        setPredictions([]);
        return;
      }

      if (data?.predictions) {
        setPredictions(data.predictions);
      }
    } catch (err) {
      console.error('[MapSearchBar] Fetch error:', err);
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentLocation, sessionToken]);

  // Debounced search
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      fetchPredictions(newValue);
    }, 300);
  }, [onChange, fetchPredictions]);

  // Fetch place details and select
  const handlePredictionSelect = useCallback(async (prediction: PlacePrediction) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('maps-api/place-details', {
        body: { placeId: prediction.placeId },
      });

      if (error || !data?.place) {
        console.error('[MapSearchBar] Place details error:', error);
        return;
      }

      onResultSelect(data.place);
      setPredictions([]);
      setIsFocused(false);
      onChange('');
    } catch (err) {
      console.error('[MapSearchBar] Select error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [onResultSelect, onChange]);

  // Handle saved place selection
  const handleSavedPlaceSelect = useCallback((place: SavedPlace) => {
    onResultSelect({
      placeId: place.placeId,
      name: place.name,
      address: place.address,
      location: place.location,
    });
    setIsFocused(false);
  }, [onResultSelect]);

  // Handle recent search selection
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showDropdown = isFocused && (predictions.length > 0 || recentSearches.length > 0 || homePlace || workPlace);

  return (
    <div 
      ref={containerRef}
      className="absolute top-4 left-4 right-4 z-50 max-w-xl mx-auto"
    >
      {/* Search Input */}
      <motion.div
        initial={false}
        animate={{
          scale: isFocused ? 1.02 : 1,
        }}
        className="relative"
      >
        <div className={cn(
          "flex items-center gap-2 px-4 py-3 rounded-full transition-all duration-200",
          "bg-background/95 backdrop-blur-xl shadow-lg border",
          isFocused ? "border-primary ring-2 ring-primary/20" : "border-border"
        )}>
          <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <Input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            placeholder="Search Maps"
            className="border-0 p-0 h-auto focus-visible:ring-0 bg-transparent text-base"
          />
          {isLoading && (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          )}
          {value && !isLoading && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full"
              onClick={() => {
                onChange('');
                setPredictions([]);
                inputRef.current?.focus();
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </motion.div>

      {/* Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "mt-2 rounded-2xl overflow-hidden",
              "bg-background/95 backdrop-blur-xl shadow-xl border border-border"
            )}
          >
            <div className="max-h-[60vh] overflow-y-auto">
              {/* Quick Actions: Home & Work */}
              {(homePlace || workPlace) && !value && (
                <div className="p-3 border-b border-border">
                  <div className="flex gap-2">
                    {homePlace && (
                      <button
                        onClick={() => handleSavedPlaceSelect(homePlace)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors flex-1"
                      >
                        <Home className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Home</span>
                      </button>
                    )}
                    {workPlace && (
                      <button
                        onClick={() => handleSavedPlaceSelect(workPlace)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors flex-1"
                      >
                        <Briefcase className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Work</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Predictions */}
              {predictions.length > 0 && (
                <div className="py-1">
                  {predictions.map((prediction) => (
                    <button
                      key={prediction.placeId}
                      onClick={() => handlePredictionSelect(prediction)}
                      className="flex items-start gap-3 w-full px-4 py-3 hover:bg-accent transition-colors text-left"
                    >
                      <MapPin className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{prediction.mainText}</p>
                        {prediction.secondaryText && (
                          <p className="text-sm text-muted-foreground truncate">
                            {prediction.secondaryText}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Recent Searches */}
              {!value && recentSearches.length > 0 && (
                <div className="py-1">
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
                  {recentSearches.slice(0, 5).map((search) => (
                    <button
                      key={search.id}
                      onClick={() => handleRecentSelect(search)}
                      className="flex items-start gap-3 w-full px-4 py-3 hover:bg-accent transition-colors text-left"
                    >
                      <Clock className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{search.placeName || search.query}</p>
                        {search.placeAddress && (
                          <p className="text-sm text-muted-foreground truncate">
                            {search.placeAddress}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
