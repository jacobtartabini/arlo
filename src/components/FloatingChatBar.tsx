import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Mic, MicOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useArlo } from "@/providers/ArloProvider";
import { toast } from "sonner";

type SpeechRecognitionAlternative = {
  transcript?: string;
};

type SpeechRecognitionResult = {
  0?: SpeechRecognitionAlternative;
  length?: number;
  [index: number]: SpeechRecognitionAlternative | undefined;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<SpeechRecognitionResult>;
};

type BrowserSpeechRecognition = {
  start: () => void;
  stop: () => void;
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

export function FloatingChatBar() {
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const { sendMessage, messages } = useArlo();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const root = rootRef.current;
      if (!root) return;

      if (!root.contains(event.target as Node)) {
        setIsMessagesOpen(false);
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      const root = rootRef.current;
      if (!root) return;

      if (!root.contains(event.target as Node)) {
        setIsMessagesOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("focusin", handleFocusIn);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("focusin", handleFocusIn);
    };
  }, []);

  useEffect(() => {
    if (!isMessagesOpen) return;

    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, isMessagesOpen]);

  useEffect(() => {
    if (!isMessagesOpen) return;

    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isMessagesOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const content = input;
    setInput("");
    setIsMessagesOpen(true);
    await sendMessage(content);
  };

  const initializeSpeechRecognition = () => {
    if (recognitionRef.current) {
      return recognitionRef.current;
    }

    if (typeof window === "undefined") {
      toast.error("Speech recognition is unavailable in this environment.");
      return null;
    }

    const SpeechRecognitionConstructor = ((window as unknown as {
      SpeechRecognition?: BrowserSpeechRecognitionConstructor;
      webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
    }).SpeechRecognition ||
      (window as unknown as {
        SpeechRecognition?: BrowserSpeechRecognitionConstructor;
        webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
      }).webkitSpeechRecognition) as BrowserSpeechRecognitionConstructor | undefined;

    if (!SpeechRecognitionConstructor) {
      toast.error("Speech recognition is not supported in this browser.");
      return null;
    }

    const recognition = new SpeechRecognitionConstructor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();

      if (transcript) {
        setInput((prev) => {
          if (!prev) return transcript;
          return `${prev} ${transcript}`.trim();
        });
        inputRef.current?.focus();
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event);
      toast.error("Microphone error. Please try again.");
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    return recognition;
  };

  const toggleRecording = () => {
    const recognition = initializeSpeechRecognition();
    if (!recognition) {
      return;
    }

    if (isRecording) {
      recognition.stop();
      return;
    }

    try {
      recognition.start();
      setIsRecording(true);
      setIsMessagesOpen(true);
    } catch (error) {
      console.error("Failed to start speech recognition:", error);
      toast.error("Unable to access the microphone.");
      setIsRecording(false);
    }
  };

  return (
    <motion.div
      ref={rootRef}
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed bottom-6 inset-x-0 z-50 flex flex-col items-center gap-4 px-4"
    >
      <AnimatePresence initial={false}>
        {isMessagesOpen && messages.length > 0 && (
          <motion.div
            key="messages-panel"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full flex justify-center"
          >
            <div
              ref={messagesContainerRef}
              className="w-full max-w-[640px] space-y-3 overflow-y-auto max-h-72 pr-1"
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-lg transition-all ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative w-full flex justify-center">
        <motion.div
          animate={{
            width: isFocused ? "min(90vw, 640px)" : "min(90vw, 400px)",
            scale: isFocused ? 1.02 : 1,
          }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
          className="glass-chat relative rounded-full shadow-2xl backdrop-blur-2xl"
        >
          <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-2.5">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => {
                setIsFocused(true);
                setIsMessagesOpen(true);
              }}
              onBlur={() => setIsFocused(false)}
              placeholder="Ask Arlo anything..."
              className="flex-1 bg-transparent border-none focus-visible:ring-0 text-foreground placeholder:text-muted-foreground"
            />

            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => {
                  setIsMessagesOpen(true);
                  toggleRecording();
                }}
                className={`rounded-full transition-colors ${
                  isRecording ? "bg-destructive text-destructive-foreground" : ""
                }`}
              >
                {isRecording ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              <Button
                type="submit"
                size="icon"
                className="rounded-full bg-primary hover:bg-primary/90"
                disabled={!input.trim()}
              >
                <ArrowUp className="w-5 h-5" />
              </Button>
            </motion.div>
          </form>

          <div className="absolute inset-0 rounded-full bg-primary/20 blur-3xl -z-10 opacity-50" />
        </motion.div>
      </div>
    </motion.div>
  );
}
