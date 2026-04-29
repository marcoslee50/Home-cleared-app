// End-of-Day Report Generator
// Produces performance metrics, photo summary, invoice prompts.

import Anthropic from '@anthropic-ai/sdk'
import { DayPlan, ScheduledJob } from './claude'
import { Invoice } from './invoices'

const client = new Anthropic()

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CompletedJobSummary {
  job: ScheduledJob
  arrivedAt: string
  finishedAt: string
  actualDuration: number
  estimatedDuration: number
  photosBefore: number
  photosAfter: number
  facebookPosted: boolean
  invoiceId?: string
  invoiceStatus?: string
}

export interface DayReport {
  date: string
  generatedAt: string

  plannedStart: string
  actualStart: string
  plannedFinish: string
  actualFinish: string
  totalJobTimeActual: number
  totalJobTimePlanned: number
  totalTravelTime: number

  jobsCompleted: number
  jobsPlanned: number
  completedJobs: CompletedJobSummary[]

  confirmedRevenue: number
  invoicedTotal: number
  cashCollected: number

  avgAccuracyPct: number
  onTimeJobs: number
  earlyJobs: number
  lateJobs: number

  totalPhotosTaken: number
  facebookPostsCount: number

  barryWorked: boolean
  barryDroppedOnTime: boolean

  invoicesToSend: string[]
  overdueInvoices: Invoice[]

  narrative: string
  highlights: string[]
  tomorrowFlags: string[]
}

// ── Generate end-of-day report ────────────────────────────────────────────────

export async function generateDayReport(params: {
  plan: DayPlan
  completedJobs: CompletedJobSummary[]
  overdueInvoices: Invoice[]
  invoicesToSend: string[]
}): Promise<DayReport> {
  const { plan, completedJobs, overdueInvoices, invoicesToSend } = params

  const now = new Date()
  const actualFinish = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/London',
  })

  const totalJobTimeActual = completedJobs.reduce((s, j) => s + j.actualDuration, 0)
  const totalJobTimePlanned = completedJobs.reduce((s, j) => s + j.estimatedDuration, 0)

  const accuracies = completedJobs.map(j =>
    Math.max(0, 100 - (Math.abs(j.actualDuration - j.estimatedDuration) / j.estimatedDuration) * 100)
  )
  const avgAccuracyPct = accuracies.length
    ? Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length)
    : 100

  let onTimeJobs = 0
  let earlyJobs = 0
  let lateJobs = 0
  for (const j of completedJobs) {
    const diff = j.actualDuration - j.estimatedDuration
    if (Math.abs(diff) <= 10) onTimeJobs++
    else if (diff < 0) earlyJobs++
    else lateJobs++
  }

  const totalPhotosTaken = completedJobs.reduce((s, j) => s + j.photosBefore + j.photosAfter, 0)
  const facebookPostsCount = completedJobs.filter(j => j.facebookPosted).length

  const narrative = await generateNarrative({
    completedJobs,
    plan,
    avgAccuracyPct,
    totalPhotosTaken,
    facebookPostsCount,
  })

  const report: DayReport = {
    date: plan.date,
    generatedAt: now.toISOString(),
    plannedStart: plan.startTime,
    actualStart: completedJobs[0]?.arrivedAt || plan.startTime,
    plannedFinish: plan.estimatedFinish,
    actualFinish,
    totalJobTimeActual,
    totalJobTimePlanned,
    totalTravelTime: plan.totalTravelTime,
    jobsCompleted: completedJobs.length,
    jobsPlanned: plan.jobs.length,
    completedJobs,
    confirmedRevenue: plan.confirmedRevenue,
    invoicedTotal: completedJobs.reduce((s, j) => {
      const job = plan.jobs.find(p => p.id === j.job.id)
      return s + (job?.price || 0)
    }, 0),
    cashCollected: 0,
    avgAccuracyPct,
    onTimeJobs,
    earlyJobs,
    lateJobs,
    totalPhotosTaken,
    facebookPostsCount,
    barryWorked: !!plan.barryDropoffTime,
    barryDroppedOnTime: true,
    invoicesToSend,
    overdueInvoices,
    narrative: narrative.summary,
    highlights: narrative.highlights,
    tomorrowFlags: narrative.tomorrowFlags,
  }

  return report
}

// ── Claude narrative generator ────────────────────────────────────────────────

async function generateNarrative(data: {
  completedJobs: CompletedJobSummary[]
  plan: DayPlan
  avgAccuracyPct: number
  totalPhotosTaken: number
  facebookPostsCount: number
}): Promise<{ summary: string; highlights: string[]; tomorrowFlags: string[] }> {
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `Generate a brief end-of-day summary for a garden maintenance business owner.

Data:
- Jobs completed: ${data.completedJobs.length} of ${data.plan.jobs.length} planned
- Estimate accuracy: ${data.avgAccuracyPct}%
- Photos taken: ${data.totalPhotosTaken}
- Facebook posts: ${data.facebookPostsCount}
- Revenue: £${data.plan.confirmedRevenue}
- Completed jobs: ${data.completedJobs.map(j => j.job.clientName).join(', ')}

Return JSON only:
{
  "summary": "2 sentence plain-English day summary (no markdown)",
  "highlights": ["3 short bullet points"],
  "tomorrowFlags": ["any prep needed for tomorrow — max 3"]
}`,
        },
      ],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return {
      summary: `Completed ${data.completedJobs.length} jobs today with ${data.avgAccuracyPct}% timing accuracy.`,
      highlights: ['Day complete', `${data.totalPhotosTaken} photos taken`, `£${data.plan.confirmedRevenue} confirmed`],
      tomorrowFlags: [],
    }
  }
}

// ── Format report for display ─────────────────────────────────────────────────

export function formatReportMetric(value: number, suffix = ''): string {
  return `${value}${suffix}`
}

export function getAccuracyColour(pct: number): string {
  if (pct >= 85) return 'var(--brand-green)'
  if (pct >= 70) return 'var(--status-warn)'
  return 'var(--status-alert)'
}
