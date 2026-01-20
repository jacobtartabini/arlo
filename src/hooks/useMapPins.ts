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

// Type for the map_pins table (not in generated types yet)
interface MapPinRow {
  id: string;
  title: string;
  note: string | null;
  latitude: number;
  longitude: number;
  user_key: string;
  created_at: string;
  updated_at: string;
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

    // Use type assertion since map_pins may not be in generated types
    const { data, error: fetchError } = await (supabase
      .from('map_pins' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .setHeader('x-user-key', userKey) as any);

    if (fetchError) {
      setError(fetchError.message);
      setIsLoading(false);
      return;
    }

    setPins(
      ((data ?? []) as MapPinRow[]).map((pin) => ({
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

      const { data, error: insertError } = await (supabase
        .from('map_pins' as any)
        .insert({
          user_key: userKey,
          title,
          note,
          latitude: location.lat,
          longitude: location.lng,
        })
        .select()
        .single()
        .setHeader('x-user-key', userKey) as any);

      if (insertError) {
        setError(insertError.message);
        return null;
      }

      const pinData = data as MapPinRow;
      const newPin: MapPin = {
        id: pinData.id,
        title: pinData.title,
        note: pinData.note,
        location: { lat: pinData.latitude, lng: pinData.longitude },
        createdAt: pinData.created_at,
        updatedAt: pinData.updated_at,
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

      const { data, error: updateError } = await (supabase
        .from('map_pins' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single()
        .setHeader('x-user-key', userKey) as any);

      if (updateError) {
        setError(updateError.message);
        return null;
      }

      const pinData = data as MapPinRow;
      const updatedPin: MapPin = {
        id: pinData.id,
        title: pinData.title,
        note: pinData.note,
        location: { lat: pinData.latitude, lng: pinData.longitude },
        createdAt: pinData.created_at,
        updatedAt: pinData.updated_at,
      };

      setPins((prev) => prev.map((pin) => (pin.id === id ? updatedPin : pin)));
      return updatedPin;
    },
    [userKey]
  );

  const deletePin = useCallback(
    async (id: string) => {
      if (!userKey) return false;

      const { error: deleteError } = await (supabase
        .from('map_pins' as any)
        .delete()
        .eq('id', id)
        .setHeader('x-user-key', userKey) as any);

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