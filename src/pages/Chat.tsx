import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  MessageSquare,
  Plus,
  Search,
  Settings,
  Trash2,
  Edit3,
  History,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useChatHistory } from "@/providers/ChatHistoryProvider";
import { useArlo } from "@/providers/ArloProvider";

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatDate = (timestamp: string) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleDateString();
};

export default function Chat() {
  const [chatInput, setChatInput] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  const {
    conversations,
    activeConversation,
    activeConversationId,
    setActiveConversation,
    createConversation,
    deleteConversation,
    updateConversationTitle,
    hasPendingPersistence,
  } = useChatHistory();
  const { sendMessage, isLoading } = useArlo();

  useEffect(() => {
    document.title = "Chat – Arlo AI";
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages?.length]);

  const sortedConversations = useMemo(() => conversations, [conversations]);

  const handleChatSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    await sendMessage(trimmed);
    setChatInput("");
  };

  const handleCreateConversation = () => {
    const conversation = createConversation({ setActive: true });
    if (conversation) {
      setShowHistory(false);
      setRenamingId(null);
      setRenameValue("");
    }
  };

  const handleSelectConversation = (conversationId: string) => {
    setActiveConversation(conversationId);
    setShowHistory(false);
    setRenamingId(null);
    setRenameValue("");
  };

  const handleDeleteConversation = (conversationId: string) => {
    deleteConversation(conversationId);
    if (renamingId === conversationId) {
      setRenamingId(null);
      setRenameValue("");
    }
  };

  const handleRenameSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!renamingId) return;
    const newTitle = renameValue.trim() || "New Chat";
    updateConversationTitle(renamingId, newTitle);
    setRenamingId(null);
    setRenameValue("");
  };

  const handleRenameCancel = () => {
    setRenamingId(null);
    setRenameValue("");
  };

  const conversationMessages = activeConversation?.messages ?? [];

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex pt-16">
      {/* Chat History Sidebar */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="w-80 bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl border-r border-white/20 flex flex-col"
          >
            <div className="p-6 border-b border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Chat History</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowHistory(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Button
                onClick={handleCreateConversation}
                className="w-full gap-2 bg-white/50 dark:bg-gray-800/50 hover:bg-white/70 dark:hover:bg-gray-700/70"
              >
                <Plus className="h-4 w-4" />
                New Chat
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {sortedConversations.map((conversation) => (
                <motion.div
                  key={conversation.id}
                  layout
                  className={`group p-3 rounded-lg cursor-pointer transition-all ${
                    conversation.id === activeConversationId
                      ? "bg-primary/20 border border-primary/30"
                      : "bg-white/40 dark:bg-gray-800/40 hover:bg-white/60 dark:hover:bg-gray-700/60"
                  }`}
                  onClick={() => handleSelectConversation(conversation.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {renamingId === conversation.id ? (
                        <form
                          onSubmit={handleRenameSubmit}
                          className="space-y-2"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Input
                            value={renameValue}
                            autoFocus
                            onChange={(event) => setRenameValue(event.target.value)}
                            onClick={(event) => event.stopPropagation()}
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              type="submit"
                              size="sm"
                              onClick={(event) => event.stopPropagation()}
                            >
                              Save
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleRenameCancel();
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <h3 className="font-medium text-sm truncate">
                            {conversation.title}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {conversation.messages.length} messages
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(conversation.updatedAt)}
                          </p>
                        </>
                      )}
                    </div>
                    {renamingId !== conversation.id && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(event) => {
                            event.stopPropagation();
                            setRenamingId(conversation.id);
                            setRenameValue(conversation.title);
                          }}
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteConversation(conversation.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl border-b border-white/20 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowHistory(!showHistory)}
                className="bg-white/50 dark:bg-gray-800/50"
              >
                <History className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/50 dark:bg-gray-800/50">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="font-semibold">
                    {activeConversation?.title ?? "New Chat"}
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {conversationMessages.length} messages
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hasPendingPersistence && (
                <Badge variant="outline" className="animate-pulse">
                  Saving history…
                </Badge>
              )}
              <Button
                variant="outline"
                onClick={handleCreateConversation}
                className="gap-2 bg-white/50 dark:bg-gray-800/50"
              >
                <Plus className="h-4 w-4" />
                New Chat
              </Button>
              <Button variant="outline" size="icon" className="bg-white/50 dark:bg-gray-800/50">
                <Search className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="bg-white/50 dark:bg-gray-800/50">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {conversationMessages.length === 0 && (
              <Card className="bg-white/60 dark:bg-gray-800/60 border-white/20">
                <CardContent className="py-12 text-center text-muted-foreground space-y-2">
                  <p>Your conversation history will appear here once you send a message.</p>
                  <p className="text-sm">
                    Use the floating chat bar or the composer below to talk to Arlo.
                  </p>
                </CardContent>
              </Card>
            )}

            {conversationMessages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.05, 0.3) }}
                className={`flex items-start gap-4 ${
                  message.sender === "user" ? "flex-row-reverse" : ""
                }`}
              >
                <Avatar className="h-8 w-8 bg-white/50 dark:bg-gray-800/50 border border-white/20">
                  <AvatarFallback className="text-xs">
                    {message.sender === "user" ? "U" : "A"}
                  </AvatarFallback>
                </Avatar>

                <div
                  className={`max-w-[70%] ${
                    message.sender === "user" ? "text-right" : "text-left"
                  }`}
                >
                  <div
                    className={`p-4 rounded-2xl ${
                      message.sender === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/20"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.text}</p>
                    {message.status !== "sent" && (
                      <div className="mt-3 flex items-center gap-2 text-xs">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            message.status === "pending"
                              ? "bg-amber-400 animate-pulse"
                              : "bg-destructive"
                          }`}
                        />
                        <span className="opacity-80">
                          {message.status === "pending" ? "Pending" : "Failed"}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 px-2">
                    {formatTimestamp(message.timestamp)}
                  </p>
                </div>
              </motion.div>
            ))}

            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-4"
              >
                <Avatar className="h-8 w-8 bg-white/50 dark:bg-gray-800/50 border border-white/20">
                  <AvatarFallback className="text-xs">A</AvatarFallback>
                </Avatar>
                <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/20 rounded-2xl p-4">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <div
                      className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={endRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl border-t border-white/20 p-6">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleChatSubmit} className="flex gap-3">
              <div className="flex-1 relative">
                <Input
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  placeholder="Message Arlo..."
                  className="w-full bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-white/20 pr-12"
                  disabled={isLoading}
                />
              </div>
              <Button
                type="submit"
                disabled={!chatInput.trim() || isLoading}
                className="px-6"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
