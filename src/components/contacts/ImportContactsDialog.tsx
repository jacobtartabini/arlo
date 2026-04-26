import { useEffect, useState } from 'react';
import {
  Apple,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Linkedin,
  Loader2,
  Smartphone,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getCachedDriveAccounts, useFilesPersistence } from '@/hooks/useFilesPersistence';
import { useContactsPersistence } from '@/hooks/useContactsPersistence';
import {
  devicePickedToDrafts,
  parseLinkedInConnectionsCsv,
  parseVCardFile,
} from '@/lib/contacts-parsers';
import { getAuthHeaders } from '@/lib/arloAuth';
import type { ContactImportDraft } from '@/types/contacts';
import type { DriveAccount } from '@/types/files';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

type ProviderKey = 'google' | 'apple' | 'device' | 'vcard' | 'linkedin';

interface ImportContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

const PROVIDERS: Array<{
  key: ProviderKey;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
}> = [
  {
    key: 'google',
    label: 'Google Contacts',
    description: 'Pull names, emails, phones, and photos from your linked Google account.',
    icon: GoogleIcon,
    iconClass: 'bg-[hsl(217,91%,60%)]/15 text-[hsl(217,91%,60%)]',
  },
  {
    key: 'apple',
    label: 'Apple / iCloud',
    description: 'Export your iCloud Contacts as a vCard and upload it here.',
    icon: Apple,
    iconClass: 'bg-zinc-500/15 text-zinc-200',
  },
  {
    key: 'device',
    label: 'This device',
    description: 'Pick contacts directly from your phone (Chrome on Android).',
    icon: Smartphone,
    iconClass: 'bg-emerald-500/15 text-emerald-300',
  },
  {
    key: 'vcard',
    label: 'vCard file (.vcf)',
    description: 'Universal contact format — works with most contact apps.',
    icon: FileText,
    iconClass: 'bg-violet-500/15 text-violet-300',
  },
  {
    key: 'linkedin',
    label: 'LinkedIn CSV',
    description: 'Use LinkedIn → Settings → Data export → Connections.',
    icon: Linkedin,
    iconClass: 'bg-[hsl(201,100%,35%)]/15 text-[hsl(201,100%,55%)]',
  },
];

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M21.35 11.1H12v2.9h5.36c-.24 1.4-1.71 4.1-5.36 4.1-3.23 0-5.86-2.67-5.86-5.95s2.63-5.95 5.86-5.95c1.84 0 3.07.78 3.78 1.45l2.58-2.49C16.78 3.74 14.6 2.8 12 2.8 6.94 2.8 2.85 6.89 2.85 11.95S6.94 21.1 12 21.1c6.93 0 9.45-4.86 9.45-9.4 0-.63-.06-1.1-.1-1.6z" />
    </svg>
  );
}

