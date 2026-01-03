import React, { createContext, useContext, ReactNode } from 'react';
import { useJsApiLoader, Libraries } from '@react-google-maps/api';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const libraries: Libraries = ['places', 'geometry', 'drawing'];

interface MapContextValue {
  isLoaded: boolean;
  loadError: Error | undefined;
}

const MapContext = createContext<MapContextValue | undefined>(undefined);

interface MapProviderProps {
  children: ReactNode;
}

export function MapProvider({ children }: MapProviderProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
  });

  return (
    <MapContext.Provider value={{ isLoaded, loadError }}>
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
