import { useState } from 'react';
import { useVoiceSettings } from '@/hooks/useVoiceSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Mic, Volume2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

export default function VoiceSettings() {
  const { settings, isLoading, updateSettings } = useVoiceSettings();
  const [localApiKey, setLocalApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  if (isLoading) {
    return (
      <Card className="bg-background/40 backdrop-blur-md border border-border/30">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((j) => (
              <Skeleton key={j} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
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

  const handleSaveWakeWord = async (phrase: string) => {
    await updateSettings({ wake_word_phrase: phrase });
  };

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
      <CardContent className="space-y-6">
        {/* Hands-Free Voice Mode - Primary Toggle */}
        <div className="space-y-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-primary" />
                Hands-Free Voice Mode
              </Label>
              <p className="text-xs text-muted-foreground">
                Always-on voice assistant with ambient feedback. Say "Hey Arlo" to start.
              </p>
            </div>
            <Switch
              checked={Boolean(settings?.voice_mode_enabled && settings?.wake_word_enabled)}
              onCheckedChange={async (checked) => {
                await updateSettings({ 
                  voice_mode_enabled: checked,
                  wake_word_enabled: checked,
                });
              }}
            />
          </div>
          
          {settings?.voice_mode_enabled && settings?.wake_word_enabled && (
            <div className="pt-3 border-t border-border/20 space-y-3">
              <p className="text-xs text-muted-foreground">
                ✓ Wake word detection active while Arlo is open<br />
                ✓ Ambient edge glow shows listening/thinking/speaking states<br />
                ✓ Responses are spoken aloud via Cartesia TTS<br />
                ✓ Stay on your current page — no interruptions
              </p>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-muted-foreground">Listening for "Hey Arlo"</span>
              </div>
            </div>
          )}
        </div>

        {/* Advanced Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border/20">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Auto-send on Silence</Label>
              <p className="text-xs text-muted-foreground">Send after you stop speaking</p>
            </div>
            <Switch
              checked={settings?.auto_send_on_silence ?? true}
              onCheckedChange={(checked) => handleToggle('auto_send_on_silence', checked)}
            />
          </div>

          <div className="space-y-2 p-4 rounded-lg bg-muted/20 border border-border/20">
            <Label htmlFor="silence-timeout" className="text-xs">Silence Timeout (ms)</Label>
            <Input
              id="silence-timeout"
              type="number"
              placeholder="1500"
              defaultValue={settings?.silence_timeout_ms || 1500}
              onBlur={(e) => handleSaveSilenceTimeout(parseInt(e.target.value) || 1500)}
              className="bg-background/60"
            />
            <p className="text-xs text-muted-foreground">How long to wait before sending</p>
          </div>
        </div>

        {/* TTS Settings */}
        <div className="space-y-4 p-4 rounded-lg bg-muted/20 border border-border/20">
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-primary" />
            <Label className="text-sm font-medium">Text-to-Speech (Cartesia)</Label>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="voice-id" className="text-xs">Voice ID</Label>
              <Input
                id="voice-id"
                placeholder="Voice ID"
                defaultValue={settings?.cartesia_voice_id || ''}
                onBlur={(e) => handleSaveVoiceId(e.target.value)}
                className="bg-background/60 font-mono text-xs"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="silence-timeout" className="text-xs">Silence Timeout (ms)</Label>
              <Input
                id="silence-timeout"
                type="number"
                placeholder="1500"
                defaultValue={settings?.silence_timeout_ms || 1500}
                onBlur={(e) => handleSaveSilenceTimeout(parseInt(e.target.value) || 1500)}
                className="bg-background/60"
              />
            </div>
          </div>

          {/* Custom API Key (optional) */}
          <div className="space-y-2 pt-2 border-t border-border/20">
            <Label className="text-xs text-muted-foreground">
              Custom API Key (optional - leave blank to use default)
            </Label>
            <div className="flex gap-2">
              <Input
                type={showApiKey ? 'text' : 'password'}
                placeholder={settings?.cartesia_api_key ? '••••••••••••' : 'Enter Cartesia API key'}
                value={localApiKey}
                onChange={(e) => setLocalApiKey(e.target.value)}
                className="bg-background/60 flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? 'Hide' : 'Show'}
              </Button>
              <Button
                size="sm"
                onClick={handleSaveApiKey}
                disabled={!localApiKey.trim()}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
