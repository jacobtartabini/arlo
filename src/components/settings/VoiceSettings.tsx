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
        {/* Voice Mode Toggle */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border/20">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Voice Mode</Label>
              <p className="text-xs text-muted-foreground">Enable voice input globally</p>
            </div>
            <Switch
              checked={settings?.voice_mode_enabled ?? false}
              onCheckedChange={(checked) => handleToggle('voice_mode_enabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border/20">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Auto-send on Silence</Label>
              <p className="text-xs text-muted-foreground">Send message when you stop speaking</p>
            </div>
            <Switch
              checked={settings?.auto_send_on_silence ?? true}
              onCheckedChange={(checked) => handleToggle('auto_send_on_silence', checked)}
            />
          </div>
        </div>

        {/* Wake Word Settings */}
        <div className="space-y-4 p-4 rounded-lg bg-muted/20 border border-border/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-primary" />
              <Label className="text-sm font-medium">Wake Word</Label>
            </div>
            <Switch
              checked={settings?.wake_word_enabled ?? false}
              onCheckedChange={(checked) => handleToggle('wake_word_enabled', checked)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Activate voice mode by saying the wake phrase when Arlo is in the foreground
          </p>
          {settings?.wake_word_enabled && (
            <div className="space-y-2">
              <Label htmlFor="wake-phrase" className="text-xs">Wake Phrase</Label>
              <Input
                id="wake-phrase"
                placeholder="Hey Arlo"
                defaultValue={settings?.wake_word_phrase || 'Hey Arlo'}
                onBlur={(e) => handleSaveWakeWord(e.target.value)}
                className="bg-background/60"
              />
            </div>
          )}
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
