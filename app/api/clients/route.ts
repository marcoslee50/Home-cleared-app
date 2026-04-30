import { NextRequest, NextResponse } from 'next/server'
import {
  getClientProfile,
  saveClientProfile,
  listClientProfiles,
  getOrCreateClientProfile,
  ClientProfile,
} from '@/lib/client-profiles'

export const dynamic = 'force-dynamic'

// GET /api/clients              - list all profiles
// GET /api/clients?name=X       - fetch one
// POST /api/clients             - create or update (action: 'save' | 'create')

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const name = searchParams.get('name')

  if (name) {
    const profile = await getClientProfile(name)
    return profile
      ? NextResponse.json(profile)
      : NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const profiles = await listClientProfiles()
  // Sort by last visit (most recent first), then by name
  profiles.sort((a, b) => {
    if (a.lastVisit !== b.lastVisit) return a.lastVisit > b.lastVisit ? -1 : 1
    return a.clientName.localeCompare(b.clientName)
  })
  return NextResponse.json({ profiles })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'create') {
      const profile = await getOrCreateClientProfile(body.clientName, body.address || '')
      return NextResponse.json(profile)
    }

    if (action === 'save') {
      await saveClientProfile(body.profile as ClientProfile)
      return NextResponse.json({ ok: true })
    }

    if (action === 'dismiss-pitch') {
      const profile = await getClientProfile(body.clientName)
      if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      profile.pitchDismissedAt = new Date().toISOString()
      await saveClientProfile(profile)
      return NextResponse.json({ ok: true })
    }

    if (action === 'mark-contract') {
      const profile = await getClientProfile(body.clientName)
      if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      profile.isMonthlyContract = !!body.isMonthlyContract
      await saveClientProfile(profile)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Clients API error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
