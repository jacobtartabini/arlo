"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  X, 
  GripVertical, 
  Sparkles, 
  Send, 
  Loader2,
  Copy,
  Check,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { getArloToken } from "@/lib/arloAuth";

interface ArloAIModuleProps {
  id: string;
  onClose: () => void;
  noteContent?: string;
  onInsertText: (text: string) => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function ArloAIModule({ id, onClose, noteContent, onInsertText }: ArloAIModuleProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const token = await getArloToken();
      if (!token) {
        throw new Error("Authentication required");
      }

      const conversationHistory = messages.slice(-10).map((message) => ({
        role: message.role,
        content: message.content,
      }));

      const prompt = noteContent?.trim()
        ? `${userMessage}\n\nNote context:\n${noteContent}`
        : userMessage;

      const { data, error } = await supabase.functions.invoke("arlo-ai", {
        headers: { "X-Arlo-Authorization": `Bearer ${token}` },
        body: {
          prompt,
          conversation: conversationHistory,
        },
      });

      if (error) {
        throw error;
      }

      const response = data?.message;
      if (!response || typeof response !== "string") {
        throw new Error("No AI response received");
      }

      setMessages(prev => [...prev, { role: "assistant", content: response }]);
    } catch (error) {
      console.error("Arlo AI request failed:", error);
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: "I couldn't generate a response right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, noteContent, messages]);

  const handleCopy = useCallback((text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }, []);

  const handleInsert = useCallback((text: string) => {
    onInsertText(text);
  }, [onInsertText]);

  const handleClear = useCallback(() => {
    setMessages([]);
  }, []);

  const quickActions = [
    { label: "Summarize", prompt: "Summarize this note for me" },
    { label: "Explain", prompt: "Explain the selected content" },
    { label: "Expand", prompt: "Help me expand on these ideas" },
  ];

  return (
    <Card className="w-80 h-96 overflow-hidden shadow-2xl border-border/60 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-primary/10 to-primary/5 px-3 py-2 border-b border-border/40 cursor-move">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium">Arlo AI</span>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            onClick={handleClear}
            disabled={messages.length === 0}
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Sparkles className="h-8 w-8 text-primary/50 mb-3" />
            <p className="text-sm font-medium mb-1">Ask Arlo anything</p>
            <p className="text-xs text-muted-foreground mb-4">
              Get help with your notes
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setInput(action.prompt);
                  }}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex flex-col",
                  message.role === "user" ? "items-end" : "items-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === "assistant" && (
                  <div className="flex items-center gap-1 mt-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleCopy(message.content, index)}
                    >
                      {copiedIndex === index ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => handleInsert(message.content)}
                    >
                      Insert
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs">Thinking...</span>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-border/40">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Arlo..."
            className="min-h-[38px] max-h-20 text-sm resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button 
            type="submit" 
            size="icon" 
            className="h-9 w-9 shrink-0" 
            disabled={!input.trim() || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}
