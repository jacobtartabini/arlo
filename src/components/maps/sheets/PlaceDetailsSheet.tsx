import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Navigation, 
  Share, 
  Phone, 
  Globe, 
  Clock,
  Home,
  Briefcase,
  Heart,
  Star,
  ChevronRight,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Place, SavedPlace } from '@/types/maps';

interface PlaceDetailsSheetProps {
  place: Place;
  onGetDirections: () => void;
  onSavePlace: (place: Omit<SavedPlace, 'id' | 'createdAt'>) => Promise<SavedPlace | null>;
  onClose: () => void;
}

export function PlaceDetailsSheet({
  place,
  onGetDirections,
  onSavePlace,
  onClose,
}: PlaceDetailsSheetProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [savedAs, setSavedAs] = useState<string | null>(null);

  const handleSave = async (type: 'home' | 'work' | 'favorite') => {
    setIsSaving(true);
    try {
      await onSavePlace({
        placeId: place.placeId,
        name: place.name,
        address: place.address,
        location: place.location,
        placeType: type,
      });
      setSavedAs(type);
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: place.name,
      text: place.address,
      url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`,
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(`${place.name}\n${place.address}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with close button */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-foreground truncate">{place.name}</h2>
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{place.address}</p>
          
          {/* Rating & Status */}
          <div className="flex items-center gap-3 mt-2">
            {place.rating && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="text-sm font-medium">{place.rating.toFixed(1)}</span>
              </div>
            )}
            {place.openNow !== undefined && (
              <div className="flex items-center gap-1.5">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  place.openNow ? "bg-green-500" : "bg-red-500"
                )} />
                <span className={cn(
                  "text-sm font-medium",
                  place.openNow ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  {place.openNow ? "Open" : "Closed"}
                </span>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 -mr-2 -mt-1 rounded-full hover:bg-accent transition-colors"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Photos Carousel */}
      {place.photos && place.photos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5">
          {place.photos.slice(0, 4).map((photo, index) => (
            <motion.img
              key={index}
              src={photo}
              alt={`${place.name}`}
              className="w-28 h-20 object-cover rounded-xl flex-shrink-0"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
            />
          ))}
        </div>
      )}

      {/* Primary Action - Directions */}
      <Button 
        size="lg"
        className="w-full gap-2 h-12 rounded-xl text-base font-medium"
        onClick={onGetDirections}
      >
        <Navigation className="w-5 h-5" />
        Directions
      </Button>

      {/* Secondary Actions Row */}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="flex-1 gap-2 h-11 rounded-xl"
          onClick={() => handleSave('favorite')}
          disabled={isSaving || savedAs === 'favorite'}
        >
          <Heart className={cn(
            "w-4 h-4",
            savedAs === 'favorite' && "fill-current text-red-500"
          )} />
          {savedAs === 'favorite' ? 'Saved' : 'Save'}
        </Button>
        <Button
          variant="secondary"
          className="flex-1 gap-2 h-11 rounded-xl"
          onClick={handleShare}
        >
          <Share className="w-4 h-4" />
          Share
        </Button>
      </div>

      {/* Save As Options */}
      <div className="flex gap-2">
        <button
          onClick={() => handleSave('home')}
          disabled={isSaving || savedAs === 'home'}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-colors",
            savedAs === 'home' 
              ? "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400" 
              : "border-border hover:bg-accent"
          )}
        >
          <Home className="w-4 h-4" />
          <span className="text-sm font-medium">Home</span>
        </button>
        <button
          onClick={() => handleSave('work')}
          disabled={isSaving || savedAs === 'work'}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-colors",
            savedAs === 'work' 
              ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400" 
              : "border-border hover:bg-accent"
          )}
        >
          <Briefcase className="w-4 h-4" />
          <span className="text-sm font-medium">Work</span>
        </button>
      </div>

      {/* Contact Info */}
      {(place.phoneNumber || place.website) && (
        <div className="pt-2 space-y-1">
          {place.phoneNumber && (
            <a
              href={`tel:${place.phoneNumber}`}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-accent transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-sm">{place.phoneNumber}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          )}
          {place.website && (
            <a
              href={place.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-xl hover:bg-accent transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm truncate max-w-[200px]">
                  {new URL(place.website).hostname.replace('www.', '')}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
