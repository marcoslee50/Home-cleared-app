import { NextResponse } from 'next/server'

// Returns server-side invoice configuration (bank details, company info)
// so the new-invoice page can render PDF without exposing account number
// as NEXT_PUBLIC_* env vars.

export async function GET() {
  return NextResponse.json({
    bankName: process.env.INVOICE_BANK_NAME || '',
    sortCode: process.env.INVOICE_SORT_CODE || '',
    accountNumber: process.env.INVOICE_ACCOUNT_NUMBER || '',
    companyName: process.env.INVOICE_COMPANY_NAME || 'Wirral Garden & Property',
    address: process.env.INVOICE_ADDRESS || 'Port Sunlight, Wirral, CH62',
    phone: process.env.INVOICE_PHONE || '07542 888 772',
    email: process.env.INVOICE_EMAIL || 'marcos@gmx.co.uk',
    website: process.env.INVOICE_WEBSITE || 'wirralgardenandproperty.com',
    vatNumber: process.env.INVOICE_VAT_NUMBER || '',
  })
}
