"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  MessageSquare,
  ArrowUp,
  Paperclip,
  ChevronLeft,
  ChevronRight,
  Folder,
  Menu,
  X,
  Mic,
  MicOff,
  FileImage,
  FileText,
  Globe,
  Telescope,
  Bot,
  ShoppingBag,
  GraduationCap,
  Trash2,
  Edit2,
  Check,
  Loader2,
} from "lucide-react";
import { useArlo } from "@/providers/ArloProvider";
import { useChatHistory } from "@/providers/ChatHistoryProvider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Types for speech recognition
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// Custom Hook for auto-resizing textarea
function useAutoResizeTextarea({
  minHeight,
  maxHeight,
}: {
  minHeight: number;
  maxHeight?: number;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      textarea.style.height = `${minHeight}px`;
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Number.POSITIVE_INFINITY)
      );

      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = `${minHeight}px`;
    }
  }, [minHeight]);

  useEffect(() => {
    const handleResize = () => adjustHeight();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [adjustHeight]);

  return { textareaRef, adjustHeight };
}

// Main Chat Component
export default function Chat() {
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 48,
    maxHeight: 200,
  });

  // Get chat functionality from providers
  const { messages, sendMessage, isLoading } = useArlo();
  const {
    conversations,
    activeConversationId,
    setActiveConversation,
    createConversation,
    deleteConversation,
    updateConversationTitle,
  } = useChatHistory();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput("");
    adjustHeight(true);
    setShowPlusMenu(false);

    await sendMessage(message);
  };

  // Handle creating a new chat
  const handleNewChat = () => {
    createConversation({ setActive: true });
    setShowPlusMenu(false);
  };

  // Handle selecting a conversation
  const handleSelectConversation = (conversationId: string) => {
    setActiveConversation(conversationId);
  };

  // Handle deleting a conversation
  const handleDeleteConversation = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    deleteConversation(conversationId);
    toast.success("Conversation deleted");
  };

  // Handle renaming a conversation
  const handleStartRename = (e: React.MouseEvent, conversation: { id: string; title: string }) => {
    e.stopPropagation();
    setRenamingId(conversation.id);
    setRenameValue(conversation.title);
  };

  const handleRenameSubmit = (e: React.FormEvent, conversationId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (renameValue.trim()) {
      updateConversationTitle(conversationId, renameValue.trim());
      toast.success("Conversation renamed");
    }
    setRenamingId(null);
    setRenameValue("");
  };

  const handleRenameCancel = () => {
    setRenamingId(null);
    setRenameValue("");
  };

  // Voice recording with Web Speech API
  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      toast.error("Speech recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput((prev) => prev + transcript);
      adjustHeight();
    };

    recognition.onerror = (event: { error: string }) => {
      console.error("Speech recognition error:", event.error);
      toast.error("Voice input error: " + event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    toast.info("Listening...");
  };

  // Filter conversations based on search
  const filteredConversations = conversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get unique folders from conversations (using mock data structure)
  const folders = ["Work", "Personal", "Research"];

  // Format timestamp for display
  const formatTime = (timestamp: Date | string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full border-r border-border bg-card/50 flex flex-col overflow-hidden"
          >
            {/* Search & New Chat */}
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search chats..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-muted/30 border-0 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
                  />
                </div>
                <button
                  onClick={handleNewChat}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title="New Chat"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Folders & Chats */}
            <div className="flex-1 overflow-y-auto px-2 pb-2">
              {/* Folders Section */}
              <div className="mb-4">
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Folders
                </div>
                {folders.map((folder) => (
                  <button
                    key={folder}
                    className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 rounded-lg text-sm transition-colors"
                  >
                    <Folder className="w-4 h-4 text-muted-foreground" />
                    {folder}
                  </button>
                ))}
              </div>

              {/* Chats Section */}
              <div>
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Recent Chats
                </div>
                {filteredConversations
                  .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                  .map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv.id)}
                      className={cn(
                        "group w-full flex items-center gap-2 px-2 py-2 hover:bg-muted/50 rounded-lg text-sm transition-colors cursor-pointer",
                        activeConversationId === conv.id && "bg-muted"
                      )}
                    >
                      <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 text-left truncate">
                        {renamingId === conv.id ? (
                          <form
                            onSubmit={(e) => handleRenameSubmit(e, conv.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1"
                          >
                            <input
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              className="flex-1 bg-background px-1 py-0.5 rounded text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                              autoFocus
                              onBlur={handleRenameCancel}
                            />
                            <button
                              type="submit"
                              className="p-0.5 hover:bg-muted rounded"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          </form>
                        ) : (
                          <span className="font-medium truncate block">{conv.title}</span>
                        )}
                      </div>
                      {renamingId !== conv.id && (
                        <div className="hidden group-hover:flex items-center gap-1">
                          <button
                            onClick={(e) => handleStartRename(e, conv)}
                            className="p-1 hover:bg-muted rounded transition-colors"
                            title="Rename"
                          >
                            <Edit2 className="w-3 h-3 text-muted-foreground" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteConversation(e, conv.id)}
                            className="p-1 hover:bg-destructive/20 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                {filteredConversations.length === 0 && (
                  <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                    No conversations yet
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
          <div className="font-medium text-foreground">Arlo</div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md px-4">
                <div className="text-3xl font-semibold text-foreground mb-2">
                  Let's Get Started.
                </div>
                <p className="text-muted-foreground">
                  Ask me anything or use the + menu for special actions like web search, image creation, and more.
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto py-6 px-4 space-y-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] px-4 py-3 rounded-2xl",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <div
                      className={cn(
                        "text-xs mt-1 opacity-60",
                        message.role === "user" ? "text-right" : "text-left"
                      )}
                    >
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-muted px-4 py-3 rounded-2xl flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Arlo is thinking...</span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-border p-4">
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <div className="relative flex items-center bg-muted/50 rounded-2xl border border-border focus-within:ring-1 focus-within:ring-ring transition-all">
                <button
                  onClick={() => setShowPlusMenu(!showPlusMenu)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-muted/50 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                >
                  <Plus className="w-5 h-5" />
                </button>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    adjustHeight();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ask anything"
                  className="w-full px-14 py-3.5 bg-transparent resize-none focus:outline-none text-sm placeholder:text-muted-foreground/60 leading-tight"
                  style={{ minHeight: "48px", maxHeight: "200px" }}
                  rows={1}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    onClick={toggleRecording}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      isRecording
                        ? "bg-destructive text-destructive-foreground"
                        : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                    )}
                    title={isRecording ? "Stop recording" : "Start voice input"}
                  >
                    {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isLoading}
                    className={cn(
                      "p-2 rounded-full transition-all",
                      input.trim() && !isLoading
                        ? "bg-foreground text-background hover:bg-foreground/90"
                        : "bg-muted/50 text-muted-foreground/40 cursor-not-allowed"
                    )}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Plus Menu */}
              <AnimatePresence>
                {showPlusMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full mb-2 left-0 bg-card border border-border rounded-2xl shadow-xl p-2 min-w-[240px] z-50"
                  >
                    <button
                      onClick={() => {
                        toast.info("File upload coming soon!");
                        setShowPlusMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted rounded-lg transition-colors text-left text-sm"
                    >
                      <Paperclip className="w-4 h-4 text-muted-foreground" />
                      <span>Add photos & files</span>
                    </button>
                    <button
                      onClick={() => {
                        toast.info("Add sources coming soon!");
                        setShowPlusMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted rounded-lg transition-colors text-left text-sm"
                    >
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span>Add sources</span>
                    </button>
                    <button
                      onClick={() => {
                        setInput("Help me study and learn about ");
                        adjustHeight();
                        setShowPlusMenu(false);
                        textareaRef.current?.focus();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted rounded-lg transition-colors text-left text-sm"
                    >
                      <GraduationCap className="w-4 h-4 text-muted-foreground" />
                      <span>Study and learn</span>
                    </button>
                    <button
                      onClick={() => {
                        setInput("Search the web for ");
                        adjustHeight();
                        setShowPlusMenu(false);
                        textareaRef.current?.focus();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted rounded-lg transition-colors text-left text-sm"
                    >
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <span>Web search</span>
                    </button>
                    <button
                      onClick={() => {
                        setInput("Create an image of ");
                        adjustHeight();
                        setShowPlusMenu(false);
                        textareaRef.current?.focus();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted rounded-lg transition-colors text-left text-sm"
                    >
                      <FileImage className="w-4 h-4 text-muted-foreground" />
                      <span>Create image</span>
                    </button>
                    <button
                      onClick={() => {
                        setInput("Do deep research on ");
                        adjustHeight();
                        setShowPlusMenu(false);
                        textareaRef.current?.focus();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted rounded-lg transition-colors text-left text-sm"
                    >
                      <Telescope className="w-4 h-4 text-muted-foreground" />
                      <span>Deep research</span>
                    </button>
                    <button
                      onClick={() => {
                        setInput("Help me shop for ");
                        adjustHeight();
                        setShowPlusMenu(false);
                        textareaRef.current?.focus();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted rounded-lg transition-colors text-left text-sm"
                    >
                      <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                      <span>Shopping research</span>
                    </button>
                    <button
                      onClick={() => {
                        toast.info("Agent mode coming soon!");
                        setShowPlusMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted rounded-lg transition-colors text-left text-sm"
                    >
                      <Bot className="w-4 h-4 text-muted-foreground" />
                      <span>Agent mode</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
