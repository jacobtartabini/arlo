// Arlo Maps Type Definitions

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Place {
  placeId: string;
  name: string;
  address: string;
  location: LatLng;
  types?: string[];
  openNow?: boolean;
  rating?: number;
  phoneNumber?: string;
  website?: string;
  photos?: string[];
}

export interface MapPin {
  id: string;
  title: string;
  note?: string | null;
  location: LatLng;
  createdAt: string;
  updatedAt: string;
}

export interface SavedPlace extends Place {
  id: string;
  placeType: 'home' | 'work' | 'favorite';
  createdAt: string;
}

export interface RecentSearch {
  id: string;
  query: string;
  placeId?: string;
  placeName?: string;
  placeAddress?: string;
  location?: LatLng;
  searchedAt: string;
}

export interface DestinationPattern {
  id: string;
  placeId?: string;
  placeName: string;
  placeAddress?: string;
  location: LatLng;
  dayOfWeek: number;
  timeBucket: 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';
  visitCount: number;
  lastVisitedAt: string;
}

export interface SmartSuggestion {
  place: Place;
  eta: string;
  reason: string;
}

export type IncidentType = 'police' | 'accident' | 'hazard' | 'construction' | 'closure' | 'other';

export interface Incident {
  id: string;
  type: IncidentType;
  location: LatLng;
  description?: string;
  upvotes: number;
  downvotes: number;
  expiresAt: string;
  createdAt: string;
  userVote?: 'up' | 'down' | null;
}

export interface RouteStep {
  instruction: string;
  distance: string;
  duration: string;
  maneuver?: string;
  startLocation: LatLng;
  endLocation: LatLng;
}

export interface RouteOption {
  id: string;
  summary: string;
  distance: number;           // meters
  distanceText: string;
  duration: number;           // seconds
  durationText: string;
  durationInTraffic?: number; // seconds
  durationInTrafficText?: string;
  polyline: string;           // encoded polyline string
  steps: RouteStep[];
  warnings?: string[];
  viaWaypoints?: LatLng[];
}

export interface DirectionsResult {
  routes: RouteOption[];
  origin: Place;
  destination: Place;
  waypoints?: Place[];
}

export interface NavigationState {
  isNavigating: boolean;
  currentRoute: RouteOption | null;
  currentStepIndex: number;
  origin: Place | null;
  destination: Place | null;
  waypoints: Place[];
  followMode: boolean;
  voiceMuted: boolean;
  estimatedArrival: string | null;
  remainingDistance: string | null;
  remainingDuration: string | null;
}

export interface MapSettings {
  patternLearningEnabled: boolean;
  showIncidents: boolean;
  showTraffic: boolean;
  defaultMapType: 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
}

export type BottomSheetState = 'collapsed' | 'half' | 'full';

export type MapMode = 'explore' | 'search' | 'place-details' | 'directions' | 'navigation';

export interface MapViewState {
  center: LatLng;
  zoom: number;
  bearing: number;
  tilt: number;
}

// Google Maps API response types
export interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  types?: string[];
}

export interface DirectionsRequest {
  origin: string | LatLng;
  destination: string | LatLng;
  waypoints?: Array<string | LatLng>;
  optimizeWaypoints?: boolean;
  travelMode?: 'DRIVING' | 'WALKING' | 'BICYCLING' | 'TRANSIT';
  departureTime?: 'now' | Date;
  avoidHighways?: boolean;
  avoidTolls?: boolean;
  alternatives?: boolean;
}
