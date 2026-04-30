import { NextRequest, NextResponse } from 'next/server'
import { DayPlan } from '@/lib/claude'
import { toPublishedPlan, publishPlan } from '@/lib/published-plan'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { plan, pickupLocation } = body as { plan: DayPlan; pickupLocation?: string }
    if (!plan?.date) return NextResponse.json({ error: 'Missing plan' }, { status: 400 })

    const published = toPublishedPlan(plan, pickupLocation)
    const ok = await publishPlan(published)

    return NextResponse.json({ ok, date: published.date, jobs: published.jobs.length })
  } catch (error) {
    console.error('Publish plan error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
