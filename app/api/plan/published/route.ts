import { NextRequest, NextResponse } from 'next/server'
import { loadPublishedPlan } from '@/lib/published-plan'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') || undefined
  const plan = await loadPublishedPlan(date)
  if (!plan) return NextResponse.json({ ok: false, reason: 'No published plan for today' }, { status: 200 })
  return NextResponse.json({ ok: true, plan })
}
