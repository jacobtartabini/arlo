"use client";

import * as React from "react";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Home,
  Settings,
  Calendar,
  FileText,
  Clock,
  Zap,
  Plus,
  MessageSquare,
  CheckSquare,
  Folder,
  Star,
  LayoutPanelTop,
  ArrowRight,
  NotebookPen,
  Wallet,
  Plane,
  ShieldCheck,
  HeartPulse,
  FolderOpen,
  PenTool,
  Library,
  Workflow,
  Sparkles,
  BellRing,
  Flame,
  type LucideIcon,
} from "lucide-react";
import { APP_MODULES, APP_PAGES, APP_RESOURCES } from "@/lib/app-navigation";
import { useNotesPersistence } from "@/hooks/useNotesPersistence";
import { useArlo } from "@/providers/ArloProvider";
import { cn } from "@/lib/utils";

type CommandCategory = "Actions" | "Navigation" | "Content" | "Recent";

type CommandItem = {
  id: string;
  title: string;
  description?: string;
  category: CommandCategory;
  icon: LucideIcon;
  action?: () => void;
  shortcut?: string;
  keywords?: string[];
};

type SearchScope = "all" | "actions" | "files" | "modules" | "chat";

// Icon mapping for modules
const moduleIconMap: Record<string, LucideIcon> = {
  finance: Wallet,
  productivity: Calendar,
  travel: Plane,
  system: ShieldCheck,
  health: HeartPulse,
  files: FolderOpen,
  creation: PenTool,
  knowledge: Library,
  automations: Workflow,
  insights: Sparkles,
  notifications: BellRing,
  notes: NotebookPen,
  habits: Flame,
};

