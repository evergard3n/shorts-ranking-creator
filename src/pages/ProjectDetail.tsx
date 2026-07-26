import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import { useAuth } from '@/contexts/AuthContext'
import { projects, type ProjectWithVideos } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, LogOut, Trash2, ExternalLink, Play } from 'lucide-react'

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [project, setProject] = useState<ProjectWithVideos | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    try {
      const { project: p } = await projects.get(id)
      setProject(p)
      setEditName(p.name)
      setEditDesc(p.description || '')
    } catch {
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!id || !editName.trim()) return
    await projects.update(id, { name: editName.trim(), description: editDesc.trim() })
    setEditing(false)
    await load()
  }

  const handleRemoveVideo = async (videoId: string) => {
    if (!id) return
    await projects.removeVideo(id, videoId)
    await load()
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const formatDuration = (sec: number | null) => {
    if (!sec) return '—'
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const platformLabel = (p: string) => (p === 'tiktok' ? 'TikTok' : 'YouTube')

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin border-2 border-muted-foreground border-t-foreground" />
      </div>
    )
  }

  if (!project) return null

  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <Link to="/" className="text-lg font-bold tracking-tight text-foreground">
          ranker
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        {/* Back + project info */}
        <div className="mb-8">
          <Link
            to="/dashboard"
            className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to projects
          </Link>

          {editing ? (
            <div className="space-y-3 border border-border p-4">
              <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Description
                </label>
                <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Optional" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={!editName.trim()}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{project.name}</h1>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setEditing(true)}>
                  Edit
                </Button>
              </div>
              {project.description && (
                <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground/60">
                {project.videoIds.length} video{project.videoIds.length !== 1 && 's'} · Created{' '}
                {new Date(project.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          )}
        </div>

        {/* Videos */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Videos</h2>
          <Button size="sm" variant="outline" onClick={() => navigate('/editor')}>
            <Play className="h-3.5 w-3.5" />
            Open editor
          </Button>
        </div>

        {project.videoIds.length === 0 ? (
          <div className="flex flex-col items-center justify-center border border-border py-16 text-center">
            <p className="text-sm text-muted-foreground">No videos in this project</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Download videos and add them from the editor
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {project.videoIds.map((v) => (
              <div
                key={v._id}
                className="group flex items-center gap-4 border border-border px-4 py-3 transition-colors hover:bg-secondary/50"
              >
                {/* Thumbnail */}
                <div className="h-14 w-24 flex-shrink-0 overflow-hidden bg-secondary">
                  {v.thumbnail ? (
                    <img src={v.thumbnail} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground/30">
                      <Play className="h-5 w-5" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground truncate text-sm">
                    {v.title || v.filename}
                  </h3>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{platformLabel(v.platform)}</span>
                    <span>{formatDuration(v.duration)}</span>
                    <span>{new Date(v.downloadedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={v.r2Url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleRemoveVideo(v._id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
