import { NextRequest, NextResponse } from 'next/server'
import { fetchWirralForecast, evaluateFlags } from '@/lib/weather'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') || undefined
  const day = await fetchWirralForecast(date)
  if (!day) {
    return NextResponse.json({
      ok: false,
      reason: 'Weather unavailable - check METOFFICE_API_KEY',
    }, { status: 200 })
  }
  return NextResponse.json({
    ok: true,
    day,
    flags: evaluateFlags(day),
  })
}
