import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
  RecentSearch
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
}

// Panel widths for different states
const PANEL_CONFIG = {
  collapsed: { width: 380, height: 80 },
  half: { width: 400, height: 420 },
  full: { width: 420, height: 'calc(100vh - 140px)' },
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
}: MapFloatingPanelProps) {
  
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
  }, [onStateChange]);

  const renderContent = () => {
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
        "absolute left-4 top-24 z-40",
        "bg-background/80 backdrop-blur-2xl",
        "rounded-2xl",
        "border border-border/50",
        "shadow-2xl shadow-black/10 dark:shadow-black/30",
        "overflow-hidden flex flex-col"
      )}
    >
      {/* Header with controls */}
      <div className={cn(
        "flex items-center justify-between px-4 py-3",
        "border-b border-border/30",
        "bg-background/50"
      )}>
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
          {!isNavigation && (
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

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={mode}
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
            isCollapsed && "hidden"
          )}>
            {renderContent()}
          </div>
          
          {/* Collapsed preview */}
          {isCollapsed && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-4 py-2 flex items-center gap-3 cursor-pointer hover:bg-foreground/5 transition-colors"
              onClick={() => onStateChange('half')}
            >
              {mode === 'explore' && (
                <>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="text-lg">🗺️</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">Explore nearby</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {smartSuggestions.length > 0 
                        ? `${smartSuggestions.length} suggestions for you`
                        : 'Discover places around you'}
                    </p>
                  </div>
                </>
              )}
              {mode === 'place-details' && selectedPlace && (
                <>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="text-lg">📍</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{selectedPlace.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{selectedPlace.address}</p>
                  </div>
                </>
              )}
              {mode === 'directions' && navigation.destination && (
                <>
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <span className="text-lg">🚗</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">Directions to {navigation.destination.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {routes.length > 0 ? `${routes.length} routes available` : 'Getting routes...'}
                    </p>
                  </div>
                </>
              )}
              {mode === 'navigation' && (
                <>
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <span className="text-lg">🧭</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {navigation.remainingDistance} remaining
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      Arriving at {navigation.estimatedArrival}
                    </p>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
