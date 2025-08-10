import React, { useEffect, useRef, useState } from "react";
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
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Message {
  id: string;
  text: string;
  sender: "user" | "arlo";
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export default function Chat() {
  const [chatInput, setChatInput] = useState("");
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  // Initialize with default session
  useEffect(() => {
    const defaultSession: ChatSession = {
      id: "default",
      title: "New Chat",
      messages: [
        {
          id: "1",
          text: "Hello! I'm Arlo, your AI assistant. How can I help you today?",
          sender: "arlo",
          timestamp: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setCurrentSession(defaultSession);
    setChatSessions([defaultSession]);
  }, []);

  useEffect(() => {
    document.title = "Chat – Arlo AI";
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession?.messages]);

  // Save current session to history
  const saveCurrentSession = () => {
    if (!currentSession) return;
    
    setChatSessions(prev => {
      const existingIndex = prev.findIndex(session => session.id === currentSession.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...currentSession, updatedAt: new Date() };
        return updated;
      }
      return [...prev, { ...currentSession, updatedAt: new Date() }];
    });
  };

  // Create new chat session
  const createNewChat = () => {
    if (currentSession && currentSession.messages.length > 1) {
      saveCurrentSession();
    }
    
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [
        {
          id: "1",
          text: "Hello! I'm Arlo, your AI assistant. How can I help you today?",
          sender: "arlo",
          timestamp: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    setCurrentSession(newSession);
  };

  // Load a previous chat session
  const loadChatSession = (session: ChatSession) => {
    if (currentSession && currentSession.messages.length > 1) {
      saveCurrentSession();
    }
    setCurrentSession(session);
    setShowHistory(false);
  };

  // Delete a chat session
  const deleteChatSession = (sessionId: string) => {
    setChatSessions(prev => prev.filter(session => session.id !== sessionId));
    if (currentSession?.id === sessionId) {
      createNewChat();
    }
  };

  // Generate session title from first user message
  const generateSessionTitle = (message: string) => {
    return message.length > 30 ? message.substring(0, 30) + "..." : message;
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !currentSession) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: chatInput,
      sender: "user",
      timestamp: new Date(),
    };

    // Update session title if this is the first user message
    let updatedSession = { ...currentSession };
    if (currentSession.messages.length === 1 && currentSession.title === "New Chat") {
      updatedSession.title = generateSessionTitle(chatInput);
    }

    updatedSession.messages = [...updatedSession.messages, userMessage];
    setCurrentSession(updatedSession);
    setChatInput("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "That's an interesting question! Let me think about that...",
        "I understand what you're asking. Here's my perspective...",
        "Great point! Based on the information you've provided...",
        "I can help you with that. Let me break this down...",
        "That's a thoughtful question. Here's what I think...",
      ];
      
      const arloResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: responses[Math.floor(Math.random() * responses.length)],
        sender: "arlo",
        timestamp: new Date(),
      };

      setCurrentSession(prev => prev ? {
        ...prev,
        messages: [...prev.messages, arloResponse],
        updatedAt: new Date()
      } : null);
      setIsTyping(false);
    }, 1500);
  };

  if (!currentSession) return null;

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
                onClick={createNewChat}
                className="w-full gap-2 bg-white/50 dark:bg-gray-800/50 hover:bg-white/70 dark:hover:bg-gray-700/70"
              >
                <Plus className="h-4 w-4" />
                New Chat
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {chatSessions
                .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
                .map((session) => (
                  <motion.div
                    key={session.id}
                    layout
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      session.id === currentSession.id
                        ? "bg-primary/20 border border-primary/30"
                        : "bg-white/40 dark:bg-gray-800/40 hover:bg-white/60 dark:hover:bg-gray-700/60"
                    }`}
                    onClick={() => loadChatSession(session)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">
                          {session.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {session.messages.length} messages
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {session.updatedAt.toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChatSession(session.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
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
                  <h1 className="font-semibold">{currentSession.title}</h1>
                  <p className="text-xs text-muted-foreground">
                    {currentSession.messages.length} messages
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={createNewChat}
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
            {currentSession.messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
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
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 px-2">
                    {message.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </motion.div>
            ))}
            
            {/* Typing Indicator */}
            {isTyping && (
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
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
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
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Message Arlo..."
                  className="w-full bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-white/20 pr-12"
                  disabled={isTyping}
                />
              </div>
              <Button 
                type="submit" 
                disabled={!chatInput.trim() || isTyping}
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
