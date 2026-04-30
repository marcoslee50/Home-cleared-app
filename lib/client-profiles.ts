// Persistent per-client profile - access notes, dog flag, parking,
// job history, total spend. Stored in Vercel KV under client:{safeName}.
// Same graceful-fallback pattern as lib/invoices.ts.

export interface ClientJobHistoryEntry {
  date: string
  jobType: string
  duration: number       // mins, actual
  price: number
  operative: string
  photoUrls: string[]    // after-photo Vercel Blob URLs
}

export interface ClientProfile {
  clientName: string
  address: string
  phone?: string
  email?: string
  accessNotes: string       // gate code, key safe, parking
  dogOnSite: boolean
  parkingNotes: string
  jobHistory: ClientJobHistoryEntry[]
  totalSpend: number
  lastVisit: string
  averageJobDuration: number
  notes: string             // freeform Marcos notes
  referredBy?: string       // who introduced this client (referral scheme)
  visitCount: number        // auto-increments on completed job; drives upsell prompt
  isMonthlyContract: boolean
  pitchDismissedAt?: string  // ISO; if present and < 30 days old, hide contract pitch
  createdAt: string
  updatedAt: string
}

type KVClient = {
  get: <T = unknown>(key: string) => Promise<T | null>
  set: (key: string, value: unknown) => Promise<unknown>
  keys: (pattern: string) => Promise<string[]>
}

function kvConfigured(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

async function getKv(): Promise<KVClient | null> {
  if (!kvConfigured()) return null
  try {
    const mod = await import('@vercel/kv')
    return mod.kv as unknown as KVClient
  } catch {
    return null
  }
}

function safeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_').trim()
}

function newProfile(clientName: string, address: string): ClientProfile {
  const now = new Date().toISOString()
  return {
    clientName,
    address,
    accessNotes: '',
    dogOnSite: false,
    parkingNotes: '',
    jobHistory: [],
    totalSpend: 0,
    lastVisit: '',
    averageJobDuration: 0,
    notes: '',
    visitCount: 0,
    isMonthlyContract: false,
    createdAt: now,
    updatedAt: now,
  }
}

const PITCH_HIDE_DAYS = 30

export function pitchHidden(profile: { pitchDismissedAt?: string }): boolean {
  if (!profile.pitchDismissedAt) return false
  const dismissedMs = new Date(profile.pitchDismissedAt).getTime()
  if (!Number.isFinite(dismissedMs)) return false
  const ageDays = (Date.now() - dismissedMs) / (1000 * 60 * 60 * 24)
  return ageDays < PITCH_HIDE_DAYS
}

export async function getClientProfile(clientName: string): Promise<ClientProfile | null> {
  const kv = await getKv()
  if (!kv) return null
  try {
    const data = await kv.get<string>(`client:${safeName(clientName)}`)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

export async function getOrCreateClientProfile(
  clientName: string,
  address: string
): Promise<ClientProfile> {
  const existing = await getClientProfile(clientName)
  if (existing) return existing
  const profile = newProfile(clientName, address)
  await saveClientProfile(profile)
  return profile
}

export async function saveClientProfile(profile: ClientProfile): Promise<void> {
  const kv = await getKv()
  if (!kv) return
  try {
    profile.updatedAt = new Date().toISOString()
    await kv.set(`client:${safeName(profile.clientName)}`, JSON.stringify(profile))
  } catch (err) {
    console.error('Failed to save client profile:', err)
  }
}

export async function listClientProfiles(): Promise<ClientProfile[]> {
  const kv = await getKv()
  if (!kv) return []
  try {
    const keys = await kv.keys('client:*')
    const profiles = await Promise.all(
      keys.map(async k => {
        const data = await kv.get<string>(k)
        return data ? (JSON.parse(data) as ClientProfile) : null
      })
    )
    return profiles.filter(Boolean) as ClientProfile[]
  } catch {
    return []
  }
}

// Called when a job is marked complete - appends to jobHistory and
// recomputes derived fields (visitCount, totalSpend, lastVisit, avg).
export async function recordCompletedJob(params: {
  clientName: string
  address: string
  date: string
  jobType: string
  duration: number
  price: number
  operative: string
  photoUrls: string[]
}): Promise<ClientProfile> {
  const profile = await getOrCreateClientProfile(params.clientName, params.address)
  profile.jobHistory.push({
    date: params.date,
    jobType: params.jobType,
    duration: params.duration,
    price: params.price,
    operative: params.operative,
    photoUrls: params.photoUrls,
  })
  profile.visitCount = profile.jobHistory.length
  profile.totalSpend = profile.jobHistory.reduce((s, e) => s + (e.price || 0), 0)
  profile.lastVisit = params.date
  profile.averageJobDuration = Math.round(
    profile.jobHistory.reduce((s, e) => s + (e.duration || 0), 0) / profile.jobHistory.length
  )
  await saveClientProfile(profile)
  return profile
}
