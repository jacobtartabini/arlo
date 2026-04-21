import { useState, useRef, useCallback, useEffect } from 'react';
import { PorcupineWorker } from '@picovoice/porcupine-web';
import { getAuthHeaders } from '@/lib/arloAuth';

interface UsePorcupineWakeWordOptions {
  onWakeWordDetected: () => void;
  enabled?: boolean;
}

// Porcupine model - loaded from public/ for CSP compatibility
const PORCUPINE_MODEL = {
  publicPath: '/porcupine_params.pv',
  forceWrite: false,
};

// Custom "Hey Arlo" wake word trained in Picovoice Console
const HEY_ARLO_KEYWORD = {
  publicPath: '/hey-arlo.ppn',
  label: 'Hey Arlo',
  sensitivity: 0.7,
};

export function usePorcupineWakeWord({ onWakeWordDetected, enabled = false }: UsePorcupineWakeWordOptions) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  // Picovoice's free tier enforces a monthly activation cap. Once we hit it
  // there's no point retrying for the rest of the session — it will keep
  // failing with the same error and waste auth requests + mic prompts.
  const quotaExhaustedRef = useRef(false);
  
  const porcupineRef = useRef<PorcupineWorker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);

  const cleanup = useCallback(() => {
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current.port.close();
      workletNodeRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (porcupineRef.current) {
      porcupineRef.current.terminate();
      porcupineRef.current = null;
    }
    setIsListening(false);
  }, []);

  const start = useCallback(async () => {
    if (porcupineRef.current || isInitializing) return;
    if (quotaExhaustedRef.current) return;

    setIsInitializing(true);
    setError(null);

    try {
      // Fetch the AccessKey from the edge function with proper auth headers
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${supabaseUrl}/functions/v1/porcupine-key`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to get Picovoice key: ${response.status}`);
      }

      const keyData = await response.json();
      
      if (!keyData?.accessKey) {
        throw new Error('No access key returned from server');
      }

      console.log('[Porcupine] Got access key, initializing...');

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          channelCount: 1, 
          sampleRate: 16000 
        } 
      });
      streamRef.current = stream;

      // Create Porcupine with custom "Hey Arlo" wake word
      porcupineRef.current = await PorcupineWorker.create(
        keyData.accessKey,
        [HEY_ARLO_KEYWORD],
        (detection) => {
          console.log('[Porcupine] Wake word detected:', detection);
          onWakeWordDetected();
        },
        PORCUPINE_MODEL
      );

      // Set up audio processing with AudioWorklet
      const sampleRate = porcupineRef.current.sampleRate;
      const frameLength = porcupineRef.current.frameLength;
      audioContextRef.current = new AudioContext({ sampleRate });
      
      // Load the AudioWorklet processor module
      await audioContextRef.current.audioWorklet.addModule('/porcupine-processor.js');
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      // Create AudioWorkletNode with frame length option
      workletNodeRef.current = new AudioWorkletNode(
        audioContextRef.current,
        'porcupine-processor',
        {
          processorOptions: { frameLength }
        }
      );
      
      // Handle messages from the worklet (audio frames)
      workletNodeRef.current.port.onmessage = (event) => {
        if (!porcupineRef.current) return;
        
        if (event.data.type === 'frame') {
          try {
            porcupineRef.current.process(event.data.data);
          } catch (e) {
            console.error('[Porcupine] Process error:', e);
          }
        }
      };

      source.connect(workletNodeRef.current);
      // Connect to destination to keep the worklet running
      workletNodeRef.current.connect(audioContextRef.current.destination);

      setIsListening(true);
      console.log('[Porcupine] Wake word detection started with AudioWorklet');
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const errorName = e instanceof Error ? e.name : '';
      const isQuotaError =
        errorName.includes('ActivationLimitReached') ||
        errorName.includes('ActivationRefused') ||
        errorName.includes('ActivationThrottled') ||
        message.includes('ActivationLimitReached') ||
        message.includes('AccessKey') && message.includes('limit');

      if (isQuotaError) {
        quotaExhaustedRef.current = true;
        console.warn('[Porcupine] Wake word disabled: Picovoice activation quota reached for this AccessKey. "Hey Arlo" will be unavailable until the quota resets or a new key is configured.');
        setError('Wake word quota reached. Voice activation paused.');
      } else {
        console.error('[Porcupine] Initialization error:', e);
        setError(message || 'Failed to initialize wake word detection');
      }
      cleanup();
    } finally {
      setIsInitializing(false);
    }
  }, [cleanup, isInitializing, onWakeWordDetected]);

  const stop = useCallback(() => {
    console.log('[Porcupine] Stopping wake word detection');
    cleanup();
  }, [cleanup]);

  // Auto-start/stop based on enabled prop
  useEffect(() => {
    if (enabled && !isListening && !isInitializing) {
      start();
    } else if (!enabled && isListening) {
      stop();
    }
  }, [enabled, isListening, isInitializing, start, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isListening,
    isInitializing,
    error,
    start,
    stop,
  };
}
