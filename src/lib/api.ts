import axios from 'axios'
import { ApiError, type ErrorCode } from './errors'

const BASE = import.meta.env.VITE_BACKEND_URL as string

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; message: ErrorCode }

const client = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
})

// Inject bearer token
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Unwrap envelope
client.interceptors.response.use(
  (res) => {
    const body = res.data as ApiResponse<unknown>
    if (!body.success) throw new ApiError(body.message)
    res.data = body.data
    return res
  },
  (err) => {
    if (err instanceof ApiError) return Promise.reject(err)
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)

// --- Types (from API contract) ---

export interface AuthUser {
  id: string
  email: string
  name: string
}

export interface Video {
  _id: string
  url: string
  urlHash: string
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
  videoIds: Video[]
}

// --- Token helpers ---

export function setToken(token: string) {
  localStorage.setItem('token', token)
}

export function clearToken() {
  localStorage.removeItem('token')
}

// --- Auth ---

export const auth = {
  register: (data: { email: string; password: string; name: string }) =>
    client.post<{ user: AuthUser; token: string }>('/auth/register', data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    client.post<{ user: AuthUser; token: string }>('/auth/login', data).then((r) => r.data),

  me: () => client.get<{ user: AuthUser }>('/auth/me').then((r) => r.data),
}

// --- Projects ---

export const projects = {
  list: () =>
    client.get<{ projects: Project[] }>('/projects').then((r) => r.data),

  get: (id: string) =>
    client.get<{ project: ProjectWithVideos }>(`/projects/${id}`).then((r) => r.data),

  create: (data: { name: string; description?: string }) =>
    client.post<{ project: Project }>('/projects', data).then((r) => r.data),

  update: (id: string, data: { name?: string; description?: string }) =>
    client.patch<{ project: Project }>(`/projects/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    client.delete<{ deleted: true }>(`/projects/${id}`).then((r) => r.data),

  addVideo: (id: string, videoId: string) =>
    client.post<{ project: Project }>(`/projects/${id}/videos`, { videoId }).then((r) => r.data),

  removeVideo: (id: string, videoId: string) =>
    client.delete<{ project: Project }>(`/projects/${id}/videos/${videoId}`).then((r) => r.data),
}

// --- Videos ---

export const videos = {
  list: (params?: { platform?: 'tiktok' | 'youtube'; limit?: number; offset?: number }) =>
    client.get<{ videos: Video[]; total: number; limit: number; offset: number }>('/videos', { params }).then((r) => r.data),

  get: (id: string) =>
    client.get<{ video: Video }>(`/videos/${id}`).then((r) => r.data),

  delete: (id: string) =>
    client.delete<{ deleted: true }>(`/videos/${id}`).then((r) => r.data),
}

// --- Downloads (Basic auth) ---

export interface DownloadCachedResponse {
  jobId: null
  cached: true
  url: string
  video?: Video
}

export interface DownloadQueuedResponse {
  jobId: string
  cached: false
}

export interface DownloadPollProcessing {
  ready: false
}

export interface DownloadPollDone {
  ready: true
  url: string
}

export interface DownloadPollError {
  ready: true
  error: string
}

export const downloads = {
  start: (url: string) =>
    client.post<DownloadCachedResponse | DownloadQueuedResponse>(
      '/download',
      null,
      { params: { url }, headers: { Authorization: 'Basic ' + btoa('user:pass') } },
    ).then((r) => r.data),

  poll: (jobId: string) =>
    client.get<DownloadPollProcessing | DownloadPollDone | DownloadPollError>(
      `/download/${jobId}`,
      { headers: { Authorization: 'Basic ' + btoa('user:pass') } },
    ).then((r) => r.data),
}
