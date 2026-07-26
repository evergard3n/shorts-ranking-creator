import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'

export default function Home() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-svh w-svh items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin border-2 border-muted-foreground border-t-foreground" />
      </div>
    )
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-5xl font-bold tracking-tight text-foreground">ranker</h1>
        <p className="text-muted-foreground">Video editor for the web</p>
        {user ? (
          <div className="flex gap-3">
            <Button render={<Link to="/dashboard" />}>Dashboard</Button>
            <Button variant="outline" render={<Link to="/editor" />}>Open Editor</Button>
          </div>
        ) : (
          <div className="flex gap-3">
            <Button render={<Link to="/login" />}>Sign in</Button>
            <Button variant="outline" render={<Link to="/register" />}>Create account</Button>
          </div>
        )}
      </div>
    </div>
  )
}
