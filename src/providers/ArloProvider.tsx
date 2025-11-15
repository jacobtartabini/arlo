import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import { useChatHistory } from './ChatHistoryProvider';
import { ChatMessageStatus } from '@/types/chat';

export interface ArloConfig {
  apiEndpoint: string;
  apiToken: string;
}

export interface ArloStatus {
  uptime: number;
  memory: number;
  cpu: number;
  modules: string[];
  isConnected: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  status: ChatMessageStatus;
  conversationId: string;
}

interface ArloContextType {
  config: ArloConfig;
  setConfig: (config: ArloConfig) => void;
  status: ArloStatus | null;
  isConnected: boolean;
  isLoading: boolean;
  messages: ChatMessage[];
  sendMessage: (content: string) => Promise<void>;
  sendVoiceMessage: (audioBlob: Blob) => Promise<void>;
  checkConnection: () => Promise<boolean>;
  refreshStatus: () => Promise<void>;
  restartArlo: () => Promise<void>;
  latestWeatherUpdate: WeatherUpdate | null;
  latestMapUpdate: MapUpdate | null;
}

const ArloContext = createContext<ArloContextType | undefined>(undefined);

const DEFAULT_CONFIG: ArloConfig = {
  apiEndpoint: localStorage.getItem('arlo-api-endpoint') || 'http://100.64.0.1:8080',
  apiToken: localStorage.getItem('arlo-api-token') || '',
};

const WS_PATH = '/ws';

type SocketMessage = Record<string, unknown>;

const getString = (payload: SocketMessage, key: string) => {
  const value = payload[key];
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return value.toString();
  }
  return null;
};

const getBoolean = (payload: SocketMessage, key: string) => {
  const value = payload[key];
  return typeof value === 'boolean' ? value : null;
};

const getObject = <T extends object>(payload: SocketMessage, key: string) => {
  const value = payload[key];
  if (value && typeof value === 'object') {
    return value as T;
  }
  return null;
};

export interface WeatherUpdate {
  location: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  description: string;
  [key: string]: unknown;
}

export interface MapUpdate {
  start: string;
  end: string;
  distance: string;
  duration: string;
  route: string;
  mapUrl?: string;
  [key: string]: unknown;
}

