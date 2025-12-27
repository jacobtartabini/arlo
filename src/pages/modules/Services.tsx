import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  ShieldCheck,
  RefreshCw,
  Download,
  Laptop,
  Smartphone,
  Monitor,
  Clock,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Search,
  Globe,
  Key,
  Wifi,
  Eye,
  TrendingUp,
  Loader2,
  ArrowLeft,
  Server,
  FileText,
  ExternalLink,
  Plus,
  Radar,
  Target,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Device {
  id: string;
  name: string;
  os: string;
  status: 'online' | 'offline';
  tailnetIp: string;
  lastSeen: string;
  tags: string[];
  user?: string;
  clientVersion?: string;
  updateAvailable?: boolean;
  expires?: string;
}

interface AuditEvent {
  id: string;
  type: 'login' | 'logout' | 'failed' | 'refresh';
  timestamp: string;
  device: string;
  os: string;
  ip: string;
  location: string;
  source: 'tailnet' | 'public';
  actor?: string;
  eventType?: string;
}

interface AuthKey {
  id: string;
  description: string;
  created: string;
  expires: string;
  lastUsed?: string;
  reusable: boolean;
  ephemeral: boolean;
  tags: string[];
}

interface IntelligenceFinding {
  id: string;
  category: 'identity' | 'breach' | 'infrastructure' | 'account' | 'association' | 'leak';
  title: string;
  insight: string;
  significance: string;
  confidence: number;
  severity: 'informational' | 'low' | 'moderate' | 'elevated' | 'high';
  discovered: string;
  lastVerified: string;
  sources: {
    type: string;
    name: string;
    methodology: string;
  }[];
  evidence: {
    type: 'text' | 'list' | 'timeline' | 'metadata';
    label: string;
    content: string | string[] | { date: string; event: string }[];
  }[];
  context?: {
    background?: string;
    implications?: string[];
    recommendations?: string[];
  };
}

// Static intelligence findings data
const intelligenceFindings: IntelligenceFinding[] = [
  {
    id: '1',
    category: 'breach',
    title: 'Credential Exposure in Historical Breach',
    insight: 'Email address and hashed credentials were exposed in a 2021 data breach affecting a major professional networking platform.',
    significance: 'While passwords were cryptographically protected, the exposure creates ongoing risk for targeted phishing and social engineering attempts.',
    confidence: 95,
    severity: 'moderate',
    discovered: '2024-01-15',
    lastVerified: '2 hours ago',
    sources: [
      { type: 'Breach Database', name: 'HaveIBeenPwned', methodology: 'Monitored breach aggregation and hash verification' },
    ],
    evidence: [
      { type: 'metadata', label: 'Breach Event', content: 'LinkedIn Data Breach — June 2021 — 700M records' },
      { type: 'list', label: 'Exposed Data Types', content: ['Email address', 'Full name', 'Phone number', 'Professional title'] },
    ],
    context: {
      background: 'This breach resulted from an API vulnerability that allowed large-scale data scraping.',
      implications: ['Email address is confirmed present in threat actor databases', 'Professional context enables targeted spear-phishing campaigns'],
      recommendations: ['Rotate passwords for the affected platform', 'Enable two-factor authentication on all critical accounts'],
    },
  },
  {
    id: '2',
    category: 'identity',
    title: 'Cross-Platform Identity Correlation',
    insight: 'A consistent digital identity was reconstructed across multiple public platforms using username patterns and biographical details.',
    significance: 'This demonstrates how easily a comprehensive profile can be assembled from public sources.',
    confidence: 92,
    severity: 'informational',
    discovered: '2024-01-15',
    lastVerified: '1 hour ago',
    sources: [
      { type: 'Search Engine Intelligence', name: 'Google Dorking', methodology: 'Advanced search operators and pattern analysis' },
    ],
    evidence: [
      { type: 'list', label: 'Confirmed Profiles', content: ['LinkedIn — Full professional history', 'GitHub — 47 public repositories', 'Twitter — Active account'] },
    ],
    context: {
      recommendations: ['Review privacy settings on all identified platforms', 'Consider using distinct usernames for different contexts'],
    },
  },
];

