import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useNotesPersistence } from "@/hooks/useNotesPersistence";
import type { Note, NoteFolder } from "@/types/notes";
import {
  ArrowLeft,
  FileText,
  FolderOpen,
  PenLine,
  Plus,
  Clock,
  Sparkles,
  TrendingUp,
  Pin,
  ChevronRight,
} from "lucide-react";
import { formatDistanceToNow, isThisWeek, startOfWeek, isToday } from "date-fns";

export default function NotesDashboard() {
  const navigate = useNavigate();
  const { notes, folders, isLoading, isAuthenticated, createNote } = useNotesPersistence();
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Notes — Arlo";
  }, []);

  // Computed insights
  const insights = useMemo(() => {
    if (notes.length === 0) {
      return {
        recentNote: null,
        weeklyCount: 0,
        todayCount: 0,
        activeFolder: null,
        pinnedCount: 0,
        totalNotes: 0,
      };
    }

    const now = new Date();
    const weekStart = startOfWeek(now);

    const weeklyNotes = notes.filter(n => new Date(n.updatedAt) >= weekStart);
    const todayNotes = notes.filter(n => isToday(new Date(n.updatedAt)));
    const pinnedNotes = notes.filter(n => n.pinned);
    
    // Find most active folder this week
    const folderActivity = new Map<string, number>();
    weeklyNotes.forEach(n => {
      if (n.folderId) {
        folderActivity.set(n.folderId, (folderActivity.get(n.folderId) ?? 0) + 1);
      }
    });
    
    let activeFolderId: string | null = null;
    let maxActivity = 0;
    folderActivity.forEach((count, folderId) => {
      if (count > maxActivity) {
        maxActivity = count;
        activeFolderId = folderId;
      }
    });

    const activeFolder = activeFolderId 
      ? folders.find(f => f.id === activeFolderId) ?? null
      : null;

    return {
      recentNote: notes[0] ?? null,
      weeklyCount: weeklyNotes.length,
      todayCount: todayNotes.length,
      activeFolder,
      pinnedCount: pinnedNotes.length,
      totalNotes: notes.length,
    };
  }, [notes, folders]);

  // Get recent notes for quick access
  const recentNotes = useMemo(() => notes.slice(0, 5), [notes]);
  const pinnedNotes = useMemo(() => notes.filter(n => n.pinned).slice(0, 3), [notes]);

  const handleNewNote = async () => {
    const note = await createNote();
    if (note) {
      navigate("/notes", { state: { openNoteId: note.id } });
    }
  };

  const handleResumeNote = () => {
    if (insights.recentNote) {
      navigate("/notes", { state: { openNoteId: insights.recentNote.id } });
    }
  };

  const handleOpenNotes = () => {
    navigate("/notes");
  };

  const formatLastEdited = (date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  const getProductivityNudge = () => {
    if (insights.todayCount >= 3) return "You're on a roll today!";
    if (insights.todayCount > 0) return `${insights.todayCount} note${insights.todayCount > 1 ? 's' : ''} updated today`;
    if (insights.weeklyCount > 0) return `${insights.weeklyCount} notes this week`;
    return "Start capturing your thoughts";
  };

  return (
    <div className="min-h-screen bg-background bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.06),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(99,102,241,0.06),transparent_28%)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-7 px-6 py-10">
        {/* Header */}
        <header className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur">
          <div className="absolute inset-0 opacity-50" aria-hidden>
            <div className="absolute -left-12 top-6 h-24 w-24 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute right-4 top-0 h-28 w-28 rounded-full bg-muted/50 blur-3xl" />
          </div>

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-3 py-1 text-xs font-medium transition hover:border-border hover:bg-background/80"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
                </button>
                <Separator orientation="vertical" className="h-5" />
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary animate-fade-in">
                  {getProductivityNudge()}
                </span>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h1 className="text-3xl font-semibold text-foreground tracking-tight">Notes</h1>
                  <p className="max-w-2xl text-base text-muted-foreground leading-relaxed">
                    Your thinking space. Capture ideas, sketch concepts, and keep your thoughts organized.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button 
                variant="ghost" 
                className="min-w-[140px] border border-border/70 bg-background/40 transition-all hover:scale-[1.02]"
                onClick={handleOpenNotes}
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                Open Notes
              </Button>
              <Button 
                className="min-w-[150px] shadow-sm transition-all hover:scale-[1.02] hover:shadow-md"
                onClick={handleNewNote}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Note
              </Button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="relative mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Notes"
              value={String(insights.totalNotes)}
              helper={insights.pinnedCount > 0 ? `${insights.pinnedCount} pinned` : "Your collection"}
              tone="neutral"
              icon={<FileText className="h-4 w-4" />}
            />
            <StatCard
              label="This Week"
              value={String(insights.weeklyCount)}
              helper={insights.todayCount > 0 ? `${insights.todayCount} today` : "Keep writing"}
              tone={insights.weeklyCount > 0 ? "positive" : "neutral"}
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <StatCard
              label="Last Edited"
              value={insights.recentNote ? formatLastEdited(insights.recentNote.updatedAt).replace(" ago", "") : "—"}
              helper={insights.recentNote?.title ?? "No notes yet"}
              tone="info"
              icon={<Clock className="h-4 w-4" />}
            />
            <StatCard
              label="Active Folder"
              value={insights.activeFolder?.name ?? "All Notes"}
              helper="This week's focus"
              tone="neutral"
              icon={<FolderOpen className="h-4 w-4" />}
              color={insights.activeFolder?.color}
            />
          </div>
        </header>

        {/* Content Grid */}
        <div className="grid gap-4 lg:grid-cols-12">
          {/* Quick Actions - Left Column */}
          <Card className="relative overflow-hidden border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur lg:col-span-5">
            <div className="absolute inset-0 pointer-events-none opacity-60">
              <div className="absolute right-6 top-4 h-12 w-12 rounded-full bg-muted/40 blur-2xl" />
            </div>
            
            <div className="relative mb-4 space-y-1">
              <h2 className="text-base font-semibold text-foreground">Quick Actions</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Jump right back in or start fresh
              </p>
            </div>

            <div className="space-y-3">
              {/* Resume Last Note */}
              {insights.recentNote && (
                <button
                  onClick={handleResumeNote}
                  className="group w-full relative flex items-center gap-4 rounded-2xl border border-border/60 bg-gradient-to-r from-primary/5 to-transparent p-4 text-left transition-all hover:border-primary/30 hover:shadow-sm hover:scale-[1.01]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                    <PenLine className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">Resume: {insights.recentNote.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Edited {formatLastEdited(insights.recentNote.updatedAt)}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </button>
              )}

              {/* New Blank Note */}
              <button
                onClick={handleNewNote}
                className="group w-full relative flex items-center gap-4 rounded-2xl border border-border/60 bg-muted/30 p-4 text-left transition-all hover:border-border hover:bg-muted/50 hover:scale-[1.01]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background/80 text-muted-foreground transition-transform group-hover:scale-110 group-hover:text-foreground">
                  <Plus className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Start Blank Note</p>
                  <p className="text-sm text-muted-foreground">Begin with a fresh canvas</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </button>

              {/* Open Canvas Mode */}
              <button
                onClick={handleOpenNotes}
                className="group w-full relative flex items-center gap-4 rounded-2xl border border-border/60 bg-muted/30 p-4 text-left transition-all hover:border-border hover:bg-muted/50 hover:scale-[1.01]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background/80 text-muted-foreground transition-transform group-hover:scale-110 group-hover:text-foreground">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Open Workspace</p>
                  <p className="text-sm text-muted-foreground">Browse all notes and folders</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </Card>

          {/* Recent Notes - Right Column */}
          <Card className="relative overflow-hidden border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur lg:col-span-7">
            <div className="absolute inset-0 pointer-events-none opacity-60">
              <div className="absolute right-6 top-4 h-12 w-12 rounded-full bg-muted/40 blur-2xl" />
            </div>
            
            <div className="relative mb-4 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-foreground">Recent Notes</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Pick up where you left off
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs"
                onClick={handleOpenNotes}
              >
                View all
              </Button>
            </div>

            {recentNotes.length > 0 ? (
              <div className="space-y-2">
                {recentNotes.map((note, index) => (
                  <NotePreviewRow
                    key={note.id}
                    note={note}
                    folder={folders.find(f => f.id === note.folderId)}
                    isHovered={hoveredNoteId === note.id}
                    onHover={() => setHoveredNoteId(note.id)}
                    onLeave={() => setHoveredNoteId(null)}
                    onClick={() => navigate("/notes", { state: { openNoteId: note.id } })}
                    delay={index * 50}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground mb-4">
                  <FileText className="h-8 w-8" />
                </div>
                <p className="font-medium text-foreground">No notes yet</p>
                <p className="text-sm text-muted-foreground mt-1">Create your first note to get started</p>
                <Button onClick={handleNewNote} className="mt-4" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Note
                </Button>
              </div>
            )}
          </Card>

          {/* Pinned Notes Section */}
          {pinnedNotes.length > 0 && (
            <Card className="relative overflow-hidden border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur lg:col-span-6">
              <div className="absolute inset-0 pointer-events-none opacity-60">
                <div className="absolute right-6 top-4 h-12 w-12 rounded-full bg-amber-500/10 blur-2xl" />
              </div>
              
              <div className="relative mb-4 space-y-1">
                <div className="flex items-center gap-2">
                  <Pin className="h-4 w-4 text-amber-500" />
                  <h2 className="text-base font-semibold text-foreground">Pinned</h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your important notes, always visible
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pinnedNotes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => navigate("/notes", { state: { openNoteId: note.id } })}
                    className="group relative flex flex-col gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-left transition-all hover:border-amber-500/40 hover:bg-amber-500/10 hover:scale-[1.02]"
                  >
                    <Pin className="absolute right-3 top-3 h-3 w-3 text-amber-500/60" />
                    <p className="font-medium text-foreground truncate pr-6">{note.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatLastEdited(note.updatedAt)}
                    </p>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Folders Section */}
          {folders.length > 0 && (
            <Card className="relative overflow-hidden border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur lg:col-span-6">
              <div className="absolute inset-0 pointer-events-none opacity-60">
                <div className="absolute right-6 top-4 h-12 w-12 rounded-full bg-muted/40 blur-2xl" />
              </div>
              
              <div className="relative mb-4 space-y-1">
                <h2 className="text-base font-semibold text-foreground">Folders</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Organize your notes by topic
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {folders.slice(0, 6).map((folder) => {
                  const count = notes.filter(n => n.folderId === folder.id).length;
                  return (
                    <button
                      key={folder.id}
                      onClick={handleOpenNotes}
                      className="group relative flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-3 text-left transition-all hover:border-border hover:bg-muted/50 hover:scale-[1.02]"
                    >
                      <div 
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: folder.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate text-sm">{folder.name}</p>
                        <p className="text-xs text-muted-foreground">{count} note{count !== 1 ? 's' : ''}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  label,
  value,
  helper,
  tone,
  icon,
  color,
}: {
  label: string;
  value: string;
  helper?: string;
  tone: "positive" | "neutral" | "negative" | "info";
  icon: React.ReactNode;
  color?: string;
}) {
  const toneText: Record<string, string> = {
    positive: "text-emerald-600 dark:text-emerald-400",
    neutral: "text-muted-foreground",
    negative: "text-rose-600 dark:text-rose-400",
    info: "text-sky-600 dark:text-sky-300",
  };

  return (
    <Card className="group relative overflow-hidden border-border/50 bg-background/70 p-4 shadow-none backdrop-blur transition-all hover:bg-background/90 hover:shadow-sm">
      <div className="absolute inset-0 bg-gradient-to-br from-muted/40 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
      <div className="relative flex items-center gap-2 text-muted-foreground">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      </div>
      <div className="relative mt-2 flex items-baseline justify-between">
        <span 
          className="text-2xl font-semibold text-foreground truncate max-w-[60%]"
          style={color ? { color } : undefined}
        >
          {value}
        </span>
        {helper && (
          <span className={cn("text-xs font-semibold truncate max-w-[40%]", toneText[tone])}>
            {helper}
          </span>
        )}
      </div>
    </Card>
  );
}

// Note Preview Row Component
function NotePreviewRow({
  note,
  folder,
  isHovered,
  onHover,
  onLeave,
  onClick,
  delay,
}: {
  note: Note;
  folder?: NoteFolder;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
  delay: number;
}) {
  const formattedTime = formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true });

  return (
    <button
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
      className={cn(
        "group w-full flex items-center gap-4 rounded-xl border p-3 text-left transition-all animate-fade-in",
        isHovered 
          ? "border-primary/30 bg-primary/5 shadow-sm scale-[1.01]" 
          : "border-border/60 bg-muted/20 hover:bg-muted/40"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={cn(
        "flex h-10 w-10 items-center justify-center rounded-lg transition-all",
        isHovered ? "bg-primary/10 text-primary" : "bg-background/80 text-muted-foreground"
      )}>
        {note.pinned ? <Pin className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-foreground truncate">{note.title}</p>
          {folder && (
            <span 
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{ 
                backgroundColor: `${folder.color}20`,
                color: folder.color,
              }}
            >
              {folder.name}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {formattedTime}
          {note.tags.length > 0 && ` · ${note.tags.slice(0, 2).join(", ")}`}
        </p>
      </div>

      <ChevronRight className={cn(
        "h-4 w-4 text-muted-foreground transition-all",
        isHovered ? "translate-x-1 text-primary" : ""
      )} />
    </button>
  );
}
