import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ExploreSheet } from './sheets/ExploreSheet';
import { SearchResultsSheet } from './sheets/SearchResultsSheet';
import { PlaceDetailsSheet } from './sheets/PlaceDetailsSheet';
import { DirectionsSheet } from './sheets/DirectionsSheet';
import { NavigationSheet } from './sheets/NavigationSheet';
import type { 
  BottomSheetState, 
  MapMode, 
  Place, 
  RouteOption,
  NavigationState,
  DestinationPattern,
  SavedPlace,
  Incident,
  IncidentType,
  LatLng,
  RecentSearch,
  PlacePrediction
} from '@/types/maps';

interface MapFloatingPanelProps {
  state: BottomSheetState;
  onStateChange: (state: BottomSheetState) => void;
  mode: MapMode;
  selectedPlace: Place | null;
  searchResults: Place[];
  routes: RouteOption[];
  selectedRouteIndex: number;
  navigation: NavigationState;
  smartSuggestions: DestinationPattern[];
  recentSearches: RecentSearch[];
  homePlace?: SavedPlace;
  workPlace?: SavedPlace;
  incidents: Incident[];
  currentLocation: LatLng | null;
  onPlaceSelect: (place: Place) => void;
  onGetDirections: (place: Place) => void;
  onRouteSelect: (index: number) => void;
  onStartNavigation: () => void;
  onEndNavigation: () => void;
  onReportIncident: (incident: { type: IncidentType; location: LatLng; description?: string }) => Promise<Incident | null>;
  onVoteIncident: (incidentId: string, voteType: 'up' | 'down') => void;
  onSavePlace: (place: Omit<SavedPlace, 'id' | 'createdAt'>) => Promise<SavedPlace | null>;
  // Search props
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchResultSelect: (place: Place) => void;
  onClearRecent: () => void;
}

// Panel dimensions for different states
const PANEL_CONFIG = {
  collapsed: { width: 400, height: 140 },
  half: { width: 400, height: 480 },
  full: { width: 420, height: 'calc(100vh - 100px)' },
};

