import { useState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import type { RelationshipCircle, RelationshipContact } from '@/types/contacts';

interface AddContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: {
    display_name: string;
    given_name: string | null;
    family_name: string | null;
    emails: string[];
    phones: string[];
    company: string | null;
    job_title: string | null;
    linkedin_url: string | null;
    circle: RelationshipCircle;
    tags: string[];
    profile_notes: string | null;
  }) => Promise<RelationshipContact | null>;
}

export function AddContactDialog({ open, onOpenChange, onCreate }: AddContactDialogProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [circle, setCircle] = useState<RelationshipCircle>('outer');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setCompany('');
    setJobTitle('');
    setLinkedin('');
    setCircle('outer');
    setTags('');
    setNotes('');
  };

  const handleSubmit = async () => {
    const display = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ').trim();
    if (!display) {
      toast.error('Add at least a first or last name');
      return;
    }
    setSubmitting(true);
    try {
      const created = await onCreate({
        display_name: display,
        given_name: firstName.trim() || null,
        family_name: lastName.trim() || null,
        emails: email.trim() ? [email.trim()] : [],
        phones: phone.trim() ? [phone.trim()] : [],
        company: company.trim() || null,
        job_title: jobTitle.trim() || null,
        linkedin_url: linkedin.trim() || null,
        circle,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        profile_notes: notes.trim() || null,
      });
      if (created) {
        toast.success(`Added ${display}`);
        reset();
        onOpenChange(false);
      } else {
        toast.error('Could not create contact');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Add contact
          </DialogTitle>
          <DialogDescription>
            Capture the essentials—you can refine notes, tags, and reminders after.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName" className="text-xs">First name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jane"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName" className="text-xs">Last name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 123 4567"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="company" className="text-xs">Company</Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Acme Inc."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jobTitle" className="text-xs">Title</Label>
              <Input
                id="jobTitle"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Designer"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="linkedin" className="text-xs">LinkedIn URL</Label>
            <Input
              id="linkedin"
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
              placeholder="linkedin.com/in/janedoe"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="circle" className="text-xs">Circle</Label>
              <Select value={circle} onValueChange={(v) => setCircle(v as RelationshipCircle)}>
                <SelectTrigger id="circle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inner">Inner circle</SelectItem>
                  <SelectItem value="middle">Middle circle</SelectItem>
                  <SelectItem value="outer">Outer circle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tags" className="text-xs">Tags (comma separated)</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="founder, mentor"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs">Notes</Label>
            <Textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How you met, shared interests, open threads…"
              className="resize-none text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add contact
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
