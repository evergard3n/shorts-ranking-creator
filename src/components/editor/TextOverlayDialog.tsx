import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Type } from 'lucide-react'
import type { TextOverlaySettings } from '@/lib/types'

interface TextOverlayDialogProps {
  overlay: TextOverlaySettings
  onOverlayChange: (overlay: TextOverlaySettings) => void
}

export function TextOverlayDialog({ overlay, onOverlayChange }: TextOverlayDialogProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<TextOverlaySettings>(overlay)

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) setDraft(overlay)
    setOpen(isOpen)
  }

  const handleApply = () => {
    onOverlayChange(draft)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <button className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" />
        }
      >
        <Type size={15} strokeWidth={1.8} />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle>Text Overlay</DialogTitle>
          <DialogDescription>
            Add title and rank numbers to video.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">Title</label>
            <Input
              value={draft.title}
              onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
              placeholder="Enter title text..."
              className="h-8 text-[12px]"
            />
          </div>

          {/* Title style */}
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-muted-foreground">Font Size</label>
              <Input
                type="number"
                value={draft.titleFontSize}
                onChange={(e) => setDraft((p) => ({ ...p, titleFontSize: Number(e.target.value) }))}
                className="h-7 text-[11px]"
                min={12}
                max={120}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-muted-foreground">Text Color</label>
              <div className="flex gap-1 items-center">
                <input
                  type="color"
                  value={draft.titleFontColor}
                  onChange={(e) => setDraft((p) => ({ ...p, titleFontColor: e.target.value }))}
                  className="size-6 cursor-pointer"
                />
                <span className="text-[10px] font-mono text-muted-foreground">{draft.titleFontColor}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-muted-foreground">Border</label>
              <div className="flex gap-1 items-center">
                <input
                  type="color"
                  value={draft.titleBorderColor}
                  onChange={(e) => setDraft((p) => ({ ...p, titleBorderColor: e.target.value }))}
                  className="size-6 cursor-pointer"
                />
                <span className="text-[10px] font-mono text-muted-foreground">{draft.titleBorderColor}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Rank */}
          <div className="flex items-center justify-between">
            <label className="text-[12px] font-medium text-foreground">Show Rank Numbers</label>
            <button
              type="button"
              role="switch"
              aria-checked={draft.showRank}
              onClick={() => setDraft((p) => ({ ...p, showRank: !p.showRank }))}
              className={`
                relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent
                transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                ${draft.showRank ? 'bg-white' : 'bg-muted'}
              `}
            >
              <span
                className={`
                  pointer-events-none block size-4 rounded-full shadow-lg ring-0 transition-transform
                  ${draft.showRank ? 'translate-x-4 bg-black' : 'translate-x-0 bg-foreground'}
                `}
              />
            </button>
          </div>

          {draft.showRank && (
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-muted-foreground">Font Size</label>
                <Input
                  type="number"
                  value={draft.rankFontSize}
                  onChange={(e) => setDraft((p) => ({ ...p, rankFontSize: Number(e.target.value) }))}
                  className="h-7 text-[11px]"
                  min={12}
                  max={120}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-muted-foreground">Text Color</label>
                <div className="flex gap-1 items-center">
                  <input
                    type="color"
                    value={draft.rankFontColor}
                    onChange={(e) => setDraft((p) => ({ ...p, rankFontColor: e.target.value }))}
                    className="size-6 cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-muted-foreground">{draft.rankFontColor}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-muted-foreground">Border</label>
                <div className="flex gap-1 items-center">
                  <input
                    type="color"
                    value={draft.rankBorderColor}
                    onChange={(e) => setDraft((p) => ({ ...p, rankBorderColor: e.target.value }))}
                    className="size-6 cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-muted-foreground">{draft.rankBorderColor}</span>
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Preview */}
          <div className="bg-surface border border-border px-3 py-2">
            <p className="text-[11px] text-muted-foreground">
              {draft.title ? `Title: "${draft.title}"` : 'No title'}
              {draft.showRank ? ' · Rank: #1, #2, ...' : ''}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
