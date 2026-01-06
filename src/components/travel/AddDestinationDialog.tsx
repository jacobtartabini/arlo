import { useState } from "react";
import { MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";

interface AddDestinationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (
    name: string,
    options?: {
      address?: string;
      latitude?: number;
      longitude?: number;
      placeId?: string;
      timezone?: string;
      currency?: string;
    }
  ) => void;
}

const TIMEZONE_CURRENCIES: Record<string, string> = {
  'Europe/London': 'GBP',
  'Europe/Paris': 'EUR',
  'Europe/Berlin': 'EUR',
  'Europe/Rome': 'EUR',
  'Europe/Madrid': 'EUR',
  'Asia/Tokyo': 'JPY',
  'Asia/Seoul': 'KRW',
  'Asia/Shanghai': 'CNY',
  'Asia/Hong_Kong': 'HKD',
  'Asia/Singapore': 'SGD',
  'Asia/Bangkok': 'THB',
  'Australia/Sydney': 'AUD',
  'America/New_York': 'USD',
  'America/Los_Angeles': 'USD',
  'America/Chicago': 'USD',
  'America/Denver': 'USD',
  'America/Toronto': 'CAD',
  'America/Vancouver': 'CAD',
  'America/Mexico_City': 'MXN',
};

export function AddDestinationDialog({ open, onOpenChange, onAdd }: AddDestinationDialogProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [currency, setCurrency] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<{
    placeId?: string;
    lat?: number;
    lng?: number;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePlaceSelect = (place: { 
    placeId: string; 
    name: string; 
    address: string;
    lat: number;
    lng: number;
  }) => {
    setName(place.name);
    setAddress(place.address);
    setSelectedPlace({
      placeId: place.placeId,
      lat: place.lat,
      lng: place.lng,
    });
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onAdd(name.trim(), {
        address: address || undefined,
        latitude: selectedPlace?.lat,
        longitude: selectedPlace?.lng,
        placeId: selectedPlace?.placeId,
        currency: currency || undefined,
      });
      // Reset form
      setName("");
      setAddress("");
      setCurrency("");
      setSelectedPlace(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Add Destination
          </DialogTitle>
          <DialogDescription>Where are you traveling? Search for a city or place.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Search for a place</Label>
            <LocationAutocomplete
              placeholder="Search cities, airports, or places..."
              onSelect={handlePlaceSelect}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Destination Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Tokyo, Japan"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Local Currency</Label>
            <Input
              id="currency"
              placeholder="e.g., JPY"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              maxLength={3}
            />
            <p className="text-xs text-muted-foreground">
              Used for currency conversion
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!name.trim() || isSubmitting}
          >
            {isSubmitting ? "Adding..." : "Add Destination"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
