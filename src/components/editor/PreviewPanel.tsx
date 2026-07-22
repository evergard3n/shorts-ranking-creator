import { useCallback, useEffect, useRef } from 'react'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize2,
  Volume2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { SequenceClip } from '@/lib/types'

interface PreviewPanelProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  sequence: SequenceClip[]
  selectedSeqClip: SequenceClip | null
  currentTime: number
  playing: boolean
  totalDuration: number
  findRowIndex: (time: number) => number
  getRowStartTime: (index: number) => number
  onTimeChange: (time: number) => void
  onPlayingChange: (playing: boolean) => void
}

export function PreviewPanel({
  videoRef,
  sequence,
  currentTime,
  playing,
  totalDuration,
  findRowIndex,
  getRowStartTime,
  onTimeChange,
  onPlayingChange,
}: PreviewPanelProps) {
  const currentRowRef = useRef(-1)
  const switchingRef = useRef(false)
  const lastPlayingRef = useRef(false)

  // Derived refs for use in callbacks without re-triggering effects
  const sequenceRef = useRef(sequence)
  const getRowStartTimeRef = useRef(getRowStartTime)
  const onTimeChangeRef = useRef(onTimeChange)
  const onPlayingChangeRef = useRef(onPlayingChange)
  useEffect(() => { sequenceRef.current = sequence }, [sequence])
  useEffect(() => { getRowStartTimeRef.current = getRowStartTime }, [getRowStartTime])
  useEffect(() => { onTimeChangeRef.current = onTimeChange }, [onTimeChange])
  useEffect(() => { onPlayingChangeRef.current = onPlayingChange }, [onPlayingChange])

  // timeupdate: derive global time from video — the REAL clock
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current
    if (!video || switchingRef.current) return

    const seq = sequenceRef.current
    const rowIdx = currentRowRef.current
    if (rowIdx < 0 || rowIdx >= seq.length) return

    const clip = seq[rowIdx]
    const rowStart = getRowStartTimeRef.current(rowIdx)

    // Before trimStart (shouldn't happen, but safety)
    if (video.currentTime < clip.trimStart) {
      video.currentTime = clip.trimStart
      return
    }

    // Hit trimEnd → next clip or stop
    if (video.currentTime >= clip.trimEnd) {
      switchingRef.current = true
      video.pause()

      const nextIndex = rowIdx + 1
      if (nextIndex < seq.length) {
        const nextClip = seq[nextIndex]
        const nextRowStart = getRowStartTimeRef.current(nextIndex)
        currentRowRef.current = nextIndex
        video.src = nextClip.url
        video.currentTime = nextClip.trimStart
        onTimeChangeRef.current(nextRowStart)
        // Let video settle then resume
        requestAnimationFrame(() => {
          video.play().catch(() => {})
          switchingRef.current = false
        })
      } else {
        onTimeChangeRef.current(getRowStartTimeRef.current(seq.length))
        onPlayingChangeRef.current(false)
        switchingRef.current = false
      }
      return
    }

    // Normal: map video.currentTime → global timeline
    const offsetInClip = video.currentTime - clip.trimStart
    onTimeChangeRef.current(rowStart + offsetInClip)
  }, [videoRef])

  // Play/pause: only react to `playing` changes, not `currentTime`
  useEffect(() => {
    const video = videoRef.current
    if (!video || sequence.length === 0) return

    // Only act on actual play/pause transitions
    if (playing === lastPlayingRef.current) return
    lastPlayingRef.current = playing

    if (playing) {
      const rowIndex = findRowIndex(currentTime)
      if (rowIndex < 0) {
        onPlayingChange(false)
        return
      }

      const clip = sequence[rowIndex]
      const rowStart = getRowStartTime(rowIndex)
      const sourceTime = clip.trimStart + (currentTime - rowStart)

      // Switch clip if needed
      if (currentRowRef.current !== rowIndex) {
        currentRowRef.current = rowIndex
        video.src = clip.url
        video.currentTime = sourceTime
      } else if (Math.abs(video.currentTime - sourceTime) > 0.3) {
        video.currentTime = sourceTime
      }

      video.play().catch(() => {})
    } else {
      video.pause()
    }
  }, [playing, currentTime, sequence, findRowIndex, getRowStartTime, videoRef, onPlayingChange])

  // Seek (when not playing): sync video to currentTime
  useEffect(() => {
    if (playing) return

    const video = videoRef.current
    if (!video || sequence.length === 0) return

    const rowIndex = findRowIndex(currentTime)
    if (rowIndex < 0) {
      currentRowRef.current = -1
      return
    }

    const clip = sequence[rowIndex]
    const rowStart = getRowStartTime(rowIndex)
    const sourceTime = clip.trimStart + (currentTime - rowStart)

    if (currentRowRef.current !== rowIndex) {
      currentRowRef.current = rowIndex
      video.src = clip.url
      video.currentTime = sourceTime
    } else if (Math.abs(video.currentTime - sourceTime) > 0.3) {
      video.currentTime = sourceTime
    }
  }, [currentTime, playing, sequence, findRowIndex, getRowStartTime, videoRef])

  const handleVideoEnded = useCallback(() => {
    if (switchingRef.current) return
    const seq = sequenceRef.current
    const rowIdx = currentRowRef.current
    if (rowIdx < 0) return

    const nextIndex = rowIdx + 1
    if (nextIndex < seq.length) {
      const nextRowStart = getRowStartTimeRef.current(nextIndex)
      const video = videoRef.current
      if (video) {
        switchingRef.current = true
        currentRowRef.current = nextIndex
        video.src = seq[nextIndex].url
        video.currentTime = seq[nextIndex].trimStart
        onTimeChangeRef.current(nextRowStart)
        requestAnimationFrame(() => {
          video.play().catch(() => {})
          switchingRef.current = false
        })
      }
    } else {
      onPlayingChangeRef.current(false)
    }
  }, [videoRef])

  const togglePlay = useCallback(() => {
    if (sequence.length === 0) return
    if (!playing && currentTime >= totalDuration) {
      onTimeChange(0)
      currentRowRef.current = -1
    }
    onPlayingChange(!playing)
  }, [playing, currentTime, totalDuration, sequence.length, onTimeChange, onPlayingChange])

  const skipBack = useCallback(() => {
    const rowIdx = findRowIndex(currentTime)
    if (rowIdx > 0) {
      onTimeChange(getRowStartTime(rowIdx))
    } else {
      onTimeChange(0)
    }
  }, [currentTime, findRowIndex, getRowStartTime, onTimeChange])

  const skipForward = useCallback(() => {
    const rowIdx = findRowIndex(currentTime)
    if (rowIdx >= 0 && rowIdx + 1 < sequence.length) {
      onTimeChange(getRowStartTime(rowIdx + 1))
    } else {
      onTimeChange(totalDuration)
    }
  }, [currentTime, findRowIndex, getRowStartTime, sequence.length, totalDuration, onTimeChange])

  const activeRowIndex = findRowIndex(currentTime)

  return (
    <div className="flex-1 flex flex-col bg-black min-w-0">
      <div className="flex-1 flex items-center justify-center relative min-h-0 overflow-hidden">
        <video
          ref={videoRef}
          className="max-w-full max-h-full object-contain"
          playsInline
          muted
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleVideoEnded}
        />

        {sequence.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="size-16 border border-border/30 flex items-center justify-center mx-auto mb-3">
                <Play size={24} className="text-muted-foreground/50 ml-1" />
              </div>
              <p className="text-[11px] text-muted-foreground/50 font-medium tracking-wider uppercase">
                Empty sequence
              </p>
              <p className="text-[10px] text-muted-foreground/30 mt-1">
                Drag clips to sequence rows below
              </p>
            </div>
          </div>
        )}

        {sequence.length > 0 && activeRowIndex >= 0 && (
          <div className="absolute top-3 left-3">
            <span className="text-[10px] text-muted-foreground/50 font-mono">
              Row {activeRowIndex + 1}/{sequence.length}
            </span>
          </div>
        )}

        <div className="absolute top-3 right-3">
          <span className="text-[9px] text-muted-foreground/40 font-mono tracking-wider">
            1920×1080
          </span>
        </div>
      </div>

      <div className="h-10 flex items-center justify-center gap-1 border-t border-border/30 bg-panel">
        <Tooltip>
          <TooltipTrigger
            render={<Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground" onClick={skipBack} />}
          >
            <SkipBack />
          </TooltipTrigger>
          <TooltipContent side="top">Previous clip</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={<Button variant="ghost" size="icon" className="text-foreground hover:text-white" onClick={togglePlay} />}
          >
            {playing ? <Pause /> : <Play className="ml-0.5" />}
          </TooltipTrigger>
          <TooltipContent side="top">{playing ? 'Pause' : 'Play'}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={<Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground" onClick={skipForward} />}
          >
            <SkipForward />
          </TooltipTrigger>
          <TooltipContent side="top">Next clip</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-4 mx-2" />

        <span className="text-[11px] font-mono text-muted-foreground tabular-nums min-w-[60px] text-center">
          {formatTime(currentTime)}
        </span>

        <span className="text-[9px] text-muted-foreground/40 font-mono">
          / {formatTime(totalDuration)}
        </span>

        <div className="flex-1" />

        <Tooltip>
          <TooltipTrigger render={<Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground" />}>
            <Volume2 />
          </TooltipTrigger>
          <TooltipContent side="top">Volume</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger render={<Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground" />}>
            <Maximize2 />
          </TooltipTrigger>
          <TooltipContent side="top">Fullscreen</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  const ms = Math.floor((s % 1) * 100)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms).padStart(2, '0')}`
}
