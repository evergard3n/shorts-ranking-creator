/**
 * Get video duration from file using native <video> element.
 * Returns duration in seconds, or 0 if detection fails.
 */
export function getVideoDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      resolve(video.duration || 0)
      video.src = ''
    }
    video.onerror = () => resolve(0)
    video.src = url
  })
}

/**
 * Generate a thumbnail from video at a given time (seconds).
 * Returns a data URL of the frame.
 */
export function getVideoThumbnail(url: string, time = 1): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true
    video.currentTime = time
    video.onseeked = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 160
      canvas.height = 90
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.6))
      video.src = ''
    }
    video.onerror = () => resolve('')
    video.src = url
  })
}
