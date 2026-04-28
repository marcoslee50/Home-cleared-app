const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || `Request failed: ${res.status}`)
  }
  return res.json() as T
}

export const api = {
  createJob: (body: object) =>
    request<{ job_id: string }>('/api/v1/tribute/create', { method: 'POST', body: JSON.stringify(body) }),

  startJob: (jobId: string, body: object) =>
    request<{ ok: boolean }>(`/api/v1/tribute/${jobId}/start`, { method: 'POST', body: JSON.stringify(body) }),

  getStatus: (jobId: string) =>
    request<{ stage: string; stage_progress: number; video_url?: string; message?: string }>(
      `/api/v1/tribute/${jobId}/status`
    ),

  shareJob: (jobId: string) =>
    request<{ share_url: string }>(`/api/v1/tribute/${jobId}/share`, { method: 'POST' }),

  presign: (filename: string, contentType: string, folder: string) =>
    request<{ upload_url: string; public_url: string }>('/api/v1/upload/presign', {
      method: 'POST',
      body: JSON.stringify({ filename, content_type: contentType, folder }),
    }),
}
