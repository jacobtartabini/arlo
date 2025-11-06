import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Conversation,
  ConversationMessage,
  ChatMessageStatus,
  ChatSender,
} from "@/types/chat";

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
  createConversation: (options?: CreateConversationOptions) => Conversation;
  ensureActiveConversation: () => string;
  appendMessage: (input: AppendMessageInput) => ConversationMessage;
  updateMessageStatus: (
    conversationId: string,
    messageId: string,
    status: ChatMessageStatus,
    overrides?: UpdateMessageOverrides,
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

const loadConversations = (): Conversation[] => {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as Conversation[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((conversation) => ({
        ...conversation,
        messages: (conversation.messages ?? []).map((message) => ({
          ...message,
        })),
      }))
      .sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  } catch (error) {
    console.error("Failed to parse chat history from storage", error);
    return [];
  }
};

const loadActiveConversationId = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }
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
  if (!trimmed) {
    return "New Chat";
  }
  return trimmed.length > 40 ? `${trimmed.slice(0, 40)}...` : trimmed;
};

export function ChatHistoryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [conversations, setConversations] = useState<Conversation[]>(
    () => loadConversations(),
  );
  const [activeConversationId, setActiveConversationIdState] =
    useState<string | null>(() => loadActiveConversationId());
  const [hasPendingPersistence, setHasPendingPersistence] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const persistConversations = useCallback((data: Conversation[]) => {
    if (typeof window === "undefined") {
      return true;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error("Failed to persist chat history", error);
      return false;
    }
  }, []);

  const setActiveConversationInternal = useCallback(
    (conversationId: string | null) => {
      setActiveConversationIdState(conversationId);
      if (typeof window === "undefined") {
        return;
      }
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
      const preparedMessages: ConversationMessage[] = (options?.initialMessages
        ?.map((message) => ({
          id: message.id ?? generateId(),
          conversationId: id,
          text: message.text,
          sender: message.sender,
          timestamp: message.timestamp ?? now,
          status: message.status ?? "sent",
        })) ?? []) as ConversationMessage[];

      const updatedAt =
        preparedMessages[preparedMessages.length - 1]?.timestamp ?? now;

      const conversation: Conversation = {
        id,
        title: options?.title ?? "New Chat",
        createdAt: now,
        updatedAt,
        messages: sortMessages(preparedMessages),
      };

      setConversations((previous) => {
        const next = sortConversations([...previous, conversation]);
        const persisted = persistConversations(next);
        if (!persisted) {
          setHasPendingPersistence(true);
        } else {
          setHasPendingPersistence(false);
        }
        return next;
      });

      if (options?.setActive !== false) {
        setActiveConversationInternal(id);
      }

      return conversation;
    },
    [persistConversations, setActiveConversationInternal],
  );

  const ensureActiveConversation = useCallback(() => {
    if (activeConversationId) {
      const exists = conversations.some(
        (conversation) => conversation.id === activeConversationId,
      );
      if (exists) {
        return activeConversationId;
      }
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
          if (conversation.id !== conversationId) {
            return conversation;
          }
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
                messages: [message],
              },
            ];

        const sortedConversations = sortConversations(next);
        const persisted = persistConversations(sortedConversations);
        if (!persisted) {
          setHasPendingPersistence(true);
        } else {
          setHasPendingPersistence(false);
        }
        return sortedConversations;
      });

      setActiveConversationInternal(conversationId);

      return message;
    },
    [
      ensureActiveConversation,
      persistConversations,
      setActiveConversationInternal,
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
          if (conversation.id !== conversationId) {
            return conversation;
          }

          let didUpdate = false;
          const updatedMessages = conversation.messages.map((message) => {
            if (message.id !== messageId) {
              return message;
            }
            didUpdate = true;
            return {
              ...message,
              status,
              text: overrides?.text ?? message.text,
              timestamp: overrides?.timestamp ?? message.timestamp,
            };
          });

          if (!didUpdate) {
            return conversation;
          }

          return {
            ...conversation,
            messages: sortMessages(updatedMessages),
            updatedAt: overrides?.timestamp ?? conversation.updatedAt,
          };
        });

        const persisted = persistConversations(updated);
        if (!persisted) {
          setHasPendingPersistence(true);
        } else {
          setHasPendingPersistence(false);
        }
        return sortConversations(updated);
      });
    },
    [persistConversations],
  );

  const updateConversationTitle = useCallback(
    (conversationId: string, title: string) => {
      setConversations((previous) => {
        const updated = previous.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, title }
            : conversation,
        );
        const persisted = persistConversations(updated);
        if (!persisted) {
          setHasPendingPersistence(true);
        } else {
          setHasPendingPersistence(false);
        }
        return sortConversations(updated);
      });
    },
    [persistConversations],
  );

  const deleteConversation = useCallback(
    (conversationId: string) => {
      setConversations((previous) => {
        const next = previous.filter(
          (conversation) => conversation.id !== conversationId,
        );
        const persisted = persistConversations(next);
        if (!persisted) {
          setHasPendingPersistence(true);
        } else {
          setHasPendingPersistence(false);
        }

        if (activeConversationId === conversationId) {
          const fallbackId = next[0]?.id ?? null;
          setActiveConversationInternal(fallbackId ?? null);
        }

        return sortConversations(next);
      });
    },
    [
      activeConversationId,
      persistConversations,
      setActiveConversationInternal,
    ],
  );

  const setActiveConversation = useCallback(
    (conversationId: string | null) => {
      if (!conversationId) {
        setActiveConversationInternal(null);
        return;
      }
      const exists = conversations.some(
        (conversation) => conversation.id === conversationId,
      );
      if (exists) {
        setActiveConversationInternal(conversationId);
      }
    },
    [conversations, setActiveConversationInternal],
  );

  useEffect(() => {
    if (isInitialized) {
      return;
    }
    if (conversations.length === 0) {
      createConversation({ setActive: true });
      setIsInitialized(true);
      return;
    }

    const activeExists = activeConversationId
      ? conversations.some(
          (conversation) => conversation.id === activeConversationId,
        )
      : false;
    if (!activeExists) {
      setActiveConversationInternal(conversations[0].id);
    }
    setIsInitialized(true);
  }, [
    activeConversationId,
    conversations,
    createConversation,
    isInitialized,
    setActiveConversationInternal,
  ]);

  useEffect(() => {
    if (!hasPendingPersistence) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const timeout = window.setTimeout(() => {
      setConversations((previous) => {
        const success = persistConversations(previous);
        if (success) {
          setHasPendingPersistence(false);
        }
        return previous;
      });
    }, 2000);

    return () => window.clearTimeout(timeout);
  }, [hasPendingPersistence, persistConversations]);

  const activeConversation = useMemo(() => {
    if (!activeConversationId) {
      return null;
    }
    return (
      conversations.find(
        (conversation) => conversation.id === activeConversationId,
      ) ?? null
    );
  }, [activeConversationId, conversations]);

  const value = useMemo<ChatHistoryContextValue>(
    () => ({
      conversations,
      activeConversationId,
      activeConversation,
      hasPendingPersistence,
      createConversation,
      ensureActiveConversation,
      appendMessage,
      updateMessageStatus,
      updateConversationTitle,
      setActiveConversation,
      deleteConversation,
      getConversationById,
    }),
    [
      appendMessage,
      conversations,
      activeConversation,
      activeConversationId,
      createConversation,
      deleteConversation,
      ensureActiveConversation,
      getConversationById,
      hasPendingPersistence,
      setActiveConversation,
      updateConversationTitle,
      updateMessageStatus,
    ],
  );

  return (
    <ChatHistoryContext.Provider value={value}>
      {children}
    </ChatHistoryContext.Provider>
  );
}

export const useChatHistory = () => {
  const context = useContext(ChatHistoryContext);
  if (context === undefined) {
    throw new Error("useChatHistory must be used within a ChatHistoryProvider");
  }
  return context;
};
