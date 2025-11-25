import { useEffect } from "react";
import { ModuleTemplate, type ModuleSection, type ModuleStat } from "@/components/ModuleTemplate";
import { ShieldCheck } from "lucide-react";

const protections = [
  { title: "Network shield", description: "Firewall and VPN active", badge: "On" },
  { title: "Device posture", description: "Passcodes + biometrics required", badge: "Healthy" },
  { title: "App access", description: "Sensitive data masked on mobile", badge: "On" },
];

const devices = [
  { title: "MacBook Pro", description: "Online · San Francisco", badge: "Trusted" },
  { title: "iPhone 15", description: "Online · iOS 17", badge: "Trusted" },
  { title: "iPad", description: "Last seen 2d ago", badge: "Check" },
];

const alerts = [
  { title: "New login from Chrome", description: "Reviewed and approved", badge: "Cleared" },
  { title: "Access request: finance space", description: "Pending your approval", badge: "Needs review" },
];

export default function SystemSecurity() {
  useEffect(() => {
    document.title = "Security — Arlo";
  }, []);

  const stats: ModuleStat[] = [
    { label: "Status", value: "Protected", helper: "Live monitoring", tone: "positive" },
    { label: "Devices", value: "3", helper: "2 online", tone: "neutral" },
    { label: "Incidents", value: "0", helper: "Last 30 days", tone: "positive" },
    { label: "Uptime", value: "99.99%", helper: "Past week", tone: "positive" },
  ];

  const sections: ModuleSection[] = [
    { title: "Active controls", description: "The protections currently enforced.", items: protections },
    { title: "Devices", description: "Signed-in hardware and posture checks.", items: devices },
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

