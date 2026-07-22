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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Settings } from 'lucide-react'
import {
  FORMAT_PRESETS,
  FPS_OPTIONS,
  QUALITY_PRESETS,
  type ProjectSettings,
  type FormatKey,
} from '@/lib/types'

interface SettingsDialogProps {
  settings: ProjectSettings
  onSettingsChange: (settings: ProjectSettings) => void
}

export function SettingsDialog({ settings, onSettingsChange }: SettingsDialogProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<ProjectSettings>(settings)

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setDraft(settings)
    }
    setOpen(isOpen)
  }

  const handleFormatChange = (value: string | null) => {
    if (!value) return
    const preset = FORMAT_PRESETS[value as FormatKey]
    if (!preset) return
    setDraft((prev) => ({ ...prev, width: preset.width, height: preset.height }))
  }

  const handleFpsChange = (value: string | null) => {
    if (!value) return
    setDraft((prev) => ({ ...prev, fps: parseInt(value, 10) }))
  }

  const handleQualityChange = (value: string | null) => {
    if (!value) return
    const q = QUALITY_PRESETS[value as keyof typeof QUALITY_PRESETS]
    if (!q) return
    setDraft((prev) => ({ ...prev, preset: value as ProjectSettings['preset'], crf: q.crf }))
  }

  const handleApply = () => {
    onSettingsChange(draft)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <button className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" />
        }
      >
        <Settings size={15} strokeWidth={1.8} />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle>Output Settings</DialogTitle>
          <DialogDescription>
            Configure video format for preview and export.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Format */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">Format</label>
            <Select value={findFormatKey(draft)} onValueChange={handleFormatChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Presets</SelectLabel>
                  {Object.entries(FORMAT_PRESETS).map(([key, preset]) => (
                    <SelectItem key={key} value={key}>
                      {preset.label} ({preset.width}×{preset.height})
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* FPS */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">Frame Rate</label>
            <Select value={String(draft.fps)} onValueChange={handleFpsChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {FPS_OPTIONS.map((fps) => (
                    <SelectItem key={fps} value={String(fps)}>
                      {fps} fps
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Quality */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">Quality</label>
            <Select value={draft.preset} onValueChange={handleQualityChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {Object.entries(QUALITY_PRESETS).map(([key, q]) => (
                    <SelectItem key={key} value={key}>
                      {q.label} (CRF {q.crf})
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Summary */}
          <div className="bg-surface border border-border px-3 py-2">
            <p className="text-[11px] text-muted-foreground font-mono">
              Output: {draft.width}×{draft.height} @ {draft.fps}fps · {draft.preset} · CRF {draft.crf}
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

function findFormatKey(settings: ProjectSettings): string {
  const match = Object.entries(FORMAT_PRESETS).find(
    ([, v]) => v.width === settings.width && v.height === settings.height
  )
  return match?.[0] ?? 'vertical-hd'
}
