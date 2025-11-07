import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowUp, Mic } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useArlo } from "@/providers/ArloProvider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type SpeechRecognitionAlternative = {
  transcript?: string;
};

type SpeechRecognitionResult = {
  0?: SpeechRecognitionAlternative;
  length?: number;
  isFinal?: boolean;
  [index: number]: SpeechRecognitionAlternative | undefined;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<SpeechRecognitionResult>;
};

type SpeechRecognitionErrorEventLike = {
  error?: string;
  message?: string;
};

type BrowserSpeechRecognition = {
  start: () => void;
  stop: () => void;
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
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
  const [micError, setMicError] = useState<string | null>(null);
  const { sendMessage, messages } = useArlo();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recordingBaseInputRef = useRef("");
  const finalTranscriptRef = useRef("");
  const interimTranscriptRef = useRef("");

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
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const results = Array.from(event.results);

      const finalTranscript = results
        .filter((result) => result.isFinal)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();

      const interimTranscript = results
        .filter((result) => !result.isFinal)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();

      finalTranscriptRef.current = finalTranscript;
      interimTranscriptRef.current = interimTranscript;

      const base = recordingBaseInputRef.current.trim();
      const combined = [base, finalTranscript, interimTranscript]
        .filter((value) => value && value.length > 0)
        .join(" ")
        .trim();

      setInput(combined);
      inputRef.current?.focus();
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event);
      const errorEvent = event as SpeechRecognitionErrorEventLike;
      if (
        errorEvent.error === "not-allowed" ||
        errorEvent.error === "service-not-allowed"
      ) {
        setMicError("Voice input requires microphone access.");
      } else {
        toast.error("Microphone error. Please try again.");
      }
      try {
        recognition.stop();
      } catch (stopError) {
        console.error("Failed to stop recognition after error:", stopError);
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      const base = recordingBaseInputRef.current.trim();
      const finalTranscript = finalTranscriptRef.current.trim();
      const interimTranscript = interimTranscriptRef.current.trim();
      const transcriptToKeep = finalTranscript || interimTranscript;
      const combined = [base, transcriptToKeep]
        .filter((value) => value && value.length > 0)
        .join(" ")
        .trim();

      setInput(combined);
      recordingBaseInputRef.current = combined;
      finalTranscriptRef.current = "";
      interimTranscriptRef.current = "";
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
      setMicError(null);
      recordingBaseInputRef.current = input.trim();
      finalTranscriptRef.current = "";
      interimTranscriptRef.current = "";
      recognition.start();
      setIsRecording(true);
      setIsMessagesOpen(true);
      inputRef.current?.focus();
    } catch (error) {
      console.error("Failed to start speech recognition:", error);
      const errorName =
        error && typeof error === "object" && "name" in error
          ? String((error as { name?: string }).name)
          : "";
      if (errorName === "NotAllowedError" || errorName === "SecurityError") {
        setMicError("Voice input requires microphone access.");
      } else {
        toast.error("Unable to access the microphone.");
      }
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
                    <p>{message.content}</p>
                    {message.status !== "sent" && (
                      <div className="mt-2 flex items-center gap-2 text-xs opacity-80">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            message.status === "pending"
                              ? "bg-amber-400 animate-pulse"
                              : "bg-destructive"
                          }`}
                        />
                        <span>
                          {message.status === "pending"
                            ? "Pending"
                            : "Failed"}
                        </span>
                      </div>
                    )}
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
                aria-pressed={isRecording}
                aria-label={
                  isRecording ? "Stop voice input" : "Start voice input"
                }
                className={cn(
                  "relative overflow-hidden rounded-full transition-all duration-200",
                  isRecording
                    ? "bg-destructive text-destructive-foreground shadow-[0_0_0_3px_rgba(239,68,68,0.35)]"
                    : "hover:bg-muted"
                )}
              >
                {isRecording && (
                  <>
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 rounded-full bg-destructive/40"
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 rounded-full bg-destructive/30 blur-xl"
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 rounded-full border border-destructive/40 animate-pulse"
                    />
                  </>
                )}
                <Mic
                  className={cn(
                    "relative z-[1] h-5 w-5 transition-all duration-200",
                    isRecording ? "fill-current" : ""
                  )}
                />
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

        <AnimatePresence>
          {micError && (
            <motion.div
              key="mic-permission-error"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full mt-3 flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-1 text-xs text-destructive backdrop-blur"
            >
              <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{micError}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
