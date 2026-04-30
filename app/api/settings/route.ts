import { NextRequest, NextResponse } from 'next/server'
import {
  loadSettings,
  saveFbTemplates,
  saveBarry,
  saveInvoice,
  saveReviewLink,
  saveBarryDebtNote,
  saveCampaigns,
} from '@/lib/settings'

export const dynamic = 'force-dynamic'

export async function GET() {
  const settings = await loadSettings()
  return NextResponse.json(settings)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { section, value } = body

    if (section === 'fbTemplates') { await saveFbTemplates(value); return NextResponse.json({ ok: true }) }
    if (section === 'barry')       { await saveBarry(value);       return NextResponse.json({ ok: true }) }
    if (section === 'invoice')     { await saveInvoice(value);     return NextResponse.json({ ok: true }) }
    if (section === 'reviewLink')  { await saveReviewLink(value);  return NextResponse.json({ ok: true }) }
    if (section === 'barryDebtNote') { await saveBarryDebtNote(value); return NextResponse.json({ ok: true }) }
    if (section === 'campaigns')   { await saveCampaigns(value);    return NextResponse.json({ ok: true }) }

    return NextResponse.json({ error: 'Unknown section' }, { status: 400 })
  } catch (error) {
    console.error('Settings API error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
