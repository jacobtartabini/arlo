import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import {
  Conversation,
  ConversationMessage,
  ChatMessageStatus,
  ChatSender,
} from "@/types/chat";
import { useChatPersistence } from "@/hooks/useChatPersistence";

interface InitialMessageInput {
  id?: string;
  text: string;
  sender: ChatSender;
  timestamp?: string;
  status?: ChatMessageStatus;
}

interface CreateConversationOptions {
  id?: string;
  title?: string;
  initialMessages?: InitialMessageInput[];
  setActive?: boolean;
}

interface AppendMessageInput {
  conversationId?: string;
  id?: string;
  text: string;
  sender: ChatSender;
  timestamp?: string;
  status?: ChatMessageStatus;
}

interface UpdateMessageOverrides {
  text?: string;
  timestamp?: string;
}

interface ChatHistoryContextValue {
  conversations: Conversation[];
  activeConversationId: string | null;
  activeConversation: Conversation | null;
  hasPendingPersistence: boolean;
  isLoading: boolean;
  createConversation: (options?: CreateConversationOptions) => Conversation;
  ensureActiveConversation: () => string;
  appendMessage: (input: AppendMessageInput) => ConversationMessage;
  updateMessageStatus: (
    conversationId: string,
    messageId: string,
    status: ChatMessageStatus,
    overrides?: UpdateMessageOverrides,
  ) => void;
  updateMessageText: (
    conversationId: string,
    messageId: string,
    text: string,
  ) => void;
  updateConversationTitle: (conversationId: string, title: string) => void;
  setActiveConversation: (conversationId: string | null) => void;
  deleteConversation: (conversationId: string) => void;
  getConversationById: (conversationId: string) => Conversation | undefined;
}

const STORAGE_KEY = "arlo.chat.history";
const ACTIVE_STORAGE_KEY = "arlo.chat.activeConversation";

const ChatHistoryContext = createContext<ChatHistoryContextValue | undefined>(
  undefined,
);

const generateId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

// Check legacy auth flags for backward compatibility
function checkAuthFromSession(): boolean {
  if (typeof window === 'undefined') return false;
  const verified = sessionStorage.getItem('arlo_access_verified') === 'true';
  const expiry = sessionStorage.getItem('arlo_access_verified_expiry');
  return verified && !!expiry && Date.now() < parseInt(expiry);
}

// LocalStorage helpers for fallback
const loadLocalConversations = (): Conversation[] => {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Conversation[];
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  } catch {
    return [];
  }
};

const loadActiveConversationId = (): string | null => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_STORAGE_KEY);
};

const sortConversations = (conversations: Conversation[]) =>
  [...conversations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

const sortMessages = (messages: ConversationMessage[]) =>
  [...messages].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

const generateConversationTitle = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return "New Chat";
  return trimmed.length > 40 ? `${trimmed.slice(0, 40)}...` : trimmed;
};

