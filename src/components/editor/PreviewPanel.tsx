import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize2,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { SequenceClip, ProjectSettings, TextOverlaySettings } from '@/lib/types'

interface PreviewPanelProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  sequence: SequenceClip[]
  selectedSeqClip: SequenceClip | null
  currentTime: number
  playing: boolean
  totalDuration: number
  settings: ProjectSettings
  overlay: TextOverlaySettings
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
  settings,
  overlay,
  findRowIndex,
  getRowStartTime,
  onTimeChange,
  onPlayingChange,
}: PreviewPanelProps) {
  const currentRowRef = useRef(-1)
  const switchingRef = useRef(false)
  const lastPlayingRef = useRef(false)
  const [volume, setVolume] = useState(1)
  const [prevVolume, setPrevVolume] = useState(1)

  // Sync volume to video element
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.volume = volume
    video.muted = volume === 0
  }, [volume, videoRef])

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
      <div className="flex-1 flex items-center justify-center relative min-h-0 overflow-hidden p-4">
        <div
          className="relative bg-black flex items-center justify-center"
          style={{ aspectRatio: `${settings.width}/${settings.height}`, maxHeight: '100%', maxWidth: '100%' }}
        >
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleVideoEnded}
          />
          {/* Text overlay — all rank lines */}
          {overlay.enabled && ((overlay.showTitle && overlay.title) || overlay.showRank) && sequence.length > 0 && (
            <>
              {overlay.showRank && (
                <div
                  className="absolute top-3 left-3 pointer-events-none flex flex-col gap-1"
                  style={{
                    fontSize: `${Math.max(12, overlay.rankFontSize * 0.3)}px`,
                    color: overlay.rankFontColor,
                    textShadow: `0 0 4px ${overlay.rankBorderColor}, 0 0 4px ${overlay.rankBorderColor}, 0 0 4px ${overlay.rankBorderColor}`,
                    fontWeight: 700,
                    lineHeight: 1.2,
                  }}
                >
                  {sequence.map((clip, i) => (
                    <div key={clip.id} className={i === activeRowIndex ? 'opacity-100' : 'opacity-50'} style={{ color: clip.captionColor || overlay.rankFontColor }}>
                      #{i + 1}{clip.caption ? `: ${clip.caption}` : ''}
                    </div>
                  ))}
                </div>
              )}
              {overlay.showTitle && overlay.title && (
                <div
                  className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none text-center"
                  style={{
                    fontSize: `${Math.max(14, overlay.titleFontSize * 0.3)}px`,
                    color: overlay.titleFontColor,
                    textShadow: `0 0 4px ${overlay.titleBorderColor}, 0 0 4px ${overlay.titleBorderColor}, 0 0 4px ${overlay.titleBorderColor}`,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    lineHeight: 1,
                  }}
                >
                  {overlay.title}
                </div>
              )}
            </>
          )}
        </div>

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
            {settings.width}×{settings.height} @ {settings.fps}fps
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

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setVolume(v => v === 0 ? prevVolume : (setPrevVolume(v), 0))}
          >
            {volume === 0 ? <VolumeX /> : <Volume2 />}
          </Button>
          <Slider
            className="w-20"
            value={volume}
            onValueChange={v => setVolume(v as number)}
            min={0}
            max={1}
            step={0.01}
          />
        </div>

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
