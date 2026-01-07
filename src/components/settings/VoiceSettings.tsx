import { useState } from 'react';
import { useVoiceSettings } from '@/hooks/useVoiceSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Mic, Volume2, Wand2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface VoiceSettingsProps {
  embedded?: boolean;
}

export default function VoiceSettings({ embedded = false }: VoiceSettingsProps) {
  const { settings, isLoading, updateSettings } = useVoiceSettings();
  const [localApiKey, setLocalApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [ttsOpen, setTtsOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }

  const handleToggle = async (key: string, value: boolean) => {
    await updateSettings({ [key]: value });
  };

  const handleSaveApiKey = async () => {
    if (!localApiKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }
    const success = await updateSettings({ cartesia_api_key: localApiKey.trim() });
    if (success) {
      setLocalApiKey('');
      setShowApiKey(false);
    }
  };

  const handleSaveVoiceId = async (voiceId: string) => {
    await updateSettings({ cartesia_voice_id: voiceId });
  };

  const handleSaveSilenceTimeout = async (ms: number) => {
    await updateSettings({ silence_timeout_ms: ms });
  };

  const isHandsFreeEnabled = Boolean(settings?.voice_mode_enabled && settings?.wake_word_enabled);

  const content = (
    <div className="space-y-4">
      {/* Primary Toggle - Hands-Free Mode */}
      <div className={cn(
        "p-4 rounded-lg border transition-all",
        isHandsFreeEnabled 
          ? "bg-primary/5 border-primary/20" 
          : "bg-muted/10 border-border/20"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wand2 className={cn(
              "h-4 w-4",
              isHandsFreeEnabled ? "text-primary" : "text-muted-foreground"
            )} />
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Hands-Free Voice Mode</Label>
              <p className="text-xs text-muted-foreground">
                Say "Hey Arlo" to start
              </p>
            </div>
          </div>
          <Switch
            checked={isHandsFreeEnabled}
            onCheckedChange={async (checked) => {
              await updateSettings({ 
                voice_mode_enabled: checked,
                wake_word_enabled: checked,
              });
            }}
          />
        </div>
        
        {isHandsFreeEnabled && (
          <div className="mt-3 pt-3 border-t border-border/20">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Listening for wake word
            </div>
          </div>
        )}
      </div>

      {/* Auto-send Toggle */}
      <div className="flex items-center justify-between py-2">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Auto-send on Silence</Label>
          <p className="text-xs text-muted-foreground">Send after you stop speaking</p>
        </div>
        <Switch
          checked={settings?.auto_send_on_silence ?? true}
          onCheckedChange={(checked) => handleToggle('auto_send_on_silence', checked)}
        />
      </div>

      {/* TTS Settings - Collapsible */}
      <Collapsible open={ttsOpen} onOpenChange={setTtsOpen}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <div className="flex items-center gap-2">
              <Volume2 className="h-3.5 w-3.5" />
              <span>Text-to-Speech Settings</span>
            </div>
            <ChevronDown className={cn(
              "h-3.5 w-3.5 transition-transform",
              ttsOpen && "rotate-180"
            )} />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="pt-3 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="voice-id" className="text-xs">Voice ID</Label>
                <Input
                  id="voice-id"
                  placeholder="Voice ID"
                  defaultValue={settings?.cartesia_voice_id || ''}
                  onBlur={(e) => handleSaveVoiceId(e.target.value)}
                  className="bg-background/60 h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="silence-timeout" className="text-xs">Silence Timeout (ms)</Label>
                <Input
                  id="silence-timeout"
                  type="number"
                  placeholder="1500"
                  defaultValue={settings?.silence_timeout_ms || 1500}
                  onBlur={(e) => handleSaveSilenceTimeout(parseInt(e.target.value) || 1500)}
                  className="bg-background/60 h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Custom API Key (optional)
              </Label>
              <div className="flex gap-2">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  placeholder={settings?.cartesia_api_key ? '••••••••' : 'Cartesia API key'}
                  value={localApiKey}
                  onChange={(e) => setLocalApiKey(e.target.value)}
                  className="bg-background/60 h-8 text-xs flex-1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? 'Hide' : 'Show'}
                </Button>
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={handleSaveApiKey}
                  disabled={!localApiKey.trim()}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <Card className="bg-background/40 backdrop-blur-md border border-border/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5 text-primary" />
          Voice Mode
        </CardTitle>
        <CardDescription>
          Configure voice input, text-to-speech, and wake word settings
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
