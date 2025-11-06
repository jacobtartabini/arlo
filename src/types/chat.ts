export type ChatSender = "user" | "arlo";

export type ChatMessageStatus = "pending" | "sent" | "error";

export interface ConversationMessage {
  id: string;
  conversationId: string;
  text: string;
  sender: ChatSender;
  timestamp: string;
  status: ChatMessageStatus;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ConversationMessage[];
}
