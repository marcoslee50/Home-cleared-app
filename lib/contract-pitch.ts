// Monthly contract pitch trigger logic
//
// Trigger: a non-contract client reaches visitCount >= 3 and isn't on
// a monthly plan yet. The day report and the client detail page show
// a soft prompt with a pre-written message Marcos can copy or send.
// The message is NEVER sent automatically.
//
// "Dismiss" stores a timestamp in KV under contract_pitch:{safeName}.
// If a dismissal exists and is < 30 days old, the prompt stays hidden.

const PRICE_PER_VISIT = 65
const MONTHLY_PRICE = 199
const MONTHLY_VISITS = 4

export function monthlySaving(perVisit = PRICE_PER_VISIT, monthly = MONTHLY_PRICE, visits = MONTHLY_VISITS): number {
  return perVisit * visits - monthly
}

export function buildContractPitchMessage(clientName: string): string {
  const firstName = clientName.split(' ')[0]
  const saving = monthlySaving()
  return `Hi ${firstName}, you've been brilliant to work for - a lot of our regulars find the monthly plan works out better. ${MONTHLY_VISITS} visits for £${MONTHLY_PRICE}, saves you £${saving} vs booking each time, and you always get priority scheduling. Worth a chat? - Marcos`
}

export function buildContractPitchLink(clientName: string, clientPhone?: string): string {
  const message = buildContractPitchMessage(clientName)
  const phone = clientPhone?.replace(/[^0-9+]/g, '')
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

export interface ContractPitchEligibility {
  eligible: boolean
  reason?: string
}

export function checkPitchEligibility(profile: {
  visitCount: number
  isMonthlyContract: boolean
}): ContractPitchEligibility {
  if (profile.isMonthlyContract) return { eligible: false, reason: 'already on contract' }
  if (profile.visitCount < 3) return { eligible: false, reason: `only ${profile.visitCount} visit(s)` }
  return { eligible: true }
}
