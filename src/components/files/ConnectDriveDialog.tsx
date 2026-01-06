import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Cloud, Shield, Link2, FolderOpen } from "lucide-react";

interface ConnectDriveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: () => void;
}

export function ConnectDriveDialog({ open, onOpenChange, onConnect }: ConnectDriveDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10">
            <Cloud className="h-8 w-8 text-blue-500" />
          </div>
          <DialogTitle className="text-center">Connect Google Drive</DialogTitle>
          <DialogDescription className="text-center">
            Access your Google Drive files directly in Arlo without downloading them
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
              <FolderOpen className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Browse & search files</p>
                <p className="text-xs text-muted-foreground">
                  View and search across all your Drive files
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
              <Link2 className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Link to projects & trips</p>
                <p className="text-xs text-muted-foreground">
                  Attach Drive files to your Arlo projects and travel plans
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
              <Shield className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Read-only access</p>
                <p className="text-xs text-muted-foreground">
                  Arlo only reads file metadata, never modifies your files
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={() => { onConnect(); onOpenChange(false); }} className="gap-2">
            <Cloud className="h-4 w-4" />
            Connect with Google
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
