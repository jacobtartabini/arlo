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
  Folder,
  Menu,
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
  Image as ImageIcon,
  Pencil,
  X,
} from "lucide-react";
import { useArlo } from "@/providers/ArloProvider";
import { useChatHistory } from "@/providers/ChatHistoryProvider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";
import { FileUpload, useFileUpload, type UploadedFile } from "@/components/chat/FileUpload";
import { MessageAttachments } from "@/components/chat/MessageAttachments";

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

// Extended message type with attachments
interface MessageWithAttachments {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: UploadedFile[];
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
  const [localAttachments, setLocalAttachments] = useState<Record<string, UploadedFile[]>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 48,
    maxHeight: 200,
  });

  // File upload hook
  const { files, setFiles, clearFiles } = useFileUpload();

  // Get chat functionality from providers
  const { messages, sendMessage, isLoading } = useArlo();
  const {
    conversations,
    activeConversationId,
    setActiveConversation,
    createConversation,
    deleteConversation,
    updateConversationTitle,
    updateMessageText,
  } = useChatHistory();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle sending a message
  const handleSendMessage = async () => {
    if ((!input.trim() && files.length === 0) || isLoading) return;

    const message = input.trim();
    const currentFiles = [...files];
    
    setInput("");
    adjustHeight(true);
    setShowPlusMenu(false);
    clearFiles();

    // Store attachments locally for this message
    if (currentFiles.length > 0) {
      const tempId = `temp-${Date.now()}`;
      setLocalAttachments(prev => ({
        ...prev,
        [tempId]: currentFiles,
      }));
    }

    // Build message with file references
    let fullMessage = message;
    if (currentFiles.length > 0) {
      const fileDescriptions = currentFiles.map(f => 
        f.type === 'image' 
          ? `[Attached image: ${f.name}](${f.url})`
          : `[Attached file: ${f.name}](${f.url})`
      ).join('\n');
      fullMessage = fullMessage ? `${fullMessage}\n\n${fileDescriptions}` : fileDescriptions;
    }

    await sendMessage(fullMessage);
  };

  // Handle creating a new chat
  const handleNewChat = () => {
    createConversation({ setActive: true });
    setShowPlusMenu(false);
    clearFiles();
  };

  // Handle selecting a conversation
  const handleSelectConversation = (conversationId: string) => {
    setActiveConversation(conversationId);
    clearFiles();
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

  // Message editing handlers
  const handleStartEditMessage = (messageId: string, content: string) => {
    // Extract just the text content (remove attachment references)
    const { text } = parseMessageAttachments(content);
    setEditingMessageId(messageId);
    setEditingContent(text);
  };

  const handleSaveEditMessage = (messageId: string) => {
    if (!editingContent.trim() || !activeConversationId) {
      setEditingMessageId(null);
      setEditingContent("");
      return;
    }
    
    updateMessageText(activeConversationId, messageId, editingContent.trim());
    toast.success("Message updated");
    setEditingMessageId(null);
    setEditingContent("");
  };

  const handleCancelEditMessage = () => {
    setEditingMessageId(null);
    setEditingContent("");
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

  // Handle file input change
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const MAX_FILE_SIZE = 20 * 1024 * 1024;
    const MAX_FILES = 10;

    if (files.length + selectedFiles.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files allowed`);
      return;
    }

    const oversizedFiles = selectedFiles.filter(f => f.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      toast.error("Some files exceed the 20MB limit");
      return;
    }

    // Import supabase for uploads
    const { supabase } = await import('@/integrations/supabase/client');

    const uploadedFiles: UploadedFile[] = [];

    for (const file of selectedFiles) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error(`Failed to upload ${file.name}`);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);

      const fileType = file.type.startsWith('image/') ? 'image' 
        : (file.type === 'application/pdf' || file.type.includes('document')) ? 'document' 
        : 'other';

      uploadedFiles.push({
        id: fileName,
        name: file.name,
        url: urlData.publicUrl,
        type: fileType,
        size: file.size,
      });
    }

    if (uploadedFiles.length > 0) {
      setFiles([...files, ...uploadedFiles]);
      toast.success(`${uploadedFiles.length} file(s) uploaded`);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;

    const MAX_FILE_SIZE = 20 * 1024 * 1024;
    const MAX_FILES = 10;

    if (files.length + droppedFiles.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files allowed`);
      return;
    }

    const oversizedFiles = droppedFiles.filter(f => f.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      toast.error("Some files exceed the 20MB limit");
      return;
    }

    // Import supabase for uploads
    const { supabase } = await import('@/integrations/supabase/client');

    const uploadedFiles: UploadedFile[] = [];

    for (const file of droppedFiles) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error(`Failed to upload ${file.name}`);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);

      const fileType = file.type.startsWith('image/') ? 'image' 
        : (file.type === 'application/pdf' || file.type.includes('document')) ? 'document' 
        : 'other';

      uploadedFiles.push({
        id: fileName,
        name: file.name,
        url: urlData.publicUrl,
        type: fileType,
        size: file.size,
      });
    }

    if (uploadedFiles.length > 0) {
      setFiles([...files, ...uploadedFiles]);
      toast.success(`${uploadedFiles.length} file(s) uploaded`);
    }
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

  // Parse message for attachments
  const parseMessageAttachments = (content: string): { text: string; attachments: UploadedFile[] } => {
    const attachments: UploadedFile[] = [];
    const attachmentRegex = /\[Attached (image|file): ([^\]]+)\]\(([^)]+)\)/g;
    let match;
    
    while ((match = attachmentRegex.exec(content)) !== null) {
      attachments.push({
        id: match[3],
        name: match[2],
        url: match[3],
        type: match[1] === 'image' ? 'image' : 'document',
        size: 0,
      });
    }

    const text = content.replace(attachmentRegex, '').trim();
    return { text, attachments };
  };

  return (
    <div 
      className="flex h-screen w-full bg-background relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag and drop overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center pointer-events-none"
          >
            <div className="border-2 border-dashed border-primary rounded-2xl p-12 bg-primary/5">
              <div className="text-center">
                <Paperclip className="w-12 h-12 mx-auto mb-4 text-primary" />
                <p className="text-lg font-medium text-foreground">Drop files here</p>
                <p className="text-sm text-muted-foreground mt-1">Images, PDFs, documents and more</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.txt,.md,.csv,.json"
      />

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
              {messages.map((message) => {
                const { text, attachments } = parseMessageAttachments(message.content);
                const isEditing = editingMessageId === message.id;
                
                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "group flex",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {/* Edit button for user messages - left side */}
                    {message.role === "user" && !isEditing && (
                      <button
                        onClick={() => handleStartEditMessage(message.id, message.content)}
                        className="self-center mr-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
                        title="Edit message"
                      >
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    )}
                    
                    <div
                      className={cn(
                        "max-w-[80%] px-4 py-3 rounded-2xl",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      )}
                    >
                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            className="w-full min-w-[200px] bg-primary-foreground/10 text-primary-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-foreground/30 resize-none"
                            rows={3}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSaveEditMessage(message.id);
                              }
                              if (e.key === "Escape") {
                                handleCancelEditMessage();
                              }
                            }}
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={handleCancelEditMessage}
                              className="px-3 py-1 text-xs rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveEditMessage(message.id)}
                              className="px-3 py-1 text-xs rounded-lg bg-primary-foreground text-primary hover:bg-primary-foreground/90 transition-colors"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : message.role === "assistant" ? (
                        <MarkdownRenderer 
                          content={text || message.content} 
                          className="text-sm"
                        />
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{text || message.content}</p>
                      )}
                      {attachments.length > 0 && !isEditing && (
                        <MessageAttachments attachments={attachments} />
                      )}
                      {!isEditing && (
                        <div
                          className={cn(
                            "text-xs mt-1 opacity-60",
                            message.role === "user" ? "text-right" : "text-left"
                          )}
                        >
                          {formatTime(message.timestamp)}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
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
            {/* File previews */}
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className={cn(
                      "relative group flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/50",
                      file.type === 'image' && "p-1"
                    )}
                  >
                    {file.type === 'image' ? (
                      <img
                        src={file.url}
                        alt={file.name}
                        className="h-16 w-16 object-cover rounded"
                      />
                    ) : (
                      <>
                        <FileText className="w-4 h-4" />
                        <span className="text-xs font-medium truncate max-w-[120px]">
                          {file.name}
                        </span>
                      </>
                    )}
                    <button
                      onClick={() => setFiles(files.filter(f => f.id !== file.id))}
                      className="absolute -top-1.5 -right-1.5 p-0.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <span className="sr-only">Remove</span>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

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
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 hover:bg-muted/50 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                    title="Attach files"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
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
                    disabled={(!input.trim() && files.length === 0) || isLoading}
                    className={cn(
                      "p-2 rounded-full transition-all",
                      (input.trim() || files.length > 0) && !isLoading
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
                        fileInputRef.current?.click();
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
                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
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
