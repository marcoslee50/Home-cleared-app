import { NextRequest, NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/calendar'

// Visit /api/auth/google to start the OAuth flow (first-time setup only)
export async function GET(_req: NextRequest) {
  const url = getAuthUrl()
  return NextResponse.redirect(url)
}
