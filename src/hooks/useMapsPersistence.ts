import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import type { SavedPlace, RecentSearch, DestinationPattern, Incident, MapSettings, LatLng, IncidentType } from '@/types/maps';

const DEFAULT_SETTINGS: MapSettings = {
  patternLearningEnabled: true,
  showIncidents: true,
  showTraffic: true,
  defaultMapType: 'roadmap',
};

export function useMapsPersistence() {
  const { userKey, isAuthenticated } = useAuth();
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [patterns, setPatterns] = useState<DestinationPattern[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [settings, setSettings] = useState<MapSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all map data
  const fetchData = useCallback(async () => {
    if (!isAuthenticated || !userKey) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Fetch places
      const placesRes = await supabase
        .from('user_saved_places')
        .select('*')
        .order('created_at', { ascending: false })
        .setHeader('x-user-key', userKey);

      if (placesRes.data) {
        setSavedPlaces(placesRes.data.map(p => ({
          id: p.id,
          placeId: p.place_id || '',
          name: p.name,
          address: p.address,
          location: { lat: p.latitude, lng: p.longitude },
          placeType: p.place_type as 'home' | 'work' | 'favorite',
          createdAt: p.created_at,
        })));
      }

      // Fetch recent searches
      const searchesRes = await supabase
        .from('map_recent_searches')
        .select('*')
        .order('searched_at', { ascending: false })
        .limit(20)
        .setHeader('x-user-key', userKey);

      if (searchesRes.data) {
        setRecentSearches(searchesRes.data.map(s => ({
          id: s.id,
          query: s.query,
          placeId: s.place_id || undefined,
          placeName: s.place_name || undefined,
          placeAddress: s.place_address || undefined,
          location: s.latitude && s.longitude ? { lat: s.latitude, lng: s.longitude } : undefined,
          searchedAt: s.searched_at,
        })));
      }

      // Fetch patterns
      const patternsRes = await supabase
        .from('map_destination_patterns')
        .select('*')
        .order('visit_count', { ascending: false })
        .setHeader('x-user-key', userKey);

      if (patternsRes.data) {
        setPatterns(patternsRes.data.map(p => ({
          id: p.id,
          placeId: p.place_id || undefined,
          placeName: p.place_name,
          placeAddress: p.place_address || undefined,
          location: { lat: p.latitude, lng: p.longitude },
          dayOfWeek: p.day_of_week,
          timeBucket: p.time_bucket as DestinationPattern['timeBucket'],
          visitCount: p.visit_count,
          lastVisitedAt: p.last_visited_at,
        })));
      }

      // Fetch active incidents
      const incidentsRes = await supabase
        .from('map_incidents')
        .select('*')
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .setHeader('x-user-key', userKey);

      if (incidentsRes.data) {
        setIncidents(incidentsRes.data.map(i => ({
          id: i.id,
          type: i.incident_type as IncidentType,
          location: { lat: i.latitude, lng: i.longitude },
          description: i.description || undefined,
          upvotes: i.upvotes,
          downvotes: i.downvotes,
          expiresAt: i.expires_at,
          createdAt: i.created_at,
        })));
      }

      // Fetch settings (use maybeSingle to handle 0 rows)
      const settingsRes = await supabase
        .from('map_user_settings')
        .select('*')
        .eq('user_key', userKey)
        .maybeSingle()
        .setHeader('x-user-key', userKey);

      if (settingsRes.data) {
        setSettings({
          patternLearningEnabled: settingsRes.data.pattern_learning_enabled,
          showIncidents: settingsRes.data.show_incidents,
          showTraffic: settingsRes.data.show_traffic,
          defaultMapType: settingsRes.data.default_map_type as MapSettings['defaultMapType'],
        });
      } else if (!settingsRes.error) {
        // No settings exist yet - create default settings for this user
        await supabase
          .from('map_user_settings')
          .insert({
            user_key: userKey,
            pattern_learning_enabled: DEFAULT_SETTINGS.patternLearningEnabled,
            show_incidents: DEFAULT_SETTINGS.showIncidents,
            show_traffic: DEFAULT_SETTINGS.showTraffic,
            default_map_type: DEFAULT_SETTINGS.defaultMapType,
          })
          .setHeader('x-user-key', userKey);
      }
    } catch (error) {
      console.error('[useMapsPersistence] Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, userKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Save a place (home, work, or favorite)
  const savePlace = useCallback(async (place: Omit<SavedPlace, 'id' | 'createdAt'>) => {
    if (!userKey) return null;

    const { data, error } = await supabase
      .from('user_saved_places')
      .upsert({
        user_key: userKey,
        place_type: place.placeType,
        name: place.name,
        address: place.address,
        place_id: place.placeId,
        latitude: place.location.lat,
        longitude: place.location.lng,
      }, { onConflict: 'user_key,place_type' })
      .select()
      .single()
      .setHeader('x-user-key', userKey);

    if (error) {
      console.error('[useMapsPersistence] Error saving place:', error);
      return null;
    }

    const newPlace: SavedPlace = {
      id: data.id,
      placeId: data.place_id || '',
      name: data.name,
      address: data.address,
      location: { lat: data.latitude, lng: data.longitude },
      placeType: data.place_type as 'home' | 'work' | 'favorite',
      createdAt: data.created_at,
    };

    setSavedPlaces(prev => {
      const filtered = prev.filter(p => p.placeType !== place.placeType);
      return [newPlace, ...filtered];
    });

    return newPlace;
  }, [userKey]);

  // Add a recent search
  const addRecentSearch = useCallback(async (search: Omit<RecentSearch, 'id' | 'searchedAt'>) => {
    if (!userKey) return;

    const { error } = await supabase
      .from('map_recent_searches')
      .insert({
        user_key: userKey,
        query: search.query,
        place_id: search.placeId,
        place_name: search.placeName,
        place_address: search.placeAddress,
        latitude: search.location?.lat,
        longitude: search.location?.lng,
      })
      .setHeader('x-user-key', userKey);

    if (error) {
      console.error('[useMapsPersistence] Error adding recent search:', error);
      return;
    }

    // Refetch to get the new search
    fetchData();
  }, [userKey, fetchData]);

  // Clear recent searches
  const clearRecentSearches = useCallback(async () => {
    if (!userKey) return;

    const { error } = await supabase
      .from('map_recent_searches')
      .delete()
      .eq('user_key', userKey)
      .setHeader('x-user-key', userKey);

    if (error) {
      console.error('[useMapsPersistence] Error clearing searches:', error);
      return;
    }

    setRecentSearches([]);
  }, [userKey]);

  // Record a destination visit (for pattern learning)
  const recordDestinationVisit = useCallback(async (place: { placeId?: string; name: string; address?: string; location: LatLng }) => {
    if (!userKey || !settings.patternLearningEnabled) return;

    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();

    let timeBucket: DestinationPattern['timeBucket'];
    if (hour >= 5 && hour < 11) timeBucket = 'morning';
    else if (hour >= 11 && hour < 14) timeBucket = 'midday';
    else if (hour >= 14 && hour < 17) timeBucket = 'afternoon';
    else if (hour >= 17 && hour < 21) timeBucket = 'evening';
    else timeBucket = 'night';

    // Check if pattern exists
    const existing = patterns.find(
      p => p.placeId === place.placeId && p.dayOfWeek === dayOfWeek && p.timeBucket === timeBucket
    );

    if (existing) {
      const { error } = await supabase
        .from('map_destination_patterns')
        .update({
          visit_count: existing.visitCount + 1,
          last_visited_at: now.toISOString(),
        })
        .eq('id', existing.id)
        .setHeader('x-user-key', userKey);

      if (!error) {
        setPatterns(prev => prev.map(p => 
          p.id === existing.id 
            ? { ...p, visitCount: p.visitCount + 1, lastVisitedAt: now.toISOString() }
            : p
        ));
      }
    } else {
      const { data, error } = await supabase
        .from('map_destination_patterns')
        .insert({
          user_key: userKey,
          place_id: place.placeId,
          place_name: place.name,
          place_address: place.address,
          latitude: place.location.lat,
          longitude: place.location.lng,
          day_of_week: dayOfWeek,
          time_bucket: timeBucket,
        })
        .select()
        .single()
        .setHeader('x-user-key', userKey);

      if (!error && data) {
        setPatterns(prev => [{
          id: data.id,
          placeId: data.place_id || undefined,
          placeName: data.place_name,
          placeAddress: data.place_address || undefined,
          location: { lat: data.latitude, lng: data.longitude },
          dayOfWeek: data.day_of_week,
          timeBucket: data.time_bucket as DestinationPattern['timeBucket'],
          visitCount: data.visit_count,
          lastVisitedAt: data.last_visited_at,
        }, ...prev]);
      }
    }
  }, [userKey, settings.patternLearningEnabled, patterns]);

  // Get smart suggestions based on patterns
  const getSmartSuggestions = useCallback(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();

    let currentBucket: DestinationPattern['timeBucket'];
    if (hour >= 5 && hour < 11) currentBucket = 'morning';
    else if (hour >= 11 && hour < 14) currentBucket = 'midday';
    else if (hour >= 14 && hour < 17) currentBucket = 'afternoon';
    else if (hour >= 17 && hour < 21) currentBucket = 'evening';
    else currentBucket = 'night';

    // Find patterns matching current time
    return patterns
      .filter(p => p.dayOfWeek === dayOfWeek && p.timeBucket === currentBucket)
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, 3);
  }, [patterns]);

  // Report an incident
  const reportIncident = useCallback(async (incident: { type: IncidentType; location: LatLng; description?: string }) => {
    if (!userKey) return null;

    // Incidents expire after 30 minutes by default, police reports after 15 minutes
    const expiresIn = incident.type === 'police' ? 15 : 30;
    const expiresAt = new Date(Date.now() + expiresIn * 60 * 1000);

    const { data, error } = await supabase
      .from('map_incidents')
      .insert({
        user_key: userKey,
        incident_type: incident.type,
        latitude: incident.location.lat,
        longitude: incident.location.lng,
        description: incident.description,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()
      .setHeader('x-user-key', userKey);

    if (error) {
      console.error('[useMapsPersistence] Error reporting incident:', error);
      return null;
    }

    const newIncident: Incident = {
      id: data.id,
      type: data.incident_type as IncidentType,
      location: { lat: data.latitude, lng: data.longitude },
      description: data.description || undefined,
      upvotes: 0,
      downvotes: 0,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
    };

    setIncidents(prev => [newIncident, ...prev]);
    return newIncident;
  }, [userKey]);

  // Vote on an incident
  const voteIncident = useCallback(async (incidentId: string, voteType: 'up' | 'down') => {
    if (!userKey) return;

    // Record the vote
    const { error: voteError } = await supabase
      .from('map_incident_votes')
      .upsert({
        user_key: userKey,
        incident_id: incidentId,
        vote_type: voteType,
      }, { onConflict: 'user_key,incident_id' })
      .setHeader('x-user-key', userKey);

    if (voteError) {
      console.error('[useMapsPersistence] Error voting:', voteError);
      return;
    }

    // Update the incident vote counts (simplified - in production would use triggers)
    const incident = incidents.find(i => i.id === incidentId);
    if (!incident) return;

    const updateField = voteType === 'up' ? 'upvotes' : 'downvotes';
    await supabase
      .from('map_incidents')
      .update({ [updateField]: incident[updateField] + 1 })
      .eq('id', incidentId)
      .setHeader('x-user-key', userKey);

    setIncidents(prev => prev.map(i => 
      i.id === incidentId
        ? { ...i, [updateField]: i[updateField] + 1, userVote: voteType }
        : i
    ));
  }, [userKey, incidents]);

  // Update settings
  const updateSettings = useCallback(async (newSettings: Partial<MapSettings>) => {
    if (!userKey) return;

    const merged = { ...settings, ...newSettings };

    const { error } = await supabase
      .from('map_user_settings')
      .upsert({
        user_key: userKey,
        pattern_learning_enabled: merged.patternLearningEnabled,
        show_incidents: merged.showIncidents,
        show_traffic: merged.showTraffic,
        default_map_type: merged.defaultMapType,
      }, { onConflict: 'user_key' })
      .setHeader('x-user-key', userKey);

    if (error) {
      console.error('[useMapsPersistence] Error updating settings:', error);
      return;
    }

    setSettings(merged);
  }, [userKey, settings]);

  // Get home/work locations
  const homePlace = savedPlaces.find(p => p.placeType === 'home');
  const workPlace = savedPlaces.find(p => p.placeType === 'work');
  const favorites = savedPlaces.filter(p => p.placeType === 'favorite');

  return {
    // Data
    savedPlaces,
    homePlace,
    workPlace,
    favorites,
    recentSearches,
    patterns,
    incidents,
    settings,
    isLoading,

    // Actions
    savePlace,
    addRecentSearch,
    clearRecentSearches,
    recordDestinationVisit,
    getSmartSuggestions,
    reportIncident,
    voteIncident,
    updateSettings,
    refresh: fetchData,
  };
}
