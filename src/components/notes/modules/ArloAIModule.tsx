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

    // Simulate AI response (in production, this would call Arlo's API)
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    // Generate contextual response
    let response = "";
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes("summarize") || lowerMessage.includes("summary")) {
      response = noteContent 
        ? `Based on your note content, here's a summary:\n\n• The note contains visual elements and text\n• Key themes appear to be related to your drawing\n• Consider adding headers for better organization`
        : "I don't see any content in this note yet. Start adding some drawings or text, and I can help summarize!";
    } else if (lowerMessage.includes("explain")) {
      response = "I'd be happy to explain! Could you select the specific content you'd like me to explain? Just highlight it on the canvas.";
    } else if (lowerMessage.includes("expand") || lowerMessage.includes("elaborate")) {
      response = "Here are some ways to expand on your ideas:\n\n1. Add more visual diagrams\n2. Include supporting examples\n3. Link related concepts together\n4. Add annotations to your drawings";
    } else if (lowerMessage.includes("help") || lowerMessage.includes("what can you do")) {
      response = "I'm Arlo, your AI assistant for Smart Notes! I can:\n\n✨ Summarize your note content\n📝 Explain concepts you select\n💡 Suggest ideas and expansions\n🔍 Answer questions about your work\n\nJust ask me anything!";
    } else {
      response = `I understand you're asking about "${userMessage}". Here are my thoughts:\n\nThis is an interesting topic! Consider:\n• Breaking it down into smaller parts\n• Adding visual diagrams\n• Creating connections to other concepts\n\nWould you like me to help with any specific aspect?`;
    }

    setMessages(prev => [...prev, { role: "assistant", content: response }]);
    setIsLoading(false);
  }, [input, isLoading, noteContent]);

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
