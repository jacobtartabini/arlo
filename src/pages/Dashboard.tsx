import { useEffect } from "react";
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
        <BentoGrid />
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
        <Badge className="glass px-4 py-2">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
          <span className="text-sm font-medium">Arlo Online</span>
        </Badge>
      </motion.div>
    </div>
  );
}