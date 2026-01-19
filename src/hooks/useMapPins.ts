import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import type { LatLng, MapPin } from '@/types/maps';

interface CreatePinInput {
  title: string;
  note?: string | null;
  location: LatLng;
}

interface UpdatePinInput {
  id: string;
  title?: string;
  note?: string | null;
  location?: LatLng;
}

export function useMapPins() {
  const { userKey, isAuthenticated } = useAuth();
  const [pins, setPins] = useState<MapPin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPins = useCallback(async () => {
    if (!isAuthenticated || !userKey) {
      setPins([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('map_pins')
      .select('*')
      .order('created_at', { ascending: false })
      .setHeader('x-user-key', userKey);

    if (fetchError) {
      setError(fetchError.message);
      setIsLoading(false);
      return;
    }

    setPins(
      (data ?? []).map((pin) => ({
        id: pin.id,
        title: pin.title,
        note: pin.note,
        location: { lat: pin.latitude, lng: pin.longitude },
        createdAt: pin.created_at,
        updatedAt: pin.updated_at,
      }))
    );
    setIsLoading(false);
  }, [isAuthenticated, userKey]);

  useEffect(() => {
    fetchPins();
  }, [fetchPins]);

  const createPin = useCallback(
    async ({ title, note, location }: CreatePinInput) => {
      if (!userKey) return null;

      const { data, error: insertError } = await supabase
        .from('map_pins')
        .insert({
          user_key: userKey,
          title,
          note,
          latitude: location.lat,
          longitude: location.lng,
        })
        .select()
        .single()
        .setHeader('x-user-key', userKey);

      if (insertError) {
        setError(insertError.message);
        return null;
      }

      const newPin: MapPin = {
        id: data.id,
        title: data.title,
        note: data.note,
        location: { lat: data.latitude, lng: data.longitude },
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setPins((prev) => [newPin, ...prev]);
      return newPin;
    },
    [userKey]
  );

  const updatePin = useCallback(
    async ({ id, title, note, location }: UpdatePinInput) => {
      if (!userKey) return null;

      const updates: Record<string, unknown> = {};
      if (title !== undefined) updates.title = title;
      if (note !== undefined) updates.note = note;
      if (location) {
        updates.latitude = location.lat;
        updates.longitude = location.lng;
      }

      const { data, error: updateError } = await supabase
        .from('map_pins')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
        .setHeader('x-user-key', userKey);

      if (updateError) {
        setError(updateError.message);
        return null;
      }

      const updatedPin: MapPin = {
        id: data.id,
        title: data.title,
        note: data.note,
        location: { lat: data.latitude, lng: data.longitude },
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setPins((prev) => prev.map((pin) => (pin.id === id ? updatedPin : pin)));
      return updatedPin;
    },
    [userKey]
  );

  const deletePin = useCallback(
    async (id: string) => {
      if (!userKey) return false;

      const { error: deleteError } = await supabase
        .from('map_pins')
        .delete()
        .eq('id', id)
        .setHeader('x-user-key', userKey);

      if (deleteError) {
        setError(deleteError.message);
        return false;
      }

      setPins((prev) => prev.filter((pin) => pin.id !== id));
      return true;
    },
    [userKey]
  );

  return {
    pins,
    isLoading,
    error,
    refresh: fetchPins,
    createPin,
    updatePin,
    deletePin,
  };
}
