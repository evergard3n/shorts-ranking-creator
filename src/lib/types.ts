export interface Clip {
  id: string
  file: File
  name: string
  url: string
  duration: number
  thumbnail?: string
}

export interface SequenceClip {
  id: string
  clipId: string
  trimStart: number
  trimEnd: number
  name: string
  url: string
  duration: number // source duration
  caption: string
  captionColor: string
}

export interface ProjectSettings {
  width: number
  height: number
  fps: number
  preset: 'ultrafast' | 'fast' | 'medium' | 'slow'
  crf: number
}

export const FORMAT_PRESETS = {
  'vertical-hd':   { width: 1080, height: 1920, label: '9:16 Vertical HD' },
  'vertical-sd':   { width: 720,  height: 1280, label: '9:16 Vertical SD' },
  'horizontal-hd': { width: 1920, height: 1080, label: '16:9 Horizontal HD' },
  'horizontal-sd': { width: 1280, height: 720,  label: '16:9 Horizontal SD' },
  'square':        { width: 1080, height: 1080, label: '1:1 Square' },
} as const

export type FormatKey = keyof typeof FORMAT_PRESETS

export const DEFAULT_SETTINGS: ProjectSettings = {
  width: 1080,
  height: 1920,
  fps: 30,
  preset: 'ultrafast',
  crf: 28,
}

export const FPS_OPTIONS = [24, 30, 60] as const

export const QUALITY_PRESETS = {
  ultrafast: { label: 'Fast (ultrafast)', crf: 28 },
  fast:      { label: 'Balanced (fast)',  crf: 24 },
  medium:    { label: 'Quality (medium)', crf: 20 },
  slow:      { label: 'Best (slow)',      crf: 18 },
} as const

export interface TextOverlaySettings {
  enabled: boolean
  showTitle: boolean
  title: string
  titleFontSize: number
  titleFontColor: string
  titleBorderColor: string
  showRank: boolean
  rankFontSize: number
  rankFontColor: string
  rankBorderColor: string
}

export const DEFAULT_TEXT_OVERLAY: TextOverlaySettings = {
  enabled: true,
  showTitle: true,
  title: '',
  titleFontSize: 48,
  titleFontColor: '#ffffff',
  titleBorderColor: '#000000',
  showRank: true,
  rankFontSize: 36,
  rankFontColor: '#ffffff',
  rankBorderColor: '#000000',
}
