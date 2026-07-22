import { useCallback, useRef, useState } from 'react'
import {
  Play,
  Pause,
  Trash2,
  Plus,
  GripVertical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import type { SequenceClip } from '@/lib/types'

interface SequencePanelProps {
  sequence: SequenceClip[]
  selectedSeqId: string | null
  currentTime: number
  playing: boolean
  totalDuration: number
  findRowIndex: (time: number) => number
  onSelectClip: (id: string | null) => void
  onDropClip: (clipId: string, rowIndex: number) => void
  onReplaceRow: (clipId: string, rowIndex: number) => void
  onRemoveRow: (rowIndex: number) => void
  onTrimChange: (id: string, trimStart: number, trimEnd: number) => void
  onReorder: (fromIndex: number, toIndex: number) => void
  onTimeChange: (time: number) => void
  onPlayingChange: (playing: boolean) => void
}

export function SequencePanel({
  sequence,
  selectedSeqId,
  currentTime,
  playing,
  totalDuration,
  findRowIndex,
  onSelectClip,
  onDropClip,
  onReplaceRow,
  onRemoveRow,
  onTrimChange,
  onReorder,
  onTimeChange,
  onPlayingChange,
}: SequencePanelProps) {
  const [dragOverRow, setDragOverRow] = useState<number | null>(null)

  const activeRowIndex = findRowIndex(currentTime)

  const handleDrop = useCallback(
    (e: React.DragEvent, rowIndex: number) => {
      e.preventDefault()
      setDragOverRow(null)

      const clipId = e.dataTransfer.getData('application/x-clip-id')
      const reorderIndex = e.dataTransfer.getData('application/x-reorder-index')

      if (reorderIndex !== '') {
        // Reorder
        const from = parseInt(reorderIndex, 10)
        if (from !== rowIndex) onReorder(from, rowIndex)
      } else if (clipId) {
        // Drop from media panel
        if (rowIndex < sequence.length) {
          onReplaceRow(clipId, rowIndex)
        } else {
          onDropClip(clipId, rowIndex)
        }
      }
    },
    [sequence.length, onDropClip, onReplaceRow, onReorder]
  )

  const handleDragOver = useCallback((e: React.DragEvent, rowIndex: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = e.dataTransfer.types.includes('application/x-reorder-index') ? 'move' : 'copy'
    setDragOverRow(rowIndex)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverRow(null)
  }, [])

  // Click on row to seek to that row's start time
  const handleRowClick = useCallback(
    (rowIndex: number) => {
      onSelectClip(sequence[rowIndex]?.id ?? null)
      // Calculate row start time
      let elapsed = 0
      for (let i = 0; i < rowIndex; i++) {
        elapsed += sequence[i].trimEnd - sequence[i].trimStart
      }
      onTimeChange(elapsed)
      onPlayingChange(false)
    },
    [sequence, onSelectClip, onTimeChange, onPlayingChange]
  )

  return (
    <div className="h-[220px] shrink-0 bg-panel border-t border-border flex flex-col">
      {/* Header */}
      <div className="h-9 flex items-center justify-between px-3 bg-panel border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
            Sequence
          </span>
          <Separator orientation="vertical" className="h-4" />
          <span className="text-[10px] text-muted-foreground/60 font-mono">
            {sequence.length} clip{sequence.length !== 1 ? 's' : ''} · {formatTime(totalDuration)}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => {
              if (playing) onPlayingChange(false)
              else {
                if (currentTime >= totalDuration) onTimeChange(0)
                onPlayingChange(true)
              }
            }}
            disabled={sequence.length === 0}
          >
            {playing ? <Pause /> : <Play />}
          </Button>
        </div>
      </div>

      {/* Rows */}
      <ScrollArea className="flex-1">
        <div className="p-2 flex flex-col gap-1">
          {sequence.map((clip, rowIndex) => {
            const isActive = activeRowIndex === rowIndex
            const isSelected = selectedSeqId === clip.id
            const clipDuration = clip.trimEnd - clip.trimStart

            return (
              <SequenceRow
                key={clip.id}
                clip={clip}
                rowIndex={rowIndex}
                isActive={isActive}
                isSelected={isSelected}
                clipDuration={clipDuration}
                rowStartTime={sequence.slice(0, rowIndex).reduce((s, c) => s + (c.trimEnd - c.trimStart), 0)}
                currentTime={currentTime}
                isDragOver={dragOverRow === rowIndex}
                isLast={false}
                onClick={() => handleRowClick(rowIndex)}
                onDrop={(e) => handleDrop(e, rowIndex)}
                onDragOver={(e) => handleDragOver(e, rowIndex)}
                onDragLeave={handleDragLeave}
                onRemove={() => onRemoveRow(rowIndex)}
                onTrimChange={onTrimChange}
                onTimeChange={onTimeChange}
                onPlayingChange={onPlayingChange}
                onSelectClip={onSelectClip}
              />
            )
          })}

          {/* Add row / drop target */}
          <div
            className={`h-12 border-2 border-dashed flex items-center justify-center gap-2 transition-colors ${
              dragOverRow === sequence.length
                ? 'border-white/40 bg-accent'
                : 'border-border hover:border-muted-foreground'
            }`}
            onDragOver={(e) => handleDragOver(e, sequence.length)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, sequence.length)}
          >
            <Plus size={14} className="text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground tracking-wider uppercase">
              Drop clip here or add row
            </span>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

function SequenceRow({
  clip,
  rowIndex,
  isActive,
  isSelected,
  clipDuration,
  rowStartTime,
  currentTime,
  isDragOver,
  onClick,
  onDrop,
  onDragOver,
  onDragLeave,
  onRemove,
  onTrimChange,
  onSelectClip,
}: {
  clip: SequenceClip
  rowIndex: number
  isActive: boolean
  isSelected: boolean
  clipDuration: number
  rowStartTime: number
  currentTime: number
  isDragOver: boolean
  isLast: boolean
  onClick: () => void
  onDrop: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onRemove: () => void
  onTrimChange: (id: string, trimStart: number, trimEnd: number) => void
  onTimeChange: (time: number) => void
  onPlayingChange: (playing: boolean) => void
  onSelectClip: (id: string | null) => void
}) {
  const trimBarRef = useRef<HTMLDivElement>(null)
  const [trimming, setTrimming] = useState(false)
  const trimStartRef = useRef<{ edge: 'start' | 'end'; startX: number; origValue: number } | null>(null)

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData('application/x-reorder-index', String(rowIndex))
      e.dataTransfer.effectAllowed = 'move'
    },
    [rowIndex]
  )

  const handleTrimMouseDown = useCallback(
    (e: React.MouseEvent, edge: 'start' | 'end') => {
      e.stopPropagation()
      setTrimming(true)
      trimStartRef.current = {
        edge,
        startX: e.clientX,
        origValue: edge === 'start' ? clip.trimStart : clip.trimEnd,
      }

      const handleMove = (me: MouseEvent) => {
        if (!trimStartRef.current || !trimBarRef.current) return
        const barWidth = trimBarRef.current.offsetWidth
        const dx = me.clientX - trimStartRef.current.startX
        const dt = (dx / barWidth) * clip.duration

        if (trimStartRef.current.edge === 'start') {
          const newStart = Math.max(0, Math.min(trimStartRef.current.origValue + dt, clip.trimEnd - 0.5))
          onTrimChange(clip.id, Math.round(newStart * 10) / 10, clip.trimEnd)
        } else {
          const newEnd = Math.min(clip.duration, Math.max(trimStartRef.current.origValue + dt, clip.trimStart + 0.5))
          onTrimChange(clip.id, clip.trimStart, Math.round(newEnd * 10) / 10)
        }
      }

      const handleUp = () => {
        setTrimming(false)
        trimStartRef.current = null
        window.removeEventListener('mousemove', handleMove)
        window.removeEventListener('mouseup', handleUp)
      }

      window.addEventListener('mousemove', handleMove)
      window.addEventListener('mouseup', handleUp)
    },
    [clip, onTrimChange]
  )

  // Click on trim bar to seek within clip
  const handleTrimBarClick = useCallback(
    (_e: React.MouseEvent) => {
      if (trimming) return
      if (!trimBarRef.current) return
      onSelectClip(clip.id)
    },
    [trimming, clip, onSelectClip]
  )

  return (
    <div
      className={`group flex items-center gap-2 h-12 border transition-colors cursor-pointer ${
        isActive
          ? 'border-white/40 bg-surface'
          : isSelected
          ? 'border-white/20 bg-surface/50'
          : isDragOver
          ? 'border-white/30 bg-accent'
          : 'border-border hover:border-muted-foreground/30'
      }`}
      onClick={onClick}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      {/* Row number + grip */}
      <div
        className="flex items-center gap-1 px-2 w-16 shrink-0 cursor-grab active:cursor-grabbing"
        draggable
        onDragStart={handleDragStart}
      >
        <GripVertical size={12} className="text-muted-foreground/40" />
        <span className={`text-[11px] font-mono font-medium ${isActive ? 'text-white' : 'text-muted-foreground'}`}>
          {rowIndex + 1}
        </span>
        {isActive && (
          <div className="size-1.5 bg-playhead rounded-full ml-0.5" />
        )}
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Clip info */}
      <div className="w-32 shrink-0 px-2">
        <p className="text-[10px] text-foreground truncate font-medium">{clip.name}</p>
        <p className="text-[9px] text-muted-foreground font-mono">
          {formatTime(clipDuration)}
        </p>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Trim bar */}
      <div
        ref={trimBarRef}
        className="flex-1 h-8 relative mx-2 bg-track-bg border border-border/50 overflow-hidden"
        onClick={handleTrimBarClick}
      >
        {/* Full clip background (faded) */}
        <div className="absolute inset-0 bg-muted/30" />

        {/* Active trim region */}
        <div
          className="absolute top-0 bottom-0 bg-blue-600/60"
          style={{
            left: `${(clip.trimStart / clip.duration) * 100}%`,
            width: `${(clipDuration / clip.duration) * 100}%`,
          }}
        />

        {/* Waveform texture */}
        <div className="absolute inset-0 flex items-center px-1 overflow-hidden">
          <div className="flex-1 flex items-center gap-px">
            {Array.from({ length: 40 }).map((_, i) => (
              <div
                key={i}
                className="w-[2px] bg-white/10 shrink-0"
                style={{ height: `${15 + Math.sin(i * 0.6) * 25 + Math.random() * 15}%` }}
              />
            ))}
          </div>
        </div>

        {/* Trim handles */}
        <div
          className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-yellow-400/50 active:bg-yellow-400/70 transition-colors z-10"
          onMouseDown={(e) => handleTrimMouseDown(e, 'start')}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-yellow-400/50 active:bg-yellow-400/70 transition-colors z-10"
          onMouseDown={(e) => handleTrimMouseDown(e, 'end')}
        />

        {/* Trim labels */}
        <div className="absolute top-0 left-2.5 text-[8px] text-white/70 font-mono leading-none mt-0.5">
          {formatTime(clip.trimStart)}
        </div>
        <div className="absolute top-0 right-2.5 text-[8px] text-white/70 font-mono leading-none mt-0.5">
          {formatTime(clip.trimEnd)}
        </div>

        {isActive && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-playhead z-20 pointer-events-none"
            style={{
              left: `${((clip.trimStart + currentTime - rowStartTime) / clip.duration) * 100}%`,
            }}
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 pr-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground hover:text-destructive"
          onClick={(e) => { e.stopPropagation(); onRemove() }}
        >
          <Trash2 />
        </Button>
      </div>
    </div>
  )
}

function formatTime(s: number): string {
  const sec = Math.floor(s)
  const ms = Math.floor((s % 1) * 10)
  return `${sec}.${ms}s`
}
