import { useCallback } from 'react';
import { dataApiHelpers } from '@/lib/data-api';
import { Conversation, ConversationMessage, ChatSender, ChatMessageStatus } from '@/types/chat';

export interface DbConversation {
  id: string;
  user_id: string;
  title: string;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  content: string;
  sender: string;
  status: string;
  created_at: string;
}

// Transform DB conversation to app Conversation
export const dbToConversation = (
  dbConv: DbConversation, 
  messages: DbMessage[]
): Conversation => ({
  id: dbConv.id,
  title: dbConv.title,
  createdAt: dbConv.created_at,
  updatedAt: dbConv.updated_at,
  folderId: dbConv.folder_id,
  messages: messages
    .filter(m => m.conversation_id === dbConv.id)
    .map(dbToMessage)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
});

// Transform DB message to app ConversationMessage
export const dbToMessage = (dbMsg: DbMessage): ConversationMessage => ({
  id: dbMsg.id,
  conversationId: dbMsg.conversation_id,
  text: dbMsg.content,
  sender: dbMsg.sender as ChatSender,
  timestamp: dbMsg.created_at,
  status: dbMsg.status as ChatMessageStatus,
});

export function useChatPersistence(isAuthenticated: boolean) {
  // Fetch all conversations with messages
  const fetchConversations = useCallback(async (): Promise<Conversation[]> => {
    if (!isAuthenticated) return [];

    try {
      const { data: conversations, error: convError } = await dataApiHelpers.select<DbConversation[]>('conversations', {
        order: { column: 'updated_at', ascending: false },
      });

      if (convError || !conversations || conversations.length === 0) {
        if (convError) console.error('Error fetching conversations:', convError);
        return [];
      }

      const conversationIds = conversations.map(c => c.id);
      const { data: messages, error: msgError } = await dataApiHelpers.selectWithIn<DbMessage[]>(
        'conversation_messages',
        'conversation_id',
        conversationIds,
        { column: 'created_at', ascending: true }
      );

      if (msgError) {
        console.error('Error fetching messages:', msgError);
        return conversations.map(c => dbToConversation(c, []));
      }

      return conversations.map(c => dbToConversation(c, messages || []));
    } catch (error) {
      console.error('Error in fetchConversations:', error);
      return [];
    }
  }, [isAuthenticated]);

  const createConversation = useCallback(async (
    title: string = 'New Chat',
    id?: string,
  ): Promise<Conversation | null> => {
    if (!isAuthenticated) return null;

    try {
      const payload: Record<string, unknown> = { title };
      if (id) payload.id = id;
      const { data, error } = await dataApiHelpers.insert<DbConversation>('conversations', payload);

      if (error || !data) {
        console.error('Error creating conversation:', error);
        return null;
      }

      return dbToConversation(data, []);
    } catch (error) {
      console.error('Error in createConversation:', error);
      return null;
    }
  }, [isAuthenticated]);

  const updateConversationTitle = useCallback(async (conversationId: string, title: string): Promise<boolean> => {
    if (!isAuthenticated) return false;

    try {
      const { error } = await dataApiHelpers.update('conversations', conversationId, { title });
      if (error) {
        console.error('Error updating conversation:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error in updateConversationTitle:', error);
      return false;
    }
  }, [isAuthenticated]);

  const deleteConversation = useCallback(async (conversationId: string): Promise<boolean> => {
    if (!isAuthenticated) return false;

    try {
      const { error } = await dataApiHelpers.delete('conversations', conversationId);
      if (error) {
        console.error('Error deleting conversation:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error in deleteConversation:', error);
      return false;
    }
  }, [isAuthenticated]);

  const addMessage = useCallback(async (
    conversationId: string,
    content: string,
    sender: ChatSender,
    status: ChatMessageStatus = 'sent',
    id?: string,
  ): Promise<ConversationMessage | null> => {
    if (!isAuthenticated) return null;

    try {
      const payload: Record<string, unknown> = {
        conversation_id: conversationId,
        content,
        sender,
        status,
      };
      if (id) payload.id = id;
      const { data, error } = await dataApiHelpers.insert<DbMessage>('conversation_messages', payload);

      if (error || !data) {
        console.error('Error adding message:', error);
        return null;
      }

      // Update conversation's updated_at
      await dataApiHelpers.update('conversations', conversationId, {
        updated_at: new Date().toISOString(),
      });

      return dbToMessage(data);
    } catch (error) {
      console.error('Error in addMessage:', error);
      return null;
    }
  }, [isAuthenticated]);

  const updateMessageStatus = useCallback(async (
    messageId: string,
    status: ChatMessageStatus,
    content?: string
  ): Promise<boolean> => {
    if (!isAuthenticated) return false;

    try {
      const updates: { status: string; content?: string } = { status };
      if (content !== undefined) updates.content = content;

      const { error } = await dataApiHelpers.update('conversation_messages', messageId, updates);
      if (error) {
        console.error('Error updating message:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error in updateMessageStatus:', error);
      return false;
    }
  }, [isAuthenticated]);

  return {
    fetchConversations,
    createConversation,
    updateConversationTitle,
    deleteConversation,
    addMessage,
    updateMessageStatus,
  };
}
