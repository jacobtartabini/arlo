import { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  PenTool,
  Boxes,
  Printer,
  CircuitBoard,
  FileText,
  ImagePlus,
  Sparkles
} from "lucide-react";
import { FloatingChatBar } from "@/components/FloatingChatBar";

const cadProjects = [
  { name: "Lunar habitat", status: "Iterating", detail: "v3 ready for simulation" },
  { name: "Drone frame", status: "Approved", detail: "Send to print" }
];

const printQueue = [
  { name: "Drone frame", progress: "Printing 62%" },
  { name: "Prototype shell", progress: "Queued" }
];

const pcbProjects = [
  { name: "Sensor array", stage: "Routing", updated: "2h ago" },
  { name: "Power module", stage: "Review", updated: "Yesterday" },
  { name: "Wearable", stage: "Prototype", updated: "Apr 18" }
];

const gallery = ["/images/creation-1.png", "/images/creation-2.png", "/images/creation-3.png"];

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.05 }
  })
};

export default function Creation() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Creation & Design — Arlo";
  }, []);

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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center">
              <PenTool className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Creation & Design</h1>
              <p className="text-sm text-muted-foreground">Build CAD models, documents, and rich media in one hub.</p>
            </div>
          </div>
        </div>
        <Button className="glass-intense">
          <Sparkles className="w-4 h-4 mr-2" />
          Start creative session
        </Button>
      </motion.header>

      <main className="relative z-10 p-6 pb-32">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={0}>
              <Card className="glass-intense p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Boxes className="w-5 h-5 text-accent" />
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">CAD / 3D Design</h2>
                      <p className="text-xs text-muted-foreground">View models and generate new iterations.</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-accent/20 text-accent-foreground border-accent/30">
                    2 active drafts
                  </Badge>
                </div>
                <div className="rounded-xl border border-border/40 bg-gradient-to-br from-accent/10 via-transparent to-accent/5 h-48 relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Boxes className="w-16 h-16 text-accent/40" />
                  </div>
                  <div className="absolute bottom-4 left-4 text-xs text-muted-foreground bg-background/80 backdrop-blur rounded-full px-3 py-1">
                    Orbit with trackpad to inspect model
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  {cadProjects.map((project) => (
                    <div key={project.name} className="rounded-lg border border-border/40 p-3 flex items-center justify-between">
                      <div>
                        <p className="text-foreground font-medium">{project.name}</p>
                        <p className="text-xs text-muted-foreground">{project.detail}</p>
                      </div>
                      <Badge variant="outline" className="border-accent/30 text-accent-foreground">
                        {project.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>

            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={1}>
              <Card className="glass p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Printer className="w-5 h-5 text-accent" />
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">3D Scanning & Printing</h2>
                      <p className="text-xs text-muted-foreground">Queue management and recent output.</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-accent/30 text-accent-foreground">
                    Stable temps
                  </Badge>
                </div>
                <div className="space-y-3 text-sm">
                  {printQueue.map((item) => (
                    <div key={item.name} className="rounded-lg border border-border/40 p-3 flex items-center justify-between">
                      <p className="text-foreground font-medium">{item.name}</p>
                      <span className="text-xs text-muted-foreground">{item.progress}</span>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full">
                  Upload new scan
                </Button>
              </Card>
            </motion.div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={2}>
              <Card className="glass p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <CircuitBoard className="w-5 h-5 text-accent" />
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">PCB / Circuit Design</h2>
                    <p className="text-xs text-muted-foreground">Board preview and project milestones.</p>
                  </div>
                </div>
                <div className="h-28 rounded-lg border border-border/40 bg-gradient-to-r from-accent/10 via-transparent to-accent/5" />
                <div className="space-y-3 text-sm">
                  {pcbProjects.map((project) => (
                    <div key={project.name} className="flex items-center justify-between">
                      <div>
                        <p className="text-foreground font-medium">{project.name}</p>
                        <p className="text-xs text-muted-foreground">{project.stage}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{project.updated}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>

            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={3}>
              <Card className="glass p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-accent" />
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Document & Presentation Creator</h2>
                      <p className="text-xs text-muted-foreground">Launch docs, slides, and living specs.</p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-3">
                  <Button>Create doc</Button>
                  <Button variant="outline">Generate slide deck</Button>
                  <Button variant="outline">Start collaborative whiteboard</Button>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={4}>
              <Card className="glass p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ImagePlus className="w-5 h-5 text-accent" />
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Image / Video Generation</h2>
                      <p className="text-xs text-muted-foreground">Prompt-to-asset gallery.</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-accent/20 text-accent-foreground border-accent/30">
                    Studio v2
                  </Badge>
                </div>
                <Textarea placeholder="Describe the scene..." className="text-sm" />
                <Button className="w-full">
                  Render
                </Button>
                <div className="grid grid-cols-3 gap-2">
                  {gallery.map((src, index) => (
                    <div
                      key={src}
                      className="aspect-square rounded-lg border border-border/40 bg-gradient-to-br from-accent/10 via-transparent to-accent/5 flex items-end p-2 text-[10px] text-muted-foreground"
                    >
                      Concept {index + 1}
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>

      <FloatingChatBar />
    </div>
  );
}
