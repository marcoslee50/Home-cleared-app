import { NextResponse } from 'next/server'
import { loadSettings } from '@/lib/settings'

// Reads from KV at request time - never static.
export const dynamic = 'force-dynamic'

// Returns server-side invoice configuration (bank details, company info)
// so the new-invoice page can render PDF without exposing account number
// as NEXT_PUBLIC_* env vars.
//
// KV-backed settings (from /settings) take priority over env vars when
// they're non-empty.

export async function GET() {
  const settings = await loadSettings()
  const inv = settings.invoice

  return NextResponse.json({
    bankName: inv.bankName || process.env.INVOICE_BANK_NAME || '',
    sortCode: inv.sortCode || process.env.INVOICE_SORT_CODE || '',
    accountNumber: inv.accountNumber || process.env.INVOICE_ACCOUNT_NUMBER || '',
    paymentTerms: inv.paymentTerms || 14,
    invoicePrefix: inv.prefix || 'INV',
    companyName: process.env.INVOICE_COMPANY_NAME || 'Wirral Garden & Property',
    address: process.env.INVOICE_ADDRESS || 'Port Sunlight, Wirral, CH62',
    phone: process.env.INVOICE_PHONE || '07542 888 772',
    email: process.env.INVOICE_EMAIL || 'marcos@gmx.co.uk',
    website: process.env.INVOICE_WEBSITE || 'wirralgardenandproperty.com',
    vatNumber: process.env.INVOICE_VAT_NUMBER || '',
    googleReviewLink: settings.reviewLink || process.env.NEXT_PUBLIC_GOOGLE_REVIEW_LINK || '',
  })
}
