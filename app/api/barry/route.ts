import { NextRequest, NextResponse } from 'next/server'
import { generateBarryBriefing, DayPlan } from '@/lib/claude'

export async function POST(req: NextRequest) {
  try {
    const { plan } = (await req.json()) as { plan: DayPlan }
    const briefing = await generateBarryBriefing(plan)
    return NextResponse.json({ briefing })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
