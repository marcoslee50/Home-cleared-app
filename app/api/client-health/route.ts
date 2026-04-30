import { NextResponse } from 'next/server'
import { listClientProfiles } from '@/lib/client-profiles'
import { getOutstandingInvoices } from '@/lib/invoices'
import { assessClientHealth, summariseHealth, HealthAssessment } from '@/lib/client-health'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [profiles, outstanding] = await Promise.all([
    listClientProfiles(),
    getOutstandingInvoices(),
  ])

  const assessed: Array<{
    clientName: string
    address: string
    phone?: string
    visitCount: number
    lastVisit: string
    health: HealthAssessment
  }> = profiles.map(p => ({
    clientName: p.clientName,
    address: p.address,
    phone: p.phone,
    visitCount: p.visitCount,
    lastVisit: p.lastVisit,
    health: assessClientHealth(p, outstanding),
  }))

  const summary = summariseHealth(assessed.map(a => a.health))

  return NextResponse.json({ summary, clients: assessed })
}
