import { FFmpeg } from '@ffmpeg/ffmpeg'

const FONT_FILENAME = 'font.ttf'
let fontCache: ArrayBuffer | null = null

async function loadFont(): Promise<ArrayBuffer> {
  if (fontCache) return fontCache

  const url = new URL('../assets/fonts/Inter_18pt-Medium.ttf', import.meta.url).href
  console.log('[font] Loading from:', url)
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Failed to load font: ${resp.status}`)
  fontCache = await resp.arrayBuffer()
  console.log('[font] Loaded, size:', fontCache.byteLength)
  return fontCache
}

export async function writeFontToFS(ffmpeg: FFmpeg): Promise<string> {
  const data = await loadFont()
  await ffmpeg.writeFile(FONT_FILENAME, new Uint8Array(data))
  console.log('[font] Written to FS:', FONT_FILENAME)
  return FONT_FILENAME
}

export function escapeDrawText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/:/g, '\\:')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
}

/** #rrggbb -> 0xrrggbb for ffmpeg */
export function hexToFfmpegColor(hex: string): string {
  return hex.replace('#', '0x')
}
