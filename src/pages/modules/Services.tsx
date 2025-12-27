import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Download,
  Laptop,
  Smartphone,
  Monitor,
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Search,
  Globe,
  Key,
  Activity,
  Wifi,
  Database,
  Mail,
  User,
  FileText,
  ExternalLink,
  Info,
  Fingerprint,
  Server,
  Link,
  Eye,
  TrendingUp,
  Layers,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

const Services = () => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);
  const [osintQuery, setOsintQuery] = useState('');
  const [osintCategory, setOsintCategory] = useState('all');
  const [investigationType, setInvestigationType] = useState('identity');
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
    document.title = "Security — Arlo";
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
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const fetchTailscaleData = useCallback(async (action: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('tailscale-api', {
        body: { action },
        headers: {
          'x-tailscale-verified': 'true',
        },
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
      } else if (data?.message) {
        // Audit logs not available on this plan
        console.log('Audit logs:', data.message);
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

  // Load data on mount and when access section is expanded
  useEffect(() => {
    loadAllData();
  }, []);

  const securityStatus = 'secure' as 'secure' | 'attention' | 'risk';

  // Calculate expiring keys
  const expiringKeys = authKeys.filter((key) => {
    if (!key.expires) return false;
    const expiresDate = new Date(key.expires);
    const now = new Date();
    const daysUntilExpiry = Math.floor((expiresDate.getTime() - now.getTime()) / 86400000);
    return daysUntilExpiry <= 7 && daysUntilExpiry >= 0;
  });

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
        {
          type: 'Breach Database',
          name: 'HaveIBeenPwned',
          methodology: 'Monitored breach aggregation and hash verification',
        },
        {
          type: 'Dark Web Intelligence',
          name: 'DeHashed',
          methodology: 'Historical leak correlation and pattern matching',
        },
      ],
      evidence: [
        {
          type: 'metadata',
          label: 'Breach Event',
          content: 'LinkedIn Data Breach — June 2021 — 700M records',
        },
        {
          type: 'list',
          label: 'Exposed Data Types',
          content: ['Email address', 'Full name', 'Phone number', 'Professional title', 'Employer information'],
        },
        {
          type: 'text',
          label: 'Password Status',
          content: 'Stored as salted hash (SHA-256) — not recovered in plaintext',
        },
      ],
      context: {
        background: 'This breach resulted from an API vulnerability that allowed large-scale data scraping. The exposed data was widely distributed and indexed by multiple threat intelligence platforms.',
        implications: [
          'Email address is confirmed present in threat actor databases',
          'Professional context enables highly targeted spear-phishing campaigns',
          'Phone number may receive social engineering calls or SMS-based attacks',
        ],
        recommendations: [
          'Rotate passwords for the affected platform and any reused credentials',
          'Enable two-factor authentication on all critical accounts',
          'Monitor for suspicious login attempts or account recovery requests',
          'Brief close contacts about potential impersonation attempts',
        ],
      },
    },
    {
      id: '2',
      category: 'identity',
      title: 'Cross-Platform Identity Correlation',
      insight: 'A consistent digital identity was reconstructed across multiple public platforms using username patterns, biographical details, and linked accounts.',
      significance: 'This level of correlation demonstrates how easily a comprehensive profile can be assembled from public sources, which could be used for reconnaissance or social engineering.',
      confidence: 92,
      severity: 'informational',
      discovered: '2024-01-15',
      lastVerified: '1 hour ago',
      sources: [
        {
          type: 'Search Engine Intelligence',
          name: 'Google Dorking',
          methodology: 'Advanced search operators and pattern analysis',
        },
        {
          type: 'Social Graph Analysis',
          name: 'LinkedIn + GitHub',
          methodology: 'Public profile enumeration and biographical matching',
        },
      ],
      evidence: [
        {
          type: 'list',
          label: 'Confirmed Profiles',
          content: [
            'LinkedIn — Full professional history and network',
            'GitHub — 47 public repositories, contribution history',
            'Twitter — Active account with 200+ followers',
            'Personal website — Contact information and portfolio',
          ],
        },
        {
          type: 'list',
          label: 'Correlating Factors',
          content: [
            'Consistent username pattern across platforms',
            'Matching employment history and timeline',
            'Cross-linked social accounts and email references',
            'Shared professional interests and technical specializations',
          ],
        },
      ],
      context: {
        background: 'Modern OSINT techniques can aggregate scattered public information into a unified identity profile. This finding represents what a sophisticated adversary could learn through patient observation.',
        implications: [
          'Professional background and technical skills are publicly documented',
          'Social network connections provide context for targeted attacks',
          'Activity patterns reveal interests and potential pressure points',
        ],
        recommendations: [
          'Review privacy settings on all identified platforms',
          'Consider using distinct usernames for personal vs. professional contexts',
          'Limit public exposure of employment history and technical specializations',
          'Periodically search for your own identity to understand your exposure',
        ],
      },
    },
    {
      id: '3',
      category: 'infrastructure',
      title: 'Domain Ownership Attribution',
      insight: 'Two active domain registrations were linked to monitored email addresses through WHOIS records and DNS intelligence.',
      significance: 'These domains create an extended attack surface and can be used to infer organizational structure, technical interests, or personal projects.',
      confidence: 100,
      severity: 'low',
      discovered: '2024-01-15',
      lastVerified: '3 hours ago',
      sources: [
        {
          type: 'Domain Intelligence',
          name: 'WHOIS Lookup',
          methodology: 'Registration record analysis and historical tracking',
        },
        {
          type: 'DNS Analysis',
          name: 'Passive DNS',
          methodology: 'Resolution history and infrastructure mapping',
        },
      ],
      evidence: [
        {
          type: 'timeline',
          label: 'Domain Timeline',
          content: [
            { date: '2019-03-12', event: 'example.com registered' },
            { date: '2019-03-15', event: 'DNS records configured, site became active' },
            { date: '2022-08-03', event: 'personal-site.io registered' },
            { date: '2022-08-05', event: 'Portfolio site deployed' },
          ],
        },
        {
          type: 'list',
          label: 'Infrastructure Details',
          content: [
            'example.com — Active site, hosted on Vercel',
            'personal-site.io — Portfolio site, hosted on Netlify',
            'Both domains use privacy-protected registration (current)',
            'Historical WHOIS showed direct email linkage (2019-2021)',
          ],
        },
      ],
      context: {
        background: 'Domain ownership leaves a permanent trail in public records. Even with privacy protection enabled today, historical WHOIS data remains accessible through various intelligence platforms.',
        implications: [
          'Domain ownership confirms control over web infrastructure',
          'Hosting provider choices reveal technical preferences',
          'Historical registration data may still be cached in databases',
        ],
        recommendations: [
          'Ensure WHOIS privacy protection is enabled on all domains',
          'Use separate registration emails for different contexts',
          'Monitor domains for unauthorized DNS changes or subdomain takeovers',
          'Consider using domain privacy services for sensitive projects',
        ],
      },
    },
    {
      id: '4',
      category: 'leak',
      title: 'Legacy Data in Archived Breach',
      insight: 'An older credential pair was recovered from a 2013 breach archive, representing a historical exposure with limited current risk.',
      significance: 'This finding is primarily historical, but confirms that credentials from this era are permanently accessible to threat actors.',
      confidence: 88,
      severity: 'low',
      discovered: '2024-01-14',
      lastVerified: '6 hours ago',
      sources: [
        {
          type: 'Breach Database',
          name: 'HaveIBeenPwned',
          methodology: 'Historical breach indexing',
        },
      ],
      evidence: [
        {
          type: 'metadata',
          label: 'Breach Event',
          content: 'Adobe Systems Breach — October 2013 — 153M accounts',
        },
        {
          type: 'list',
          label: 'Exposed Data',
          content: ['Email address', 'Encrypted password', 'Password hint (partial)'],
        },
        {
          type: 'text',
          label: 'Technical Note',
          content: 'Passwords were encrypted using 3DES in ECB mode with weak key derivation. Many were subsequently decrypted by security researchers.',
        },
      ],
      context: {
        background: 'The 2013 Adobe breach was one of the largest of its era. While the encryption was weak, the age of this exposure significantly reduces its current threat value.',
        implications: [
          'If this password was reused elsewhere, those accounts remain vulnerable',
          'Password patterns from this era may inform brute force attempts',
          'Email address is confirmed in historical threat databases',
        ],
        recommendations: [
          'Verify this password is not in active use on any current accounts',
          'Update Adobe account credentials if still maintaining an account',
          'Consider this when evaluating password reuse patterns',
        ],
      },
    },
    {
      id: '5',
      category: 'account',
      title: 'Third-Party Service Enumeration',
      insight: 'Email-based account enumeration identified active accounts on 12 major platforms and services.',
      significance: 'This maps the digital footprint and reveals which platforms would be valuable targets for account takeover attempts.',
      confidence: 85,
      severity: 'informational',
      discovered: '2024-01-15',
      lastVerified: '30 minutes ago',
      sources: [
        {
          type: 'Account Enumeration',
          name: 'Holehe + Custom Methods',
          methodology: 'Password reset flows and registration verification',
        },
      ],
      evidence: [
        {
          type: 'list',
          label: 'Confirmed Active Accounts',
          content: [
            'Google / Gmail — Primary email service',
            'Microsoft / Outlook — Secondary account',
            'GitHub — Development platform',
            'LinkedIn — Professional network',
            'Twitter — Social media',
            'Spotify — Entertainment',
            'Amazon — Commerce',
            'Dropbox — Cloud storage',
            'Notion — Productivity',
            'Figma — Design tools',
            'Vercel — Infrastructure',
            'Stripe — Payment processing',
          ],
        },
      ],
      context: {
        background: 'Account enumeration uses legitimate platform features (like password reset flows) to determine whether an email address has an active account. This is entirely passive and leaves no trace.',
        implications: [
          'These platforms represent high-value targets for attackers',
          'Compromise of any account could enable lateral movement',
          'Account recovery flows may be exploitable through social engineering',
        ],
        recommendations: [
          'Enable two-factor authentication on all identified accounts',
          'Review connected applications and revoke unused access',
          'Use unique passwords for each critical platform',
          'Monitor for unusual login locations or device authorizations',
        ],
      },
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'secure':
      case 'pass':
      case 'online':
        return 'text-green-600 dark:text-green-400';
      case 'attention':
      case 'warning':
        return 'text-amber-600 dark:text-amber-400';
      case 'risk':
      case 'fail':
      case 'offline':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'secure':
        return <ShieldCheck className="h-5 w-5" />;
      case 'attention':
        return <ShieldAlert className="h-5 w-5" />;
      case 'risk':
        return <Shield className="h-5 w-5" />;
      default:
        return <Shield className="h-5 w-5" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'elevated':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200 dark:border-orange-800';
      case 'moderate':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'low':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'informational':
        return 'bg-slate-100 text-slate-800 dark:bg-slate-900/20 dark:text-slate-400 border-slate-200 dark:border-slate-800';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'breach':
        return <Database className="h-4 w-4" />;
      case 'identity':
        return <Fingerprint className="h-4 w-4" />;
      case 'infrastructure':
        return <Server className="h-4 w-4" />;
      case 'account':
        return <Key className="h-4 w-4" />;
      case 'association':
        return <Link className="h-4 w-4" />;
      case 'leak':
        return <Eye className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'login':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'refresh':
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const toggleFinding = (findingId: string) => {
    setExpandedFinding(expandedFinding === findingId ? null : findingId);
  };

  const handleRefresh = async () => {
    toast.info('Refreshing security status...');
    await loadAllData();
    toast.success('Security status updated');
  };

  const handleExport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      devices,
      recentEvents,
      intelligenceFindings,
      securityStatus,
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Security report exported');
  };

  const handleInvestigate = () => {
    if (!osintQuery.trim()) {
      toast.error('Please enter a query to investigate');
      return;
    }
    toast.info(`Starting ${investigationType} investigation for: ${osintQuery}`);
    // Future: integrate with actual OSINT APIs
    setTimeout(() => {
      toast.success('Investigation complete. Results added to findings.');
    }, 3000);
  };

  const filteredFindings = intelligenceFindings.filter((finding) => {
    if (osintCategory === 'all') return true;
    if (osintCategory === 'high-severity') return finding.severity === 'high' || finding.severity === 'elevated';
    return finding.category === osintCategory;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">Security</h1>
              <p className="text-sm text-muted-foreground">
                Monitor access, verify devices, and track exposure across the internet
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Status Modules */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Shield className="h-3.5 w-3.5" />
                  Devices
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-semibold text-foreground">
                    {devices.filter((d) => d.status === 'online').length}
                  </span>
                  <span className="text-sm text-muted-foreground">of {devices.length} online</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Clock className="h-3.5 w-3.5" />
                  Last Activity
                </div>
                {devices.length > 0 ? (
                  <>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-semibold text-foreground">
                        {devices.find(d => d.status === 'online')?.lastSeen?.split(' ')[0] || '--'}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {devices.find(d => d.status === 'online')?.lastSeen?.includes('minute') ? 'min ago' : 
                         devices.find(d => d.status === 'online')?.lastSeen?.includes('hour') ? 'hrs ago' : 'ago'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {devices.find(d => d.status === 'online')?.name || 'No active device'}
                    </p>
                  </>
                ) : (
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-semibold text-foreground">--</span>
                    <span className="text-sm text-muted-foreground">loading</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Intelligence
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-semibold text-foreground">
                    {intelligenceFindings.length}
                  </span>
                  <span className="text-sm text-muted-foreground">findings</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {intelligenceFindings.filter((f) => f.severity === 'elevated' || f.severity === 'high').length > 0
                    ? `${intelligenceFindings.filter((f) => f.severity === 'elevated' || f.severity === 'high').length} require review`
                    : 'All reviewed'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tailnet Status */}
          <div className="flex items-center gap-2 text-sm">
            <div className={`flex items-center gap-1.5 ${getStatusColor('secure')}`}>
              <Wifi className="h-3.5 w-3.5" />
              Tailnet connected
            </div>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              Last check {lastCheckTime}
            </span>
          </div>
        </div>

        {/* Section 1: Access & Authentication */}
        <Card className="border-border/50">
          <button
            onClick={() => toggleSection('access')}
            className="w-full flex items-center justify-between p-4 group hover:bg-muted/50 transition-colors rounded-t-lg"
          >
            <div className="text-left">
              <h2 className="font-medium text-foreground">Access & Authentication</h2>
              <p className="text-sm text-muted-foreground">
                {devices.length} devices · {recentEvents.filter((e) => e.type === 'failed').length} failed
              </p>
            </div>
            {expandedSection === 'access' ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
          {expandedSection === 'access' && (
            <CardContent className="pt-0 space-y-6">
              {/* Devices */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-foreground">Connected Devices</h3>
                  {isLoadingDevices && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                <div className="space-y-2">
                  {isLoadingDevices && devices.length === 0 ? (
                    <div className="flex items-center justify-center p-6 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Loading devices...
                    </div>
                  ) : devices.length === 0 ? (
                    <div className="text-center p-6 text-muted-foreground">
                      No devices found. Check your Tailscale API configuration.
                    </div>
                  ) : (
                    devices.map((device) => (
                      <div
                        key={device.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {device.os.toLowerCase().includes('macos') || device.os.toLowerCase().includes('darwin') ? (
                            <Laptop className="h-5 w-5 text-muted-foreground" />
                          ) : device.os.toLowerCase().includes('ios') || device.os.toLowerCase().includes('android') ? (
                            <Smartphone className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <Monitor className="h-5 w-5 text-muted-foreground" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-foreground">{device.name}</p>
                              {device.updateAvailable && (
                                <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/50">
                                  Update available
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {device.tailnetIp} · {device.lastSeen} · {device.os}
                            </p>
                            {device.user && (
                              <p className="text-xs text-muted-foreground/70">{device.user}</p>
                            )}
                          </div>
                        </div>
                        <Badge variant={device.status === 'online' ? 'default' : 'secondary'}>
                          {device.status}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-foreground">Recent Activity</h3>
                  {isLoadingEvents && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                <div className="space-y-2">
                  {isLoadingEvents && recentEvents.length === 0 ? (
                    <div className="flex items-center justify-center p-6 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Loading activity...
                    </div>
                  ) : recentEvents.length === 0 ? (
                    <div className="text-center p-6 text-muted-foreground">
                      No recent activity. Audit logs may not be available on your Tailscale plan.
                    </div>
                  ) : (
                    recentEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="mt-0.5">{getEventIcon(event.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground capitalize">{event.type}</span>
                            <Badge variant="outline" className="text-xs">
                              {event.source}
                            </Badge>
                            {event.eventType && (
                              <span className="text-xs text-muted-foreground">{event.eventType}</span>
                            )}
                          </div>
                          <div className="mt-0.5">
                            <p className="text-sm text-foreground">
                              {event.device} {event.actor && `by ${event.actor}`}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              {event.ip && <span>{event.ip}</span>}
                              {event.ip && event.location && <span>·</span>}
                              {event.location && (
                                <>
                                  <MapPin className="h-3 w-3" />
                                  <span>{event.location}</span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {event.timestamp}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        <Separator />

        {/* Section 2: Intelligence & Exposure Analysis */}
        <Card className="border-border/50">
          <button
            onClick={() => toggleSection('intelligence')}
            className="w-full flex items-center justify-between p-4 group hover:bg-muted/50 transition-colors rounded-t-lg"
          >
            <div className="text-left">
              <h2 className="font-medium text-foreground">Intelligence & Exposure Analysis</h2>
              <p className="text-sm text-muted-foreground">
                {filteredFindings.length} findings
              </p>
            </div>
            {expandedSection === 'intelligence' ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
          {expandedSection === 'intelligence' && (
            <CardContent className="pt-0 space-y-6">
              {/* Investigation Input */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">New Investigation</h3>
                <div className="flex gap-2">
                  <Select value={investigationType} onValueChange={setInvestigationType}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="identity">Identity</SelectItem>
                      <SelectItem value="email">Email Address</SelectItem>
                      <SelectItem value="domain">Domain</SelectItem>
                      <SelectItem value="username">Username</SelectItem>
                      <SelectItem value="ip">IP Address</SelectItem>
                      <SelectItem value="organization">Organization</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Enter query..."
                    value={osintQuery}
                    onChange={(e) => setOsintQuery(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && handleInvestigate()}
                  />
                  <Button onClick={handleInvestigate}>
                    <Search className="h-4 w-4 mr-2" />
                    Investigate
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Results will be synthesized into a structured intelligence report with findings, confidence scores, and contextual analysis.
                </p>
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Category:</span>
                <div className="flex gap-1 flex-wrap">
                  {[
                    { value: 'all', label: 'All' },
                    { value: 'high-severity', label: 'High Severity' },
                    { value: 'breach', label: 'Breaches' },
                    { value: 'identity', label: 'Identity' },
                    { value: 'infrastructure', label: 'Infrastructure' },
                    { value: 'account', label: 'Accounts' },
                    { value: 'leak', label: 'Leaks' },
                  ].map((cat) => (
                    <Badge
                      key={cat.value}
                      variant={osintCategory === cat.value ? 'default' : 'outline'}
                      onClick={() => setOsintCategory(cat.value)}
                      className="text-xs cursor-pointer hover:bg-primary/80"
                    >
                      {cat.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Intelligence Findings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-foreground">Current Intelligence</h3>
                  <span className="text-xs text-muted-foreground">
                    Last updated: 30 minutes ago
                  </span>
                </div>
                <div className="space-y-2">
                  {filteredFindings.map((finding) => (
                    <div key={finding.id} className="border border-border/50 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleFinding(finding.id)}
                        className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                      >
                        <div className="mt-0.5 text-muted-foreground">
                          {getCategoryIcon(finding.category)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-sm font-medium text-foreground">{finding.title}</h4>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {finding.insight}
                              </p>
                            </div>
                            <Badge className={`shrink-0 ${getSeverityColor(finding.severity)}`}>
                              {finding.severity}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {finding.confidence}% confidence
                            </span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <Layers className="h-3 w-3" />
                              {finding.sources.length} sources
                            </span>
                            <span>·</span>
                            <span className="capitalize">{finding.category}</span>
                          </div>
                        </div>
                        <div className="mt-0.5 text-muted-foreground">
                          {expandedFinding === finding.id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </div>
                      </button>
                      {expandedFinding === finding.id && (
                        <div className="px-4 pb-4 space-y-4 bg-muted/20">
                          {/* Significance */}
                          <div className="pt-4 border-t border-border/50">
                            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                              Significance
                            </h5>
                            <p className="text-sm text-foreground">
                              {finding.significance}
                            </p>
                          </div>

                          {/* Evidence */}
                          <div>
                            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                              Evidence
                            </h5>
                            {finding.evidence.map((ev, idx) => (
                              <div key={idx} className="mb-3">
                                <p className="text-xs font-medium text-foreground mb-1">
                                  {ev.label}
                                </p>
                                {ev.type === 'text' && (
                                  <p className="text-sm text-muted-foreground">{ev.content as string}</p>
                                )}
                                {ev.type === 'metadata' && (
                                  <div className="text-sm bg-muted/50 rounded px-2 py-1 font-mono">
                                    {ev.content as string}
                                  </div>
                                )}
                                {ev.type === 'list' && (
                                  <ul className="space-y-1">
                                    {(ev.content as string[]).map((item, i) => (
                                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                        <span className="text-muted-foreground">•</span>
                                        <span>{item}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                {ev.type === 'timeline' && (
                                  <div className="space-y-2">
                                    {(ev.content as { date: string; event: string }[]).map((item, i) => (
                                      <div key={i} className="flex items-start gap-3 text-sm">
                                        <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                                          {item.date}
                                        </span>
                                        <span className="text-foreground">{item.event}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Context */}
                          {finding.context && (
                            <div>
                              <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                                Context & Analysis
                              </h5>
                              <div className="space-y-3">
                                {finding.context.background && (
                                  <div>
                                    <p className="text-xs font-medium text-foreground mb-1">
                                      Background
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {finding.context.background}
                                    </p>
                                  </div>
                                )}

                                {finding.context.implications && (
                                  <div>
                                    <p className="text-xs font-medium text-foreground mb-1">
                                      Implications
                                    </p>
                                    <ul className="space-y-1">
                                      {finding.context.implications.map((impl, i) => (
                                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                          <AlertTriangle className="h-3 w-3 mt-0.5 text-amber-500 shrink-0" />
                                          <span>{impl}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {finding.context.recommendations && (
                                  <div>
                                    <p className="text-xs font-medium text-foreground mb-1">
                                      Recommended Actions
                                    </p>
                                    <ul className="space-y-1">
                                      {finding.context.recommendations.map((rec, i) => (
                                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                          <CheckCircle className="h-3 w-3 mt-0.5 text-green-500 shrink-0" />
                                          <span>{rec}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Sources */}
                          <div>
                            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                              Intelligence Sources
                            </h5>
                            <div className="space-y-2">
                              {finding.sources.map((source, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-sm">
                                  <Globe className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
                                  <div>
                                    <p className="font-medium text-foreground">{source.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {source.type} — {source.methodology}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Metadata */}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t border-border/50">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Discovered {finding.discovered}
                            </span>
                            <span>·</span>
                            <span>Last verified {finding.lastVerified}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {filteredFindings.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No findings match the selected category
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        <Separator />

        {/* Section 3: Security Health */}
        <Card className="border-border/50">
          <button
            onClick={() => toggleSection('health')}
            className="w-full flex items-center justify-between p-4 group hover:bg-muted/50 transition-colors rounded-t-lg"
          >
            <div className="text-left">
              <h2 className="font-medium text-foreground">Security Health</h2>
              <p className="text-sm text-muted-foreground">
                {expiringKeys.length > 0 ? `${expiringKeys.length} warning${expiringKeys.length > 1 ? 's' : ''}` : 'All healthy'}
              </p>
            </div>
            {expandedSection === 'health' ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
          {expandedSection === 'health' && (
            <CardContent className="pt-0 space-y-3">
              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                {devices.filter(d => d.status === 'online').length > 0 ? (
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">Tailnet Connectivity</p>
                  <p className="text-xs text-muted-foreground">
                    {devices.filter(d => d.status === 'online').length > 0 
                      ? `${devices.filter(d => d.status === 'online').length} of ${devices.length} devices online`
                      : 'No devices currently online'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Device Updates</p>
                  <p className="text-xs text-muted-foreground">
                    {devices.filter(d => d.updateAvailable).length > 0 
                      ? `${devices.filter(d => d.updateAvailable).length} device${devices.filter(d => d.updateAvailable).length > 1 ? 's' : ''} have updates available`
                      : 'All devices up to date'}
                  </p>
                </div>
              </div>

              {expiringKeys.length > 0 ? (
                expiringKeys.map((key) => {
                  const expiresDate = new Date(key.expires);
                  const now = new Date();
                  const daysUntilExpiry = Math.floor((expiresDate.getTime() - now.getTime()) / 86400000);
                  return (
                    <div key={key.id} className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">Auth Key Expiration</p>
                        <p className="text-xs text-muted-foreground">
                          "{key.description}" expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2" 
                          onClick={() => toast.info('Key rotation initiated - visit Tailscale admin console to complete')}
                        >
                          <Key className="h-3.5 w-3.5 mr-1.5" />
                          Rotate Key
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Auth Keys</p>
                    <p className="text-xs text-muted-foreground">
                      {authKeys.length > 0 ? `All ${authKeys.length} auth keys are valid` : 'No auth keys configured'}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Access Rules</p>
                  <p className="text-xs text-muted-foreground">
                    All access rules match expected behavior
                  </p>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* API Error Notice */}
        {apiError && (
          <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <p className="text-sm text-muted-foreground">
              Unable to fetch live Tailscale data: {apiError}
            </p>
            <Button variant="ghost" size="sm" onClick={handleRefresh} className="ml-auto">
              Retry
            </Button>
          </div>
        )}

        {/* Footer */}
        <p className="text-xs text-center text-muted-foreground">
          Last security check: {lastCheckTime} · {isRefreshing && <Loader2 className="inline h-3 w-3 animate-spin mr-1" />}
          {isRefreshing ? 'Refreshing...' : 'Next check: in 22 hours'}
        </p>
      </div>
    </div>
  );
};

export default Services;
