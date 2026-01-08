import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { useArlo } from "@/providers/ArloProvider";
import { SpatialCanvas } from "@/components/SpatialCanvas";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { MapProvider } from "@/components/maps/MapProvider";

export default function Dashboard() {
  const navigate = useNavigate();
  const { isAuthenticated, verifyAuth } = useAuth();
  const { isConnected, checkConnection } = useArlo();
  const [gridScale, setGridScale] = useState(1);
  const [isFit, setIsFit] = useState(false);
  const [recenterSignal, setRecenterSignal] = useState(0);

  const handleScaleChange = useCallback((value: number) => {
    const clamped = Math.min(Math.max(value, 0.4), 2.5);
    setIsFit(false);
    setGridScale(clamped);
  }, []);

  const applyZoomPercent = useCallback((percent: number) => {
    if (Number.isNaN(percent)) return;
    const clampedPercent = Math.min(Math.max(percent, 40), 250);
    setIsFit(false);
    setGridScale(clampedPercent / 100);
  }, []);

  const handlePresetSelect = useCallback(
    (percent: number) => {
      applyZoomPercent(percent);
    },
    [applyZoomPercent]
  );

  const handleFitSelect = useCallback(() => {
    setIsFit(true);
    setGridScale(1);
  }, []);

  const handleRecenter = useCallback(() => {
    setIsFit(false);
    setGridScale(1);
    setRecenterSignal((prev) => prev + 1);
  }, []);

  const handleCustomZoomSubmit = useCallback(
    (percent: number) => {
      applyZoomPercent(percent);
    },
    [applyZoomPercent]
  );

  useEffect(() => {
    document.title = "Arlo";
    const desc = "By Jacob Tartabini";
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
      if (isAuthenticated) return;
      const ok = await checkConnection();
      if (!ok) navigate("/unauthorized");
    };
    verify();
  }, [checkConnection, navigate, isAuthenticated]);

  if (!isAuthenticated && !isConnected) {
    return null;
  }

  return (
    <MapProvider>
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Main Content - Spatial Canvas */}
        <main className="h-screen">
          <SpatialCanvas
            onScaleChange={handleScaleChange}
            scale={gridScale}
            recenterSignal={recenterSignal}
          />
        </main>

        {/* Edge Fade Overlay */}
        <div className="pointer-events-none fixed inset-0 z-30">
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-background via-background/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background via-background/70 to-transparent" />
          <div className="absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-background via-background/70 to-transparent" />
          <div className="absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-background via-background/70 to-transparent" />
        </div>

        {/* Status Chip with integrated notifications */}
        <div className="fixed top-6 right-6 z-40">
          <StatusChip
            gridScale={gridScale}
            isFit={isFit}
            onPresetSelect={handlePresetSelect}
            onFitSelect={handleFitSelect}
            onRecenter={handleRecenter}
            onCustomZoomSubmit={handleCustomZoomSubmit}
          />
        </div>
      </div>
    </MapProvider>
  );
}
