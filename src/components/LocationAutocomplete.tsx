import * as React from "react";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

interface LocationAutocompleteProps {
  value?: string;
  onChange?: (value: string) => void;
  onSelect?: (place: { placeId: string; name: string; address: string; lat: number; lng: number }) => void;
  placeholder?: string;
  className?: string;
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  value: controlledValue,
  onChange,
  onSelect,
  placeholder = "Add location",
  className,
}) => {
  const [internalValue, setInternalValue] = React.useState("");
  const value = controlledValue ?? internalValue;
  const [predictions, setPredictions] = React.useState<PlacePrediction[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [sessionToken] = React.useState(() => crypto.randomUUID());
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

  const fetchPredictions = React.useCallback(async (query: string) => {
    if (query.length < 2) {
      setPredictions([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("places-autocomplete", {
        body: { query, sessionToken },
      });

      if (error) {
        console.error("[LocationAutocomplete] Error:", error);
        setPredictions([]);
        return;
      }

      if (data?.predictions) {
        setPredictions(data.predictions);
        setIsOpen(true);
      }
    } catch (err) {
      console.error("[LocationAutocomplete] Fetch error:", err);
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionToken]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    onChange?.(newValue);

    // Debounce API calls
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      fetchPredictions(newValue);
    }, 300);
  };

  const handleSelect = async (prediction: PlacePrediction) => {
    setInternalValue(prediction.description);
    onChange?.(prediction.description);
    setPredictions([]);
    setIsOpen(false);

    // If onSelect callback provided, fetch place details for coordinates
    if (onSelect) {
      try {
        const { data } = await supabase.functions.invoke("maps-api", {
          body: { action: "place-details", placeId: prediction.placeId },
        });
        if (data?.result) {
          onSelect({
            placeId: prediction.placeId,
            name: prediction.mainText,
            address: prediction.description,
            lat: data.result.geometry?.location?.lat ?? 0,
            lng: data.result.geometry?.location?.lng ?? 0,
          });
        } else {
          // Fallback without coordinates
          onSelect({
            placeId: prediction.placeId,
            name: prediction.mainText,
            address: prediction.description,
            lat: 0,
            lng: 0,
          });
        }
      } catch (err) {
        console.error("[LocationAutocomplete] Place details error:", err);
        onSelect({
          placeId: prediction.placeId,
          name: prediction.mainText,
          address: prediction.description,
          lat: 0,
          lng: 0,
        });
      }
    }
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => predictions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className={cn("pl-9", className)}
        />
      </div>

      {isOpen && predictions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-lg">
          <ul className="max-h-60 overflow-auto py-1">
            {predictions.map((prediction) => (
              <li key={prediction.placeId}>
                <button
                  type="button"
                  onClick={() => handleSelect(prediction)}
                  className="flex w-full items-start gap-3 px-3 py-2 text-left hover:bg-accent transition-colors"
                >
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{prediction.mainText}</p>
                    {prediction.secondaryText && (
                      <p className="text-xs text-muted-foreground truncate">
                        {prediction.secondaryText}
                      </p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
};
