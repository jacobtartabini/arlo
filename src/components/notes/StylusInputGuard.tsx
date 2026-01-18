import { useCallback, useRef } from 'react';

export type InputType = 'stylus' | 'finger' | 'mouse' | 'unknown';

interface StylusInputGuardOptions {
  /**
   * When true, only stylus input can draw/erase
   */
  pencilOnlyMode: boolean;
  
  /**
   * Callback when drawing should start
   */
  onDrawStart?: (x: number, y: number, pressure: number, inputType: InputType) => void;
  
  /**
   * Callback when drawing should continue
   */
  onDrawMove?: (x: number, y: number, pressure: number, inputType: InputType) => void;
  
  /**
   * Callback when drawing should end
   */
  onDrawEnd?: (inputType: InputType) => void;
  
  /**
   * Callback when finger navigation starts (pan/scroll)
   */
  onNavigationStart?: (x: number, y: number) => void;
  
  /**
   * Callback when finger navigation continues
   */
  onNavigationMove?: (x: number, y: number, deltaX: number, deltaY: number) => void;
  
  /**
   * Callback when finger navigation ends
   */
  onNavigationEnd?: () => void;
  
  /**
   * Callback for pinch zoom
   */
  onPinchZoom?: (scale: number, centerX: number, centerY: number) => void;
}

/**
 * Determines the input type from a pointer event
 */
export function getInputType(event: PointerEvent | React.PointerEvent): InputType {
  // Check pointerType first (most reliable)
  if (event.pointerType === 'pen') {
    return 'stylus';
  }
  
  if (event.pointerType === 'touch') {
    // On iOS, check for stylus-specific properties
    // Apple Pencil reports as touch but has pressure > 0 and tiltX/tiltY
    const nativeEvent = 'nativeEvent' in event ? event.nativeEvent : event;
    
    // Apple Pencil always has non-zero pressure when touching
    if (nativeEvent.pressure > 0 && nativeEvent.pressure !== 0.5) {
      // 0.5 is the default pressure for touch on many platforms
      // Apple Pencil typically reports actual pressure values
      
      // Additional check: Apple Pencil has tilt support
      if ('tiltX' in nativeEvent && 'tiltY' in nativeEvent) {
        const tiltX = (nativeEvent as PointerEvent).tiltX;
        const tiltY = (nativeEvent as PointerEvent).tiltY;
        
        // If there's meaningful tilt, it's likely a stylus
        if (Math.abs(tiltX || 0) > 0 || Math.abs(tiltY || 0) > 0) {
          return 'stylus';
        }
      }
      
      // Check width/height - Apple Pencil has very small contact area
      if ('width' in nativeEvent && 'height' in nativeEvent) {
        const width = (nativeEvent as any).width;
        const height = (nativeEvent as any).height;
        
        // Apple Pencil typically has width/height of 1 or very small values
        if (width <= 2 && height <= 2) {
          return 'stylus';
        }
      }
    }
    
    return 'finger';
  }
  
  if (event.pointerType === 'mouse') {
    return 'mouse';
  }
  
  return 'unknown';
}

/**
 * Check if a touch event is from a stylus (for legacy touch events)
 */
export function isTouchFromStylus(touch: Touch): boolean {
  // Check the touchType property (Safari/WebKit)
  if ('touchType' in touch && (touch as any).touchType === 'stylus') {
    return true;
  }
  
  // Check force - stylus typically has force support
  if (touch.force > 0 && touch.force !== 1) {
    // Check radius - stylus has very small contact area
    if (touch.radiusX <= 2 && touch.radiusY <= 2) {
      return true;
    }
  }
  
  return false;
}

/**
 * Hook that provides input type detection and guards drawing to stylus only
 */