export function ArloProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfigState] = useState<ArloConfig>(DEFAULT_CONFIG);
  const [status, setStatus] = useState<ArloStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [latestWeatherUpdate, setLatestWeatherUpdate] = useState<WeatherUpdate | null>(null);
  const [latestMapUpdate, setLatestMapUpdate] = useState<MapUpdate | null>(null);
  const {
    activeConversation,
    appendMessage,
    ensureActiveConversation,
    updateMessageStatus,
  } = useChatHistory();

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const pendingMessagesRef = useRef(new Set<string>());
  const outboundMessageMapRef = useRef(
    new Map<string, { conversationId: string; messageId: string }>(),
  );
  const fallbackTimeoutsRef = useRef(new Map<string, number>());
  const streamingReplyMapRef = useRef(
    new Map<string, { conversationId: string; messageId: string }>(),
  );
  const streamingBufferRef = useRef(new Map<string, string>());
  const isUnmountingRef = useRef(false);

  const messages = useMemo<ChatMessage[]>(
    () =>
      (activeConversation?.messages ?? []).map((message) => ({
        id: message.id,
        role: message.sender === 'user' ? 'user' : 'assistant',
        content: message.text,
        timestamp: new Date(message.timestamp),
        status: message.status,
        conversationId: message.conversationId,
      })),
    [activeConversation],
  );

  const setConfig = (newConfig: ArloConfig) => {
    setConfigState(newConfig);
    localStorage.setItem('arlo-api-endpoint', newConfig.apiEndpoint);
    localStorage.setItem('arlo-api-token', newConfig.apiToken);
  };

  const makeApiCall = useCallback(
    async (endpoint: string, options: RequestInit = {}) => {
      const url = `${config.apiEndpoint}${endpoint}`;
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiToken}`,
        ...options.headers,
      };

      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }

      return response.json();
    },
    [config.apiEndpoint, config.apiToken],
  );

  const updateLoadingState = useCallback(() => {
    setIsLoading(pendingMessagesRef.current.size > 0);
  }, []);

  const clearMessageFallbackTimeout = useCallback((messageId: string) => {
    if (typeof window === 'undefined') {
      return;
    }

    const timeoutId = fallbackTimeoutsRef.current.get(messageId);
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      fallbackTimeoutsRef.current.delete(messageId);
    }
  }, []);

  const completePendingMessage = useCallback(
    (messageId: string) => {
      clearMessageFallbackTimeout(messageId);
      if (pendingMessagesRef.current.delete(messageId)) {
        updateLoadingState();
      }
    },
    [clearMessageFallbackTimeout, updateLoadingState],
  );

  const flushPendingMessages = useCallback(
    (status: ChatMessageStatus = 'error') => {
      const pendingIds = Array.from(pendingMessagesRef.current);
      pendingMessagesRef.current.clear();
      for (const messageId of pendingIds) {
        clearMessageFallbackTimeout(messageId);
        const record = outboundMessageMapRef.current.get(messageId);
        if (record) {
          updateMessageStatus(record.conversationId, record.messageId, status);
          outboundMessageMapRef.current.delete(messageId);
        }
      }
      updateLoadingState();
    },
    [clearMessageFallbackTimeout, updateLoadingState, updateMessageStatus],
  );

  const deriveWebSocketUrl = useMemo(() => {
    try {
      if (!config.apiEndpoint) {
        return null;
      }
      const url = new URL(config.apiEndpoint);
      const normalizedPath = url.pathname.endsWith('/')
        ? url.pathname.slice(0, -1)
        : url.pathname;
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      url.pathname = `${normalizedPath}${WS_PATH}`;
      return url.toString();
    } catch (error) {
      console.error('Failed to derive WebSocket URL', error);
      return null;
    }
  }, [config.apiEndpoint]);

  const handleChatAck = useCallback(
    (payload: SocketMessage) => {
      const identifier =
        getString(payload, 'messageId') ??
        getString(payload, 'clientMessageId') ??
        getString(payload, 'id');
      if (!identifier) {
        return;
      }

      const record = outboundMessageMapRef.current.get(identifier);
      if (!record) {
        return;
      }

      const timestamp = getString(payload, 'timestamp') ?? new Date().toISOString();
      updateMessageStatus(record.conversationId, record.messageId, 'sent', {
        timestamp,
      });
      outboundMessageMapRef.current.delete(identifier);
      clearMessageFallbackTimeout(identifier);
      completePendingMessage(identifier);
    },
    [clearMessageFallbackTimeout, completePendingMessage, updateMessageStatus],
  );

  const finalizePendingForConversation = useCallback(
    (conversationId: string, timestamp?: string) => {
      const pending = Array.from(outboundMessageMapRef.current.entries());
      for (const [key, value] of pending) {
        if (value.conversationId === conversationId) {
          updateMessageStatus(conversationId, value.messageId, 'sent', {
            timestamp: timestamp ?? new Date().toISOString(),
          });
          outboundMessageMapRef.current.delete(key);
          completePendingMessage(key);
          break;
        }
      }
    },
    [completePendingMessage, updateMessageStatus],
  );

  const handleStreamingChunk = useCallback(
    (payload: SocketMessage) => {
      const conversationId = getString(payload, 'conversationId');
      const replyId =
        getString(payload, 'replyId') ??
        getString(payload, 'messageId') ??
        getString(payload, 'id');
      if (!conversationId || !replyId) {
        return;
      }

      const delta =
        getString(payload, 'delta') ?? getString(payload, 'text') ?? '';
      const bufferKey = replyId.toString();
      const existing = streamingReplyMapRef.current.get(bufferKey);

      if (!existing) {
        const message = appendMessage({
          conversationId,
          id: replyId,
          text: delta,
          sender: 'arlo',
          status: getBoolean(payload, 'done') ? 'sent' : 'pending',
        });
        streamingReplyMapRef.current.set(bufferKey, {
          conversationId,
          messageId: message.id,
        });
        streamingBufferRef.current.set(bufferKey, delta ?? '');
      } else {
        const previous = streamingBufferRef.current.get(bufferKey) ?? '';
        const combined = `${previous}${delta ?? ''}`;
        streamingBufferRef.current.set(bufferKey, combined);
        updateMessageStatus(existing.conversationId, existing.messageId, getBoolean(payload, 'done') ? 'sent' : 'pending', {
          text: combined,
          timestamp: new Date().toISOString(),
        });
      }

      if (getBoolean(payload, 'done')) {
        const mapping = streamingReplyMapRef.current.get(bufferKey);
        if (mapping) {
          const combined = streamingBufferRef.current.get(bufferKey) ?? '';
          updateMessageStatus(mapping.conversationId, mapping.messageId, 'sent', {
            text: combined,
            timestamp: new Date().toISOString(),
          });
          streamingReplyMapRef.current.delete(bufferKey);
          streamingBufferRef.current.delete(bufferKey);
          const sourceId =
            getString(payload, 'replyTo') ??
            getString(payload, 'requestId') ??
            getString(payload, 'sourceId');
          if (sourceId) {
            const requestKey = sourceId.toString();
            const pendingRecord = outboundMessageMapRef.current.get(requestKey);
            if (pendingRecord) {
              updateMessageStatus(
                pendingRecord.conversationId,
                pendingRecord.messageId,
                'sent',
                {
                  timestamp: new Date().toISOString(),
                },
              );
              outboundMessageMapRef.current.delete(requestKey);
            }
            completePendingMessage(requestKey);
          } else {
            finalizePendingForConversation(conversationId, new Date().toISOString());
          }
        }
      }
    },
    [
      appendMessage,
      completePendingMessage,
      finalizePendingForConversation,
      updateMessageStatus,
    ],
  );

  const handleChatReply = useCallback(
    (payload: SocketMessage) => {
      const conversationId =
        getString(payload, 'conversationId') ?? activeConversation?.id;
      if (!conversationId) {
        return;
      }

      const replyId =
        getString(payload, 'replyId') ??
        getString(payload, 'messageId') ??
        getString(payload, 'id');
      const text =
        getString(payload, 'text') ?? getString(payload, 'reply') ?? '';
      const timestamp = getString(payload, 'timestamp') ?? new Date().toISOString();

      if (replyId) {
        const streamingEntry = streamingReplyMapRef.current.get(replyId.toString());
        if (streamingEntry) {
          updateMessageStatus(streamingEntry.conversationId, streamingEntry.messageId, 'sent', {
            text,
            timestamp,
          });
          streamingReplyMapRef.current.delete(replyId.toString());
          streamingBufferRef.current.delete(replyId.toString());
        } else {
          appendMessage({
            conversationId,
            id: replyId,
            text,
            sender: 'arlo',
            status: 'sent',
            timestamp,
          });
        }
      } else {
        appendMessage({
          conversationId,
          text,
          sender: 'arlo',
          status: 'sent',
          timestamp,
        });
      }

      const responseKey =
        getString(payload, 'replyTo') ??
        getString(payload, 'requestId') ??
        getString(payload, 'sourceId') ??
        getString(payload, 'messageId');
      if (responseKey) {
        const key = responseKey.toString();
        const pendingRecord = outboundMessageMapRef.current.get(key);
        if (pendingRecord) {
          updateMessageStatus(conversationId, pendingRecord.messageId, 'sent', {
            timestamp,
          });
          outboundMessageMapRef.current.delete(key);
        }
        clearMessageFallbackTimeout(key);
        completePendingMessage(key);
      } else {
        finalizePendingForConversation(conversationId, timestamp);
      }
    },
    [
      activeConversation?.id,
      appendMessage,
      clearMessageFallbackTimeout,
      completePendingMessage,
      finalizePendingForConversation,
      updateMessageStatus,
    ],
  );

  const handleChatError = useCallback(
    (payload: SocketMessage) => {
      const messageId =
        getString(payload, 'messageId') ??
        getString(payload, 'requestId') ??
        getString(payload, 'id');
      const conversationId =
        getString(payload, 'conversationId') ?? activeConversation?.id;

      if (messageId && conversationId) {
        updateMessageStatus(conversationId, messageId, 'error');
        completePendingMessage(messageId);
        clearMessageFallbackTimeout(messageId);
      }

      const errorMessage = getString(payload, 'error');
      if (errorMessage) {
        toast.error(errorMessage);
      }
    },
    [
      activeConversation?.id,
      clearMessageFallbackTimeout,
      completePendingMessage,
      updateMessageStatus,
    ],
  );

  const handleSocketMessage = useCallback(
    (event: MessageEvent) => {
      let rawPayload: unknown = null;
      try {
        rawPayload = JSON.parse(event.data as string);
      } catch (error) {
        console.warn('Received non-JSON WebSocket message', event.data);
        return;
      }

      if (!rawPayload || typeof rawPayload !== 'object') {
        return;
      }

      const payload = rawPayload as SocketMessage;
      const type = getString(payload, 'type');

      switch (type) {
        case 'status':
        case 'system_status':
          {
            const data = getObject<ArloStatus>(payload, 'data');
            if (data) {
              setStatus(data);
            }
          }
          setIsConnected(true);
          break;
        case 'chat_ack':
        case 'message_ack':
          handleChatAck(payload);
          break;
        case 'chat_chunk':
        case 'chat_reply_chunk':
        case 'chat_partial':
          handleStreamingChunk(payload);
          break;
        case 'chat_reply':
        case 'chat_response':
        case 'assistant_message':
          handleChatReply(payload);
          break;
        case 'chat_complete':
          {
            const replyTo = getString(payload, 'replyTo');
            if (replyTo) {
              completePendingMessage(replyTo.toString());
            }
          }
          break;
        case 'chat_error':
          handleChatError(payload);
          break;
        case 'weather_update':
          {
            const data = getObject<WeatherUpdate>(payload, 'data');
            if (data) {
              setLatestWeatherUpdate(data);
            }
          }
          break;
        case 'map_update':
          {
            const data = getObject<MapUpdate>(payload, 'data');
            if (data) {
              setLatestMapUpdate(data);
            }
          }
          break;
        default:
          break;
      }
    },
    [
      completePendingMessage,
      handleChatAck,
      handleChatError,
      handleChatReply,
      handleStreamingChunk,
    ],
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!deriveWebSocketUrl || !config.apiToken) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      flushPendingMessages('error');
      return;
    }

    isUnmountingRef.current = false;

    const connect = () => {
      if (!deriveWebSocketUrl || typeof window === 'undefined') {
        return;
      }

      try {
        const url = new URL(deriveWebSocketUrl);
        if (config.apiToken) {
          url.searchParams.set('token', config.apiToken);
        }

        const socket = new WebSocket(url.toString());
        socketRef.current = socket;

        const handleOpen = () => {
          reconnectAttemptsRef.current = 0;
          setIsConnected(true);
        };

        const handleClose = () => {
          socket.removeEventListener('message', handleSocketMessage);
          socket.removeEventListener('open', handleOpen);
          socket.removeEventListener('close', handleClose);
          socket.removeEventListener('error', handleError);

          if (isUnmountingRef.current) {
            return;
          }

          setIsConnected(false);

          flushPendingMessages('error');

          const attempt = reconnectAttemptsRef.current + 1;
          reconnectAttemptsRef.current = attempt;
          const delay = Math.min(30000, 1000 * 2 ** (attempt - 1));

          if (reconnectTimeoutRef.current) {
            window.clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = window.setTimeout(connect, delay);
        };

        const handleError = (event: Event) => {
          console.error('WebSocket error', event);
          socket.close();
        };

        socket.addEventListener('open', handleOpen);
        socket.addEventListener('message', handleSocketMessage);
        socket.addEventListener('close', handleClose);
        socket.addEventListener('error', handleError);
      } catch (error) {
        console.error('Failed to establish WebSocket connection', error);
      }
    };

    connect();

    return () => {
      isUnmountingRef.current = true;
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [
    config.apiToken,
    deriveWebSocketUrl,
    flushPendingMessages,
    handleSocketMessage,
  ]);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      await makeApiCall('/status');
      setIsConnected(true);
      return true;
    } catch (error) {
      setIsConnected(false);
      return false;
    }
  }, [makeApiCall]);

  const refreshStatus = async () => {
    try {
      const statusData = await makeApiCall('/status');
      setStatus(statusData);
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to fetch status:', error);
      setIsConnected(false);
      toast.error('Failed to connect to Arlo');
    }
  };

  const sendMessageOverHttp = useCallback(
    async (conversationId: string, messageId: string, text: string) => {
      try {
        const response = await makeApiCall('/ask', {
          method: 'POST',
          body: JSON.stringify({ message: text }),
        });

        updateMessageStatus(conversationId, messageId, 'sent');

        appendMessage({
          conversationId,
          text: response.reply,
          sender: 'arlo',
          status: 'sent',
        });
      } catch (error) {
        console.error('Failed to send message:', error);
        updateMessageStatus(conversationId, messageId, 'error');
        toast.error('Failed to send message to Arlo');
      } finally {
        completePendingMessage(messageId);
      }
    },
    [appendMessage, completePendingMessage, makeApiCall, updateMessageStatus],
  );

  const scheduleHttpFallback = useCallback(
    (conversationId: string, messageId: string, text: string) => {
      if (typeof window === 'undefined') {
        return;
      }

      clearMessageFallbackTimeout(messageId);

      const timeoutId = window.setTimeout(() => {
        fallbackTimeoutsRef.current.delete(messageId);
        if (!outboundMessageMapRef.current.has(messageId)) {
          return;
        }

        outboundMessageMapRef.current.delete(messageId);
        void sendMessageOverHttp(conversationId, messageId, text);
      }, 3000);

      fallbackTimeoutsRef.current.set(messageId, timeoutId);
    },
    [clearMessageFallbackTimeout, sendMessageOverHttp],
  );

  const sendMessage = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) {
      return;
    }

    const conversationId = ensureActiveConversation();
    const userMessage = appendMessage({
      conversationId,
      text: trimmed,
      sender: 'user',
      status: 'pending',
    });

    pendingMessagesRef.current.add(userMessage.id);
    updateLoadingState();

    const socket = socketRef.current;
    const socketReady = socket && socket.readyState === WebSocket.OPEN;

    if (socketReady) {
      try {
        const payload = {
          type: 'chat_prompt',
          conversationId,
          messageId: userMessage.id,
          text: trimmed,
          message: trimmed,
          prompt: trimmed,
        };
        socket!.send(JSON.stringify(payload));
        outboundMessageMapRef.current.set(userMessage.id, {
          conversationId,
          messageId: userMessage.id,
        });
        scheduleHttpFallback(conversationId, userMessage.id, trimmed);
        return;
      } catch (error) {
        console.error('WebSocket send failed, falling back to HTTP', error);
      }
    }

    await sendMessageOverHttp(conversationId, userMessage.id, trimmed);
  };

  const sendVoiceMessage = async (audioBlob: Blob) => {
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.wav');

      const response = await fetch(`${config.apiEndpoint}/voice`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Voice message failed');
      }

      const result = await response.json();
      const conversationId = ensureActiveConversation();

      appendMessage({
        conversationId,
        text: result.transcription,
        sender: 'user',
        status: 'sent',
      });

      appendMessage({
        conversationId,
        text: result.reply,
        sender: 'arlo',
        status: 'sent',
      });
    } catch (error) {
      console.error('Failed to send voice message:', error);
      toast.error('Failed to send voice message to Arlo');
    } finally {
      setIsLoading(false);
    }
  };

  const restartArlo = async () => {
    try {
      await makeApiCall('/admin/restart', {
        method: 'POST',
      });
      toast.success('Arlo restart initiated');
      setTimeout(refreshStatus, 5000); // Check status after 5 seconds
    } catch (error) {
      console.error('Failed to restart Arlo:', error);
      toast.error('Failed to restart Arlo');
    }
  };

  useEffect(() => {
    if (config.apiEndpoint && config.apiToken) {
      checkConnection();
    }
  }, [checkConnection, config.apiEndpoint, config.apiToken]);

  const value: ArloContextType = {
    config,
    setConfig,
    status,
    isConnected,
    isLoading,
    messages,
    sendMessage,
    sendVoiceMessage,
    checkConnection,
    refreshStatus,
    restartArlo,
    latestWeatherUpdate,
    latestMapUpdate,
  };

  return (
    <ArloContext.Provider value={value}>
      {children}
    </ArloContext.Provider>
  );
}

export const useArlo = () => {
  const context = useContext(ArloContext);
  if (context === undefined) {
    throw new Error('useArlo must be used within an ArloProvider');
  }
  return context;
};