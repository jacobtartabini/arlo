import { useState, useEffect } from 'react';
import { 
  X, 
  Minus, 
  Maximize2,
  Paperclip,
  Image,
  Link2,
  Send,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { InboxAccount, InboxThread, InboxMessage } from '@/types/inbox';
import { PROVIDER_META } from '@/types/inbox';

export type ComposeMode = 'new' | 'reply' | 'replyAll' | 'forward';

interface ComposeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ComposeMode;
  accounts: InboxAccount[];
  replyToThread?: InboxThread;
  replyToMessage?: InboxMessage;
  initialDraft?: string;
  isAIDraft?: boolean;
  onSend: (data: ComposeData) => Promise<void>;
  isSending?: boolean;
}

export interface ComposeData {
  accountId: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  threadId?: string;
  inReplyTo?: string;
}

export function ComposeDialog({
  isOpen,
  onClose,
  mode,
  accounts,
  replyToThread,
  replyToMessage,
  initialDraft,
  isAIDraft,
  onSend,
  isSending,
}: ComposeDialogProps) {
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [showQuotedText, setShowQuotedText] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Initialize form based on mode
  useEffect(() => {
    if (!isOpen) return;
    
    if (initialDraft) {
      setBody(initialDraft);
    }
    
    if (mode === 'new') {
      setTo('');
      setSubject('');
      setBody(initialDraft || '');
    } else if (replyToThread && replyToMessage) {
      const sender = replyToMessage.sender;
      const recipients = replyToMessage.recipients || [];
      
      if (mode === 'reply') {
        setTo(sender.email || '');
      } else if (mode === 'replyAll') {
        const allRecipients = [sender, ...recipients]
          .map(r => r.email)
          .filter(Boolean)
          .join(', ');
        setTo(allRecipients);
      } else if (mode === 'forward') {
        setTo('');
      }
      
      // Set subject
      const originalSubject = replyToThread.subject || '';
      if (mode === 'forward') {
        setSubject(originalSubject.startsWith('Fwd:') ? originalSubject : `Fwd: ${originalSubject}`);
      } else {
        setSubject(originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`);
      }
      
      // Set account from thread
      if (replyToThread.account_id) {
        setSelectedAccountId(replyToThread.account_id);
      }
    }
  }, [isOpen, mode, replyToThread, replyToMessage, initialDraft]);

  const handleSend = async () => {
    if (!to.trim() || !selectedAccountId) return;
    
    await onSend({
      accountId: selectedAccountId,
      to: to.split(',').map(s => s.trim()).filter(Boolean),
      cc: cc.split(',').map(s => s.trim()).filter(Boolean),
      bcc: bcc.split(',').map(s => s.trim()).filter(Boolean),
      subject,
      body,
      threadId: replyToThread?.id,
      inReplyTo: replyToMessage?.external_message_id,
    });
    
    onClose();
  };

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  if (!isOpen) return null;

  // Build quoted text
  const quotedText = replyToMessage ? `

---
On ${new Date(replyToMessage.sent_at).toLocaleDateString()}, ${replyToMessage.sender?.name || replyToMessage.sender?.email} wrote:

${replyToMessage.body_text || ''}
` : '';

  const modeLabels = {
    new: 'New Message',
    reply: 'Reply',
    replyAll: 'Reply All',
    forward: 'Forward',
  };

  return (
    <div 
      className={cn(
        "fixed z-50 glass-intense rounded-t-2xl shadow-2xl flex flex-col transition-all duration-200",
        isMaximized 
          ? "inset-4 rounded-2xl" 
          : isMinimized
            ? "bottom-0 right-6 w-80 h-12 rounded-t-xl"
            : "bottom-0 right-6 w-[560px] h-[520px]"
      )}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-3 border-b border-border/30 cursor-pointer"
        onClick={() => isMinimized && setIsMinimized(false)}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{modeLabels[mode]}</span>
          {isAIDraft && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Sparkles className="h-3 w-3" />
              AI Draft
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={(e) => { e.stopPropagation(); setIsMaximized(!isMaximized); setIsMinimized(false); }}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {!isMinimized && (
        <>
          {/* Form */}
          <div className="flex-1 overflow-auto">
            <div className="p-4 space-y-3">
              {/* From selector */}
              {accounts.length > 1 && (
                <div className="flex items-center gap-2">
                  <Label className="w-16 text-sm text-muted-foreground">From</Label>
                  <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                    <SelectTrigger className="flex-1 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map(account => (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: PROVIDER_META[account.provider].color }}
                            />
                            {account.account_email || account.account_name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {/* To */}
              <div className="flex items-center gap-2">
                <Label className="w-16 text-sm text-muted-foreground">To</Label>
                <Input 
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="Recipients"
                  className="flex-1 h-9"
                />
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={() => setShowCcBcc(!showCcBcc)}
                >
                  Cc/Bcc
                </Button>
              </div>
              
              {/* Cc/Bcc */}
              {showCcBcc && (
                <>
                  <div className="flex items-center gap-2">
                    <Label className="w-16 text-sm text-muted-foreground">Cc</Label>
                    <Input 
                      value={cc}
                      onChange={(e) => setCc(e.target.value)}
                      placeholder="Cc recipients"
                      className="flex-1 h-9"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="w-16 text-sm text-muted-foreground">Bcc</Label>
                    <Input 
                      value={bcc}
                      onChange={(e) => setBcc(e.target.value)}
                      placeholder="Bcc recipients"
                      className="flex-1 h-9"
                    />
                  </div>
                </>
              )}
              
              {/* Subject */}
              <div className="flex items-center gap-2">
                <Label className="w-16 text-sm text-muted-foreground">Subject</Label>
                <Input 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject"
                  className="flex-1 h-9"
                />
              </div>
              
              {/* Body */}
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message..."
                className="min-h-[200px] resize-none"
              />
              
              {/* Quoted text (for replies/forwards) */}
              {quotedText && (
                <Collapsible open={showQuotedText} onOpenChange={setShowQuotedText}>
                  <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {showQuotedText ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {showQuotedText ? 'Hide' : 'Show'} quoted text
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground whitespace-pre-wrap border-l-2 border-muted-foreground/30">
                      {quotedText}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          </div>
          
          {/* Footer actions */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/30">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Link2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Image className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button 
                onClick={handleSend}
                disabled={!to.trim() || isSending}
                className="gap-2"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
