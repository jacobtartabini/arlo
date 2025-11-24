import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Archive,
  ArrowLeft,
  FilePenLine,
  FolderOpen,
  FolderSearch,
  Globe,
  HardDrive,
  Link,
  Loader2,
  Lock,
  Network,
  RefreshCcw,
  Server,
  UploadCloud,
  Usb,
  Wand2
} from "lucide-react";
import { FloatingChatBar } from "@/components/FloatingChatBar";

const drives = [
  {
    name: "External SSD",
    mount: "/media/pi/ssd",
    capacity: "1 TB",
    used: 62,
    health: "Healthy",
    role: "Primary workspace"
  },
  {
    name: "Archive",
    mount: "/media/pi/archive",
    capacity: "2 TB",
    used: 38,
    health: "Indexed",
    role: "Backups + media"
  }
];

const recentActivity = [
  { action: "Upload", detail: "Specs.pdf → /workspace/docs", time: "Just now" },
  { action: "Share", detail: "Research folder link created", time: "6m ago" },
  { action: "Edit", detail: "notes.md via Filebrowser", time: "24m ago" }
];

type CollectionAccent = "primary" | "accent";

const smartCollections: {
  title: string;
  description: string;
  icon: typeof FolderSearch;
  accent: CollectionAccent;
}[] = [
  {
    title: "Projects",
    description: "Shared folders synced with Arlo automations",
    icon: FolderSearch,
    accent: "primary"
  },
  {
    title: "Backups",
    description: "Nightly snapshots + integrity reports",
    icon: Archive,
    accent: "accent"
  },
  {
    title: "Shared links",
    description: "Expiring links generated from Filebrowser",
    icon: Link,
    accent: "primary"
  }
];

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.05 }
  })
};

