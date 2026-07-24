import { useCallback, useEffect, useRef, useState } from 'react'
import { MediaPanel } from '@/components/editor/MediaPanel'
import { PreviewPanel } from '@/components/editor/PreviewPanel'
import { SequencePanel } from '@/components/editor/SequencePanel'
import { TopBar } from '@/components/editor/TopBar'
import { getVideoDuration } from '@/lib/media'
import { getFFmpeg } from '@/lib/ffmpeg'
import { exportVideo } from '@/lib/export'
import type { Clip, SequenceClip, ProjectSettings, TextOverlaySettings } from '@/lib/types'
import { DEFAULT_SETTINGS, DEFAULT_TEXT_OVERLAY } from '@/lib/types'

let clipCounter = 0
let seqCounter = 0

export default function Editor() {
  const [clips, setClips] = useState<Clip[]>([])
  const [sequence, setSequence] = useState<SequenceClip[]>([])
  const [selectedSeqId, setSelectedSeqId] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState<string | null>(null)
  const [settings, setSettings] = useState<ProjectSettings>(DEFAULT_SETTINGS)
  const [overlay, setOverlay] = useState<TextOverlaySettings>(DEFAULT_TEXT_OVERLAY)
  const videoRef = useRef<HTMLVideoElement>(null)

  const totalDuration = sequence.reduce((sum, c) => sum + (c.trimEnd - c.trimStart), 0)

  const findRowIndex = useCallback(
    (time: number): number => {
      let elapsed = 0
      for (let i = 0; i < sequence.length; i++) {
        const dur = sequence[i].trimEnd - sequence[i].trimStart
        if (time < elapsed + dur) return i
        elapsed += dur
      }
      return -1
    },
    [sequence]
  )

  const getRowStartTime = useCallback(
    (index: number): number => {
      let elapsed = 0
      for (let i = 0; i < index; i++) {
        elapsed += sequence[i].trimEnd - sequence[i].trimStart
      }
      return elapsed
    },
    [sequence]
  )

  const handleFilesSelected = useCallback(async (files: File[]) => {
    const newClips: Clip[] = await Promise.all(
      files.map(async (file) => {
        const id = `clip-${++clipCounter}`
        const url = URL.createObjectURL(file)
        const duration = await getVideoDuration(url)
        return { id, file, name: file.name, url, duration }
      })
    )
    setClips((prev) => [...prev, ...newClips])
  }, [])

  const handleRemoveClip = useCallback((id: string) => {
    setClips((prev) => {
      const clip = prev.find((c) => c.id === id)
      if (clip) URL.revokeObjectURL(clip.url)
      return prev.filter((c) => c.id !== id)
    })
    setSequence((prev) => prev.filter((s) => s.clipId !== id))
  }, [])

  const handleDropToRow = useCallback(
    (clipId: string, rowIndex: number) => {
      console.log('[drop] clipId:', clipId, 'available:', clips.map(c => c.id))
      const clip = clips.find((c) => c.id === clipId)
      console.log('[drop] found clip:', clip?.name)
      if (!clip) return

      const seqClip: SequenceClip = {
        id: `seq-${++seqCounter}`,
        clipId: clip.id,
        trimStart: 0,
        trimEnd: clip.duration,
        name: clip.name,
        url: clip.url,
        duration: clip.duration,
        caption: '',
        captionColor: '#ffffff',
      }

      setSequence((prev) => {
        const next = [...prev]
        if (rowIndex < next.length) {
          next[rowIndex] = seqClip
        } else {
          next.push(seqClip)
        }
        return next
      })
    },
    [clips]
  )

  const handleReplaceRow = useCallback(
    (clipId: string, rowIndex: number) => {
      const clip = clips.find((c) => c.id === clipId)
      if (!clip) return

      const seqClip: SequenceClip = {
        id: `seq-${++seqCounter}`,
        clipId: clip.id,
        trimStart: 0,
        trimEnd: clip.duration,
        name: clip.name,
        url: clip.url,
        duration: clip.duration,
        caption: '',
        captionColor: '#ffffff',
      }

      setSequence((prev) => {
        const next = [...prev]
        next[rowIndex] = seqClip
        return next
      })
    },
    [clips]
  )

  const handleRemoveRow = useCallback((rowIndex: number) => {
    setSequence((prev) => prev.filter((_, i) => i !== rowIndex))
    setSelectedSeqId(null)
  }, [])

  const handleTrimChange = useCallback(
    (seqId: string, trimStart: number, trimEnd: number) => {
      setSequence((prev) =>
        prev.map((s) =>
          s.id === seqId ? { ...s, trimStart, trimEnd } : s
        )
      )
    },
    []
  )

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    setSequence((prev) => {
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }, [])

  const handleCaptionChange = useCallback((seqId: string, caption: string) => {
    setSequence((prev) =>
      prev.map((s) => (s.id === seqId ? { ...s, caption } : s))
    )
  }, [])

  const handleCaptionColorChange = useCallback((seqId: string, captionColor: string) => {
    setSequence((prev) =>
      prev.map((s) => (s.id === seqId ? { ...s, captionColor } : s))
    )
  }, [])

  // Clamp currentTime when totalDuration shrinks
  useEffect(() => {
    if (currentTime > totalDuration) {
      setCurrentTime(Math.max(0, totalDuration))
      setPlaying(false)
    }
  }, [currentTime, totalDuration])

  const selectedSeqClip = sequence.find((s) => s.id === selectedSeqId) ?? null

  const handleExport = useCallback(async () => {
    if (sequence.length === 0) return
    setExporting(true)
    setExportProgress('Loading ffmpeg...')

    try {
      const ffmpeg = await getFFmpeg()
      setExportProgress('Starting export...')

      const blob = await exportVideo(
        ffmpeg,
        sequence,
        settings,
        overlay,
        (msg) => setExportProgress(msg)
      )

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'output.mp4'
      a.click()
      URL.revokeObjectURL(url)
      setExportProgress('Done!')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Export failed'
      setExportProgress(`Error: ${msg}`)
      console.error('Export failed:', err)
    } finally {
      setExporting(false)
      setTimeout(() => setExportProgress(null), 3000)
    }
  }, [sequence, settings, overlay])

  return (
    <div className="flex flex-col h-screen w-screen bg-background text-foreground select-none">
      <TopBar
        exporting={exporting}
        exportProgress={exportProgress}
        onExport={handleExport}
        clipCount={sequence.length}
        settings={settings}
        onSettingsChange={setSettings}
        overlay={overlay}
        onOverlayChange={setOverlay}
      />

      <div className="flex flex-1 min-h-0">
        <MediaPanel
          clips={clips}
          onFilesSelected={handleFilesSelected}
          onRemoveClip={handleRemoveClip}
        />

        <PreviewPanel
          videoRef={videoRef}
          sequence={sequence}
          selectedSeqClip={selectedSeqClip}
          currentTime={currentTime}
          playing={playing}
          totalDuration={totalDuration}
          settings={settings}
          overlay={overlay}
          findRowIndex={findRowIndex}
          getRowStartTime={getRowStartTime}
          onTimeChange={setCurrentTime}
          onPlayingChange={setPlaying}
        />
      </div>

      <SequencePanel
        sequence={sequence}
        selectedSeqId={selectedSeqId}
        currentTime={currentTime}
        playing={playing}
        totalDuration={totalDuration}
        findRowIndex={findRowIndex}
        onSelectClip={setSelectedSeqId}
        onDropClip={handleDropToRow}
        onReplaceRow={handleReplaceRow}
        onRemoveRow={handleRemoveRow}
        onTrimChange={handleTrimChange}
        onCaptionChange={handleCaptionChange}
        onCaptionColorChange={handleCaptionColorChange}
        onReorder={handleReorder}
        onTimeChange={setCurrentTime}
        onPlayingChange={setPlaying}
      />
    </div>
  )
}
