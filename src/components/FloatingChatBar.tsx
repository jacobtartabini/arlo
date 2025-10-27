import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Mic, MicOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useArlo } from "@/providers/ArloProvider";

export function FloatingChatBar() {
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const { sendMessage } = useArlo();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    sendMessage(input);
    setInput("");
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // Voice recording will be implemented with MediaRecorder API
  };

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
      style={{ left: '50%' }}
    >
      <motion.div
        animate={{
          width: isFocused ? "min(90vw, 640px)" : "min(90vw, 400px)",
          scale: isFocused ? 1.02 : 1,
        }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        className="glass-intense rounded-full shadow-2xl backdrop-blur-xl"
      >
        <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-2.5">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Ask Arlo anything..."
            className="flex-1 bg-transparent border-none focus-visible:ring-0 text-foreground placeholder:text-muted-foreground"
          />
          
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={toggleRecording}
              className={`rounded-full ${isRecording ? 'bg-destructive text-destructive-foreground' : ''}`}
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
              <Send className="w-5 h-5" />
            </Button>
          </motion.div>
        </form>
      </motion.div>

      {/* Glow effect */}
      <div className="absolute inset-0 rounded-full bg-primary/20 blur-3xl -z-10 opacity-50" />
    </motion.div>
  );
}