export default function Files() {
  const navigate = useNavigate();
  const [isRescanning, setIsRescanning] = useState(false);

  useEffect(() => {
    document.title = "Files & Storage — Arlo";
  }, []);

  const handleRescan = async () => {
    setIsRescanning(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    setIsRescanning(false);
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 spatial-grid opacity-30" />

      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 p-6 flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="glass rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Files & Storage</h1>
              <p className="text-sm text-muted-foreground">
                Manage disks connected to your Arlo Pi and browse them with Filebrowser.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="glass" onClick={handleRescan} disabled={isRescanning}>
            {isRescanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
            Rescan drives
          </Button>
          <Button className="glass-intense">
            <Wand2 className="w-4 h-4 mr-2" />
            Open Filebrowser
          </Button>
        </div>
      </motion.header>

      <main className="relative z-10 p-6 pb-32">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={0} className="lg:col-span-2">
              <Card className="glass p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Server className="w-5 h-5 text-primary" />
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">Filebrowser on Arlo Pi</h2>
                      <p className="text-xs text-muted-foreground">Self-hosted explorer with upload, edit, and sharing.</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20">
                    Running
                  </Badge>
                </div>
                <div className="grid gap-4 sm:grid-cols-3 text-sm">
                  <div className="rounded-lg border border-border/40 p-3">
                    <p className="text-xs text-muted-foreground">Endpoint</p>
                    <p className="text-foreground font-semibold">https://arlo.local:8080</p>
                    <p className="text-xs text-muted-foreground">Reverse-proxied + Tailscale</p>
                  </div>
                  <div className="rounded-lg border border-border/40 p-3">
                    <p className="text-xs text-muted-foreground">Auth</p>
                    <p className="text-foreground font-semibold">Pi users + Arlo session</p>
                    <p className="text-xs text-muted-foreground">Sudo-free editing, markdown preview</p>
                  </div>
                  <div className="rounded-lg border border-border/40 p-3">
                    <p className="text-xs text-muted-foreground">Mounts indexed</p>
                    <p className="text-foreground font-semibold">{drives.length} attached</p>
                    <p className="text-xs text-muted-foreground">Ready for uploads & shares</p>
                  </div>
                </div>
                <div className="rounded-lg border border-dashed border-primary/40 p-4 flex items-start gap-3 text-sm">
                  <Globe className="w-4 h-4 text-primary mt-0.5" />
                  <div>
                    <p className="text-foreground font-medium">Powered by Filebrowser</p>
                    <p className="text-muted-foreground text-xs">
                      Plug in a drive, mount it at /media/pi/…, then hit "Rescan drives" to expose it instantly in the Files module.
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={1}>
              <Card className="glass p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Network className="w-5 h-5 text-primary" />
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Remote access</h3>
                      <p className="text-xs text-muted-foreground">Secure tunnel + HTTPS</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-primary/30 text-primary">
                    Protected
                  </Badge>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Tailscale</span>
                    <span className="text-emerald-400">Connected</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">SSL</span>
                    <span className="text-foreground">Let's Encrypt</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Shares</span>
                    <span className="text-foreground">Expiring links</span>
                  </div>
                </div>
                <div className="rounded-lg bg-primary/10 p-3 text-xs text-primary flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Arlo can revoke external links automatically after review.
                </div>
              </Card>
            </motion.div>
          </div>

          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={2}>
            <Card className="glass p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <HardDrive className="w-5 h-5 text-primary" />
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Attached drives</h2>
                    <p className="text-xs text-muted-foreground">Mount points from your Raspberry Pi.</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-primary/30 text-primary">
                  Auto-mount ready
                </Badge>
              </div>
              <div className="space-y-4">
                {drives.map((drive) => (
                  <div
                    key={drive.mount}
                    className="rounded-xl border border-border/40 p-4 bg-background/60 grid gap-4 sm:grid-cols-5"
                  >
                    <div className="sm:col-span-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <Usb className="w-4 h-4 text-primary" />
                        <p className="text-foreground font-semibold">{drive.name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{drive.mount}</p>
                      <p className="text-xs text-muted-foreground">{drive.role}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Usage</p>
                      <p className="text-foreground text-sm font-medium">{drive.used}% of {drive.capacity}</p>
                      <Progress value={drive.used} className="h-2" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Health</p>
                      <p className="text-emerald-400 text-sm font-medium">{drive.health}</p>
                    </div>
                    <div className="flex items-center gap-2 justify-end sm:justify-start">
                      <Button variant="outline" size="sm" className="glass">
                        <FilePenLine className="w-4 h-4 mr-2" />
                        Browse
                      </Button>
                      <Button size="sm" className="glass-intense">
                        <UploadCloud className="w-4 h-4 mr-2" />
                        Upload
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-3">
            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={3}>
              <Card className="glass p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FolderSearch className="w-5 h-5 text-primary" />
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Recent activity</h3>
                      <p className="text-xs text-muted-foreground">Uploads, edits, shares</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    Live sync
                  </Badge>
                </div>
                <div className="space-y-3 text-sm">
                  {recentActivity.map((item) => (
                    <div key={item.detail} className="rounded-lg border border-border/40 p-3 flex items-center justify-between">
                      <div>
                        <p className="text-foreground font-medium">{item.action}</p>
                        <p className="text-xs text-muted-foreground">{item.detail}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{item.time}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg bg-primary/10 p-3 text-xs text-primary flex items-center gap-2">
                  <UploadCloud className="w-4 h-4" />
                  Drag-and-drop uploads land in /media/pi/ssd/uploads.
                </div>
              </Card>
            </motion.div>

            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={4}>
              <Card className="glass p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Link className="w-5 h-5 text-primary" />
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Sharing & links</h3>
                      <p className="text-xs text-muted-foreground">Generate Filebrowser links</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-primary/30 text-primary">
                    Audited
                  </Badge>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="rounded-lg border border-border/40 p-3">
                    <p className="text-xs text-muted-foreground">Quick share</p>
                    <p className="text-foreground font-semibold">docs/launch-plan</p>
                    <p className="text-xs text-muted-foreground">Expires in 48h • view & upload</p>
                  </div>
                  <div className="rounded-lg border border-border/40 p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Access policy</p>
                      <p className="text-foreground font-semibold">Signed links + Arlo session</p>
                    </div>
                    <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20">
                      Trusted
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    When you plug in a new drive, Arlo can auto-provision a private share and restrict uploads to your login.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="glass w-full">
                    <Link className="w-4 h-4 mr-2" />
                    Create link
                  </Button>
                  <Button className="glass-intense w-full">
                    <Lock className="w-4 h-4 mr-2" />
                    Revoke all
                  </Button>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={5}>
              <Card className="glass p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Wand2 className="w-5 h-5 text-primary" />
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Smart collections</h3>
                      <p className="text-xs text-muted-foreground">Arlo-curated folders</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    Suggested
                  </Badge>
                </div>
                <div className="space-y-3">
                  {smartCollections.map((collection) => {
                    const accentClass =
                      collection.accent === "accent"
                        ? "bg-accent/10 text-accent"
                        : "bg-primary/10 text-primary";

                    return (
                      <div
                        key={collection.title}
                        className="rounded-lg border border-border/40 p-3 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg ${accentClass} flex items-center justify-center`}>
                            <collection.icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-foreground font-semibold">{collection.title}</p>
                            <p className="text-xs text-muted-foreground">{collection.description}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="glass">
                          <FolderOpen className="w-4 h-4 mr-2" />
                          Open
                        </Button>
                      </div>
                    );
                  })}
                </div>
                <div className="rounded-lg border border-dashed border-border/60 p-4 text-xs text-muted-foreground">
                  Use Filebrowser.org builds for Raspberry Pi, point the root to /media/pi, and Arlo will surface everything here.
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>

      <FloatingChatBar context="Ask Arlo to mount, index, or share files from your drives." />
    </div>
  );
}
