import React, { useCallback } from 'react';
import { motion, useDragControls, PanInfo } from 'framer-motion';
import { cn } from '@/lib/utils';
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

interface MapBottomSheetProps {
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

// Heights for different states - more elegant proportions
const SHEET_HEIGHTS = {
  collapsed: 100,
  half: '45%',
  full: 'calc(100% - 60px)',
};

export function MapBottomSheet({
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
}: MapBottomSheetProps) {
  const dragControls = useDragControls();

  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    if (velocity > 400 || offset > 80) {
      if (state === 'full') {
        onStateChange('half');
      } else {
        onStateChange('collapsed');
      }
    } else if (velocity < -400 || offset < -80) {
      if (state === 'collapsed') {
        onStateChange('half');
      } else {
        onStateChange('full');
      }
    }
  }, [state, onStateChange]);

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
            onClose={() => onStateChange('collapsed')}
          />
        );

      case 'place-details':
        return selectedPlace ? (
          <PlaceDetailsSheet
            place={selectedPlace}
            onGetDirections={() => onGetDirections(selectedPlace)}
            onSavePlace={onSavePlace}
            onClose={() => onStateChange('collapsed')}
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

  return (
    <motion.div
      initial={false}
      animate={{ height: SHEET_HEIGHTS[state] }}
      transition={{ 
        type: 'spring', 
        damping: 30, 
        stiffness: 350,
        mass: 0.8
      }}
      className={cn(
        "absolute bottom-0 left-0 right-0 z-50",
        "bg-background/95 backdrop-blur-2xl",
        "rounded-t-[28px] shadow-2xl",
        "border-t border-x border-white/10 dark:border-white/5",
        "overflow-hidden"
      )}
      style={{
        boxShadow: '0 -8px 32px rgba(0,0,0,0.12), 0 -2px 8px rgba(0,0,0,0.08)'
      }}
    >
      {/* Drag Handle */}
      <motion.div
        drag="y"
        dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none"
      >
        <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
      </motion.div>

      {/* Content */}
      <div className="h-full overflow-hidden">
        <div className="h-full overflow-y-auto overscroll-contain px-5 pb-8">
          {renderContent()}
        </div>
      </div>
    </motion.div>
  );
}
