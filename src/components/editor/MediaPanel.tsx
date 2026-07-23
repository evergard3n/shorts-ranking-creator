import { useCallback, useRef, useState } from 'react'
import {
  Film,
  Music,
  Image,
  Type,
  Plus,
  X,
  GripVertical,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { Clip } from '@/lib/types'

interface MediaPanelProps {
  clips: Clip[]
  onFilesSelected: (files: File[]) => void
  onRemoveClip: (id: string) => void
}

export function MediaPanel({ clips, onFilesSelected, onRemoveClip }: MediaPanelProps) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith('video/')
      )
      if (files.length > 0) onFilesSelected(files)
    },
    [onFilesSelected]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  return (
    <div className="w-[280px] shrink-0 bg-panel border-r border-border flex flex-col">
      <Tabs defaultValue="media" className="flex flex-col flex-1 min-h-0">
        <TabsList variant="line" className="w-full justify-start rounded-none px-2 h-10 border-b border-border">
          <TabsTrigger value="media" className="text-[10px] font-medium tracking-wider uppercase">
            <Film data-icon="inline-start" />
            Media
          </TabsTrigger>
          <TabsTrigger value="audio" className="text-[10px] font-medium tracking-wider uppercase">
            <Music data-icon="inline-start" />
            Audio
          </TabsTrigger>
          <TabsTrigger value="text" className="text-[10px] font-medium tracking-wider uppercase">
            <Type data-icon="inline-start" />
            Text
          </TabsTrigger>
          <TabsTrigger value="effects" className="text-[10px] font-medium tracking-wider uppercase">
            <Image data-icon="inline-start" />
            Effects
          </TabsTrigger>
        </TabsList>

        <TabsContent value="media" className="flex-1 min-h-0 mt-0">
          <MediaContent
            clips={clips}
            dragOver={dragOver}
            inputRef={inputRef}
            onFilesSelected={onFilesSelected}
            onRemoveClip={onRemoveClip}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          />
        </TabsContent>

        <TabsContent value="audio" className="flex-1 min-h-0 mt-0">
          <div className="flex-1 flex items-center justify-center p-4">
            <p className="text-[11px] text-muted-foreground text-center">Coming soon</p>
          </div>
        </TabsContent>

        <TabsContent value="text" className="flex-1 min-h-0 mt-0">
          <div className="flex-1 flex items-center justify-center p-4">
            <p className="text-[11px] text-muted-foreground text-center">Coming soon</p>
          </div>
        </TabsContent>

        <TabsContent value="effects" className="flex-1 min-h-0 mt-0">
          <div className="flex-1 flex items-center justify-center p-4">
            <p className="text-[11px] text-muted-foreground text-center">Coming soon</p>
          </div>
        </TabsContent>
      </Tabs>

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          if (files.length > 0) onFilesSelected(files)
          e.target.value = ''
        }}
      />
    </div>
  )
}

function MediaContent({
  clips,
  dragOver,
  inputRef,
  onRemoveClip,
  onDrop,
  onDragOver,
  onDragLeave,
}: {
  clips: Clip[]
  dragOver: boolean
  inputRef: React.RefObject<HTMLInputElement | null>
  onFilesSelected: (files: File[]) => void
  onRemoveClip: (id: string) => void
  onDrop: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
}) {
  const [search, setSearch] = useState('')

  const filtered = clips.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Search + Import */}
      <div className="p-2 flex flex-col gap-2">
        <div className="flex gap-1">
          <div className="flex-1 relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search media..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 pl-7 text-[11px] rounded-none border-input bg-surface"
            />
          </div>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="icon-sm"
                  className="bg-white text-black hover:bg-gray-200"
                  onClick={() => inputRef.current?.click()}
                />
              }
            >
              <Plus />
            </TooltipTrigger>
            <TooltipContent>Import media</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Media grid / drop zone */}
      <ScrollArea
        className={`flex-1 transition-colors ${dragOver ? 'bg-accent' : ''}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        <div className="p-2">
          {clips.length === 0 ? (
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full min-h-[200px] border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-muted-foreground transition-colors"
            >
              <div className="size-10 border border-border flex items-center justify-center">
                <Plus size={20} className="text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-[12px] text-foreground font-medium">Import Media</p>
                <p className="text-[10px] text-muted-foreground mt-1">Click or drag videos here</p>
              </div>
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {filtered.map((clip) => (
                <MediaCard
                  key={clip.id}
                  clip={clip}
                  onRemove={() => onRemoveClip(clip.id)}
                />
              ))}
              {/* Add more button */}
              <button
                onClick={() => inputRef.current?.click()}
                className="aspect-video border border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-muted-foreground hover:bg-panel-hover transition-colors"
              >
                <Plus size={16} className="text-muted-foreground" />
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Import</span>
              </button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Clip count */}
      {clips.length > 0 && (
        <>
          <Separator />
          <div className="px-3 py-1.5 flex items-center justify-between">
            <Badge variant="secondary">{clips.length} clip{clips.length !== 1 ? 's' : ''}</Badge>
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
              Drag to timeline →
            </span>
          </div>
        </>
      )}
    </div>
  )
}

function MediaCard({ clip, onRemove }: { clip: Clip; onRemove: () => void }) {
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      console.log('[drag] clip:', clip.id, clip.name)
      e.dataTransfer.setData('application/x-clip-id', clip.id)
      e.dataTransfer.effectAllowed = 'copy'
    },
    [clip.id, clip.name]
  )

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="group relative aspect-video bg-black cursor-grab active:cursor-grabbing border border-border hover:border-white/30 transition-colors"
    >
      <video
        src={clip.url}
        className="w-full h-full object-cover"
        muted
        preload="metadata"
      />

      {/* Overlay on hover */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical size={18} className="text-white" />
        </div>
      </div>

      {/* Remove button */}
      <Button
        size="icon-xs"
        variant="destructive"
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className="absolute top-0.5 right-0.5 size-4 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X />
      </Button>

      {/* Name */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-1">
        <p className="text-[9px] text-white truncate leading-tight">
          {clip.name}
        </p>
      </div>
    </div>
  )
}