export function useStylusInputGuard(options: StylusInputGuardOptions) {
  const {
    pencilOnlyMode,
    onDrawStart,
    onDrawMove,
    onDrawEnd,
    onNavigationStart,
    onNavigationMove,
    onNavigationEnd,
    onPinchZoom,
  } = options;

  const isDrawingRef = useRef(false);
  const isNavigatingRef = useRef(false);
  const currentInputTypeRef = useRef<InputType>('unknown');
  const lastPositionRef = useRef({ x: 0, y: 0 });
  const touchesRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const initialPinchDistanceRef = useRef<number | null>(null);

  /**
   * Check if the input should be allowed to draw
   */
  const canDraw = useCallback((inputType: InputType): boolean => {
    if (!pencilOnlyMode) {
      // In non-pencil-only mode, allow mouse and stylus
      return inputType === 'stylus' || inputType === 'mouse';
    }
    
    // In pencil-only mode, ONLY stylus can draw
    return inputType === 'stylus';
  }, [pencilOnlyMode]);

  /**
   * Handle pointer down event
   */
  const handlePointerDown = useCallback((event: React.PointerEvent) => {
    const inputType = getInputType(event);
    currentInputTypeRef.current = inputType;

    const x = event.clientX;
    const y = event.clientY;
    const pressure = event.pressure || 0.5;

    if (canDraw(inputType)) {
      // Start drawing
      isDrawingRef.current = true;
      isNavigatingRef.current = false;
      lastPositionRef.current = { x, y };
      onDrawStart?.(x, y, pressure, inputType);
      
      // Capture pointer for smooth drawing
      (event.target as HTMLElement)?.setPointerCapture?.(event.pointerId);
    } else if (inputType === 'finger' && pencilOnlyMode) {
      // Finger in pencil-only mode = navigation
      isNavigatingRef.current = true;
      isDrawingRef.current = false;
      lastPositionRef.current = { x, y };
      touchesRef.current.set(event.pointerId, { x, y });
      onNavigationStart?.(x, y);
    }
  }, [canDraw, pencilOnlyMode, onDrawStart, onNavigationStart]);

  /**
   * Handle pointer move event
   */
  const handlePointerMove = useCallback((event: React.PointerEvent) => {
    const inputType = getInputType(event);
    const x = event.clientX;
    const y = event.clientY;
    const pressure = event.pressure || 0.5;

    if (isDrawingRef.current && canDraw(inputType)) {
      onDrawMove?.(x, y, pressure, inputType);
      lastPositionRef.current = { x, y };
    } else if (isNavigatingRef.current && inputType === 'finger') {
      const deltaX = x - lastPositionRef.current.x;
      const deltaY = y - lastPositionRef.current.y;
      
      // Update touch position
      touchesRef.current.set(event.pointerId, { x, y });
      
      // Check for pinch zoom (2+ fingers)
      if (touchesRef.current.size >= 2 && onPinchZoom) {
        const touches = Array.from(touchesRef.current.values());
        const currentDistance = Math.hypot(
          touches[1].x - touches[0].x,
          touches[1].y - touches[0].y
        );
        
        if (initialPinchDistanceRef.current === null) {
          initialPinchDistanceRef.current = currentDistance;
        } else {
          const scale = currentDistance / initialPinchDistanceRef.current;
          const centerX = (touches[0].x + touches[1].x) / 2;
          const centerY = (touches[0].y + touches[1].y) / 2;
          onPinchZoom(scale, centerX, centerY);
        }
      } else {
        onNavigationMove?.(x, y, deltaX, deltaY);
      }
      
      lastPositionRef.current = { x, y };
    }
  }, [canDraw, onDrawMove, onNavigationMove, onPinchZoom]);

  /**
   * Handle pointer up event
   */
  const handlePointerUp = useCallback((event: React.PointerEvent) => {
    const inputType = getInputType(event);
    
    // Release pointer capture
    try {
      (event.target as HTMLElement)?.releasePointerCapture?.(event.pointerId);
    } catch (e) {
      // Ignore - pointer may already be released
    }

    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      onDrawEnd?.(inputType);
    }

    if (isNavigatingRef.current) {
      touchesRef.current.delete(event.pointerId);
      
      if (touchesRef.current.size === 0) {
        isNavigatingRef.current = false;
        initialPinchDistanceRef.current = null;
        onNavigationEnd?.();
      }
    }
  }, [onDrawEnd, onNavigationEnd]);

  /**
   * Handle pointer cancel event
   */
  const handlePointerCancel = useCallback((event: React.PointerEvent) => {
    handlePointerUp(event);
  }, [handlePointerUp]);

  /**
   * Handle pointer leave event
   */
  const handlePointerLeave = useCallback((event: React.PointerEvent) => {
    // Only end if we were actively drawing/navigating
    if (isDrawingRef.current || isNavigatingRef.current) {
      handlePointerUp(event);
    }
  }, [handlePointerUp]);

  return {
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
      onPointerLeave: handlePointerLeave,
    },
    isDrawing: isDrawingRef.current,
    isNavigating: isNavigatingRef.current,
    currentInputType: currentInputTypeRef.current,
    canDraw,
    getInputType,
  };
}

/**
 * Utility to check if current device likely has stylus support
 */
export function hasLikelyStylusSupport(): boolean {
  // Check for iOS/iPadOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  // Check for Windows with pen support
  const isWindowsPen = navigator.maxTouchPoints > 0 && 
    /Windows/.test(navigator.userAgent);
  
  // Check for Android tablets
  const isAndroidTablet = /Android/.test(navigator.userAgent) && 
    navigator.maxTouchPoints > 0 &&
    Math.min(window.screen.width, window.screen.height) > 600;
  
  return isIOS || isWindowsPen || isAndroidTablet;
}
