import { useCallback, useRef, useState } from 'react';
import { OverlayViewF, OVERLAY_MOUSE_TARGET } from '@react-google-maps/api';

type LatLng = { lat: number; lng: number };

interface AdvancedMapMarkerProps {
  map?: google.maps.Map | null;
  position: LatLng;
  content: React.ReactNode;
  title?: string;
  zIndex?: number;
  draggable?: boolean;
  onClick?: () => void;
  onDragEnd?: (position: LatLng) => void;
  /** Offset the rendered element relative to its anchor (defaults to centered). */
  anchor?: 'center' | 'bottom-center';
}

function getPixelOffset(anchor: 'center' | 'bottom-center') {
  return (width: number, height: number) => ({
    x: -(width / 2),
    y: anchor === 'bottom-center' ? -height : -(height / 2),
  });
}

export function AdvancedMapMarker({
  map,
  position,
  content,
  title,
  zIndex,
  draggable,
  onClick,
  onDragEnd,
  anchor = 'center',
}: AdvancedMapMarkerProps) {
  const [currentPos, setCurrentPos] = useState<LatLng>(position);
  const currentPosRef = useRef<LatLng>(position);
  const moveListenerRef = useRef<google.maps.MapsEventListener | null>(null);

  // Keep position in sync when the prop changes externally
  if (position.lat !== currentPos.lat || position.lng !== currentPos.lng) {
    setCurrentPos(position);
    currentPosRef.current = position;
  }

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggable || !map) return;
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

      // Disable native map panning while dragging the marker
      map.setOptions({ draggable: false, gestureHandling: 'none' });

      moveListenerRef.current = map.addListener(
        'mousemove',
        (event: google.maps.MapMouseEvent) => {
          if (!event.latLng) return;
          const pos = { lat: event.latLng.lat(), lng: event.latLng.lng() };
          currentPosRef.current = pos;
          setCurrentPos(pos);
        }
      );
    },
    [draggable, map]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggable || !map) return;
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);

      moveListenerRef.current?.remove();
      moveListenerRef.current = null;

      map.setOptions({ draggable: true, gestureHandling: 'greedy' });
      onDragEnd?.(currentPosRef.current);
    },
    [draggable, map, onDragEnd]
  );

  return (
    <OverlayViewF
      position={currentPos}
      mapPaneName={OVERLAY_MOUSE_TARGET}
      zIndex={zIndex}
      getPixelPositionOffset={getPixelOffset(anchor)}
    >
      <div
        title={title}
        onClick={onClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        style={{
          cursor: draggable ? 'grab' : onClick ? 'pointer' : 'default',
          userSelect: 'none',
          touchAction: 'none',
        }}
      >
        {content}
      </div>
    </OverlayViewF>
  );
}
