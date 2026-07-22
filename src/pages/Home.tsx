import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-4xl font-bold">Video Editor</h1>
        <p className="text-muted-foreground">Web-based video editor powered by ffmpeg.wasm</p>
        <Button render={<Link to="/editor" />}>Get Started</Button>
      </div>
    </div>
  )
}
