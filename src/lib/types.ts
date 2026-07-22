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
}
