import React from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlacePrediction } from '@/types/maps';

interface MapSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  isLoading?: boolean;
  predictions: PlacePrediction[];
  onPredictionSelect: (prediction: PlacePrediction) => void;
  placeholder?: string;
  variant?: 'default' | 'floating';
}

export function MapSearchInput({
  value,
  onChange,
  onSubmit,
  onClear,
  isLoading,
  predictions,
  onPredictionSelect,
  placeholder = 'Search places',
  variant = 'default',
}: MapSearchInputProps) {
  return (
    <div className={cn('relative', variant === 'floating' && 'w-full max-w-md')}> 
      <div
        className={cn(
          'flex items-center gap-2 rounded-2xl border bg-background px-4 py-3 shadow-sm',
          variant === 'floating' && 'bg-background/90 backdrop-blur border-border/60 shadow-lg'
        )}
      >
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onSubmit();
            }
          }}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm outline-none"
        />
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : value ? (
          <button type="button" onClick={onClear} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {predictions.length > 0 && (
        <div className="absolute z-20 mt-2 w-full rounded-2xl border bg-background/95 shadow-lg backdrop-blur">
          <div className="max-h-64 overflow-y-auto">
            {predictions.map((prediction) => (
              <button
                key={prediction.placeId}
                type="button"
                onClick={() => onPredictionSelect(prediction)}
                className="flex w-full flex-col gap-0.5 px-4 py-3 text-left hover:bg-muted"
              >
                <span className="text-sm font-medium text-foreground">{prediction.mainText}</span>
                <span className="text-xs text-muted-foreground">{prediction.secondaryText}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
