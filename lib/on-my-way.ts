// On-my-way WhatsApp message
//
// CRITICAL RULE: this message must NEVER send automatically.
// Marcos always has to tap a confirm button before WhatsApp opens.
// The functions here only build the link/preview text - the live page
// is responsible for the confirmation UX.

export interface OnMyWayParams {
  clientName: string
  clientPhone?: string
  etaMinutes?: number   // omit for 'shortly'
}

export function buildOnMyWayMessage(params: OnMyWayParams): string {
  const firstName = params.clientName.split(' ')[0]
  const eta = typeof params.etaMinutes === 'number' && params.etaMinutes > 0
    ? `I'll be with you in approximately ${params.etaMinutes} minutes`
    : `I'll be with you shortly`

  return `Hi ${firstName}, just leaving now - ${eta}. See you shortly! - Marcos`
}

export function buildOnMyWayLink(params: OnMyWayParams): string {
  const message = buildOnMyWayMessage(params)
  const phone = params.clientPhone?.replace(/[^0-9+]/g, '')
  const formattedPhone = phone?.startsWith('0')
    ? '44' + phone.slice(1)
    : phone?.startsWith('+')
      ? phone.slice(1)
      : phone

  const encoded = encodeURIComponent(message)
  return formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`
}

// Estimate drive time from current GPS position to a destination address
// using Google Distance Matrix API. Returns null on any failure - the
// live page falls back to 'shortly' when ETA is null.

export async function estimateEtaMinutes(
  origin: { lat: number; lng: number },
  destinationAddress: string
): Promise<number | null> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!key) return null

  try {
    const o = `${origin.lat},${origin.lng}`
    const d = encodeURIComponent(destinationAddress + ' Wirral UK')
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${o}&destinations=${d}&mode=driving&units=metric&key=${key}`
    )
    const data = await res.json()
    const seconds = data.rows?.[0]?.elements?.[0]?.duration?.value
    if (typeof seconds !== 'number') return null
    return Math.max(1, Math.round(seconds / 60))
  } catch {
    return null
  }
}

// Round ETA to a friendly multiple (5 mins under 30, 10 mins above)
export function roundEta(mins: number): number {
  if (mins <= 30) return Math.round(mins / 5) * 5 || 5
  return Math.round(mins / 10) * 10
}
