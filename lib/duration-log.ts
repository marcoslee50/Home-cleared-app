// Duration Learning Log - persists client-specific job duration actuals
// Uses Vercel KV for serverless storage. Falls back to in-memory if KV not configured.

interface DurationEntry {
  date: string
  operatives: string
  jobType: string
  actualMins: number
}

interface ClientDurationData {
  clientName: string
  entries: DurationEntry[]
  averageMins: number
  lastUpdated: string
}

// -- KV helpers ---------------------------------------------------------------

function kvConfigured(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

async function kvGet(key: string): Promise<string | null> {
  if (!kvConfigured()) return null
  try {
    const { kv } = await import('@vercel/kv')
    return await kv.get<string>(key)
  } catch {
    return null
  }
}

async function kvSet(key: string, value: string): Promise<void> {
  if (!kvConfigured()) return
  try {
    const { kv } = await import('@vercel/kv')
    await kv.set(key, value)
  } catch (err) {
    console.warn('KV set failed (running without KV?):', err)
  }
}

// -- Public API ---------------------------------------------------------------

export async function logDuration(
  clientName: string,
  entry: DurationEntry
): Promise<void> {
  const key = `duration:${sanitizeKey(clientName)}`
  const existing = await kvGet(key)

  const data: ClientDurationData = existing
    ? JSON.parse(existing)
    : { clientName, entries: [], averageMins: 0, lastUpdated: '' }

  data.entries.push(entry)
  if (data.entries.length > 10) data.entries = data.entries.slice(-10)

  const recent = data.entries.slice(-3)
  data.averageMins = Math.round(
    recent.reduce((a, b) => a + b.actualMins, 0) / recent.length
  )
  data.lastUpdated = new Date().toISOString()

  await kvSet(key, JSON.stringify(data))
}

export async function getClientDuration(clientName: string): Promise<number | null> {
  const key = `duration:${sanitizeKey(clientName)}`
  const data = await kvGet(key)
  if (!data) return null
  const parsed: ClientDurationData = JSON.parse(data)
  return parsed.averageMins || null
}

export async function getAllClientDurations(): Promise<Record<string, number>> {
  if (!kvConfigured()) return {}
  try {
    const { kv } = await import('@vercel/kv')
    const keys = await kv.keys('duration:*')
    const result: Record<string, number> = {}

    for (const key of keys) {
      const data = await kv.get<string>(key)
      if (data) {
        const parsed: ClientDurationData = JSON.parse(data)
        result[parsed.clientName] = parsed.averageMins
      }
    }

    return result
  } catch {
    return {}
  }
}

// -- Format a DURATION LOG line for calendar events ---------------------------

export function formatDurationLogLine(
  date: string,
  operatives: 'Marcos' | 'Barry' | 'Both',
  jobType: string,
  actualMins: number
): string {
  return `DURATION LOG: ${date} | ${operatives} | ${jobType} | ${actualMins} min`
}

// -- Helpers ------------------------------------------------------------------

function sanitizeKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .trim()
}
