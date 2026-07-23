import { FFmpeg } from '@ffmpeg/ffmpeg'

const FONT_PATH = '/font.ttf'
let fontCache: ArrayBuffer | null = null

async function loadFont(): Promise<ArrayBuffer> {
  if (fontCache) return fontCache

  const url = new URL('../assets/fonts/Inter_18pt-Medium.ttf', import.meta.url).href
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Failed to load font: ${resp.status}`)
  fontCache = await resp.arrayBuffer()
  return fontCache
}

export async function writeFontToFS(ffmpeg: FFmpeg): Promise<string> {
  const data = await loadFont()
  await ffmpeg.writeFile(FONT_PATH, new Uint8Array(data))
  return FONT_PATH
}

export function escapeDrawText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "'\\''")
    .replace(/:/g, '\\:')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
}
