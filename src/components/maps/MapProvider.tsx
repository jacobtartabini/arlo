import React, { createContext, useContext, ReactNode } from 'react';
import { useJsApiLoader, Libraries } from '@react-google-maps/api';
import { AlertTriangle } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const libraries: Libraries = ['places', 'geometry', 'drawing'];

interface MapContextValue {
  isLoaded: boolean;
  loadError: Error | undefined;
  apiKeyMissing: boolean;
}

const MapContext = createContext<MapContextValue | undefined>(undefined);

interface MapProviderProps {
  children: ReactNode;
}

export function MapProvider({ children }: MapProviderProps) {
  const apiKeyMissing = !GOOGLE_MAPS_API_KEY;

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
    // Prevent loading if no API key
    preventGoogleFontsLoading: apiKeyMissing,
  });

  // Show error UI if API key is missing
  if (apiKeyMissing) {
    return (
      <MapContext.Provider value={{ isLoaded: false, loadError: undefined, apiKeyMissing: true }}>
        <div className="flex flex-col items-center justify-center h-full bg-background p-8">
          <div className="flex flex-col items-center gap-4 text-center max-w-md">
            <div className="p-4 rounded-full bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Google Maps API Key Missing</h2>
            <p className="text-muted-foreground">
              The Google Maps API key is not configured. Please add <code className="px-1.5 py-0.5 rounded bg-muted text-sm">VITE_GOOGLE_MAPS_API_KEY</code> to your environment variables.
            </p>
          </div>
        </div>
      </MapContext.Provider>
    );
  }

  return (
    <MapContext.Provider value={{ isLoaded, loadError, apiKeyMissing: false }}>
      {children}
    </MapContext.Provider>
  );
}

export function useMapContext() {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error('useMapContext must be used within a MapProvider');
  }
  return context;
}
