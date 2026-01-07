import React from 'react';
import { motion } from 'framer-motion';
import { Navigation, Clock, MapPin, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DestinationPattern, SavedPlace, Incident, Place, RecentSearch, LatLng } from '@/types/maps';

interface ExploreSheetProps {
  smartSuggestions: DestinationPattern[];
  recentSearches: RecentSearch[];
  homePlace?: SavedPlace;
  workPlace?: SavedPlace;
  incidents: Incident[];
  currentLocation: LatLng | null;
  onPlaceSelect: (place: Place) => void;
  onVoteIncident: (incidentId: string, voteType: 'up' | 'down') => void;
}

export function ExploreSheet({
  smartSuggestions,
  recentSearches,
  homePlace,
  workPlace,
  incidents,
  onPlaceSelect,
}: ExploreSheetProps) {
  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const hasQuickActions = homePlace || workPlace;
  const hasSuggestions = smartSuggestions.length > 0;
  const hasRecent = recentSearches.length > 0;
  const hasIncidents = incidents.length > 0;

  return (
    <div className="space-y-5">
      {/* Greeting Header */}
      <div className="pt-1">
        <h2 className="text-xl font-semibold text-foreground">{getGreeting()}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Where would you like to go?</p>
      </div>

      {/* Quick Access Chips - Home & Work */}
      {hasQuickActions && (
        <div className="flex gap-3">
          {homePlace && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => onPlaceSelect(homePlace)}
              className={cn(
                "flex-1 flex items-center gap-3 p-4 rounded-2xl",
                "bg-gradient-to-br from-blue-500/10 to-blue-600/5",
                "border border-blue-500/20 hover:border-blue-500/30",
                "transition-all duration-200"
              )}
            >
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <span className="text-lg">🏠</span>
              </div>
              <div className="text-left min-w-0">
                <p className="font-medium text-foreground">Home</p>
                <p className="text-xs text-muted-foreground truncate max-w-[100px]">
                  {homePlace.address?.split(',')[0] || 'Saved'}
                </p>
              </div>
            </motion.button>
          )}
          {workPlace && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => onPlaceSelect(workPlace)}
              className={cn(
                "flex-1 flex items-center gap-3 p-4 rounded-2xl",
                "bg-gradient-to-br from-amber-500/10 to-amber-600/5",
                "border border-amber-500/20 hover:border-amber-500/30",
                "transition-all duration-200"
              )}
            >
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <span className="text-lg">💼</span>
              </div>
              <div className="text-left min-w-0">
                <p className="font-medium text-foreground">Work</p>
                <p className="text-xs text-muted-foreground truncate max-w-[100px]">
                  {workPlace.address?.split(',')[0] || 'Saved'}
                </p>
              </div>
            </motion.button>
          )}
        </div>
      )}

      {/* Smart Suggestions */}
      {hasSuggestions && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Suggested for you</span>
          </div>
          <div className="space-y-2">
            {smartSuggestions.slice(0, 3).map((suggestion, index) => (
              <motion.button
                key={suggestion.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onPlaceSelect({
                  placeId: suggestion.placeId || '',
                  name: suggestion.placeName,
                  address: suggestion.placeAddress || '',
                  location: suggestion.location,
                })}
                className={cn(
                  "w-full flex items-center gap-3 p-3.5 rounded-xl",
                  "bg-secondary/50 hover:bg-secondary transition-colors text-left"
                )}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Navigation className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{suggestion.placeName}</p>
                  <p className="text-sm text-muted-foreground">
                    Based on your {suggestion.timeBucket} patterns
                  </p>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  ~15 min
                </div>
              </motion.button>
            ))}
          </div>
        </section>
      )}

      {/* Recent Destinations */}
      {hasRecent && !hasSuggestions && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Recent</span>
          </div>
          <div className="space-y-1">
            {recentSearches.slice(0, 4).map((search, index) => (
              <motion.button
                key={search.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => search.location && onPlaceSelect({
                  placeId: search.placeId || '',
                  name: search.placeName || search.query,
                  address: search.placeAddress || '',
                  location: search.location,
                })}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-sm">🕐</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-sm">{search.placeName || search.query}</p>
                  {search.placeAddress && (
                    <p className="text-xs text-muted-foreground truncate">{search.placeAddress}</p>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </section>
      )}

      {/* Nearby Incidents - Compact */}
      {hasIncidents && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">⚠️</span>
            <span className="text-sm font-medium text-muted-foreground">Nearby alerts</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {incidents.slice(0, 3).map((incident) => (
              <div
                key={incident.id}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-full bg-amber-500/10 border border-amber-500/20"
              >
                <span className="text-sm">
                  {incident.type === 'police' ? '🚔' : 
                   incident.type === 'accident' ? '🚗' : 
                   incident.type === 'hazard' ? '⚠️' : 
                   incident.type === 'construction' ? '🚧' : '❗'}
                </span>
                <span className="text-xs font-medium text-foreground capitalize">
                  {incident.type}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {!hasQuickActions && !hasSuggestions && !hasRecent && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
            <MapPin className="w-7 h-7 text-muted-foreground/50" />
          </div>
          <p className="text-muted-foreground">
            Search for a place to get started
          </p>
        </div>
      )}
    </div>
  );
}
