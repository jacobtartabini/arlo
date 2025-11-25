import { useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";

export default function Files() {
  const { tailscaleVerified, isLoading } = useAuth();

  useEffect(() => {
    document.title = "Files — Arlo";
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <p className="text-foreground">Loading...</p>
      </div>
    );
  }

  if (!tailscaleVerified) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <p className="text-lg text-muted-foreground text-center">
          You must be logged in to view files.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <iframe
        src="/filebrowser/"
        title="File Browser"
        className="w-full border-0"
        style={{ height: "calc(100vh - 64px)" }}
      />
    </div>
  );
}
