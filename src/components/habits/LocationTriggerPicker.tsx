import { useState, useEffect } from "react";
import { MapPin, Home, Briefcase, Dumbbell, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useGeolocation } from "@/hooks/useGeolocation";
import { cn } from "@/lib/utils";

interface SavedPlace {
  id: string;
  name: string;
  address: string;
  placeType: string;
  latitude: number;
  longitude: number;
}

interface LocationTriggerPickerProps {
  selectedLocationId: string | null;
  onLocationSelect: (locationId: string | null) => void;
}

const PLACE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  home: Home,
  work: Briefcase,
  gym: Dumbbell,
};

export function LocationTriggerPicker({
  selectedLocationId,
  onLocationSelect,
}: LocationTriggerPickerProps) {
  const { userKey } = useAuth();
  const { position, getCurrentPosition, isLoading: geoLoading } = useGeolocation();
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newPlace, setNewPlace] = useState({ name: "", address: "", placeType: "other" });
  const [isSaving, setIsSaving] = useState(false);

  // Fetch saved places
  useEffect(() => {
    if (!userKey) return;

    async function fetchPlaces() {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("user_saved_places")
        .select("*")
        .eq("user_key", userKey)
        .order("place_type", { ascending: true });

      if (!error && data) {
        setPlaces(
          data.map((p) => ({
            id: p.id,
            name: p.name,
            address: p.address,
            placeType: p.place_type,
            latitude: p.latitude,
            longitude: p.longitude,
          }))
        );
      }
      setIsLoading(false);
    }

    fetchPlaces();
  }, [userKey]);

  const handleAddPlace = async () => {
    if (!userKey || !newPlace.name || !position) return;

    setIsSaving(true);
    const { data, error } = await supabase
      .from("user_saved_places")
      .insert({
        user_key: userKey,
        name: newPlace.name,
        address: newPlace.address || "Current location",
        place_type: newPlace.placeType,
        latitude: position.lat,
        longitude: position.lng,
      })
      .select()
      .single();

    if (!error && data) {
      setPlaces([
        ...places,
        {
          id: data.id,
          name: data.name,
          address: data.address,
          placeType: data.place_type,
          latitude: data.latitude,
          longitude: data.longitude,
        },
      ]);
      onLocationSelect(data.id);
      setAddDialogOpen(false);
      setNewPlace({ name: "", address: "", placeType: "other" });
    }
    setIsSaving(false);
  };

  const selectedPlace = places.find((p) => p.id === selectedLocationId);

  if (isLoading) {
    return (
      <div className="bg-background rounded-xl p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Quick Place Selection */}
      {places.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {places.slice(0, 6).map((place) => {
            const Icon = PLACE_ICONS[place.placeType] || MapPin;
            const isSelected = selectedLocationId === place.id;
            return (
              <button
                key={place.id}
                type="button"
                onClick={() => onLocationSelect(isSelected ? null : place.id)}
                className={cn(
                  "flex flex-col items-center gap-1 p-3 rounded-xl transition-all",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium truncate w-full text-center">
                  {place.name}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Selected Place Info */}
      {selectedPlace && (
        <div className="bg-background rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{selectedPlace.name}</p>
              <p className="text-sm text-muted-foreground truncate">
                {selectedPlace.address}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Routine will start when you arrive at this location
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State / Add New */}
      {places.length === 0 ? (
        <div className="bg-background rounded-xl p-6 text-center">
          <MapPin className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-3">
            No saved places yet. Add a place to trigger routines based on location.
          </p>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" onClick={() => getCurrentPosition()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Place
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add a Place</DialogTitle>
              </DialogHeader>
              <AddPlaceForm
                position={position}
                geoLoading={geoLoading}
                getCurrentPosition={getCurrentPosition}
                newPlace={newPlace}
                setNewPlace={setNewPlace}
                onSave={handleAddPlace}
                isSaving={isSaving}
              />
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => getCurrentPosition()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Place
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add a Place</DialogTitle>
            </DialogHeader>
            <AddPlaceForm
              position={position}
              geoLoading={geoLoading}
              getCurrentPosition={getCurrentPosition}
              newPlace={newPlace}
              setNewPlace={setNewPlace}
              onSave={handleAddPlace}
              isSaving={isSaving}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Sub-component for Add Place Form
function AddPlaceForm({
  position,
  geoLoading,
  getCurrentPosition,
  newPlace,
  setNewPlace,
  onSave,
  isSaving,
}: {
  position: { lat: number; lng: number } | null;
  geoLoading: boolean;
  getCurrentPosition: () => void;
  newPlace: { name: string; address: string; placeType: string };
  setNewPlace: (place: { name: string; address: string; placeType: string }) => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  const placeTypes = [
    { value: "home", label: "Home", icon: Home },
    { value: "work", label: "Work", icon: Briefcase },
    { value: "gym", label: "Gym", icon: Dumbbell },
    { value: "other", label: "Other", icon: MapPin },
  ];

  return (
    <div className="space-y-4">
      {/* Location Status */}
      {!position ? (
        <div className="bg-muted rounded-xl p-4 text-center">
          <MapPin className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-3">
            We need your current location to save this place
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={getCurrentPosition}
            disabled={geoLoading}
          >
            {geoLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Getting location...
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 mr-2" />
                Use Current Location
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="bg-green-500/10 rounded-xl p-3 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-green-600" />
          <span className="text-sm text-green-700 dark:text-green-400">
            Location captured
          </span>
        </div>
      )}

      {/* Name Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Name</label>
        <Input
          placeholder="e.g., My Gym"
          value={newPlace.name}
          onChange={(e) => setNewPlace({ ...newPlace, name: e.target.value })}
        />
      </div>

      {/* Address Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Address (optional)</label>
        <Input
          placeholder="e.g., 123 Main St"
          value={newPlace.address}
          onChange={(e) => setNewPlace({ ...newPlace, address: e.target.value })}
        />
      </div>

      {/* Place Type */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Type</label>
        <div className="flex gap-2">
          {placeTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = newPlace.placeType === type.value;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => setNewPlace({ ...newPlace, placeType: type.value })}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 p-3 rounded-xl transition-all",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="text-xs">{type.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Save Button */}
      <Button
        type="button"
        className="w-full"
        onClick={onSave}
        disabled={!position || !newPlace.name || isSaving}
      >
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Place"
        )}
      </Button>
    </div>
  );
}