export function MapFloatingPanel({
  state,
  onStateChange,
  mode,
  selectedPlace,
  searchResults,
  routes,
  selectedRouteIndex,
  navigation,
  smartSuggestions,
  recentSearches,
  homePlace,
  workPlace,
  incidents,
  currentLocation,
  onPlaceSelect,
  onGetDirections,
  onRouteSelect,
  onStartNavigation,
  onEndNavigation,
  onReportIncident,
  onVoteIncident,
  onSavePlace,
  searchQuery,
  onSearchChange,
  onSearchResultSelect,
  onClearRecent,
}: MapFloatingPanelProps) {
  // Search state
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [sessionToken] = useState(() => crypto.randomUUID());

  // Fetch predictions
  const fetchPredictions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setPredictions([]);
      return;
    }

    setIsSearching(true);
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
      setIsSearching(false);
    }
  }, [currentLocation, sessionToken]);

  // Handle search input
  const handleSearchInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onSearchChange(newValue);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(newValue), 300);
  }, [onSearchChange, fetchPredictions]);

  // Handle prediction select
  const handlePredictionSelect = useCallback(async (prediction: PlacePrediction) => {
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('maps-api/place-details', {
        body: { placeId: prediction.placeId },
      });

      if (!error && data?.place) {
        onSearchResultSelect(data.place);
        setPredictions([]);
        setIsSearchFocused(false);
        onSearchChange('');
      }
    } finally {
      setIsSearching(false);
    }
  }, [onSearchResultSelect, onSearchChange]);

  // Handle saved place select
  const handleSavedPlaceSelect = useCallback((place: SavedPlace) => {
    onSearchResultSelect({
      placeId: place.placeId,
      name: place.name,
      address: place.address,
      location: place.location,
    });
    setIsSearchFocused(false);
  }, [onSearchResultSelect]);

  // Handle recent search select
  const handleRecentSelect = useCallback((search: RecentSearch) => {
    if (search.location) {
      onSearchResultSelect({
        placeId: search.placeId || '',
        name: search.placeName || search.query,
        address: search.placeAddress || '',
        location: search.location,
      });
      setIsSearchFocused(false);
    }
  }, [onSearchResultSelect]);

  const toggleExpand = useCallback(() => {
    if (state === 'collapsed') {
      onStateChange('half');
    } else if (state === 'half') {
      onStateChange('full');
    } else {
      onStateChange('half');
    }
  }, [state, onStateChange]);

  const handleClose = useCallback(() => {
    onStateChange('collapsed');
    setIsSearchFocused(false);
    setPredictions([]);
  }, [onStateChange]);

  // Expand panel when search is focused
  useEffect(() => {
    if (isSearchFocused && state === 'collapsed') {
      onStateChange('half');
    }
  }, [isSearchFocused, state, onStateChange]);

  const renderContent = () => {
    // Show search results when searching
    if (isSearchFocused && (predictions.length > 0 || searchQuery.length === 0)) {
      return (
        <div className="space-y-2">
          {/* Quick Access Chips */}
          {!searchQuery && (homePlace || workPlace) && (
            <div className="flex gap-2 pb-2">
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
            <div className="space-y-1">
              {predictions.map((prediction, index) => (
                <motion.button
                  key={prediction.placeId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => handlePredictionSelect(prediction)}
                  className="flex items-start gap-3 w-full p-3 rounded-xl hover:bg-accent/50 transition-colors text-left"
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
          {!searchQuery && recentSearches.length > 0 && (
            <div className="pt-2 border-t border-border/50">
              <div className="flex items-center justify-between pb-2">
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
                  className="flex items-center gap-3 w-full p-2.5 rounded-lg hover:bg-accent/50 transition-colors text-left"
                >
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-xs">🕐</span>
                  </div>
                  <span className="text-sm truncate">{search.placeName || search.query}</span>
                </motion.button>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!searchQuery && predictions.length === 0 && recentSearches.length === 0 && !homePlace && !workPlace && (
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground">
                Search for a place or address
              </p>
            </div>
          )}
        </div>
      );
    }

    switch (mode) {
      case 'navigation':
        return (
          <NavigationSheet
            navigation={navigation}
            onEndNavigation={onEndNavigation}
            onReportIncident={onReportIncident}
          />
        );

      case 'directions':
        return (
          <DirectionsSheet
            routes={routes}
            selectedRouteIndex={selectedRouteIndex}
            destination={navigation.destination}
            waypoints={navigation.waypoints}
            onRouteSelect={onRouteSelect}
            onStartNavigation={onStartNavigation}
            onClose={handleClose}
          />
        );

      case 'place-details':
        return selectedPlace ? (
          <PlaceDetailsSheet
            place={selectedPlace}
            onGetDirections={() => onGetDirections(selectedPlace)}
            onSavePlace={onSavePlace}
            onClose={handleClose}
          />
        ) : null;

      case 'search':
        return (
          <SearchResultsSheet
            results={searchResults}
            onPlaceSelect={onPlaceSelect}
          />
        );

      case 'explore':
      default:
        return (
          <ExploreSheet
            smartSuggestions={smartSuggestions}
            recentSearches={recentSearches}
            homePlace={homePlace}
            workPlace={workPlace}
            incidents={incidents}
            currentLocation={currentLocation}
            onPlaceSelect={onPlaceSelect}
            onVoteIncident={onVoteIncident}
          />
        );
    }
  };

  // Get current config
  const config = PANEL_CONFIG[state];
  const isCollapsed = state === 'collapsed';
  const isNavigation = mode === 'navigation';

  // Hide during navigation
  if (isNavigation && navigation.isNavigating) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ 
        opacity: 1, 
        x: 0, 
        scale: 1,
        width: config.width,
        height: config.height,
      }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      transition={{ 
        type: 'spring', 
        damping: 28, 
        stiffness: 320,
        mass: 0.8
      }}
      className={cn(
        "absolute left-4 top-4 z-40",
        "bg-background/85 backdrop-blur-2xl",
        "rounded-2xl",
        "border border-border/40",
        "shadow-2xl shadow-black/10 dark:shadow-black/30",
        "overflow-hidden flex flex-col"
      )}
    >
      {/* Integrated Search Bar */}
      <div className={cn(
        "px-4 pt-4 pb-3",
        "border-b border-border/30"
      )}>
        <div className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
          "bg-muted/50 border",
          isSearchFocused 
            ? "border-primary/30 bg-background/80" 
            : "border-transparent"
        )}>
          <Search className={cn(
            "w-5 h-5 flex-shrink-0 transition-colors",
            isSearchFocused ? "text-primary" : "text-muted-foreground"
          )} />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={handleSearchInput}
            onFocus={() => setIsSearchFocused(true)}
            placeholder="Search places"
            className="flex-1 bg-transparent border-0 outline-none text-base placeholder:text-muted-foreground/60"
          />
          <AnimatePresence mode="wait">
            {isSearching ? (
              <motion.div
                key="loader"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </motion.div>
            ) : searchQuery ? (
              <motion.button
                key="clear"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => {
                  onSearchChange('');
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

        {/* Header controls - only show when not search focused */}
        {!isSearchFocused && (
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                mode === 'navigation' ? "bg-green-500 animate-pulse" :
                mode === 'directions' ? "bg-blue-500" :
                mode === 'place-details' ? "bg-primary" :
                "bg-muted-foreground/40"
              )} />
              <span className="text-sm font-medium text-foreground/80">
                {mode === 'navigation' ? 'Navigating' :
                 mode === 'directions' ? 'Route Options' :
                 mode === 'place-details' ? selectedPlace?.name || 'Place' :
                 mode === 'search' ? 'Search Results' :
                 'Explore'}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg hover:bg-foreground/5"
                onClick={toggleExpand}
              >
                {state === 'full' ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
              {mode !== 'explore' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg hover:bg-foreground/5"
                  onClick={handleClose}
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={isSearchFocused ? 'search' : mode}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className={cn(
            "flex-1 overflow-hidden",
            !isCollapsed && "overflow-y-auto"
          )}
        >
          <div className={cn(
            "px-4 py-3",
            isCollapsed && !isSearchFocused && "hidden"
          )}>
            {renderContent()}
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