const StatCard = ({ 
  label, 
  value, 
  helper, 
  tone = 'neutral',
  icon,
}: { 
  label: string; 
  value: string; 
  helper?: string; 
  tone?: 'positive' | 'neutral' | 'negative' | 'info';
  icon?: React.ReactNode;
}) => {
  const toneColors = {
    positive: 'text-emerald-600 dark:text-emerald-400',
    neutral: 'text-muted-foreground',
    negative: 'text-rose-600 dark:text-rose-400',
    info: 'text-sky-600 dark:text-sky-400',
  };

  return (
    <Card className="group relative overflow-hidden border-border/50 bg-background/70 p-4 shadow-none backdrop-blur">
      <div className="absolute inset-0 bg-gradient-to-br from-muted/40 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
      <div className="flex items-center gap-2 mb-2">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-semibold text-foreground">{value}</span>
        {helper && (
          <span className={cn("text-xs font-semibold", toneColors[tone])}>
            {helper}
          </span>
        )}
      </div>
    </Card>
  );
};

const Services = () => {
  const navigate = useNavigate();
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);
  const [osintCategory, setOsintCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<string>('Never');
  
  // Live data state
  const [devices, setDevices] = useState<Device[]>([]);
  const [recentEvents, setRecentEvents] = useState<AuditEvent[]>([]);
  const [authKeys, setAuthKeys] = useState<AuthKey[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Arlo";
  }, []);

  const formatLastSeen = (isoDate: string): string => {
    if (!isoDate) return 'Unknown';
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const fetchTailscaleData = useCallback(async (action: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('tailscale-api', {
        body: { action },
        headers: { 'x-tailscale-verified': 'true' },
      });

      if (error) {
        console.error(`Tailscale API error (${action}):`, error);
        throw new Error(error.message || 'Failed to fetch Tailscale data');
      }
      return data;
    } catch (err) {
      console.error(`Error fetching ${action}:`, err);
      throw err;
    }
  }, []);

  const loadDevices = useCallback(async () => {
    setIsLoadingDevices(true);
    try {
      const data = await fetchTailscaleData('devices');
      if (data?.devices) {
        const formattedDevices: Device[] = data.devices.map((d: any) => ({
          id: d.id,
          name: d.name,
          os: d.os,
          status: d.status,
          tailnetIp: d.tailnetIp,
          lastSeen: formatLastSeen(d.lastSeen),
          tags: d.tags || [],
          user: d.user,
          clientVersion: d.clientVersion,
          updateAvailable: d.updateAvailable,
          expires: d.expires,
        }));
        setDevices(formattedDevices);
        setApiError(null);
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to load devices');
    } finally {
      setIsLoadingDevices(false);
    }
  }, [fetchTailscaleData]);

  const loadAuditEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    try {
      const data = await fetchTailscaleData('audit-logs');
      if (data?.events) {
        const formattedEvents: AuditEvent[] = data.events.map((e: any) => ({
          id: e.id,
          type: e.type,
          timestamp: formatLastSeen(e.timestamp),
          device: e.device,
          os: e.os || 'Unknown',
          ip: e.ip,
          location: e.location || 'Via Tailnet',
          source: e.source,
          actor: e.actor,
          eventType: e.eventType,
        }));
        setRecentEvents(formattedEvents);
      }
    } catch (err) {
      console.error('Failed to load audit events:', err);
    } finally {
      setIsLoadingEvents(false);
    }
  }, [fetchTailscaleData]);

  const loadAuthKeys = useCallback(async () => {
    setIsLoadingKeys(true);
    try {
      const data = await fetchTailscaleData('keys');
      if (data?.keys) {
        setAuthKeys(data.keys);
      }
    } catch (err) {
      console.error('Failed to load auth keys:', err);
    } finally {
      setIsLoadingKeys(false);
    }
  }, [fetchTailscaleData]);

  const loadAllData = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([loadDevices(), loadAuditEvents(), loadAuthKeys()]);
    setLastCheckTime('Just now');
    setIsRefreshing(false);
  }, [loadDevices, loadAuditEvents, loadAuthKeys]);

  // Initial load and realtime polling
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    loadAllData();
    
    // Set up polling for realtime updates (every 30 seconds)
    pollingIntervalRef.current = setInterval(() => {
      loadAllData();
    }, 30000);
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [loadAllData]);

  const handleExport = () => {
    const report = {
      exportedAt: new Date().toISOString(),
      devices,
      recentEvents,
      authKeys,
      intelligenceFindings,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Security report exported');
  };

  const onlineDevices = devices.filter(d => d.status === 'online').length;
  const failedEvents = recentEvents.filter(e => e.type === 'failed').length;
  const expiringKeys = authKeys.filter(key => {
    if (!key.expires) return false;
    const expiresDate = new Date(key.expires);
    const daysUntilExpiry = Math.floor((expiresDate.getTime() - Date.now()) / 86400000);
    return daysUntilExpiry <= 7 && daysUntilExpiry >= 0;
  });

  const filteredFindings = useMemo(() => {
    return intelligenceFindings.filter(finding => {
      const matchesCategory = osintCategory === 'all' || 
        (osintCategory === 'high-severity' ? ['high', 'elevated'].includes(finding.severity) : finding.category === osintCategory);
      const matchesSearch = !searchQuery || 
        finding.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        finding.insight.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [osintCategory, searchQuery]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      case 'elevated': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'moderate': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
      case 'low': return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20';
      default: return 'bg-muted/50 text-muted-foreground border-border/50';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'breach': return <AlertTriangle className="h-4 w-4" />;
      case 'identity': return <Eye className="h-4 w-4" />;
      case 'infrastructure': return <Server className="h-4 w-4" />;
      case 'account': return <Key className="h-4 w-4" />;
      case 'leak': return <FileText className="h-4 w-4" />;
      default: return <Globe className="h-4 w-4" />;
    }
  };

  const getDeviceIcon = (os: string) => {
    const lower = os.toLowerCase();
    if (lower.includes('macos') || lower.includes('darwin')) return <Laptop className="h-5 w-5" />;
    if (lower.includes('ios') || lower.includes('android')) return <Smartphone className="h-5 w-5" />;
    return <Monitor className="h-5 w-5" />;
  };

  return (
    <div className="min-h-screen bg-background bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.06),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(5,150,105,0.06),transparent_28%)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-7 px-6 py-10">
        {/* Header */}
        <header className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur">
          <div className="absolute inset-0 opacity-50" aria-hidden>
            <div className="absolute -left-12 top-6 h-24 w-24 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="absolute right-4 top-0 h-28 w-28 rounded-full bg-muted/50 blur-3xl" />
          </div>

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-3 py-1 text-xs font-medium transition hover:border-border hover:bg-background/80"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
                </button>
                <Separator orientation="vertical" className="h-5" />
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <Wifi className="h-3 w-3" />
                  Tailnet connected
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-inner">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h1 className="text-3xl font-semibold text-foreground tracking-tight">Security</h1>
                  <p className="max-w-2xl text-base text-muted-foreground leading-relaxed">
                    Monitor access, verify devices, and track exposure across your network.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button 
                variant="ghost" 
                className="min-w-[120px] border border-border/70 bg-background/40 transition-all hover:scale-[1.02]"
                onClick={handleExport}
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button 
                className="min-w-[120px] shadow-sm transition-all hover:scale-[1.02] hover:shadow-md"
                onClick={loadAllData}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="relative mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Devices Online"
              value={String(onlineDevices)}
              helper={`of ${devices.length} total`}
              tone={onlineDevices > 0 ? 'positive' : 'neutral'}
              icon={<Shield className="h-4 w-4" />}
            />
            <StatCard
              label="Auth Keys"
              value={String(authKeys.length)}
              helper={expiringKeys.length > 0 ? `${expiringKeys.length} expiring soon` : 'All valid'}
              tone={expiringKeys.length > 0 ? 'negative' : 'positive'}
              icon={<Key className="h-4 w-4" />}
            />
            <StatCard
              label="Last Activity"
              value={devices.find(d => d.status === 'online')?.lastSeen?.split(' ')[0] || '--'}
              helper={devices.find(d => d.status === 'online')?.name || 'No active'}
              tone="info"
              icon={<Clock className="h-4 w-4" />}
            />
            <StatCard
              label="Intelligence"
              value={String(intelligenceFindings.length)}
              helper={`${intelligenceFindings.filter(f => ['elevated', 'high'].includes(f.severity)).length} need review`}
              tone="neutral"
              icon={<TrendingUp className="h-4 w-4" />}
            />
          </div>
        </header>

        {/* Content Grid */}
        <div className="grid gap-4 lg:grid-cols-12">
          {/* Devices Section */}
          <Card className="relative overflow-hidden border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur lg:col-span-7">
            <div className="absolute inset-0 pointer-events-none opacity-60">
              <div className="absolute right-6 top-4 h-12 w-12 rounded-full bg-muted/40 blur-2xl" />
            </div>
            
            <div className="relative mb-4 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-foreground">Connected Devices</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Active devices on your Tailnet
                </p>
              </div>
              {isLoadingDevices && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>

            {devices.length > 0 ? (
              <div className="space-y-2">
                {devices.map((device) => {
                  const isOnline = device.status === 'online';
                  return (
                    <div
                      key={device.id}
                      className="group relative flex items-center gap-4 rounded-2xl border border-border/60 bg-muted/30 p-4 transition-all hover:border-border hover:bg-muted/50"
                    >
                      <div className="relative">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background/80 text-muted-foreground transition-transform group-hover:scale-105">
                          {getDeviceIcon(device.os)}
                        </div>
                        {/* Status indicator dot */}
                        <div className={cn(
                          "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card",
                          isOnline ? "bg-emerald-500" : "bg-muted-foreground/40"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground truncate">{device.name}</p>
                          {device.updateAvailable && (
                            <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/50">
                              Update
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {device.tailnetIp} · {device.os}
                        </p>
                        <p className="text-xs text-muted-foreground/70">
                          {isOnline ? 'Connected now' : `Last seen ${device.lastSeen}`}
                        </p>
                      </div>
                      <Badge 
                        variant={isOnline ? 'default' : 'secondary'} 
                        className={cn(
                          "shrink-0",
                          isOnline && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        )}
                      >
                        {isOnline ? 'online' : 'offline'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground mb-4">
                  <Monitor className="h-8 w-8" />
                </div>
                <p className="font-medium text-foreground">No devices found</p>
                <p className="text-sm text-muted-foreground mt-1">Check your Tailscale configuration</p>
              </div>
            )}
          </Card>

          {/* Auth Keys Section */}
          <Card className="relative overflow-hidden border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur lg:col-span-5">
            <div className="absolute inset-0 pointer-events-none opacity-60">
              <div className="absolute right-6 top-4 h-12 w-12 rounded-full bg-muted/40 blur-2xl" />
            </div>
            
            <div className="relative mb-4 space-y-1">
              <h2 className="text-base font-semibold text-foreground">Auth Keys</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Manage authentication keys
              </p>
            </div>

            {authKeys.length > 0 ? (
              <div className="space-y-2">
                {authKeys.slice(0, 4).map((key) => {
                  const expiresDate = key.expires ? new Date(key.expires) : null;
                  const daysUntilExpiry = expiresDate ? Math.floor((expiresDate.getTime() - Date.now()) / 86400000) : null;
                  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry >= 0;
                  const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
                  
                  return (
                    <div
                      key={key.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 p-3 transition-all hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background/80 text-muted-foreground">
                          <Key className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {key.description || 'Unnamed key'}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{key.reusable ? 'Reusable' : 'Single-use'}</span>
                            {key.ephemeral && <span>· Ephemeral</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {isExpired ? (
                          <Badge variant="outline" className="text-xs text-rose-500 border-rose-500/50">
                            Expired
                          </Badge>
                        ) : isExpiringSoon ? (
                          <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/50">
                            {daysUntilExpiry}d left
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Valid
                          </Badge>
                        )}
                        {expiresDate && (
                          <span className="text-[10px] text-muted-foreground/70">
                            {isExpired ? 'Expired' : 'Expires'}: {format(expiresDate, 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground mb-3">
                  <Key className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-foreground">No auth keys</p>
                <p className="text-xs text-muted-foreground mt-1">Create keys in Tailscale admin</p>
              </div>
            )}
          </Card>

          {/* Threat Research & Intelligence */}
          <Card className="relative overflow-hidden border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur lg:col-span-12">
            <div className="absolute inset-0 pointer-events-none opacity-60">
              <div className="absolute right-6 top-4 h-12 w-12 rounded-full bg-muted/40 blur-2xl" />
            </div>
            
            <div className="relative mb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Radar className="h-5 w-5 text-emerald-500" />
                  <h2 className="text-base font-semibold text-foreground">Threat Research</h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Investigate exposure, track breaches, and conduct security research
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 bg-background/50 hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/50"
                  onClick={() => toast.info('New investigation coming soon')}
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  New Investigation
                </Button>
              </div>
            </div>

            {/* Research Actions */}
            <div className="grid gap-3 sm:grid-cols-3 mb-5">
              <button
                onClick={() => toast.info('Breach monitoring coming soon')}
                className="group flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-4 text-left transition-all hover:border-emerald-500/50 hover:bg-emerald-500/5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm">Breach Monitor</p>
                  <p className="text-xs text-muted-foreground">Check for exposed credentials</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
              
              <button
                onClick={() => toast.info('Identity search coming soon')}
                className="group flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-4 text-left transition-all hover:border-emerald-500/50 hover:bg-emerald-500/5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
                  <Target className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm">Identity Trace</p>
                  <p className="text-xs text-muted-foreground">Map digital footprint</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
              
              <button
                onClick={() => toast.info('Infrastructure scan coming soon')}
                className="group flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-4 text-left transition-all hover:border-emerald-500/50 hover:bg-emerald-500/5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                  <Server className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm">Infrastructure Scan</p>
                  <p className="text-xs text-muted-foreground">Analyze attack surface</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            </div>

            {/* Findings Section */}
            <div className="border-t border-border/40 pt-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <p className="text-sm font-medium text-foreground">Research Findings</p>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search findings..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-8 w-[180px] bg-background/50 text-sm"
                    />
                  </div>
                  <Select value={osintCategory} onValueChange={setOsintCategory}>
                    <SelectTrigger className="w-[130px] h-8 bg-background/50 text-sm">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="high-severity">High Severity</SelectItem>
                      <SelectItem value="breach">Breaches</SelectItem>
                      <SelectItem value="identity">Identity</SelectItem>
                      <SelectItem value="infrastructure">Infrastructure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                {filteredFindings.map((finding) => (
                  <div
                    key={finding.id}
                    className="rounded-2xl border border-border/60 bg-muted/30 overflow-hidden transition-all hover:border-border"
                  >
                    <button
                      onClick={() => setExpandedFinding(expandedFinding === finding.id ? null : finding.id)}
                      className="w-full flex items-center gap-4 p-4 text-left"
                    >
                      <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl shrink-0",
                        getSeverityColor(finding.severity)
                      )}>
                        {getCategoryIcon(finding.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground">{finding.title}</p>
                          <Badge variant="outline" className={cn("text-xs", getSeverityColor(finding.severity))}>
                            {finding.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{finding.insight}</p>
                      </div>
                      <ChevronRight className={cn(
                        "h-5 w-5 text-muted-foreground shrink-0 transition-transform",
                        expandedFinding === finding.id && "rotate-90"
                      )} />
                    </button>
                    
                    {expandedFinding === finding.id && (
                      <div className="px-4 pb-4 pt-0 border-t border-border/40 mt-0">
                        <div className="pt-4 space-y-4">
                          <p className="text-sm text-muted-foreground">{finding.significance}</p>
                          
                          {finding.context?.recommendations && (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recommendations</p>
                              <ul className="space-y-1">
                                {finding.context.recommendations.map((rec, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                    {rec}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                            <span>Confidence: {finding.confidence}%</span>
                            <span>·</span>
                            <span>Verified: {finding.lastVerified}</span>
                            <span>·</span>
                            <span className="capitalize">{finding.category}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {filteredFindings.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground mb-4">
                      <Eye className="h-8 w-8" />
                    </div>
                    <p className="font-medium text-foreground">No findings match your filter</p>
                    <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or category</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Services;
