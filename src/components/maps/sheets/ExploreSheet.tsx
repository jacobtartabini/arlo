import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Clock, AlertTriangle, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DestinationPattern, SavedPlace, Incident, Place } from '@/types/maps';

interface ExploreSheetProps {
  smartSuggestions: DestinationPattern[];
  homePlace?: SavedPlace;
  workPlace?: SavedPlace;
  incidents: Incident[];
  onPlaceSelect: (place: Place) => void;
  onVoteIncident: (incidentId: string, voteType: 'up' | 'down') => void;
}

const incidentLabels: Record<string, string> = {
  police: 'Police',
  accident: 'Accident',
  hazard: 'Hazard',
  construction: 'Construction',
  closure: 'Road Closure',
  other: 'Incident',
};

const incidentIcons: Record<string, string> = {
  police: '🚔',
  accident: '🚗',
  hazard: '⚠️',
  construction: '🚧',
  closure: '🚫',
  other: '❗',
};

export function ExploreSheet({
  smartSuggestions,
  homePlace,
  workPlace,
  incidents,
  onPlaceSelect,
  onVoteIncident,
}: ExploreSheetProps) {
  return (
    <div className="space-y-6">
      {/* Smart Suggestions */}
      {smartSuggestions.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Suggested
          </h3>
          <div className="space-y-2">
            {smartSuggestions.map((suggestion) => (
              <motion.button
                key={suggestion.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onPlaceSelect({
                  placeId: suggestion.placeId || '',
                  name: suggestion.placeName,
                  address: suggestion.placeAddress || '',
                  location: suggestion.location,
                })}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl",
                  "bg-secondary hover:bg-secondary/80 transition-colors text-left"
                )}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Navigation className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{suggestion.placeName}</p>
                  <p className="text-sm text-muted-foreground">
                    Based on your patterns
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">~15 min</p>
                </div>
              </motion.button>
            ))}
          </div>
        </section>
      )}

      {/* Quick Access: Home & Work */}
      {(homePlace || workPlace) && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Your Places
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {homePlace && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onPlaceSelect(homePlace)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl",
                  "bg-secondary hover:bg-secondary/80 transition-colors"
                )}
              >
                <div className="text-2xl">🏠</div>
                <span className="text-sm font-medium">Home</span>
              </motion.button>
            )}
            {workPlace && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onPlaceSelect(workPlace)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl",
                  "bg-secondary hover:bg-secondary/80 transition-colors"
                )}
              >
                <div className="text-2xl">💼</div>
                <span className="text-sm font-medium">Work</span>
              </motion.button>
            )}
          </div>
        </section>
      )}

      {/* Nearby Incidents */}
      {incidents.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Nearby Incidents
          </h3>
          <div className="space-y-2">
            {incidents.slice(0, 5).map((incident) => (
              <div
                key={incident.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-secondary"
              >
                <div className="text-2xl">{incidentIcons[incident.type]}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{incidentLabels[incident.type]}</p>
                  {incident.description && (
                    <p className="text-sm text-muted-foreground truncate">
                      {incident.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    Expires {new Date(incident.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onVoteIncident(incident.id, 'up')}
                  >
                    <ThumbsUp className={cn("w-4 h-4", incident.userVote === 'up' && "text-green-500 fill-current")} />
                  </Button>
                  <span className="text-sm font-medium min-w-[20px] text-center">
                    {incident.upvotes - incident.downvotes}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onVoteIncident(incident.id, 'down')}
                  >
                    <ThumbsDown className={cn("w-4 h-4", incident.userVote === 'down' && "text-red-500 fill-current")} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {smartSuggestions.length === 0 && !homePlace && !workPlace && incidents.length === 0 && (
        <div className="text-center py-8">
          <MapPin className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">
            Search for a place to get started
          </p>
        </div>
      )}
    </div>
  );
}
