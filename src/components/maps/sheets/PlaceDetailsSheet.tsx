import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Navigation, 
  Heart, 
  Share, 
  Phone, 
  Globe, 
  MapPin,
  Clock,
  Home,
  Briefcase,
  Star
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
  const [saveType, setSaveType] = useState<'home' | 'work' | 'favorite' | null>(null);

  const handleSave = async (type: 'home' | 'work' | 'favorite') => {
    setIsSaving(true);
    setSaveType(type);
    try {
      await onSavePlace({
        placeId: place.placeId,
        name: place.name,
        address: place.address,
        location: place.location,
        placeType: type,
      });
    } finally {
      setIsSaving(false);
      setSaveType(null);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: place.name,
          text: place.address,
          url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(
        `${place.name}\n${place.address}\nhttps://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold truncate">{place.name}</h2>
          <p className="text-sm text-muted-foreground mt-1">{place.address}</p>
          {place.rating && (
            <div className="flex items-center gap-1 mt-2">
              <Star className="w-4 h-4 text-yellow-500 fill-current" />
              <span className="text-sm font-medium">{place.rating.toFixed(1)}</span>
            </div>
          )}
          {place.openNow !== undefined && (
            <div className="flex items-center gap-1 mt-1">
              <Clock className="w-4 h-4" />
              <span className={cn(
                "text-sm font-medium",
                place.openNow ? "text-green-500" : "text-red-500"
              )}>
                {place.openNow ? "Open now" : "Closed"}
              </span>
            </div>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Photos */}
      {place.photos && place.photos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {place.photos.map((photo, index) => (
            <motion.img
              key={index}
              src={photo}
              alt={`${place.name} photo ${index + 1}`}
              className="w-32 h-24 object-cover rounded-xl flex-shrink-0"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            />
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button 
          className="flex-1 gap-2" 
          onClick={onGetDirections}
        >
          <Navigation className="w-4 h-4" />
          Directions
        </Button>
        <Button variant="secondary" size="icon" onClick={handleShare}>
          <Share className="w-4 h-4" />
        </Button>
      </div>

      {/* Save Options */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1 gap-2"
          onClick={() => handleSave('home')}
          disabled={isSaving}
        >
          <Home className={cn("w-4 h-4", saveType === 'home' && "animate-pulse")} />
          Home
        </Button>
        <Button
          variant="outline"
          className="flex-1 gap-2"
          onClick={() => handleSave('work')}
          disabled={isSaving}
        >
          <Briefcase className={cn("w-4 h-4", saveType === 'work' && "animate-pulse")} />
          Work
        </Button>
        <Button
          variant="outline"
          className="flex-1 gap-2"
          onClick={() => handleSave('favorite')}
          disabled={isSaving}
        >
          <Heart className={cn("w-4 h-4", saveType === 'favorite' && "animate-pulse")} />
          Save
        </Button>
      </div>

      {/* Contact Info */}
      {(place.phoneNumber || place.website) && (
        <div className="space-y-2 pt-2 border-t border-border">
          {place.phoneNumber && (
            <a
              href={`tel:${place.phoneNumber}`}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors"
            >
              <Phone className="w-5 h-5 text-primary" />
              <span className="text-sm">{place.phoneNumber}</span>
            </a>
          )}
          {place.website && (
            <a
              href={place.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors"
            >
              <Globe className="w-5 h-5 text-primary" />
              <span className="text-sm truncate">{new URL(place.website).hostname}</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}
