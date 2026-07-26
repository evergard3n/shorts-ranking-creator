import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '@/contexts/AuthContext'
import { projects, type Project } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, FolderOpen, LogOut, Video, Pencil } from 'lucide-react'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [list, setList] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const load = useCallback(async () => {
    const { projects: p } = await projects.list()
    setList(p)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      await projects.create({ name: newName.trim() })
      setNewName('')
      setShowCreate(false)
      await load()
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    await projects.delete(id)
    setList((prev) => prev.filter((p) => p._id !== id))
  }

  const handleRename = async (id: string) => {
    if (!editName.trim()) return
    await projects.update(id, { name: editName.trim() })
    setEditingId(null)
    await load()
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <Link to="/" className="text-lg font-bold tracking-tight text-foreground">
          ranker
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <Button variant="ghost" size="sm" onClick={() => navigate('/editor')}>
            <Video className="h-4 w-4" />
            Editor
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Projects</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {list.length} project{list.length !== 1 && 's'}
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} size="sm">
            <Plus className="h-4 w-4" />
            New project
          </Button>
        </div>

        {/* Create form */}
        {showCreate && (
          <form onSubmit={handleCreate} className="mb-6 flex gap-2 border border-border p-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Project name"
              autoFocus
              className="flex-1"
            />
            <Button type="submit" disabled={creating || !newName.trim()} size="sm">
              {creating ? 'Creating…' : 'Create'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setShowCreate(false); setNewName('') }}>
              Cancel
            </Button>
          </form>
        )}

        {/* Project list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin border-2 border-muted-foreground border-t-foreground" />
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-sm text-muted-foreground">No projects yet</p>
            <p className="text-xs text-muted-foreground/60">Create one to get started</p>
          </div>
        ) : (
          <div className="space-y-1">
            {list.map((p) => (
              <div
                key={p._id}
                className="group flex items-center justify-between border border-border px-4 py-3 transition-colors hover:bg-secondary/50"
              >
                <div className="flex-1 min-w-0">
                  {editingId === p._id ? (
                    <form
                      onSubmit={(e) => { e.preventDefault(); handleRename(p._id) }}
                      className="flex items-center gap-2"
                    >
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        autoFocus
                        onBlur={() => setEditingId(null)}
                        className="h-7 text-sm"
                      />
                      <Button type="submit" size="sm" variant="ghost" className="h-7 px-2 text-xs">
                        Save
                      </Button>
                    </form>
                  ) : (
                    <Link to={`/projects/${p._id}`} className="block">
                      <h3 className="font-medium text-foreground truncate">{p.name}</h3>
                      {p.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground truncate">{p.description}</p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground/60">
                        Created {formatDate(p.createdAt)}
                      </p>
                    </Link>
                  )}
                </div>

                {editingId !== p._id && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={(e) => {
                        e.preventDefault()
                        setEditingId(p._id)
                        setEditName(p.name)
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.preventDefault()
                        handleDelete(p._id)
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
