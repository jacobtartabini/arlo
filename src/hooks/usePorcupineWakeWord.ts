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
  
  const porcupineRef = useRef<PorcupineWorker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const cleanup = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
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

      // Set up audio processing
      const sampleRate = porcupineRef.current.sampleRate;
      audioContextRef.current = new AudioContext({ sampleRate });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      // Buffer audio frames for Porcupine
      const frameLength = porcupineRef.current.frameLength;
      let audioBuffer: number[] = [];
      
      // Use ScriptProcessor for audio processing
      processorRef.current = audioContextRef.current.createScriptProcessor(512, 1, 1);
      
      processorRef.current.onaudioprocess = (event) => {
        if (!porcupineRef.current) return;
        
        const inputData = event.inputBuffer.getChannelData(0);
        
        // Convert Float32Array to Int16 and buffer
        for (let i = 0; i < inputData.length; i++) {
          audioBuffer.push(Math.max(-32768, Math.min(32767, Math.round(inputData[i] * 32768))));
        }
        
        // Process complete frames
        while (audioBuffer.length >= frameLength) {
          const frame = new Int16Array(audioBuffer.slice(0, frameLength));
          audioBuffer = audioBuffer.slice(frameLength);
          
          try {
            porcupineRef.current.process(frame);
          } catch (e) {
            console.error('[Porcupine] Process error:', e);
          }
        }
      };

      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      setIsListening(true);
      console.log('[Porcupine] Wake word detection started');
    } catch (e) {
      console.error('[Porcupine] Initialization error:', e);
      setError(e instanceof Error ? e.message : 'Failed to initialize wake word detection');
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
