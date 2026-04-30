// Client health scoring per Addendum 2:
//   GREEN  - last visit within 5 weeks AND visitCount > 1
//   AMBER  - last visit > 6 weeks OR 1 cancellation in last 60 days
//            OR invoice overdue 7+ days
//   RED    - last visit > 10 weeks OR 2+ cancellations in last 60 days
//            OR invoice overdue 14+ days OR no response to last WhatsApp
//
// Cancellation tracking and "no response" aren't yet first-class in the
// data model - we infer best-effort from what we have:
//   - lastVisit drives the time-based bucket
//   - overdue invoices come from /api/invoices?outstanding=true
// More signals can layer in later without changing the consumer API.

import type { ClientProfile } from './client-profiles'
import type { Invoice } from './invoices'

export type HealthStatus = 'green' | 'amber' | 'red' | 'new'

export interface HealthAssessment {
  status: HealthStatus
  reasons: string[]               // human-readable list of triggers
  weeksSinceVisit: number | null  // null if no visit yet
  overdueInvoices: number
  maxOverdueDays: number
}

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

export function assessClientHealth(
  profile: ClientProfile,
  outstandingInvoices: Invoice[] = [],
  now: Date = new Date()
): HealthAssessment {
  const reasons: string[] = []

  // Time since last visit
  let weeks: number | null = null
  if (profile.lastVisit) {
    const diff = now.getTime() - new Date(profile.lastVisit).getTime()
    weeks = Math.max(0, Math.floor(diff / MS_PER_WEEK))
  }

  // Outstanding invoices for this client
  const theirs = outstandingInvoices.filter(
    inv => inv.clientName.toLowerCase() === profile.clientName.toLowerCase()
  )
  let maxOverdueDays = 0
  for (const inv of theirs) {
    if (!inv.dueDate) continue
    const dueMs = new Date(inv.dueDate).getTime()
    const days = Math.floor((now.getTime() - dueMs) / (24 * 60 * 60 * 1000))
    if (days > maxOverdueDays) maxOverdueDays = days
  }
  const overdueInvoices = theirs.filter(inv => {
    const dueMs = new Date(inv.dueDate).getTime()
    return now.getTime() > dueMs
  }).length

  // No visits ever -> "new" status, neither green nor red
  if (profile.visitCount === 0) {
    return { status: 'new', reasons: ['No visits yet'], weeksSinceVisit: null, overdueInvoices, maxOverdueDays }
  }

  // RED triggers
  let isRed = false
  if (weeks !== null && weeks > 10) { reasons.push(`No visit for ${weeks} weeks`); isRed = true }
  if (maxOverdueDays >= 14) { reasons.push(`Invoice ${maxOverdueDays} days overdue`); isRed = true }
  if (isRed) return { status: 'red', reasons, weeksSinceVisit: weeks, overdueInvoices, maxOverdueDays }

  // AMBER triggers
  let isAmber = false
  if (weeks !== null && weeks > 6) { reasons.push(`No visit for ${weeks} weeks`); isAmber = true }
  if (maxOverdueDays >= 7) { reasons.push(`Invoice ${maxOverdueDays} days overdue`); isAmber = true }
  if (isAmber) return { status: 'amber', reasons, weeksSinceVisit: weeks, overdueInvoices, maxOverdueDays }

  // GREEN
  if (weeks !== null && weeks <= 5 && profile.visitCount > 1) {
    return {
      status: 'green',
      reasons: [`Healthy - ${profile.visitCount} visits, last ${weeks}w ago`],
      weeksSinceVisit: weeks,
      overdueInvoices,
      maxOverdueDays,
    }
  }

  // First-time client with one visit, recent
  return {
    status: 'green',
    reasons: ['Recent first visit'],
    weeksSinceVisit: weeks,
    overdueInvoices,
    maxOverdueDays,
  }
}

export interface HealthBuckets {
  green: number
  amber: number
  red: number
  new: number
}

export function summariseHealth(assessments: HealthAssessment[]): HealthBuckets {
  const out: HealthBuckets = { green: 0, amber: 0, red: 0, new: 0 }
  for (const a of assessments) out[a.status]++
  return out
}
