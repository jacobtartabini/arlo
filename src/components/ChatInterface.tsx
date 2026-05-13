import { useState, useRef, useEffect } from 'react';
import { useArlo } from '@/providers/ArloProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';
import { AgentApprovalDialog } from '@/components/chat/AgentApprovalDialog';

interface ChatInterfaceProps {
  onWidgetRequest: (type: 'weather' | 'map' | 'health', data?: any) => void;
}

export function ChatInterface({ onWidgetRequest }: ChatInterfaceProps) {
  const { messages, sendMessage, sendVoiceMessage, isLoading } = useArlo();
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const message = input.trim();
    setInput('');
    
    // Check for widget triggers
    if (message.toLowerCase().includes('weather')) {
      const locationMatch = message.match(/weather\s+(?:in|for|at)\s+([a-zA-Z\s]+)/i);
      const location = locationMatch ? locationMatch[1].trim() : 'current location';
      onWidgetRequest('weather', { location });
    } else if (message.toLowerCase().includes('map') || message.toLowerCase().includes('directions')) {
      onWidgetRequest('map');
    } else if (message.toLowerCase().includes('system') || message.toLowerCase().includes('health')) {
      onWidgetRequest('health');
    }
    
    await sendMessage(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        sendVoiceMessage(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setMediaRecorder(null);
      setIsRecording(false);
    }
  };

  return (
    <>
      <AgentApprovalDialog />
      {/* Chat History (when expanded) */}
      {showChatHistory && (
        <div className="fixed bottom-24 right-6 w-96 h-96 glass rounded-2xl p-4 z-40">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-foreground">Chat History</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowChatHistory(false)}
            >
              ×
            </Button>
          </div>
          <ScrollArea className="h-80">
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`
                      max-w-xs px-3 py-2 rounded-2xl text-sm
                      ${message.role === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-secondary text-secondary-foreground'
                      }
                    `}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Main Chat Bar */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="glass rounded-full p-3 flex items-center gap-3 min-w-96">
          {/* Expand Chat History Button */}
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full"
              onClick={() => setShowChatHistory(!showChatHistory)}
            >
              💬
            </Button>
          )}

          {/* Text Input */}
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Arlo anything..."
            className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            disabled={isLoading}
          />

          {/* Voice Button */}
          <Button
            variant="ghost"
            size="sm"
            className={`rounded-full ${isRecording ? 'bg-red-500 text-white' : ''}`}
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={stopRecording}
            disabled={isLoading}
          >
            {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="rounded-full"
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="text-center mt-2">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground glass px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              Arlo is thinking...
            </div>
          </div>
        )}
      </div>
    </>
  );
}