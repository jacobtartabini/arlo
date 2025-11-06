import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
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
}

const ArloContext = createContext<ArloContextType | undefined>(undefined);

const DEFAULT_CONFIG: ArloConfig = {
  apiEndpoint: localStorage.getItem('arlo-api-endpoint') || 'http://100.64.0.1:8080',
  apiToken: localStorage.getItem('arlo-api-token') || '',
};

export function ArloProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfigState] = useState<ArloConfig>(DEFAULT_CONFIG);
  const [status, setStatus] = useState<ArloStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const {
    activeConversation,
    appendMessage,
    ensureActiveConversation,
    updateMessageStatus,
  } = useChatHistory();

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

  const makeApiCall = async (endpoint: string, options: RequestInit = {}) => {
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
  };

  const checkConnection = async (): Promise<boolean> => {
    try {
      await makeApiCall('/status');
      setIsConnected(true);
      return true;
    } catch (error) {
      setIsConnected(false);
      return false;
    }
  };

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

  const sendMessage = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) {
      return;
    }

    setIsLoading(true);

    const conversationId = ensureActiveConversation();
    const userMessage = appendMessage({
      conversationId,
      text: trimmed,
      sender: 'user',
      status: 'pending',
    });

    try {
      const response = await makeApiCall('/ask', {
        method: 'POST',
        body: JSON.stringify({ message: trimmed }),
      });

      updateMessageStatus(conversationId, userMessage.id, 'sent');

      appendMessage({
        conversationId,
        text: response.reply,
        sender: 'arlo',
        status: 'sent',
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      updateMessageStatus(userMessage.conversationId, userMessage.id, 'error');
      toast.error('Failed to send message to Arlo');
    } finally {
      setIsLoading(false);
    }
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
  }, [config]);

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