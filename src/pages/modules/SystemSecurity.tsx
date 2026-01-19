import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ModuleTemplate, type ModuleSection, type ModuleStat } from "@/components/ModuleTemplate";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getAuthHeaders } from "@/lib/arloAuth";
import { useAuth } from "@/providers/AuthProvider";

const protections = [
  { title: "Network shield", description: "Firewall and VPN active", badge: "On" },
  { title: "Device posture", description: "Passcodes + biometrics required", badge: "Healthy" },
  { title: "App access", description: "Sensitive data masked on mobile", badge: "On" },
];

const alerts = [
  { title: "New login from Chrome", description: "Reviewed and approved", badge: "Cleared" },
  { title: "Access request: finance space", description: "Pending your approval", badge: "Needs review" },
];

interface Device {
  id: string;
  name: string;
  os: string;
  status: "online" | "offline";
  lastSeen: string;
}

export default function SystemSecurity() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    document.title = "Arlo";
  }, []);

  const formatLastSeen = (isoDate: string): string => {
    if (!isoDate) return "Unknown";
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const loadDevices = useCallback(async () => {
    setIsLoadingDevices(true);
    try {
      const authHeaders = await getAuthHeaders();
      if (!authHeaders) {
        throw new Error("Authentication required. Please connect to the Tailnet.");
      }

      const { data, error } = await supabase.functions.invoke("tailscale-api", {
        body: { action: "devices" },
        headers: authHeaders as Record<string, string>,
      });

      if (error) {
        throw new Error(error.message || "Failed to fetch Tailnet devices.");
      }

      const formattedDevices: Device[] = (data?.devices ?? []).map((device: any) => ({
        id: device.id,
        name: device.name,
        os: device.os,
        status: device.status,
        lastSeen: formatLastSeen(device.lastSeen),
      }));
      setDevices(formattedDevices);
      setApiError(null);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to load devices.");
      setDevices([]);
    } finally {
      setIsLoadingDevices(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      setApiError("Authentication required. Please connect to the Tailnet.");
      setDevices([]);
      return;
    }

    setApiError(null);
    loadDevices();

    pollingIntervalRef.current = setInterval(() => {
      if (isAuthenticated) {
        loadDevices();
      }
    }, 30000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [authLoading, isAuthenticated, loadDevices]);

  const deviceStats = useMemo(() => {
    const total = devices.length;
    const onlineCount = devices.filter((device) => device.status === "online").length;
    const offlineCount = total - onlineCount;

    return {
      total,
      onlineCount,
      offlineCount,
    };
  }, [devices]);

  const stats: ModuleStat[] = [
    {
      label: "Status",
      value: apiError ? "Degraded" : isLoadingDevices ? "Syncing" : "Protected",
      helper: apiError ? "Attention needed" : "Live monitoring",
      tone: apiError ? "negative" : "positive",
    },
    {
      label: "Devices",
      value: `${deviceStats.total}`,
      helper: `${deviceStats.onlineCount} online`,
      tone: "neutral",
    },
    {
      label: "Offline",
      value: `${deviceStats.offlineCount}`,
      helper: "Needs review",
      tone: deviceStats.offlineCount > 0 ? "negative" : "positive",
    },
    { label: "Uptime", value: "99.99%", helper: "Past week", tone: "positive" },
  ];

  const deviceItems = useMemo(() => {
    if (apiError) {
      return [
        {
          title: "Tailnet connection required",
          description: apiError,
          badge: "Action",
          tone: "negative" as const,
        },
      ];
    }

    if (isLoadingDevices && devices.length === 0) {
      return [
        {
          title: "Loading devices",
          description: "Fetching live connectivity from Tailnet.",
          badge: "Syncing",
          tone: "neutral" as const,
        },
      ];
    }

    if (devices.length === 0) {
      return [
        {
          title: "No devices found",
          description: "No active Tailnet devices are linked yet.",
          badge: "Idle",
          tone: "neutral" as const,
        },
      ];
    }

    return devices.map((device) => ({
      title: device.name,
      description:
        device.status === "online"
          ? `Online · ${device.os}`
          : `Last seen ${device.lastSeen} · ${device.os}`,
      badge: device.status === "online" ? "Online" : "Offline",
      tone: device.status === "online" ? ("positive" as const) : ("negative" as const),
    }));
  }, [apiError, devices, isLoadingDevices]);

  const sections: ModuleSection[] = [
    { title: "Active controls", description: "The protections currently enforced.", items: protections },
    { title: "Devices", description: "Signed-in hardware and posture checks.", items: deviceItems },
    { title: "Alerts", description: "Only the signals that need your review.", items: alerts },
  ];

  return (
    <ModuleTemplate
      icon={ShieldCheck}
      title="Security"
      description="A quiet pulse of your devices and access controls with just the alerts that matter."
      primaryAction="Review access"
      secondaryAction="Invite new device"
      stats={stats}
      sections={sections}
    />
  );
}
