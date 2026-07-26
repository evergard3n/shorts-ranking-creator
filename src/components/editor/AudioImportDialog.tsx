import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { downloads } from "@/lib/api";
import { Download, FileVideo, FolderOpen, Loader2, Music } from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface AudioImportDialogProps {
  onAudioFileSelected: (file: File) => void;
  onAudioFromVideo: (url: string, filename: string) => void;
  children: React.ReactElement<Record<string, unknown>>;
}

export function AudioImportDialog({
  onAudioFileSelected,
  onAudioFromVideo,
  children,
}: AudioImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"main" | "video">("main");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (isOpen) {
      setView("main");
      setTiktokUrl("");
      setError(null);
    }
    setOpen(isOpen);
  }, []);

  // Audio file selected
  const handleAudioFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onAudioFileSelected(file);
        setOpen(false);
      }
      e.target.value = "";
    },
    [onAudioFileSelected],
  );

  // Video file selected → extract audio
  const handleVideoFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        onAudioFromVideo(url, file.name);
        setOpen(false);
      }
      e.target.value = "";
    },
    [onAudioFromVideo],
  );

  // TikTok download → extract audio
  const handleTiktokDownload = useCallback(async () => {
    if (!tiktokUrl.trim()) return;

    setDownloading(true);
    setError(null);

    try {
      const startResult = await downloads.start(tiktokUrl.trim());

      if (startResult.cached) {
        onAudioFromVideo(startResult.url, `tiktok-${Date.now()}.mp4`);
        setOpen(false);
        setTiktokUrl("");
        return;
      }

      let result;
      while (true) {
        await new Promise((r) => setTimeout(r, 2000));
        result = await downloads.poll(startResult.jobId);
        if (result.ready) break;
      }

      if ('error' in result) throw new Error(result.error);

      onAudioFromVideo(result.url, `tiktok-${Date.now()}.mp4`);
      setOpen(false);
      setTiktokUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }, [tiktokUrl, onAudioFromVideo]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={children} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {view === "main" ? (
              "Add Background Music"
            ) : (
              <button
                onClick={() => setView("main")}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                ← Back
              </button>
            )}
          </DialogTitle>
        </DialogHeader>

        {view === "main" ? (
          <div className="flex flex-col gap-3">
            {/* Upload audio file */}
            <button
              onClick={() => audioInputRef.current?.click()}
              className="flex items-center gap-3 p-4 border border-border hover:bg-accent transition-colors text-left"
            >
              <div className="size-10 border border-border flex items-center justify-center shrink-0">
                <Music size={20} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Upload Audio File</p>
                <p className="text-xs text-muted-foreground">
                  MP3, WAV, OGG, M4A
                </p>
              </div>
            </button>

            {/* Extract from video */}
            <button
              onClick={() => setView("video")}
              className="flex items-center gap-3 p-4 border border-border hover:bg-accent transition-colors text-left"
            >
              <div className="size-10 border border-border flex items-center justify-center shrink-0">
                <FileVideo size={20} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Extract from Video</p>
                <p className="text-xs text-muted-foreground">
                  Use audio from a video file or TikTok link
                </p>
              </div>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Upload video */}
            <button
              onClick={() => videoInputRef.current?.click()}
              className="flex items-center gap-3 p-4 border border-border hover:bg-accent transition-colors text-left"
            >
              <div className="size-10 border border-border flex items-center justify-center shrink-0">
                <FolderOpen size={20} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Upload Video</p>
                <p className="text-xs text-muted-foreground">
                  Audio will be extracted automatically
                </p>
              </div>
            </button>

            {/* TikTok download */}
            <div className="flex flex-col gap-2 p-4 border border-border">
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
        )}

        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
          className="hidden"
          onChange={handleAudioFileChange}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleVideoFileChange}
        />
      </DialogContent>
    </Dialog>
  );
}
