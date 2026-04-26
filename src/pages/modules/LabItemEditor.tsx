import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Clipboard,
  Copy,
  FileCode,
  Hash,
  Loader2,
  Plus,
  Save,
  StickyNote,
  Trash2,
  Workflow,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useLabItems } from "@/hooks/useLabItems";
import type { LabItem, LabItemType } from "@/types/creation";

type EditorKind = "note" | "code" | "automation";

const CODE_LANGUAGES = [
  "plaintext",
  "typescript",
  "javascript",
  "tsx",
  "jsx",
  "python",
  "bash",
  "json",
  "yaml",
  "html",
  "css",
  "sql",
  "go",
  "rust",
  "swift",
  "kotlin",
  "java",
  "c",
  "cpp",
  "markdown",
];

interface AutomationStep {
  id: string;
  kind: "trigger" | "action" | "condition";
  title: string;
  detail: string;
}

interface AutomationDoc {
  steps: AutomationStep[];
  schedule?: string;
}

const KIND_META: Record<EditorKind, { label: string; icon: typeof StickyNote; tint: string }> = {
  note: { label: "Note", icon: StickyNote, tint: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  code: { label: "Code", icon: FileCode, tint: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  automation: { label: "Automation", icon: Workflow, tint: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function isEditorKind(t: LabItemType | string | undefined): t is EditorKind {
  return t === "note" || t === "code" || t === "automation";
}

function parseAutomation(body: string | null, metadata: Record<string, unknown>): AutomationDoc {
  const fromMeta = (metadata?.automation ?? null) as AutomationDoc | null;
  if (fromMeta && Array.isArray(fromMeta.steps)) return fromMeta;
  if (body && body.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(body);
      if (parsed && Array.isArray(parsed.steps)) return parsed as AutomationDoc;
    } catch {
      // ignore
    }
  }
  return { steps: [] };
}

function automationToText(doc: AutomationDoc): string {
  if (!doc.steps.length) return "";
  const lines = doc.steps.map((s, i) => {
    const tag = s.kind.toUpperCase();
    return `${i + 1}. [${tag}] ${s.title}${s.detail ? ` — ${s.detail}` : ""}`;
  });
  if (doc.schedule) lines.unshift(`Schedule: ${doc.schedule}`);
  return lines.join("\n");
}

export default function LabItemEditor() {
  const { projectId, itemId } = useParams<{ projectId: string; itemId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryKind = searchParams.get("kind");
  const isNew = itemId === "new";
  const initialKind: EditorKind = isEditorKind(queryKind) ? queryKind : "note";

  const { items, loading, addTextItem, updateItem, deleteItem } = useLabItems(projectId);

  // Notes are now handled by the dedicated LabNoteEditor (which reuses the
  // full /notes experience). Redirect any traffic that lands here for a note.
  useEffect(() => {
    if (!projectId) return;
    if (isNew && queryKind === "note") {
      navigate(`/lab/project/${projectId}/note/new`, { replace: true });
      return;
    }
    if (!isNew && !loading) {
      const found = items.find((i) => i.id === itemId);
      if (found && found.item_type === "note") {
        navigate(`/lab/project/${projectId}/note/${found.id}`, { replace: true });
      }
    }
  }, [projectId, isNew, queryKind, loading, items, itemId, navigate]);

  const [kind, setKind] = useState<EditorKind>(initialKind);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [language, setLanguage] = useState<string>("plaintext");
  const [automation, setAutomation] = useState<AutomationDoc>({ steps: [] });
  const [savedItemId, setSavedItemId] = useState<string | null>(isNew ? null : itemId ?? null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const initializedRef = useRef(false);

  // Hydrate from existing item
  useEffect(() => {
    if (isNew || initializedRef.current || loading) return;
    const found = items.find((i) => i.id === itemId);
    if (!found) return;
    if (!isEditorKind(found.item_type)) {
      navigate(`/lab/project/${projectId}`, { replace: true });
      return;
    }
    initializedRef.current = true;
    setKind(found.item_type);
    setTitle(found.title);
    setBody(found.body ?? "");
    const meta = (found.metadata ?? {}) as Record<string, unknown>;
    if (typeof meta.language === "string") setLanguage(meta.language);
    if (found.item_type === "automation") {
      setAutomation(parseAutomation(found.body, meta));
    }
    setSavedItemId(found.id);
    setLastSavedAt(new Date(found.updated_at));
  }, [isNew, itemId, items, loading, navigate, projectId]);

  // Mark dirty on changes after init
  useEffect(() => {
    if (!initializedRef.current && !isNew) return;
    setDirty(true);
  }, [title, body, language, automation, kind, isNew]);

  const meta = KIND_META[kind];
  const KindIcon = meta.icon;

  const automationBodyPreview = useMemo(() => automationToText(automation), [automation]);

  const performSave = useCallback(async () => {
    if (!projectId || saving) return;
    setSaving(true);
    try {
      const cleanTitle = title.trim() || `Untitled ${meta.label.toLowerCase()}`;
      let payloadBody = body;
      let payloadMeta: Record<string, unknown> = {};

      if (kind === "code") {
        payloadMeta = { language };
      } else if (kind === "automation") {
        payloadBody = automationBodyPreview;
        payloadMeta = { automation };
      }

      if (savedItemId) {
        await updateItem(savedItemId, {
          title: cleanTitle,
          body: payloadBody,
          metadata: payloadMeta,
        });
      } else {
        const created = await addTextItem(kind, cleanTitle, payloadBody);
        if (created) {
          setSavedItemId(created.id);
          if (Object.keys(payloadMeta).length) {
            await updateItem(created.id, { metadata: payloadMeta });
          }
          // Replace URL so refresh works
          window.history.replaceState(null, "", `/lab/project/${projectId}/item/${created.id}`);
        } else {
          throw new Error("Create failed");
        }
      }
      initializedRef.current = true;
      setDirty(false);
      setLastSavedAt(new Date());
    } catch (e) {
      console.error(e);
      toast.error("Couldn't save changes");
    } finally {
      setSaving(false);
    }
  }, [
    addTextItem,
    automation,
    automationBodyPreview,
    body,
    kind,
    language,
    meta.label,
    projectId,
    savedItemId,
    saving,
    title,
    updateItem,
  ]);

  // Cmd/Ctrl+S to save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        performSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [performSave]);

  const handleDelete = async () => {
    if (!savedItemId) {
      navigate(`/lab/project/${projectId}`);
      return;
    }
    if (!confirm("Delete this item?")) return;
    await deleteItem(savedItemId);
    navigate(`/lab/project/${projectId}`);
  };

  const copyBody = async () => {
    const text = kind === "automation" ? automationBodyPreview : body;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (!projectId) {
    navigate("/lab", { replace: true });
    return null;
  }

  if (loading && !isNew) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/lab/project/${projectId}`)}
            className="shrink-0"
            aria-label="Back to project"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${meta.tint}`}>
            <KindIcon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`${meta.label} title`}
              className="h-9 text-base font-semibold border-none bg-transparent px-0 focus-visible:ring-0 tracking-tight"
            />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                {meta.label}
              </Badge>
              {dirty ? (
                <span className="text-amber-600 dark:text-amber-400">Unsaved changes</span>
              ) : lastSavedAt ? (
                <span>Saved {lastSavedAt.toLocaleTimeString()}</span>
              ) : (
                <span>Draft</span>
              )}
            </div>
          </div>
          {(kind === "code" || kind === "note" || kind === "automation") && (
            <Button variant="ghost" size="sm" onClick={copyBody} className="hidden sm:inline-flex">
              <Copy className="h-4 w-4 mr-1.5" />
              Copy
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
          <Button size="sm" onClick={performSave} disabled={saving || (!dirty && !!savedItemId)}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1.5" />
            )}
            Save
          </Button>
        </div>
      </header>

      {/* Editor body */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {kind === "note" && (
          <NoteEditor body={body} onChange={setBody} />
        )}
        {kind === "code" && (
          <CodeEditor
            body={body}
            onChange={setBody}
            language={language}
            onLanguageChange={setLanguage}
          />
        )}
        {kind === "automation" && (
          <AutomationEditor doc={automation} onChange={setAutomation} />
        )}
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Note editor                                 */
/* -------------------------------------------------------------------------- */

function NoteEditor({ body, onChange }: { body: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  // Auto-resize
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 480)}px`;
  }, [body]);

  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;
  const charCount = body.length;

  const insertAtCursor = (snippet: string) => {
    const el = ref.current;
    if (!el) {
      onChange(body + snippet);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + snippet + body.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + snippet.length;
      el.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border/60 bg-card/40 p-1">
        <ToolbarButton onClick={() => insertAtCursor("\n# ")} title="Heading">H1</ToolbarButton>
        <ToolbarButton onClick={() => insertAtCursor("\n## ")} title="Subheading">H2</ToolbarButton>
        <ToolbarButton onClick={() => insertAtCursor("**bold**")} title="Bold">B</ToolbarButton>
        <ToolbarButton onClick={() => insertAtCursor("*italic*")} title="Italic"><span className="italic">I</span></ToolbarButton>
        <div className="w-px h-5 bg-border mx-1" />
        <ToolbarButton onClick={() => insertAtCursor("\n- ")} title="Bulleted list">•</ToolbarButton>
        <ToolbarButton onClick={() => insertAtCursor("\n1. ")} title="Numbered list">1.</ToolbarButton>
        <ToolbarButton onClick={() => insertAtCursor("\n- [ ] ")} title="Checklist">☐</ToolbarButton>
        <div className="w-px h-5 bg-border mx-1" />
        <ToolbarButton onClick={() => insertAtCursor("\n> ")} title="Quote">"</ToolbarButton>
        <ToolbarButton onClick={() => insertAtCursor("`code`")} title="Inline code">{"</>"}</ToolbarButton>
        <ToolbarButton onClick={() => insertAtCursor("\n```\n\n```\n")} title="Code block">{"```"}</ToolbarButton>
        <ToolbarButton onClick={() => insertAtCursor("\n---\n")} title="Divider">―</ToolbarButton>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/30">
        <textarea
          ref={ref}
          value={body}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Start writing… use the toolbar for formatting. Markdown is supported."
          className="w-full bg-transparent border-none outline-none resize-none px-6 py-6 text-[15px] leading-7 placeholder:text-muted-foreground/60"
          style={{ minHeight: 480 }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>{wordCount} {wordCount === 1 ? "word" : "words"} · {charCount} chars</span>
        <span className="hidden sm:inline">⌘/Ctrl + S to save</span>
      </div>
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="h-8 min-w-8 px-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Code editor                                 */
/* -------------------------------------------------------------------------- */

function CodeEditor({
  body,
  onChange,
  language,
  onLanguageChange,
}: {
  body: string;
  onChange: (v: string) => void;
  language: string;
  onLanguageChange: (l: string) => void;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const [wrap, setWrap] = useState(false);

  const lines = useMemo(() => body.split("\n"), [body]);
  const lineCount = lines.length;
  const charCount = body.length;

  // Sync scroll between gutter and textarea
  const syncScroll = () => {
    if (taRef.current && lineRef.current) {
      lineRef.current.scrollTop = taRef.current.scrollTop;
    }
  };

  // Tab support
  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = body.slice(0, start) + "  " + body.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2;
      });
    }
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) onChange(body + (body && !body.endsWith("\n") ? "\n" : "") + text);
    } catch {
      toast.error("Couldn't read clipboard");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={language} onValueChange={onLanguageChange}>
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CODE_LANGUAGES.map((l) => (
              <SelectItem key={l} value={l} className="text-xs">
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setWrap((w) => !w)}
          className="h-8"
        >
          {wrap ? <Check className="h-3.5 w-3.5 mr-1.5" /> : null}
          Wrap lines
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={pasteFromClipboard} className="h-8">
          <Clipboard className="h-3.5 w-3.5 mr-1.5" />
          Paste
        </Button>
        <div className="ml-auto text-xs text-muted-foreground flex items-center gap-3">
          <span>{lineCount} lines</span>
          <span>{charCount} chars</span>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-[hsl(var(--card))] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/60 bg-muted/30">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
            <FileCode className="h-3.5 w-3.5" />
            {language}
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          </div>
        </div>
        <div className="flex max-h-[68vh]">
          <div
            ref={lineRef}
            className="select-none overflow-hidden bg-muted/20 text-right py-4 pl-3 pr-2 font-mono text-xs text-muted-foreground/70 leading-6 border-r border-border/60"
            style={{ minWidth: 44 }}
          >
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <textarea
            ref={taRef}
            value={body}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKey}
            onScroll={syncScroll}
            spellCheck={false}
            placeholder="// start typing your code here"
            className="flex-1 bg-transparent border-none outline-none resize-none py-4 px-4 font-mono text-sm leading-6 placeholder:text-muted-foreground/50 overflow-auto"
            style={{
              minHeight: 480,
              whiteSpace: wrap ? "pre-wrap" : "pre",
              wordBreak: wrap ? "break-word" : "normal",
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                             Automation editor                              */
/* -------------------------------------------------------------------------- */

const STEP_KIND_META: Record<AutomationStep["kind"], { label: string; icon: typeof Zap; tint: string }> = {
  trigger: { label: "Trigger", icon: Zap, tint: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  condition: { label: "Condition", icon: Hash, tint: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  action: { label: "Action", icon: Workflow, tint: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
};

function AutomationEditor({
  doc,
  onChange,
}: {
  doc: AutomationDoc;
  onChange: (d: AutomationDoc) => void;
}) {
  const updateStep = (id: string, patch: Partial<AutomationStep>) => {
    onChange({ ...doc, steps: doc.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  };
  const removeStep = (id: string) => {
    onChange({ ...doc, steps: doc.steps.filter((s) => s.id !== id) });
  };
  const addStep = (kind: AutomationStep["kind"]) => {
    const defaults: Record<AutomationStep["kind"], { title: string; detail: string }> = {
      trigger: { title: "When something happens", detail: "" },
      condition: { title: "If condition is met", detail: "" },
      action: { title: "Do this", detail: "" },
    };
    onChange({
      ...doc,
      steps: [...doc.steps, { id: uid(), kind, ...defaults[kind] }],
    });
  };
  const moveStep = (id: string, dir: -1 | 1) => {
    const idx = doc.steps.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= doc.steps.length) return;
    const next = [...doc.steps];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange({ ...doc, steps: next });
  };

  const hasTrigger = doc.steps.some((s) => s.kind === "trigger");

  return (
    <div className="space-y-4">
      {/* Schedule field */}
      <div className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-2">
        <Label htmlFor="auto-schedule" className="text-xs uppercase tracking-wider text-muted-foreground">
          Schedule (optional)
        </Label>
        <Input
          id="auto-schedule"
          value={doc.schedule ?? ""}
          onChange={(e) => onChange({ ...doc, schedule: e.target.value })}
          placeholder="e.g. Every weekday at 8:00am, or 0 9 * * 1-5"
        />
        <p className="text-xs text-muted-foreground">
          Plain English or a cron expression — used as a reminder of when this should run.
        </p>
      </div>

      {/* Steps */}
      {doc.steps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/30 p-10 text-center space-y-3">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Workflow className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium">Build your automation</p>
            <p className="text-xs text-muted-foreground mt-1">
              Start with a trigger, then add conditions and actions.
            </p>
          </div>
          <div className="flex justify-center gap-2 pt-1">
            <AddStepButton kind="trigger" onClick={() => addStep("trigger")} />
            <AddStepButton kind="action" onClick={() => addStep("action")} />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {doc.steps.map((step, idx) => {
            const m = STEP_KIND_META[step.kind];
            const Icon = m.icon;
            return (
              <div
                key={step.id}
                className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-3 relative"
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${m.tint}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                      Step {idx + 1} · {m.label}
                    </div>
                  </div>
                  <Select
                    value={step.kind}
                    onValueChange={(v) => updateStep(step.id, { kind: v as AutomationStep["kind"] })}
                  >
                    <SelectTrigger className="h-8 w-[120px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trigger">Trigger</SelectItem>
                      <SelectItem value="condition">Condition</SelectItem>
                      <SelectItem value="action">Action</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => moveStep(step.id, -1)}
                      disabled={idx === 0}
                      title="Move up"
                    >
                      <ChevronDown className="h-4 w-4 rotate-180" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => moveStep(step.id, 1)}
                      disabled={idx === doc.steps.length - 1}
                      title="Move down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeStep(step.id)}
                      title="Remove step"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Input
                  value={step.title}
                  onChange={(e) => updateStep(step.id, { title: e.target.value })}
                  placeholder={
                    step.kind === "trigger"
                      ? "When… (e.g. New email arrives in Inbox)"
                      : step.kind === "condition"
                      ? "If… (e.g. Subject contains 'invoice')"
                      : "Do… (e.g. Forward to accounting@)"
                  }
                />
                <Textarea
                  value={step.detail}
                  onChange={(e) => updateStep(step.id, { detail: e.target.value })}
                  rows={2}
                  placeholder="Details, parameters, or notes for this step…"
                  className="text-sm"
                />
              </div>
            );
          })}

          {!hasTrigger && (
            <p className="text-xs text-amber-600 dark:text-amber-400 px-1">
              Tip: most automations start with a trigger.
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <AddStepButton kind="trigger" onClick={() => addStep("trigger")} />
            <AddStepButton kind="condition" onClick={() => addStep("condition")} />
            <AddStepButton kind="action" onClick={() => addStep("action")} />
          </div>
        </div>
      )}
    </div>
  );
}

function AddStepButton({
  kind,
  onClick,
}: {
  kind: AutomationStep["kind"];
  onClick: () => void;
}) {
  const m = STEP_KIND_META[kind];
  const Icon = m.icon;
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick} className="h-8">
      <Plus className="h-3.5 w-3.5 mr-1" />
      <Icon className="h-3.5 w-3.5 mr-1.5" />
      Add {m.label.toLowerCase()}
    </Button>
  );
}