export function ImportContactsDialog({ open, onOpenChange, onImported }: ImportContactsDialogProps) {
  const persistence = useContactsPersistence();
  const { listAccounts } = useFilesPersistence();

  const [activeProvider, setActiveProvider] = useState<ProviderKey | null>(null);
  const [driveAccounts, setDriveAccounts] = useState<DriveAccount[]>(() => getCachedDriveAccounts());
  const [googleAccountId, setGoogleAccountId] = useState<string>('');
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!open) {
      setActiveProvider(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const acc = await listAccounts();
      if (cancelled) return;
      setDriveAccounts(acc);
      if (acc[0] && !googleAccountId) setGoogleAccountId(acc[0].id);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, listAccounts, googleAccountId]);

  const finishImport = async (drafts: ContactImportDraft[], sourceLabel: string) => {
    if (!drafts.length) {
      toast.error(`${sourceLabel}: nothing to import`);
      return;
    }
    setWorking(true);
    try {
      const { created, merged, error } = await persistence.importDrafts(drafts);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success(`${sourceLabel}: added ${created}, merged ${merged}`);
      onImported();
      onOpenChange(false);
    } finally {
      setWorking(false);
    }
  };

  const handleGoogle = async () => {
    if (!googleAccountId) {
      toast.error('Connect a Google account in Settings → Google Drive first.');
      return;
    }
    setWorking(true);
    try {
      const headers = await getAuthHeaders();
      if (!headers) throw new Error('Not signed in');
      const res = await fetch(`${SUPABASE_URL}/functions/v1/google-contacts-import`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ drive_account_id: googleAccountId }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || payload.message || 'Google import failed');

      const raw = (payload.contacts || []) as Array<{
        display_name: string;
        given_name?: string | null;
        family_name?: string | null;
        emails: string[];
        phones: string[];
        company?: string | null;
        job_title?: string | null;
        linkedin_url?: string | null;
        photo_url?: string | null;
        external_id?: string | null;
      }>;
      const drafts: ContactImportDraft[] = raw.map((row) => ({
        display_name: row.display_name,
        given_name: row.given_name,
        family_name: row.family_name,
        emails: row.emails || [],
        phones: row.phones || [],
        company: row.company,
        job_title: row.job_title,
        linkedin_url: row.linkedin_url,
        photo_url: row.photo_url,
        source: 'google',
        external_id: row.external_id,
      }));
      await finishImport(drafts, 'Google');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Google import failed');
    } finally {
      setWorking(false);
    }
  };

  const handleVCardFile = async (file: File, label = 'vCard') => {
    try {
      const text = await file.text();
      const drafts = parseVCardFile(text);
      if (!drafts.length) {
        toast.error(`${label}: no contacts found in file`);
        return;
      }
      await finishImport(drafts, label);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not read file');
    }
  };

  const handleLinkedInCsv = async (file: File) => {
    try {
      const text = await file.text();
      const drafts = parseLinkedInConnectionsCsv(text);
      if (!drafts.length) {
        toast.error('Could not parse CSV. Use LinkedIn “Connections” export.');
        return;
      }
      await finishImport(drafts, 'LinkedIn CSV');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not read CSV');
    }
  };

  const handleDevicePick = async () => {
    const nav = navigator as Navigator & {
      contacts?: { select: (props: string[], opts?: { multiple?: boolean }) => Promise<unknown[]> };
    };
    if (!nav.contacts?.select) {
      toast.message('Contact Picker unavailable on this device', {
        description: 'Try Chrome on Android, or use the vCard option below.',
      });
      return;
    }
    try {
      const picked = (await nav.contacts.select(['name', 'email', 'tel'], { multiple: true })) as Array<{
        name?: string[];
        email?: string[];
        tel?: string[];
      }>;
      const drafts = devicePickedToDrafts(picked);
      await finishImport(drafts, 'Device');
    } catch {
      toast.error('Contact selection was cancelled.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import contacts</DialogTitle>
          <DialogDescription>
            Choose where your contacts live. Arlo merges duplicates by email, phone, or LinkedIn URL.
          </DialogDescription>
        </DialogHeader>

        {!activeProvider ? (
          <div className="grid gap-2 py-2">
            {PROVIDERS.map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setActiveProvider(p.key)}
                  className="group flex items-center gap-3 rounded-lg border border-border/60 bg-muted/10 px-3 py-3 text-left transition hover:border-border hover:bg-muted/30"
                >
                  <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', p.iconClass)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{p.label}</p>
                      {p.key === 'apple' && (
                        <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                          via vCard
                        </Badge>
                      )}
                    </div>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{p.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2 h-7 text-xs"
              onClick={() => setActiveProvider(null)}
              disabled={working}
            >
              ← All sources
            </Button>

            {activeProvider === 'google' && (
              <div className="space-y-3">
                <p className="text-sm">
                  Import from your linked Google account using the People API.
                </p>
                {driveAccounts.length === 0 ? (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200/90">
                    No Google account is linked yet. Connect one under <strong>Settings → Google Drive</strong>, then come back here.
                  </div>
                ) : (
                  <>
                    <Select value={googleAccountId} onValueChange={setGoogleAccountId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose Google account" />
                      </SelectTrigger>
                      <SelectContent>
                        {driveAccounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.account_email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" disabled={working} onClick={handleGoogle} className="w-full">
                      {working && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Import from Google
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      If import fails with a permission error, disconnect Google in Settings and reconnect once so the Contacts scope is granted.
                    </p>
                  </>
                )}
              </div>
            )}

            {activeProvider === 'apple' && (
              <div className="space-y-3">
                <p className="text-sm">Apple doesn’t expose a public contacts API, so the cleanest path is a vCard export from iCloud or the Contacts app.</p>
                <ol className="list-decimal space-y-1.5 pl-4 text-xs text-muted-foreground">
                  <li>On Mac: open <strong>Contacts.app</strong>, select all (⌘A), then <strong>File → Export → Export vCard…</strong></li>
                  <li>On iPhone: open a contact → <strong>Share Contact → AirDrop / Save to Files</strong>. For everyone, use <strong>iCloud.com → Contacts → ⚙ → Export vCard</strong>.</li>
                  <li>Upload the resulting <code>.vcf</code> file below.</li>
                </ol>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/20 px-3 py-4 text-sm transition hover:bg-muted/40">
                  <Apple className="h-4 w-4" />
                  <span>{working ? 'Importing…' : 'Upload Apple vCard (.vcf)'}</span>
                  <input
                    type="file"
                    accept=".vcf,.vcard,text/vcard"
                    className="hidden"
                    disabled={working}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleVCardFile(f, 'Apple');
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            )}

            {activeProvider === 'device' && (
              <div className="space-y-3">
                <p className="text-sm">Pick contacts directly from this device — no file needed.</p>
                <p className="text-xs text-muted-foreground">
                  Works in Chrome on Android. On iOS / desktop, use the Apple or vCard option instead.
                </p>
                <Button type="button" disabled={working} onClick={handleDevicePick} className="w-full">
                  {working && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Smartphone className="mr-2 h-4 w-4" />
                  Open device contact picker
                </Button>
              </div>
            )}

            {activeProvider === 'vcard' && (
              <div className="space-y-3">
                <p className="text-sm">Universal vCard format — exported by most contact apps.</p>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/20 px-3 py-4 text-sm transition hover:bg-muted/40">
                  <FileText className="h-4 w-4" />
                  <span>{working ? 'Importing…' : 'Upload .vcf file'}</span>
                  <input
                    type="file"
                    accept=".vcf,.vcard,text/vcard"
                    className="hidden"
                    disabled={working}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleVCardFile(f);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            )}

            {activeProvider === 'linkedin' && (
              <div className="space-y-3">
                <p className="text-sm">Import your LinkedIn connections.</p>
                <ol className="list-decimal space-y-1.5 pl-4 text-xs text-muted-foreground">
                  <li>On LinkedIn: <strong>Me → Settings & Privacy → Data privacy → Get a copy of your data</strong>.</li>
                  <li>Tick <strong>Connections</strong> only and request the export.</li>
                  <li>You’ll receive a CSV by email — upload it here.</li>
                </ol>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/20 px-3 py-4 text-sm transition hover:bg-muted/40">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>{working ? 'Importing…' : 'Upload Connections.csv'}</span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    disabled={working}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleLinkedInCsv(f);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
