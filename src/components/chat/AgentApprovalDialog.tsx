"use client";

import { useState } from "react";
import { useArlo } from "@/providers/ArloProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export function AgentApprovalDialog() {
  const { pendingApproval, respondToApproval } = useArlo();
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const open = !!pendingApproval;

  const proposal = pendingApproval?.proposal;

  const submit = async (decision: "approve" | "deny") => {
    if (!pendingApproval) return;
    setIsSubmitting(true);
    try {
      await respondToApproval(decision, note.trim() || undefined);
      setNote("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { /* controlled by provider */ }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve action?</DialogTitle>
          <DialogDescription>
            Arlo wants to perform an action that may have side effects.
          </DialogDescription>
        </DialogHeader>

        {proposal ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-border/60 p-3">
              <div className="text-sm font-medium">{proposal.title}</div>
              {proposal.target ? (
                <div className="text-xs text-muted-foreground mt-0.5">
                  Target: {proposal.target}
                </div>
              ) : null}
              <div className="text-xs text-muted-foreground mt-0.5">
                Risk: {proposal.risk}
              </div>
              {proposal.preview ? (
                <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted p-2 text-xs">
                  {proposal.preview}
                </pre>
              ) : null}
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Optional note to Arlo</div>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g., Use my work email and stop before checkout."
              />
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => submit("deny")}
            disabled={isSubmitting}
          >
            Deny
          </Button>
          <Button
            onClick={() => submit("approve")}
            disabled={isSubmitting}
          >
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