const ArloCommandLauncher = () => {
  const navigate = useNavigate();
  const { notes } = useNotesPersistence();
  const { sendMessage } = useArlo();
  
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchScope, setSearchScope] = useState<SearchScope>("all");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const hasTyped = searchQuery.length > 0;

  // Build commands from Arlo's real data
  const allCommands = useMemo((): CommandItem[] => {
    const commands: CommandItem[] = [];

    // Actions
    commands.push({
      id: "new-note",
      title: "Create Note",
      description: "Start a new note",
      category: "Actions",
      icon: Plus,
      action: () => navigate("/notes-dashboard"),
      shortcut: "⌘N",
      keywords: ["new", "note", "create", "add"],
    });

    commands.push({
      id: "new-task",
      title: "Create Task",
      description: "Add a new task",
      category: "Actions",
      icon: CheckSquare,
      action: () => navigate("/productivity"),
      keywords: ["task", "todo", "create", "new"],
    });

    commands.push({
      id: "focus-session",
      title: "Start Focus Session",
      description: "Begin a 25-minute focus session",
      category: "Actions",
      icon: Zap,
      action: () => navigate("/productivity"),
      shortcut: "⌘F",
      keywords: ["focus", "pomodoro", "timer", "25"],
    });

    // Navigation from APP_PAGES
    APP_PAGES.forEach((page) => {
      const IconComponent = page.icon;
      commands.push({
        id: `nav-${page.id}`,
        title: page.title,
        description: page.description,
        category: "Navigation",
        icon: IconComponent,
        action: () => navigate(page.route),
        keywords: page.keywords,
      });
    });

    // Modules from APP_MODULES
    APP_MODULES.forEach((mod) => {
      const IconComponent = moduleIconMap[mod.id] || mod.icon;
      commands.push({
        id: `module-${mod.id}`,
        title: mod.title,
        description: mod.summary,
        category: "Navigation",
        icon: IconComponent,
        action: () => navigate(mod.route),
        keywords: mod.keywords,
      });
    });

    // Resources from APP_RESOURCES
    APP_RESOURCES.forEach((resource) => {
      const IconComponent = resource.icon;
      commands.push({
        id: `resource-${resource.id}`,
        title: resource.title,
        description: resource.description,
        category: "Content",
        icon: IconComponent,
        action: () => navigate(resource.route),
        keywords: resource.keywords,
      });
    });

    // Recent notes from actual data
    const recentNotes = notes.slice(0, 5);
    recentNotes.forEach((note, index) => {
      commands.push({
        id: `recent-note-${note.id}`,
        title: note.title || "Untitled Note",
        description: `Opened ${new Date(note.updatedAt).toLocaleDateString()}`,
        category: "Recent",
        icon: FileText,
        action: () => navigate("/notes-dashboard"),
        keywords: ["recent", "note", ...(note.tags || [])],
      });
    });

    return commands;
  }, [navigate, notes]);

  const filteredCommands = useCallback(() => {
    let commands = allCommands;

    // Filter by scope first
    if (searchScope === "actions") {
      commands = commands.filter((cmd) => cmd.category === "Actions");
    } else if (searchScope === "files") {
      commands = commands.filter(
        (cmd) => cmd.category === "Content" || cmd.category === "Recent"
      );
    } else if (searchScope === "modules") {
      commands = commands.filter((cmd) => cmd.category === "Navigation");
    }

    // Then filter by search query
    if (!searchQuery.trim()) {
      return commands;
    }

    const query = searchQuery.toLowerCase();
    return commands.filter((cmd) => {
      const titleMatch = cmd.title.toLowerCase().includes(query);
      const descMatch = cmd.description?.toLowerCase().includes(query);
      const keywordMatch = cmd.keywords?.some((k) =>
        k.toLowerCase().includes(query)
      );
      return titleMatch || descMatch || keywordMatch;
    });
  }, [searchQuery, searchScope, allCommands]);

  const groupedCommands = useCallback(() => {
    const commands = filteredCommands();
    const groups: Record<CommandCategory, CommandItem[]> = {
      Actions: [],
      Navigation: [],
      Content: [],
      Recent: [],
    };

    commands.forEach((cmd) => {
      groups[cmd.category].push(cmd);
    });

    return groups;
  }, [filteredCommands]);

  const executeCommand = useCallback((command: CommandItem) => {
    if (command.action) {
      command.action();
    }
    setOpen(false);
    setSearchQuery("");
    setSelectedIndex(0);
    setSearchScope("all");
  }, []);

  const handleChatSubmit = useCallback(() => {
    if (searchQuery.trim()) {
      sendMessage(searchQuery.trim());
      navigate("/chat");
      setOpen(false);
      setSearchQuery("");
      setSearchScope("all");
    }
  }, [searchQuery, sendMessage, navigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is in a text input (not our launcher)
      const activeElement = document.activeElement as HTMLElement | null;
      const isInOtherInput = activeElement && 
        (activeElement.tagName === "INPUT" || 
         activeElement.tagName === "TEXTAREA" ||
         activeElement.isContentEditable) &&
        !containerRef.current?.contains(activeElement);

      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        if (!open) {
          setSearchQuery("");
          setSelectedIndex(0);
          setSearchScope("all");
        }
        return;
      }

      if (!open) return;

      if (e.key === "Escape") {
        e.preventDefault();
        if (searchScope === "chat") {
          setSearchScope("all");
          setSearchQuery("");
        } else {
          setOpen(false);
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          Math.min(prev + 1, filteredCommands().length - 1)
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (searchScope === "chat") {
          handleChatSubmit();
        } else {
          const commands = filteredCommands();
          if (commands[selectedIndex]) {
            executeCommand(commands[selectedIndex]);
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, selectedIndex, filteredCommands, executeCommand, searchScope, handleChatSubmit]);

  useEffect(() => {
    if (open && selectedIndex >= 0 && itemsRef.current[selectedIndex]) {
      itemsRef.current[selectedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex, open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        open
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery, searchScope]);

  const groups = groupedCommands();
  let globalIndex = 0;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.div
        ref={containerRef}
        onClick={() => !open && setOpen(true)}
        className="fixed left-1/2 bottom-8 -translate-x-1/2 z-50 w-full bg-background shadow-2xl pointer-events-auto border border-border"
        initial={false}
        animate={{
          maxWidth: open
            ? hasTyped || searchScope !== "all"
              ? "32rem"
              : "40rem"
            : "28rem",
          borderRadius: open
            ? hasTyped || searchScope !== "all"
              ? 16
              : 24
            : 24,
          cursor: open ? "auto" : "pointer",
          scale: open && searchScope !== "all" && !hasTyped ? 1.01 : 1,
        }}
        transition={{
          maxWidth: { duration: 0.25, ease: "easeInOut" },
          borderRadius: { duration: 0.25, ease: "easeInOut" },
          scale: { duration: 0.2, ease: "easeOut" },
        }}
        whileHover={!open ? { scale: 1.02 } : {}}
      >
        <div className="flex flex-col">
          <div className="flex items-center gap-3 px-4 py-3">
            {open && searchScope !== "chat" && (
              <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            )}
            {!open && (
              <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            )}
            {open ? (
              <Input
                ref={inputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  searchScope === "actions"
                    ? "Run an action..."
                    : searchScope === "files"
                    ? "Search files..."
                    : searchScope === "modules"
                    ? "Search modules..."
                    : searchScope === "chat"
                    ? "Ask Arlo anything..."
                    : "Search or type a command..."
                }
                className="flex-1 bg-transparent border-none focus-visible:ring-0 text-foreground placeholder:text-muted-foreground/60"
                autoFocus
              />
            ) : (
              <span className="flex-1 text-sm text-muted-foreground">
                Search or type a command...
              </span>
            )}
            <AnimatePresence mode="wait">
              {open &&
                !hasTyped &&
                (searchScope === "all" ||
                  searchScope === "actions" ||
                  searchScope === "files" ||
                  searchScope === "modules") && (
                  <motion.div
                    className="flex items-center gap-1"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <motion.div
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchScope(
                          searchScope === "actions" ? "all" : "actions"
                        );
                      }}
                      className={cn(
                        "h-7 w-7 rounded-full flex items-center justify-center cursor-pointer transition-colors",
                        searchScope === "actions"
                          ? "bg-primary/20 text-primary"
                          : "bg-muted/40 text-muted-foreground/60 hover:bg-muted/70"
                      )}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      title="Actions"
                    >
                      <Zap className="h-4 w-4" />
                    </motion.div>
                    <motion.div
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchScope(
                          searchScope === "files" ? "all" : "files"
                        );
                      }}
                      className={cn(
                        "h-7 w-7 rounded-full flex items-center justify-center cursor-pointer transition-colors",
                        searchScope === "files"
                          ? "bg-primary/20 text-primary"
                          : "bg-muted/40 text-muted-foreground/60 hover:bg-muted/70"
                      )}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      title="Files"
                    >
                      <Folder className="h-4 w-4" />
                    </motion.div>
                    <motion.div
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchScope(
                          searchScope === "modules" ? "all" : "modules"
                        );
                      }}
                      className={cn(
                        "h-7 w-7 rounded-full flex items-center justify-center cursor-pointer transition-colors",
                        searchScope === "modules"
                          ? "bg-primary/20 text-primary"
                          : "bg-muted/40 text-muted-foreground/60 hover:bg-muted/70"
                      )}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      title="Modules"
                    >
                      <LayoutPanelTop className="h-4 w-4" />
                    </motion.div>
                    <motion.div
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchScope("chat");
                      }}
                      className="h-7 w-7 rounded-full flex items-center justify-center cursor-pointer transition-colors bg-muted/40 text-muted-foreground/60 hover:bg-muted/70"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      title="Chat"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </motion.div>
                  </motion.div>
                )}
              {open && searchScope === "chat" && (
                <motion.div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChatSubmit();
                  }}
                  className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center cursor-pointer hover:bg-primary/30 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  title="Send"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                >
                  <ArrowRight className="h-4 w-4" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {open &&
              (hasTyped || searchScope !== "all") &&
              searchScope !== "chat" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-border overflow-hidden"
                >
                  {filteredCommands().length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        No results for "{searchQuery}"
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto py-2 px-2">
                      {(
                        ["Actions", "Navigation", "Content", "Recent"] as const
                      ).map((category) => {
                        if (groups[category].length === 0) return null;

                        return (
                          <div
                            key={category}
                            className={globalIndex > 0 ? "mt-3" : ""}
                          >
                            {groups[category].map((cmd) => {
                              const currentIndex = globalIndex++;
                              const isSelected = selectedIndex === currentIndex;
                              const Icon = cmd.icon;

                              return (
                                <motion.div
                                  key={cmd.id}
                                  ref={(el) => {
                                    itemsRef.current[currentIndex] = el;
                                  }}
                                  className={cn(
                                    "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-all",
                                    isSelected
                                      ? "bg-accent/60"
                                      : "hover:bg-accent/30"
                                  )}
                                  onClick={() => executeCommand(cmd)}
                                  initial={{ opacity: 0, y: -4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: currentIndex * 0.015 }}
                                >
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/50">
                                    <Icon className="h-4 w-4 text-primary" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">
                                      {cmd.title}
                                    </p>
                                    {cmd.description && (
                                      <p className="text-xs text-muted-foreground truncate">
                                        {cmd.description}
                                      </p>
                                    )}
                                  </div>
                                  {cmd.shortcut && (
                                    <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-xs text-muted-foreground">
                                      {cmd.shortcut}
                                    </kbd>
                                  )}
                                </motion.div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
};

export default ArloCommandLauncher;
