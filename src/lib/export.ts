import { FFmpeg } from '@ffmpeg/ffmpeg'
import type { SequenceClip, ProjectSettings, TextOverlaySettings } from './types'
import { writeFontToFS, escapeDrawText, hexToFfmpegColor } from './font'

export async function exportVideo(
  ffmpeg: FFmpeg,
  sequence: SequenceClip[],
  settings: ProjectSettings,
  overlay?: TextOverlaySettings,
  onProgress?: (message: string) => void,
): Promise<Blob> {
  if (sequence.length === 0) throw new Error('No clips')

  const { width, height, fps, preset, crf } = settings
  const hasOverlay = overlay && overlay.enabled && (overlay.title || overlay.showRank)

  const logHandler = ({ message }: { message: string }) => console.log('[ffmpeg]', message)
  ffmpeg.on('log', logHandler)

  try {
    // Write font if overlay needed
    let fontPath = ''
    if (hasOverlay) {
      onProgress?.('Loading font...')
      fontPath = await writeFontToFS(ffmpeg)
    }

    // Deduplicate source files
    const uniqueSources = new Map<string, { blob: Blob; index: number }>()
    let idx = 0
    for (const clip of sequence) {
      if (!uniqueSources.has(clip.url)) {
        const resp = await fetch(clip.url)
        const blob = await resp.blob()
        uniqueSources.set(clip.url, { blob, index: idx++ })
      }
    }

    // Write source files to virtual FS
    onProgress?.('Writing source files...')
    for (const [, { blob, index }] of uniqueSources) {
      await ffmpeg.writeFile(`in_${index}.mp4`, new Uint8Array(await blob.arrayBuffer()))
    }

    // Single clip, no trim, no overlay: instant copy
    if (
      !hasOverlay &&
      sequence.length === 1 &&
      sequence[0].trimStart === 0 &&
      sequence[0].trimEnd === sequence[0].duration
    ) {
      const src = uniqueSources.get(sequence[0].url)!
      onProgress?.('Copying...')
      await run(ffmpeg, ['-i', `in_${src.index}.mp4`, '-c', 'copy', '-movflags', '+faststart', 'out.mp4'])
      return await readOutput(ffmpeg)
    }

    // Build base filter chain
    const baseVf = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`

    // Normalize each clip with trim + optional rank overlay
    for (let i = 0; i < sequence.length; i++) {
      const clip = sequence[i]
      const src = uniqueSources.get(clip.url)!
      onProgress?.(`Encoding clip ${i + 1}/${sequence.length}...`)

      // Add rank drawtext per-clip
      let vf = baseVf
      if (overlay?.showRank && fontPath) {
        const rankLabel = clip.caption ? `#${i + 1}: ${clip.caption}` : `#${i + 1}`
        const rankText = escapeDrawText(rankLabel)
        const rankColor = hexToFfmpegColor(clip.captionColor || overlay.rankFontColor)
        const rankBorder = hexToFfmpegColor(overlay.rankBorderColor)
        vf += `,drawtext=fontfile=${fontPath}:text='${rankText}':fontsize=${overlay.rankFontSize}:fontcolor=${rankColor}:borderw=3:bordercolor=${rankBorder}:x=20:y=20`
      }

      const args = [
        '-i', `in_${src.index}.mp4`,
        '-ss', String(clip.trimStart),
        '-to', String(clip.trimEnd),
        '-vf', vf,
        '-r', String(fps),
        '-c:v', 'libx264', '-preset', preset, '-crf', String(crf),
        '-c:a', 'aac', '-ar', '44100', '-b:a', '64k',
        '-movflags', '+faststart',
        `n_${i}.mp4`,
      ]

      const ok = await run(ffmpeg, args)

      if (!ok) {
        onProgress?.(`Clip ${i + 1}: no audio, adding silent...`)
        await ffmpeg.deleteFile(`n_${i}.mp4`).catch(() => {})
        await run(ffmpeg, [
          '-i', `in_${src.index}.mp4`,
          '-ss', String(clip.trimStart),
          '-to', String(clip.trimEnd),
          '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
          '-vf', vf,
          '-r', String(fps),
          '-c:v', 'libx264', '-preset', preset, '-crf', String(crf),
          '-c:a', 'aac', '-ar', '44100', '-b:a', '64k',
          '-movflags', '+faststart',
          '-shortest',
          `n_${i}.mp4`,
        ])
      }
    }

    // Concat
    onProgress?.('Concatenating...')
    await ffmpeg.writeFile('concat.txt',
      sequence.map((_, i) => `file n_${i}.mp4`).join('\n'))

    // If title overlay: concat first, then apply title drawtext
    if (overlay?.showTitle && overlay?.title && fontPath) {
      const titleText = escapeDrawText(overlay.title)
      const titleColor = hexToFfmpegColor(overlay.titleFontColor)
      const titleBorder = hexToFfmpegColor(overlay.titleBorderColor)
      const titleDrawText = `drawtext=fontfile=${fontPath}:text='${titleText}':fontsize=${overlay.titleFontSize}:fontcolor=${titleColor}:borderw=3:bordercolor=${titleBorder}:x=(w-text_w)/2:y=h-th-40`

      await run(ffmpeg, [
        '-f', 'concat', '-safe', '0',
        '-i', 'concat.txt',
        '-vf', titleDrawText,
        '-c:v', 'libx264', '-preset', preset, '-crf', String(crf),
        '-c:a', 'aac', '-ar', '44100', '-b:a', '64k',
        '-movflags', '+faststart',
        'out.mp4',
      ])
    } else {
      // No title: just concat with copy
      await run(ffmpeg, [
        '-f', 'concat', '-safe', '0',
        '-i', 'concat.txt',
        '-c', 'copy',
        '-movflags', '+faststart',
        'out.mp4',
      ])
    }

    return await readOutput(ffmpeg)

  } finally {
    for (let i = 0; i < sequence.length; i++) {
      await ffmpeg.deleteFile(`in_${i}.mp4`).catch(() => {})
      await ffmpeg.deleteFile(`n_${i}.mp4`).catch(() => {})
    }
    await ffmpeg.deleteFile('concat.txt').catch(() => {})
    await ffmpeg.deleteFile('out.mp4').catch(() => {})
    await ffmpeg.deleteFile('/font.ttf').catch(() => {})
    ffmpeg.off('log', logHandler)
  }
}

async function readOutput(ffmpeg: FFmpeg): Promise<Blob> {
  const data = await ffmpeg.readFile('out.mp4')
  return new Blob([new Uint8Array(data as unknown as ArrayBuffer)], { type: 'video/mp4' })
}

async function run(ffmpeg: FFmpeg, args: string[]): Promise<boolean> {
  const cmd = args.join(' ')
  console.log('[ffmpeg]', cmd)
  try {
    const rc = await ffmpeg.exec(args)
    if (rc !== 0) console.error('[ffmpeg] exit code:', rc, cmd)
    return rc === 0
  } catch (e) {
    console.error('[ffmpeg] EXCEPTION:', e, cmd)
    return false
  }
}
