import {
  Undo2,
  Redo2,
  Save,
  Download,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { SettingsDialog } from './SettingsDialog'
import type { ProjectSettings } from '@/lib/types'

interface TopBarProps {
  exporting: boolean
  exportProgress: string | null
  onExport: () => void
  clipCount: number
  settings: ProjectSettings
  onSettingsChange: (settings: ProjectSettings) => void
}

export function TopBar({ exporting, exportProgress, onExport, clipCount, settings, onSettingsChange }: TopBarProps) {
  return (
    <div className="h-11 flex items-center justify-between px-3 bg-panel border-b border-border shrink-0">
      {/* Left: Logo + File actions */}
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-2 mr-4">
          <div className="size-5 bg-white flex items-center justify-center">
            <span className="text-[10px] font-bold text-black leading-none">V</span>
          </div>
          <span className="text-[13px] font-semibold tracking-tight">Viblo Editor</span>
        </div>

        <Separator orientation="vertical" className="h-4 mx-1" />

        <TopBarButton icon={Undo2} tooltip="Undo" />
        <TopBarButton icon={Redo2} tooltip="Redo" />

        <Separator orientation="vertical" className="h-4 mx-1" />

        <TopBarButton icon={Save} tooltip="Save project" />
      </div>

      {/* Center: Progress or project name */}
      <div className="flex items-center gap-2">
        {exportProgress ? (
          <span className="text-[11px] text-muted-foreground font-medium tracking-wide">
            {exportProgress}
          </span>
        ) : (
          <span className="text-[12px] text-muted-foreground font-medium tracking-wide uppercase">
            Untitled Project
          </span>
        )}
      </div>

      {/* Right: Export + Settings */}
      <div className="flex items-center gap-1">
        <SettingsDialog settings={settings} onSettingsChange={onSettingsChange} />

        <Separator orientation="vertical" className="h-4 mx-1" />

        <Button
          size="sm"
          className="h-7 px-3 bg-white text-black text-[12px] font-semibold tracking-wide hover:bg-gray-200"
          disabled={exporting || clipCount === 0}
          onClick={onExport}
        >
          {exporting ? (
            <Loader2 data-icon="inline-start" className="animate-spin" />
          ) : (
            <Download data-icon="inline-start" />
          )}
          {exporting ? 'Exporting...' : 'Export'}
        </Button>
      </div>
    </div>
  )
}

function TopBarButton({
  icon: Icon,
  tooltip,
  active,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  tooltip: string
  active?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            className={`size-7 flex items-center justify-center transition-colors ${
              active
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          />
        }
      >
        <Icon size={15} strokeWidth={1.8} />
      </TooltipTrigger>
      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  )
}
