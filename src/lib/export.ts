import { FFmpeg } from '@ffmpeg/ffmpeg'
import type { SequenceClip, ProjectSettings } from './types'

export async function exportVideo(
  ffmpeg: FFmpeg,
  sequence: SequenceClip[],
  settings: ProjectSettings,
  onProgress?: (message: string) => void,
): Promise<Blob> {
  if (sequence.length === 0) throw new Error('No clips')

  const { width, height, fps, preset, crf } = settings

  const logHandler = ({ message }: { message: string }) => console.log('[ffmpeg]', message)
  ffmpeg.on('log', logHandler)

  try {
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

    // Single clip, no trim: instant copy
    if (
      sequence.length === 1 &&
      sequence[0].trimStart === 0 &&
      sequence[0].trimEnd === sequence[0].duration
    ) {
      const src = uniqueSources.get(sequence[0].url)!
      onProgress?.('Copying...')
      await run(ffmpeg, ['-i', `in_${src.index}.mp4`, '-c', 'copy', '-movflags', '+faststart', 'out.mp4'])
      return await readOutput(ffmpeg)
    }

    // Normalize each clip with trim
    for (let i = 0; i < sequence.length; i++) {
      const clip = sequence[i]
      const src = uniqueSources.get(clip.url)!
      onProgress?.(`Encoding clip ${i + 1}/${sequence.length}...`)

      const args = [
        '-i', `in_${src.index}.mp4`,
        '-ss', String(clip.trimStart),
        '-to', String(clip.trimEnd),
        '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
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
          '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
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

    await run(ffmpeg, [
      '-f', 'concat', '-safe', '0',
      '-i', 'concat.txt',
      '-c', 'copy',
      '-movflags', '+faststart',
      'out.mp4',
    ])

    return await readOutput(ffmpeg)

  } finally {
    for (let i = 0; i < sequence.length; i++) {
      await ffmpeg.deleteFile(`in_${i}.mp4`).catch(() => {})
      await ffmpeg.deleteFile(`n_${i}.mp4`).catch(() => {})
    }
    await ffmpeg.deleteFile('concat.txt').catch(() => {})
    await ffmpeg.deleteFile('out.mp4').catch(() => {})
    ffmpeg.off('log', logHandler)
  }
}

async function readOutput(ffmpeg: FFmpeg): Promise<Blob> {
  const data = await ffmpeg.readFile('out.mp4')
  return new Blob([new Uint8Array(data as unknown as ArrayBuffer)], { type: 'video/mp4' })
}

async function run(ffmpeg: FFmpeg, args: string[]): Promise<boolean> {
  console.log('[ffmpeg]', args.join(' '))
  try {
    return (await ffmpeg.exec(args)) === 0
  } catch (e) {
    console.error('[ffmpeg]', e)
    return false
  }
}
