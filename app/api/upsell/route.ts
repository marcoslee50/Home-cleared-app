import { NextRequest, NextResponse } from 'next/server'
import { appendUpsellNote, getClientProfile } from '@/lib/client-profiles'
import { fireKommoWebhook, UPSELL_SERVICES, UpsellService } from '@/lib/upsell'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      clientName,
      address,
      jobId,
      spotted,
      service,
      estimatedPrice,
      spottedBy = 'Marcos',
    } = body as {
      clientName: string
      address: string
      jobId?: string
      spotted: string
      service: UpsellService
      estimatedPrice?: number
      spottedBy?: 'Marcos' | 'Barry' | 'Both'
    }

    if (!clientName || !spotted || !service) {
      return NextResponse.json({ error: 'Missing clientName/spotted/service' }, { status: 400 })
    }

    const spottedAt = new Date().toISOString()
    const note = { spotted, service, estimatedPrice, spottedAt, spottedBy, jobId }

    await appendUpsellNote(clientName, address || '', note)

    // Look up phone from profile (now updated) for the webhook payload.
    const profile = await getClientProfile(clientName)
    const serviceLabel = UPSELL_SERVICES.find(s => s.id === service)?.label || service

    const webhookFired = await fireKommoWebhook({
      clientName,
      address: address || profile?.address || '',
      clientPhone: profile?.phone,
      spotted,
      service,
      serviceLabel,
      estimatedPrice,
      spottedAt,
      jobId,
    })

    return NextResponse.json({ ok: true, webhookFired })
  } catch (error) {
    console.error('Upsell capture error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
