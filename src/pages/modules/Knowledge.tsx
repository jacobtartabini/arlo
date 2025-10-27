import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Library,
  BookOpen,
  Newspaper,
  Search,
  Sparkles,
  Globe2,
  Pin,
  Lightbulb,
  Loader2
} from "lucide-react";
import { FloatingChatBar } from "@/components/FloatingChatBar";

const timeline = [
  { year: "2024", entry: "Arlo OS v3 release: modular knowledge embeddings shipped." },
  { year: "2023", entry: "Scaled archive to 1.2M indexed documents with citations." },
  { year: "2022", entry: "Anara research assistant joined the stack." }
];

const headlines = [
  { title: "Fusion breakthrough cuts cost by 30%", tag: "Energy" },
  { title: "Satellites map coral recovery", tag: "Climate" },
  { title: "Neural UI toolkit open-sourced", tag: "AI" }
];

const researchResults = [
  { title: "Autonomous lab orchestration", snippet: "Benchmarking AI-driven experiments with reproducible metrics." },
  { title: "Zero-latency comms", snippet: "Peer-to-peer mesh optimizing orbital relays." },
  { title: "Cultural memory vault", snippet: "Decentralized preservation of language and art." }
];

const pinnedNotes = [
  {
    title: "Orbital manufacturing thesis",
    excerpt: "Link energy storage findings with microgravity alloy tests — include delta from March sprint.",
    updated: "Updated 4h ago"
  },
  {
    title: "Bio-adaptive habitats",
    excerpt: "Reference Dr. Chen's paper on regenerative materials and cross-link with Mars analog study.",
    updated: "Pinned yesterday"
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

export default function Knowledge() {
  const navigate = useNavigate();
  const [semanticResults, setSemanticResults] = useState(researchResults);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    document.title = "Knowledge & Archives — Arlo";
  }, []);

  const handleSemanticSearch = async () => {
    setIsSearching(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    setSemanticResults([
      {
        title: "Productivity uplift analysis",
        snippet: "Arlo indexed your weekly journal and found a 12% output jump when focus mode was enabled."
      },
      {
        title: "Investor memo highlights",
        snippet: "Semantic recall matched key talking points from Q1 updates and climate deck annotations."
      },
      {
        title: "Research backlog",
        snippet: "4 experiments tagged 'bioprinting' waiting for follow-up. Suggest scheduling post-trip review."
      }
    ]);
    setIsSearching(false);
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
              <Library className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Knowledge & Archives</h1>
              <p className="text-sm text-muted-foreground">Discover, summarize, and explore global intelligence.</p>
            </div>
          </div>
        </div>
        <Button className="glass-intense">
          <Sparkles className="w-4 h-4 mr-2" />
          Generate daily brief
        </Button>
      </motion.header>

      <main className="relative z-10 p-6 pb-32">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={0}>
              <Card className="glass-intense p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Archivist Protocol</h2>
                    <p className="text-xs text-muted-foreground">Searchable timeline of critical knowledge drops.</p>
                  </div>
                </div>
                <div className="relative">
                  <Input placeholder="Search the archive..." className="pl-10 text-sm" />
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                <div className="space-y-4 text-sm">
                  {timeline.map((entry) => (
                    <div key={entry.year} className="flex gap-3">
                      <Badge variant="outline" className="border-primary/30 text-primary min-w-[70px] justify-center">
                        {entry.year}
                      </Badge>
                      <p className="text-muted-foreground leading-relaxed">{entry.entry}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>

            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={1}>
              <Card className="glass p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <Newspaper className="w-5 h-5 text-primary" />
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">News Summary Hub</h2>
                    <p className="text-xs text-muted-foreground">Daily summaries and watchlist headlines.</p>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  {headlines.map((headline) => (
                    <div key={headline.title} className="rounded-lg border border-border/40 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
                          {headline.tag}
                        </Badge>
                        <span className="text-xs text-muted-foreground">Updated 2h ago</span>
                      </div>
                      <p className="text-foreground font-medium leading-snug">{headline.title}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg bg-primary/10 p-3 text-xs text-primary">
                  AI digest ready — 6 min read. Send to inbox?
                </div>
              </Card>
            </motion.div>

            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={2}>
              <Card className="glass p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Pin className="w-5 h-5 text-primary" />
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Recent Insights</h2>
                    <p className="text-xs text-muted-foreground">Pinned notes stay surfaced for fast recall.</p>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  {pinnedNotes.map((note) => (
                    <div key={note.title} className="rounded-lg border border-border/40 p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-2 text-foreground font-semibold">
                          <Lightbulb className="w-3.5 h-3.5 text-primary" /> {note.title}
                        </span>
                        <span>{note.updated}</span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">{note.excerpt}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>

          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={3}>
            <Card className="glass p-6 space-y-5">
              <div className="flex items-center gap-3">
                <Globe2 className="w-5 h-5 text-primary" />
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Anara Research Panel</h2>
                  <p className="text-xs text-muted-foreground">Deep search interface with instant previews.</p>
                </div>
              </div>
              <Textarea placeholder="Ask anything — e.g. ‘climate-positive manufacturing breakthroughs’" className="text-sm" />
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={handleSemanticSearch} disabled={isSearching}>
                  {isSearching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {isSearching ? "Searching..." : "Semantic recall"}
                </Button>
                <Button variant="outline">Add to briefing</Button>
                <p className="text-xs text-muted-foreground">
                  Powered by /api/semantic-search — rehydrates context from archives and personal notes.
                </p>
              </div>
              <div className="space-y-3 text-sm">
                {semanticResults.map((result) => (
                  <div key={result.title} className="rounded-lg border border-border/40 p-3">
                    <p className="text-foreground font-semibold">{result.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{result.snippet}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>
      </main>

      <FloatingChatBar />
    </div>
  );
}