export function ChatHistoryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationIdState] = useState<string | null>(null);
  const [hasPendingPersistence, setHasPendingPersistence] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Check legacy flags for backward compatibility
  const isAuthenticated = (() => {
    if (typeof window === 'undefined') return false;
    const verified = sessionStorage.getItem('arlo_access_verified') === 'true';
    const expiry = sessionStorage.getItem('arlo_access_verified_expiry');
    return verified && !!expiry && Date.now() < parseInt(expiry);
  })();
  
  const pendingDbOperationsRef = useRef<Set<string>>(new Set());
  const dbPersistence = useChatPersistence(isAuthenticated);

  // Load conversations based on auth state
  useEffect(() => {
    if (isInitialized) return;

    const loadData = async () => {
      setIsLoading(true);

      if (isAuthenticated) {
        // Load from database via edge function
        const dbConversations = await dbPersistence.fetchConversations();
        setConversations(dbConversations);
        
        // Load active conversation from localStorage (for session persistence)
        const savedActiveId = loadActiveConversationId();
        if (savedActiveId && dbConversations.some(c => c.id === savedActiveId)) {
          setActiveConversationIdState(savedActiveId);
        } else if (dbConversations.length > 0) {
          setActiveConversationIdState(dbConversations[0].id);
        }
      } else {
        // Fallback to localStorage for unauthenticated users
        const localConversations = loadLocalConversations();
        setConversations(localConversations);
        
        const savedActiveId = loadActiveConversationId();
        if (savedActiveId && localConversations.some(c => c.id === savedActiveId)) {
          setActiveConversationIdState(savedActiveId);
        } else if (localConversations.length > 0) {
          setActiveConversationIdState(localConversations[0].id);
        }
      }

      setIsLoading(false);
      setIsInitialized(true);
    };

    loadData();
  }, [isAuthenticated, isInitialized, dbPersistence]);

  // LocalStorage persistence for fallback
  const persistToLocalStorage = useCallback((data: Conversation[]) => {
    if (typeof window === "undefined") return true;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }, []);

  const setActiveConversationInternal = useCallback(
    (conversationId: string | null) => {
      setActiveConversationIdState(conversationId);
      if (typeof window === "undefined") return;
      if (conversationId) {
        window.localStorage.setItem(ACTIVE_STORAGE_KEY, conversationId);
      } else {
        window.localStorage.removeItem(ACTIVE_STORAGE_KEY);
      }
    },
    [],
  );

  const getConversationById = useCallback(
    (conversationId: string) =>
      conversations.find((conversation) => conversation.id === conversationId),
    [conversations],
  );

  const createConversation = useCallback(
    (options?: CreateConversationOptions) => {
      const id = options?.id ?? generateId();
      const now = new Date().toISOString();
      const title = options?.title ?? "New Chat";
      
      const preparedMessages: ConversationMessage[] = (options?.initialMessages?.map((message) => ({
        id: message.id ?? generateId(),
        conversationId: id,
        text: message.text,
        sender: message.sender,
        timestamp: message.timestamp ?? now,
        status: message.status ?? "sent",
      })) ?? []) as ConversationMessage[];

      const updatedAt = preparedMessages[preparedMessages.length - 1]?.timestamp ?? now;

      const conversation: Conversation = {
        id,
        title,
        createdAt: now,
        updatedAt,
        folderId: null,
        messages: sortMessages(preparedMessages),
      };

      setConversations((previous) => {
        const next = sortConversations([...previous, conversation]);
        if (!isAuthenticated) {
          persistToLocalStorage(next);
        }
        return next;
      });

      // Persist to database if authenticated
      if (isAuthenticated) {
        dbPersistence.createConversation(title).then((dbConv) => {
          if (dbConv) {
            // Update local state with DB-assigned ID if different
            setConversations((prev) => {
              return prev.map((c) => 
                c.id === id ? { ...c, id: dbConv.id } : c
              );
            });
            if (options?.setActive !== false) {
              setActiveConversationInternal(dbConv.id);
            }
          }
        });
      }

      if (options?.setActive !== false) {
        setActiveConversationInternal(id);
      }

      return conversation;
    },
    [isAuthenticated, persistToLocalStorage, setActiveConversationInternal, dbPersistence],
  );

  const ensureActiveConversation = useCallback(() => {
    if (activeConversationId) {
      const exists = conversations.some(
        (conversation) => conversation.id === activeConversationId,
      );
      if (exists) return activeConversationId;
    }

    if (conversations.length > 0) {
      const fallbackId = conversations[0].id;
      setActiveConversationInternal(fallbackId);
      return fallbackId;
    }

    const newConversation = createConversation({ setActive: true });
    return newConversation.id;
  }, [
    activeConversationId,
    conversations,
    createConversation,
    setActiveConversationInternal,
  ]);

  const appendMessage = useCallback(
    (input: AppendMessageInput) => {
      const conversationId = input.conversationId ?? ensureActiveConversation();
      const timestamp = input.timestamp ?? new Date().toISOString();
      const messageId = input.id ?? generateId();

      const message: ConversationMessage = {
        id: messageId,
        conversationId,
        text: input.text,
        sender: input.sender,
        timestamp,
        status: input.status ?? "pending",
      };

      setConversations((previous) => {
        let conversationFound = false;
        const updated = previous.map((conversation) => {
          if (conversation.id !== conversationId) return conversation;
          conversationFound = true;

          const updatedMessages = sortMessages([...conversation.messages, message]);
          const shouldRename =
            conversation.title === "New Chat" &&
            input.sender === "user" &&
            conversation.messages.length === 0;

          return {
            ...conversation,
            messages: updatedMessages,
            updatedAt: timestamp,
            title: shouldRename
              ? generateConversationTitle(input.text)
              : conversation.title,
          };
        });

        const next = conversationFound
          ? updated
          : [
              ...previous,
              {
                id: conversationId,
                title:
                  input.sender === "user"
                    ? generateConversationTitle(input.text)
                    : "New Chat",
                createdAt: timestamp,
                updatedAt: timestamp,
                folderId: null,
                messages: [message],
              },
            ];

        const sortedConversations = sortConversations(next);
        if (!isAuthenticated) {
          persistToLocalStorage(sortedConversations);
        }
        return sortedConversations;
      });

      // Persist to database
      if (isAuthenticated) {
        pendingDbOperationsRef.current.add(messageId);
        dbPersistence.addMessage(
          conversationId,
          input.text,
          input.sender,
          input.status ?? "pending"
        ).then((dbMsg) => {
          pendingDbOperationsRef.current.delete(messageId);
          if (dbMsg && dbMsg.id !== messageId) {
            // Update local message with DB ID
            setConversations((prev) =>
              prev.map((conv) =>
                conv.id === conversationId
                  ? {
                      ...conv,
                      messages: conv.messages.map((m) =>
                        m.id === messageId ? { ...m, id: dbMsg.id } : m
                      ),
                    }
                  : conv
              )
            );
          }
        });

        // Update conversation title if needed
        const conversation = conversations.find(c => c.id === conversationId);
        if (conversation?.title === "New Chat" && input.sender === "user") {
          const newTitle = generateConversationTitle(input.text);
          dbPersistence.updateConversationTitle(conversationId, newTitle);
        }
      }

      setActiveConversationInternal(conversationId);
      return message;
    },
    [
      ensureActiveConversation,
      isAuthenticated,
      persistToLocalStorage,
      setActiveConversationInternal,
      dbPersistence,
      conversations,
    ],
  );

  const updateMessageStatus = useCallback(
    (
      conversationId: string,
      messageId: string,
      status: ChatMessageStatus,
      overrides?: UpdateMessageOverrides,
    ) => {
      setConversations((previous) => {
        const updated = previous.map((conversation) => {
          if (conversation.id !== conversationId) return conversation;

          let didUpdate = false;
          const updatedMessages = conversation.messages.map((message) => {
            if (message.id !== messageId) return message;
            didUpdate = true;
            return {
              ...message,
              status,
              text: overrides?.text ?? message.text,
              timestamp: overrides?.timestamp ?? message.timestamp,
            };
          });

          if (!didUpdate) return conversation;

          return {
            ...conversation,
            messages: sortMessages(updatedMessages),
            updatedAt: overrides?.timestamp ?? conversation.updatedAt,
          };
        });

        if (!isAuthenticated) {
          persistToLocalStorage(updated);
        }
        return sortConversations(updated);
      });

      // Persist to database
      if (isAuthenticated) {
        dbPersistence.updateMessageStatus(messageId, status, overrides?.text);
      }
    },
    [isAuthenticated, persistToLocalStorage, dbPersistence],
  );

  const updateMessageText = useCallback(
    (conversationId: string, messageId: string, text: string) => {
      setConversations((previous) => {
        const updated = previous.map((conversation) => {
          if (conversation.id !== conversationId) return conversation;

          const updatedMessages = conversation.messages.map((message) =>
            message.id === messageId ? { ...message, text } : message
          );

          return {
            ...conversation,
            messages: sortMessages(updatedMessages),
            updatedAt: new Date().toISOString(),
          };
        });

        if (!isAuthenticated) {
          persistToLocalStorage(updated);
        }
        return sortConversations(updated);
      });

      // Persist to database
      if (isAuthenticated) {
        dbPersistence.updateMessageStatus(messageId, 'sent', text);
      }
    },
    [isAuthenticated, persistToLocalStorage, dbPersistence],
  );

  const updateConversationTitle = useCallback(
    (conversationId: string, title: string) => {
      setConversations((previous) => {
        const updated = previous.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, title }
            : conversation,
        );
        if (!isAuthenticated) {
          persistToLocalStorage(updated);
        }
        return sortConversations(updated);
      });

      // Persist to database
      if (isAuthenticated) {
        dbPersistence.updateConversationTitle(conversationId, title);
      }
    },
    [isAuthenticated, persistToLocalStorage, dbPersistence],
  );

  const deleteConversation = useCallback(
    (conversationId: string) => {
      setConversations((previous) => {
        const next = previous.filter(
          (conversation) => conversation.id !== conversationId,
        );
        if (!isAuthenticated) {
          persistToLocalStorage(next);
        }

        if (activeConversationId === conversationId) {
          const fallbackId = next[0]?.id ?? null;
          setActiveConversationInternal(fallbackId);
        }

        return sortConversations(next);
      });

      // Persist to database
      if (isAuthenticated) {
        dbPersistence.deleteConversation(conversationId);
      }
    },
    [
      isAuthenticated,
      persistToLocalStorage,
      activeConversationId,
      setActiveConversationInternal,
      dbPersistence,
    ],
  );

  const activeConversation = useMemo(
    () =>
      activeConversationId
        ? conversations.find((c) => c.id === activeConversationId) ?? null
        : null,
    [activeConversationId, conversations],
  );

  const contextValue = useMemo<ChatHistoryContextValue>(
    () => ({
      conversations,
      activeConversationId,
      activeConversation,
      hasPendingPersistence: pendingDbOperationsRef.current.size > 0,
      isLoading,
      createConversation,
      ensureActiveConversation,
      appendMessage,
      updateMessageStatus,
      updateMessageText,
      updateConversationTitle,
      setActiveConversation: setActiveConversationInternal,
      deleteConversation,
      getConversationById,
    }),
    [
      conversations,
      activeConversationId,
      activeConversation,
      isLoading,
      createConversation,
      ensureActiveConversation,
      appendMessage,
      updateMessageStatus,
      updateMessageText,
      updateConversationTitle,
      setActiveConversationInternal,
      deleteConversation,
      getConversationById,
    ],
  );

  return (
    <ChatHistoryContext.Provider value={contextValue}>
      {children}
    </ChatHistoryContext.Provider>
  );
}

export function useChatHistory() {
  const context = useContext(ChatHistoryContext);
  if (context === undefined) {
    throw new Error("useChatHistory must be used within a ChatHistoryProvider");
  }
  return context;
}
