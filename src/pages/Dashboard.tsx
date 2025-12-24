import {
  useCallback,
  useEffect,
  useState,
  type KeyboardEvent,
  type FocusEvent,
  type FormEvent,
} from "react";
import { motion } from "framer-motion";
import { badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/providers/AuthProvider";
import { useArlo } from "@/providers/ArloProvider";
import { useNavigate } from "react-router-dom";
import { BentoGrid } from "@/components/BentoGrid";
import { Check, ChevronDown, Scan } from "lucide-react";
import { cn } from "@/lib/utils";

const PRESET_ZOOM_LEVELS = [50, 75, 100, 125, 150, 175, 200];

export default function Dashboard() {
  const navigate = useNavigate();
  const { tailscaleVerified } = useAuth();
  const { isConnected, checkConnection } = useArlo();
  const [gridScale, setGridScale] = useState(1);
  const [customZoom, setCustomZoom] = useState("100");
  const [isZoomMenuOpen, setIsZoomMenuOpen] = useState(false);
  const [isFit, setIsFit] = useState(false);
  const [isChipInteracting, setIsChipInteracting] = useState(false);
  const [recenterSignal, setRecenterSignal] = useState(0);

  const zoomPercent = Math.round(gridScale * 100);
  const isChipExpanded = isChipInteracting || isZoomMenuOpen;

  const handleScaleChange = useCallback((value: number) => {
    const clamped = Math.min(Math.max(value, 0.5), 2);
    setIsFit(false);
    setGridScale(clamped);
  }, []);

  const applyZoomPercent = useCallback((percent: number) => {
    if (Number.isNaN(percent)) {
      return;
    }
    const clampedPercent = Math.min(Math.max(percent, 50), 200);
    setIsFit(false);
    setGridScale(clampedPercent / 100);
  }, []);

  const handlePresetSelect = useCallback(
    (percent: number) => {
      applyZoomPercent(percent);
      setIsZoomMenuOpen(false);
    },
    [applyZoomPercent]
  );

  const handleFitSelect = useCallback(() => {
    setIsFit(true);
    setGridScale(1);
    setIsZoomMenuOpen(false);
  }, []);

  const handleCustomSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const parsed = parseFloat(customZoom);
      if (!Number.isFinite(parsed)) {
        return;
      }
      applyZoomPercent(parsed);
      setIsZoomMenuOpen(false);
    },
    [applyZoomPercent, customZoom]
  );

  useEffect(() => {
    setCustomZoom(String(zoomPercent));
  }, [zoomPercent]);

  const handleChipEnter = useCallback(() => {
    setIsChipInteracting(true);
  }, []);

  const handleChipLeave = useCallback(() => {
    setIsChipInteracting(false);
  }, []);

  const handleChipBlur = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      const nextTarget = event.relatedTarget;
      if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
        return;
      }
      setIsChipInteracting(false);
    },
    []
  );

  const handleChipKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setIsChipInteracting(true);
      }
      if (event.key === "Escape") {
        setIsChipInteracting(false);
      }
    },
    []
  );

  const handleRecenter = useCallback(() => {
    setIsFit(false);
    setGridScale(1);
    setRecenterSignal((prev) => prev + 1);
  }, []);


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
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Main Content - Infinite Bento Grid */}
      <main className="h-screen">
        <BentoGrid
          onScaleChange={handleScaleChange}
          scale={gridScale}
          recenterSignal={recenterSignal}
        />
      </main>

      {/* Edge Fade Overlay */}
      <div className="pointer-events-none fixed inset-0 z-30">
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background via-background/80 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background via-background/80 to-transparent" />
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background via-background/80 to-transparent" />
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background via-background/80 to-transparent" />
      </div>

      {/* Arlo Status Badge */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="fixed top-6 right-6 z-40"
        onHoverStart={handleChipEnter}
        onHoverEnd={handleChipLeave}
        onFocusCapture={handleChipEnter}
        onBlurCapture={handleChipBlur}
        onKeyDown={handleChipKeyDown}
        aria-label="Arlo status controls"
        aria-expanded={isChipExpanded}
        role="group"
        tabIndex={0}
      >
        <motion.div
          layout
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className={cn(
            badgeVariants({ variant: "secondary" }),
            "rounded-full border border-border/60 bg-muted/80 text-muted-foreground shadow-sm backdrop-blur transition-colors duration-300 ease-out overflow-hidden",
            isChipExpanded ? "gap-3 px-3 py-1" : "gap-1.5 px-2 py-1"
          )}
        >
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            {isChipExpanded ? (
              <span>Arlo Online</span>
            ) : (
              <span className="sr-only">Arlo Online</span>
            )}
          </span>
          {isChipExpanded ? (
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground/60" aria-hidden="true">
                •
              </span>
              <DropdownMenu open={isZoomMenuOpen} onOpenChange={setIsZoomMenuOpen}>
                <div className="flex items-center gap-1">
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-muted-foreground/80 transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Adjust dashboard zoom"
                    >
                      <span>{isFit ? "Fit" : `${zoomPercent}%`}</span>
                      <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </DropdownMenuTrigger>
                  <button
                    type="button"
                    className="flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground/80 transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Open scanner"
                    onClick={handleRecenter}
                  >
                    <Scan className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
                <DropdownMenuContent align="end" sideOffset={8} className="w-56">
                  <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                    Zoom options
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {PRESET_ZOOM_LEVELS.map((level) => (
                    <DropdownMenuItem
                      key={level}
                      onSelect={(event) => {
                        event.preventDefault();
                        handlePresetSelect(level);
                      }}
                      className="flex items-center justify-between text-sm"
                    >
                      {level}%
                      {!isFit && zoomPercent === level ? (
                        <Check className="h-4 w-4" aria-hidden="true" />
                      ) : null}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault();
                      handleFitSelect();
                    }}
                    className="flex items-center justify-between text-sm"
                  >
                    Fit to screen
                    {isFit ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <form onSubmit={handleCustomSubmit} className="grid gap-2 px-2 py-2">
                    <label
                      htmlFor="dashboard-custom-zoom"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Custom zoom
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="dashboard-custom-zoom"
                        value={customZoom}
                        onChange={(event) =>
                          setCustomZoom(event.target.value.replace(/[^0-9.]/g, ""))
                        }
                        inputMode="decimal"
                        placeholder="120"
                        className="h-8"
                      />
                      <Button type="submit" size="sm">
                        Apply
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Enter a value between 50% and 200%.
                    </p>
                  </form>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : null}
        </motion.div>

      </motion.div>
    </div>
  );
}
