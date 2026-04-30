// Published plan - a Barry-safe slice of today's day plan, stored in KV
// under plan:public:YYYY-MM-DD with a 24h TTL. The /barry/day route
// reads from here without auth so Marcos can share the URL via WhatsApp.

import type { DayPlan, ScheduledJob } from './claude'

export interface BarryJobView {
  emoji: string
  area: string
  jobType: string
  scheduledArrival: string
  estimatedDuration: number
  // First name only - no surnames
  firstName: string
  // Subset of flags safe to share (e.g. tools/special equipment, not prices)
  notes: string
}

export interface PublishedPlan {
  date: string
  publishedAt: string
  startTime: string
  pickupLocation: string        // typically "New Brighton" if Barry is on
  estimatedFinish: string
  barryDropoffTime?: string
  jobs: BarryJobView[]
  flags: string[]               // day-level flags - filtered to Barry-safe
}

const TTL_SECONDS = 26 * 60 * 60  // 26h - covers an over-running day

function kvConfigured(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

function extractFirstName(clientName: string): string {
  return clientName.split(' ')[0] || clientName
}

function extractArea(address?: string): string {
  if (!address) return 'Wirral'
  // Strip postcode-like tokens, take the last named segment
  const parts = address.split(',').map(p => p.trim()).filter(Boolean)
  if (parts.length === 0) return 'Wirral'
  // Try second-from-last (typical pattern: "12 Some St, Heswall, CH60 5AB")
  const last = parts[parts.length - 1]
  const looksLikePostcode = /^[A-Z]{1,2}\d/.test(last.toUpperCase())
  return looksLikePostcode && parts.length >= 2
    ? parts[parts.length - 2]
    : last
}

function sanitiseFlags(flags: string[]): string[] {
  // Drop anything that mentions money or surnames
  return flags.filter(f => !/£|price|invoice/i.test(f))
}

function jobToBarryView(job: ScheduledJob, barryWorking: boolean): BarryJobView | null {
  // Barry only sees jobs he's working on
  if (job.operative === 'marcos' && barryWorking) return null
  if (!barryWorking) return null
  return {
    emoji: job.emoji,
    area: extractArea(job.address),
    jobType: job.jobType,
    scheduledArrival: job.scheduledArrival,
    estimatedDuration: job.estimatedDuration,
    firstName: extractFirstName(job.clientName),
    notes: job.notes || '',
  }
}

export function toPublishedPlan(plan: DayPlan, pickupLocation = 'New Brighton'): PublishedPlan {
  const barryWorking = !!plan.barryDropoffTime
  const jobs = barryWorking
    ? plan.jobs.map(j => jobToBarryView(j, true)).filter((j): j is BarryJobView => !!j)
    : []
  return {
    date: plan.date,
    publishedAt: new Date().toISOString(),
    startTime: plan.startTime,
    pickupLocation,
    estimatedFinish: plan.estimatedFinish,
    barryDropoffTime: plan.barryDropoffTime,
    jobs,
    flags: sanitiseFlags(plan.flags || []),
  }
}

export async function publishPlan(plan: PublishedPlan): Promise<boolean> {
  if (!kvConfigured()) return false
  try {
    const { kv } = await import('@vercel/kv')
    const key = `plan:public:${plan.date}`
    await kv.set(key, JSON.stringify(plan))
    await kv.expire(key, TTL_SECONDS)
    return true
  } catch (err) {
    console.error('publishPlan failed:', err)
    return false
  }
}

export async function loadPublishedPlan(date?: string): Promise<PublishedPlan | null> {
  if (!kvConfigured()) return null
  const target = date || new Date().toISOString().split('T')[0]
  try {
    const { kv } = await import('@vercel/kv')
    const data = await kv.get<string>(`plan:public:${target}`)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}
