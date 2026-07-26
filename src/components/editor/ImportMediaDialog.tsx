import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Download, FolderOpen, Loader2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface ImportMediaDialogProps {
  onFilesSelected: (files: File[]) => void;
  onVideoDownloaded: (url: string, filename: string) => void;
  children: React.ReactElement<Record<string, unknown>>;
}

export function ImportMediaDialog({
  onFilesSelected,
  onVideoDownloaded,
  children,
}: ImportMediaDialogProps) {
  const [open, setOpen] = useState(false);
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleLocalImport = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) {
        onFilesSelected(files);
        setOpen(false);
      }
      e.target.value = "";
    },
    [onFilesSelected],
  );

  const handleTiktokDownload = useCallback(async () => {
    if (!tiktokUrl.trim()) return;

    setDownloading(true);
    setError(null);

    try {
      // Start download job
      const params = new URLSearchParams({ url: tiktokUrl.trim() });
      const startRes = await fetch(`/api/download?${params}`, {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa("user:pass"),
        },
      });

      if (!startRes.ok) {
        const body = await startRes.json().catch(() => ({}));
        throw new Error(body.error || `Failed to start download (${startRes.status})`);
      }

      const { jobId, cached, url: cachedUrl } = await startRes.json();

      // If cached, use result directly
      if (cached) {
        onVideoDownloaded(cachedUrl, `tiktok-${Date.now()}.mp4`);
        setOpen(false);
        setTiktokUrl("");
        return;
      }

      // Poll until ready
      let result;
      while (true) {
        await new Promise((r) => setTimeout(r, 2000));

        const pollRes = await fetch(`/api/download/${jobId}`, {
          headers: {
            Authorization: "Basic " + btoa("user:pass"),
          },
        });

        if (!pollRes.ok) throw new Error("Poll failed");

        result = await pollRes.json();
        if (result.ready) break;
      }

      if (result.error) throw new Error(result.error);

      onVideoDownloaded(result.url, `tiktok-${Date.now()}.mp4`);
      setOpen(false);
      setTiktokUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }, [tiktokUrl, onVideoDownloaded]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Media</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {/* Local import */}
          <button
            onClick={handleLocalImport}
            className="flex items-center gap-3 p-4 border border-border rounded-md hover:bg-accent transition-colors text-left"
          >
            <div className="size-10 border border-border flex items-center justify-center shrink-0">
              <FolderOpen size={20} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Local Files</p>
              <p className="text-xs text-muted-foreground">
                Import videos from your device
              </p>
            </div>
          </button>

          {/* TikTok download */}
          <div className="flex flex-col gap-2 p-4 border border-border rounded-md">
            <div className="flex items-center gap-3">
              <div className="size-10 border border-border flex items-center justify-center shrink-0">
                <Download size={20} className="text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Download from TikTok</p>
                <p className="text-xs text-muted-foreground">
                  Paste a TikTok video URL
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-1">
              <Input
                placeholder="https://www.tiktok.com/..."
                value={tiktokUrl}
                onChange={(e) => {
                  setTiktokUrl(e.target.value);
                  setError(null);
                }}
                disabled={downloading}
                className="h-8 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTiktokDownload();
                }}
              />
              <Button
                size="sm"
                onClick={handleTiktokDownload}
                disabled={downloading || !tiktokUrl.trim()}
              >
                {downloading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  "Download"
                )}
              </Button>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </DialogContent>
    </Dialog>
  );
}
