const BASE = '/api'

function getToken(): string | null {
  return localStorage.getItem('token')
}

export function setToken(token: string) {
  localStorage.setItem('token', token)
}

export function clearToken() {
  localStorage.removeItem('token')
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...opts, headers })

  if (res.status === 401) {
    clearToken()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  const body = await res.json()
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
  return body as T
}

// --- Auth ---

export interface AuthUser {
  id: string
  email: string
  name: string
}

interface AuthResponse {
  user: AuthUser
  token: string
}

export const auth = {
  register: (data: { email: string; password: string; name: string }) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  me: () => request<{ user: AuthUser }>('/auth/me'),
}

// --- Projects ---

export interface Project {
  _id: string
  userId: string
  name: string
  description: string
  videoIds: string[]
  createdAt: string
  updatedAt: string
}

export interface ProjectWithVideos extends Omit<Project, 'videoIds'> {
  videoIds: Array<{
    _id: string
    url: string
    r2Url: string
    platform: 'tiktok' | 'youtube'
    title: string | null
    thumbnail: string | null
    duration: number | null
    filename: string
    downloadedAt: string
  }>
}

export const projects = {
  list: () => request<{ projects: Project[] }>('/projects'),

  get: (id: string) => request<{ project: ProjectWithVideos }>(`/projects/${id}`),

  create: (data: { name: string; description?: string }) =>
    request<{ project: Project }>('/projects', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: { name?: string; description?: string }) =>
    request<{ project: Project }>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id: string) =>
    request<{ deleted: boolean }>(`/projects/${id}`, { method: 'DELETE' }),

  addVideo: (id: string, videoId: string) =>
    request<{ project: Project }>(`/projects/${id}/videos`, {
      method: 'POST',
      body: JSON.stringify({ videoId }),
    }),

  removeVideo: (id: string, videoId: string) =>
    request<{ project: Project }>(`/projects/${id}/videos/${videoId}`, { method: 'DELETE' }),
}

// --- Videos ---

export interface Video {
  _id: string
  url: string
  r2Url: string
  platform: 'tiktok' | 'youtube'
  title: string | null
  thumbnail: string | null
  duration: number | null
  fileSize: number | null
  filename: string
  downloadedBy: string
  downloadedAt: string
}

export const videos = {
  list: (params?: { platform?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams()
    if (params?.platform) qs.set('platform', params.platform)
    if (params?.limit) qs.set('limit', String(params.limit))
    if (params?.offset) qs.set('offset', String(params.offset))
    const q = qs.toString()
    return request<{ videos: Video[]; total: number; limit: number; offset: number }>(
      `/videos${q ? `?${q}` : ''}`
    )
  },

  get: (id: string) => request<{ video: Video }>(`/videos/${id}`),

  delete: (id: string) => request<{ deleted: boolean }>(`/videos/${id}`, { method: 'DELETE' }),
}
