import React, { useRef, useCallback } from 'react';
import { motion, useDragControls, PanInfo } from 'framer-motion';
import { GripHorizontal } from 'lucide-react';
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
  LatLng
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
  homePlace?: SavedPlace;
  workPlace?: SavedPlace;
  incidents: Incident[];
  onPlaceSelect: (place: Place) => void;
  onGetDirections: (place: Place) => void;
  onRouteSelect: (index: number) => void;
  onStartNavigation: () => void;
  onEndNavigation: () => void;
  onReportIncident: (incident: { type: IncidentType; location: LatLng; description?: string }) => Promise<Incident | null>;
  onVoteIncident: (incidentId: string, voteType: 'up' | 'down') => void;
  onSavePlace: (place: Omit<SavedPlace, 'id' | 'createdAt'>) => Promise<SavedPlace | null>;
}

const SHEET_HEIGHTS = {
  collapsed: 120,
  half: '50%',
  full: 'calc(100% - 80px)',
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
  homePlace,
  workPlace,
  incidents,
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
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    // Determine new state based on velocity and offset
    if (velocity > 500 || offset > 100) {
      // Dragging down fast or far
      if (state === 'full') {
        onStateChange('half');
      } else {
        onStateChange('collapsed');
      }
    } else if (velocity < -500 || offset < -100) {
      // Dragging up fast or far
      if (state === 'collapsed') {
        onStateChange('half');
      } else {
        onStateChange('full');
      }
    }
  }, [state, onStateChange]);

  const getHeight = () => {
    return SHEET_HEIGHTS[state];
  };

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
            homePlace={homePlace}
            workPlace={workPlace}
            incidents={incidents}
            onPlaceSelect={onPlaceSelect}
            onVoteIncident={onVoteIncident}
          />
        );
    }
  };

  return (
    <motion.div
      ref={containerRef}
      initial={false}
      animate={{ height: getHeight() }}
      transition={{ type: 'spring', damping: 30, stiffness: 400 }}
      className={cn(
        "absolute bottom-0 left-0 right-0 z-50",
        "bg-background/95 backdrop-blur-xl",
        "rounded-t-3xl shadow-2xl border-t border-x border-border",
        "overflow-hidden"
      )}
    >
      {/* Drag Handle */}
      <motion.div
        drag="y"
        dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        className="flex justify-center py-3 cursor-grab active:cursor-grabbing"
      >
        <div className="flex flex-col items-center gap-1">
          <GripHorizontal className="w-6 h-6 text-muted-foreground/50" />
        </div>
      </motion.div>

      {/* Content */}
      <div className="h-full overflow-hidden">
        <div className="h-full overflow-y-auto px-4 pb-8">
          {renderContent()}
        </div>
      </div>
    </motion.div>
  );
}
