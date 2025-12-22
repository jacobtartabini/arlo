import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Conversation, ConversationMessage, ChatSender, ChatMessageStatus } from '@/types/chat';

export interface DbConversation {
  id: string;
  user_id: string;
  title: string;
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

export function useChatPersistence(userId: string | null) {
  // Fetch all conversations with messages
  const fetchConversations = useCallback(async (): Promise<Conversation[]> => {
    if (!userId) return [];

    try {
      // Fetch conversations
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (convError) {
        console.error('Error fetching conversations:', convError);
        return [];
      }

      if (!conversations || conversations.length === 0) {
        return [];
      }

      // Fetch all messages for these conversations
      const conversationIds = conversations.map(c => c.id);
      const { data: messages, error: msgError } = await supabase
        .from('conversation_messages')
        .select('*')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: true });

      if (msgError) {
        console.error('Error fetching messages:', msgError);
        return conversations.map(c => dbToConversation(c, []));
      }

      return conversations.map(c => dbToConversation(c, messages || []));
    } catch (error) {
      console.error('Error in fetchConversations:', error);
      return [];
    }
  }, [userId]);

  // Create a new conversation
  const createConversation = useCallback(async (
    title: string = 'New Chat'
  ): Promise<Conversation | null> => {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: userId,
          title,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating conversation:', error);
        return null;
      }

      return dbToConversation(data, []);
    } catch (error) {
      console.error('Error in createConversation:', error);
      return null;
    }
  }, [userId]);

  // Update conversation title
  const updateConversationTitle = useCallback(async (
    conversationId: string, 
    title: string
  ): Promise<boolean> => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('conversations')
        .update({ title })
        .eq('id', conversationId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating conversation:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateConversationTitle:', error);
      return false;
    }
  }, [userId]);

  // Delete conversation (cascade deletes messages)
  const deleteConversation = useCallback(async (conversationId: string): Promise<boolean> => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting conversation:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteConversation:', error);
      return false;
    }
  }, [userId]);

  // Add a message to a conversation
  const addMessage = useCallback(async (
    conversationId: string,
    content: string,
    sender: ChatSender,
    status: ChatMessageStatus = 'sent'
  ): Promise<ConversationMessage | null> => {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('conversation_messages')
        .insert({
          conversation_id: conversationId,
          user_id: userId,
          content,
          sender,
          status,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding message:', error);
        return null;
      }

      // Update conversation's updated_at
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      return dbToMessage(data);
    } catch (error) {
      console.error('Error in addMessage:', error);
      return null;
    }
  }, [userId]);

  // Update message status
  const updateMessageStatus = useCallback(async (
    messageId: string,
    status: ChatMessageStatus,
    content?: string
  ): Promise<boolean> => {
    if (!userId) return false;

    try {
      const updates: { status: string; content?: string } = { status };
      if (content !== undefined) {
        updates.content = content;
      }

      const { error } = await supabase
        .from('conversation_messages')
        .update(updates)
        .eq('id', messageId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating message:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateMessageStatus:', error);
      return false;
    }
  }, [userId]);

  return {
    fetchConversations,
    createConversation,
    updateConversationTitle,
    deleteConversation,
    addMessage,
    updateMessageStatus,
  };
}
