import { useState, useEffect } from "react";
import { Sunrise, Sunset, MapPin, Loader2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useGeolocation } from "@/hooks/useGeolocation";
import { getSunrise, getSunset, formatSunTimeWithOffset, getOffsetLabel } from "@/lib/sun-times";
import { cn } from "@/lib/utils";

interface SunriseSunsetPickerProps {
  type: "sunrise" | "sunset";
  offsetMinutes: number;
  onTypeChange: (type: "sunrise" | "sunset") => void;
  onOffsetChange: (offset: number) => void;
  location?: { lat: number; lng: number } | null;
  onLocationRequest?: () => void;
}

export function SunriseSunsetPicker({
  type,
  offsetMinutes,
  onTypeChange,
  onOffsetChange,
  location,
  onLocationRequest,
}: SunriseSunsetPickerProps) {
  const { position, isLoading, getCurrentPosition } = useGeolocation();
  const [sunTimes, setSunTimes] = useState<{ sunrise: Date | null; sunset: Date | null }>({
    sunrise: null,
    sunset: null,
  });

  // Use provided location or geolocation
  const effectiveLocation = location || (position ? { lat: position.lat, lng: position.lng } : null);

  useEffect(() => {
    if (effectiveLocation) {
      const sunrise = getSunrise(effectiveLocation.lat, effectiveLocation.lng);
      const sunset = getSunset(effectiveLocation.lat, effectiveLocation.lng);
      setSunTimes({ sunrise, sunset });
    }
  }, [effectiveLocation]);

  const handleRequestLocation = () => {
    if (onLocationRequest) {
      onLocationRequest();
    } else {
      getCurrentPosition();
    }
  };

  const currentTime = type === "sunrise" ? sunTimes.sunrise : sunTimes.sunset;
  const displayTime = formatSunTimeWithOffset(currentTime, offsetMinutes);
  const offsetLabel = getOffsetLabel(offsetMinutes, type);

  return (
    <div className="space-y-4">
      {/* Type Toggle */}
      <div className="bg-background rounded-xl p-1 flex">
        {(["sunrise", "sunset"] as const).map((t) => {
          const Icon = t === "sunrise" ? Sunrise : Sunset;
          const isActive = type === t;
          return (
            <button
              key={t}
              type="button"
              className={cn(
                "flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all",
                isActive
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => onTypeChange(t)}
            >
              <Icon className="h-4 w-4" />
              <span className="text-sm font-medium capitalize">{t}</span>
            </button>
          );
        })}
      </div>

      {/* Location Status */}
      {!effectiveLocation && (
        <div className="bg-background rounded-xl p-4">
          <div className="text-center">
            <MapPin className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-3">
              Enable location to calculate {type} times
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRequestLocation}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Getting location...
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4 mr-2" />
                  Use my location
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Time Display */}
      {effectiveLocation && (
        <div className="bg-background rounded-xl p-4 space-y-4">
          <div className="text-center">
            {type === "sunrise" ? (
              <Sunrise className="h-10 w-10 mx-auto mb-2 text-amber-500" />
            ) : (
              <Sunset className="h-10 w-10 mx-auto mb-2 text-orange-500" />
            )}
            <div className="text-3xl font-bold">{displayTime}</div>
            <div className="text-sm text-muted-foreground mt-1">{offsetLabel}</div>
          </div>

          {/* Offset Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1h before</span>
              <span>At {type}</span>
              <span>1h after</span>
            </div>
            <Slider
              value={[offsetMinutes]}
              onValueChange={([value]) => onOffsetChange(value)}
              min={-60}
              max={60}
              step={5}
              className="w-full"
            />
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap gap-2 justify-center">
            {[-30, -15, 0, 15, 30].map((offset) => (
              <Button
                key={offset}
                type="button"
                variant={offsetMinutes === offset ? "default" : "outline"}
                size="sm"
                onClick={() => onOffsetChange(offset)}
                className="text-xs"
              >
                {offset === 0 ? "At" : offset > 0 ? `+${offset}m` : `${offset}m`}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
