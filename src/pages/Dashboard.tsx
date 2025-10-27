import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/providers/AuthProvider";
import { useArlo } from "@/providers/ArloProvider";
import { useNavigate } from "react-router-dom";
import { BentoGrid } from "@/components/BentoGrid";
import { FloatingChatBar } from "@/components/FloatingChatBar";

export default function Dashboard() {
  const navigate = useNavigate();
  const { tailscaleVerified } = useAuth();
  const { isConnected, checkConnection } = useArlo();
  const [zoomPercent, setZoomPercent] = useState(100);

  const handleScaleChange = useCallback((value: number) => {
    setZoomPercent(Math.round(value * 100));
  }, []);


  useEffect(() => {
    document.title = "Arlo Dashboard — Your Personal Operating System";
    const desc = "Infinite bento-grid dashboard for Arlo — your personal OS with modular tiles for habits, budget, nutrition, and more.";
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    if (meta) meta.content = desc;
  }, []);

  useEffect(() => {
    const verify = async () => {
      if (tailscaleVerified) return;
      const ok = await checkConnection();
      if (!ok) navigate("/unauthorized");
    };
    verify();
  }, [checkConnection, navigate, tailscaleVerified]);

  if (!tailscaleVerified && !isConnected) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Main Content - Infinite Bento Grid */}
      <main className="h-screen pt-16">
        <BentoGrid onScaleChange={handleScaleChange} />
      </main>

      {/* Floating Chat Bar */}
      <FloatingChatBar />

      {/* Arlo Status Badge */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="fixed top-6 right-6 z-40"
      >
        <Badge
          variant="secondary"
          className="flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium bg-muted/80 text-muted-foreground border border-border/60 shadow-sm"
        >
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span>Arlo Online</span>
          </span>
          <span className="text-muted-foreground/60" aria-hidden="true">
            •
          </span>
          <span>{zoomPercent}%</span>
        </Badge>
      </motion.div>
    </div>
  );
}