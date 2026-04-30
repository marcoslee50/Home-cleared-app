'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface LineItem { description: string; quantity: number; unitPrice: number; total: number }

function NewInvoiceForm() {
  const router = useRouter()
  const params = useSearchParams()
  const prefillClient = params.get('client') || ''

  const [form, setForm] = useState({
    clientName: prefillClient,
    clientPhone: '',
    clientAddress: '',
    jobDate: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: 'Garden maintenance', quantity: 1, unitPrice: 65, total: 65 },
  ])

  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<{ id: string; whatsappLink: string } | null>(null)

  const subtotal = lineItems.reduce((s, i) => s + i.total, 0)

  const updateItem = (index: number, field: keyof LineItem, value: string | number) => {
    setLineItems(prev => prev.map((item, i) => {
      if (i !== index) return item
      const updated = { ...item, [field]: value }
      if (field === 'quantity' || field === 'unitPrice') {
        updated.total = Number(updated.quantity) * Number(updated.unitPrice)
      }
      return updated
    }))
  }

  const addItem = () => setLineItems(prev => [...prev, { description: '', quantity: 1, unitPrice: 0, total: 0 }])
  const removeItem = (i: number) => setLineItems(prev => prev.filter((_, idx) => idx !== i))

  const generatePDF = async (invoice: Record<string, unknown>): Promise<string | null> => {
    try {
      const { jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF()
      const pageW = doc.internal.pageSize.getWidth()

      doc.setFillColor(45, 170, 107)
      doc.rect(0, 0, pageW, 40, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(22)
      doc.setFont('helvetica', 'bold')
      doc.text('INVOICE', 15, 22)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(String(invoice.id), pageW - 15, 22, { align: 'right' })

      doc.setTextColor(60, 60, 60)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('Wirral Garden & Property', 15, 55)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text(['Port Sunlight, Wirral, CH62', '07542 888 772', 'marcos@gmx.co.uk', 'wirralgardenandproperty.com'], 15, 62)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('Bill To:', pageW / 2, 55)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      const clientLines = [
        String(invoice.clientName),
        ...(invoice.clientAddress ? [String(invoice.clientAddress)] : []),
        ...(invoice.clientPhone ? [String(invoice.clientPhone)] : []),
      ]
      doc.text(clientLines, pageW / 2, 62)

      doc.setFontSize(9)
      doc.text([
        `Issue date: ${formatDate(String(invoice.issueDate))}`,
        `Job date: ${formatDate(String(invoice.jobDate))}`,
        `Due date: ${formatDate(String(invoice.dueDate))}`,
      ], pageW - 15, 55, { align: 'right' })

      const items = (invoice.lineItems as LineItem[])
      autoTable(doc, {
        startY: 95,
        head: [['Description', 'Qty', 'Unit price', 'Total']],
        body: items.map(item => [item.description, item.quantity, `£${Number(item.unitPrice).toFixed(2)}`, `£${Number(item.total).toFixed(2)}`]),
        foot: [
          ['', '', 'Subtotal', `£${Number(invoice.subtotal).toFixed(2)}`],
          ...(Number(invoice.vatAmount) > 0 ? [['', '', `VAT (${Math.round(Number(invoice.vatRate) * 100)}%)`, `£${Number(invoice.vatAmount).toFixed(2)}`]] : []),
          ['', '', 'TOTAL DUE', `£${Number(invoice.total).toFixed(2)}`],
        ],
        headStyles: { fillColor: [45, 170, 107], textColor: 255 },
        footStyles: { fontStyle: 'bold', fillColor: [240, 248, 244] },
        alternateRowStyles: { fillColor: [248, 252, 250] },
        styles: { fontSize: 9 },
      })

      const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('Payment Details', 15, finalY)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text([
        `Bank: ${process.env.NEXT_PUBLIC_BANK_NAME || 'Please contact us for bank details'}`,
        `Sort code: ${process.env.NEXT_PUBLIC_SORT_CODE || ''}`,
        `Account: ${process.env.NEXT_PUBLIC_ACCOUNT_NUMBER || ''}`,
        `Reference: ${invoice.id}`,
      ], 15, finalY + 7)

      if (invoice.notes) {
        doc.text(`Notes: ${invoice.notes}`, 15, finalY + 35)
      }

      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text('Thank you for your business - Wirral Garden & Property', pageW / 2, 285, { align: 'center' })

      const pdfBase64 = doc.output('datauristring').split(',')[1]

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-pdf', invoiceId: invoice.id, pdfBase64 }),
      })
      const data = await res.json()
      return data.pdfUrl || null
    } catch (err) {
      console.error('PDF generation failed:', err)
      return null
    }
  }

  const createInvoice = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          ...form,
          lineItems,
        }),
      })
      const invoice = await res.json()
      if (!res.ok) throw new Error(invoice.error)

      const pdfUrl = await generatePDF(invoice)

      const sentRes = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark-sent', invoiceId: invoice.id, pdfUrl: pdfUrl || '' }),
      })
      const sentData = await sentRes.json()

      setCreated({ id: invoice.id, whatsappLink: sentData.whatsappLink })
    } catch (err) {
      console.error('Invoice creation failed:', err)
    } finally {
      setCreating(false)
    }
  }

  if (created) {
    return (
      <div className="space-y-4">
        <div className="card p-6 text-center">
          <div className="text-4xl mb-3">!</div>
          <h3 className="font-display text-xl font-bold text-text-primary mb-1">Invoice created</h3>
          <p className="text-text-muted text-sm">{created.id}</p>
        </div>

        <a href={created.whatsappLink} target="_blank" rel="noopener noreferrer"
          className="btn-primary w-full py-4 block text-center text-base" style={{ background: '#25D366' }}>
          Send via WhatsApp
        </a>

        <button onClick={() => router.push('/invoices')} className="btn-secondary w-full py-3 text-sm">
          Back to Invoices
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-3">
        <p className="text-text-muted text-xs font-mono uppercase tracking-widest">Client details</p>
        <input value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
          placeholder="Client name *" className="input-field" />
        <input value={form.clientPhone} onChange={e => setForm(f => ({ ...f, clientPhone: e.target.value }))}
          placeholder="Phone (for WhatsApp)" className="input-field" type="tel" />
        <input value={form.clientAddress} onChange={e => setForm(f => ({ ...f, clientAddress: e.target.value }))}
          placeholder="Address" className="input-field" />
        <input value={form.jobDate} onChange={e => setForm(f => ({ ...f, jobDate: e.target.value }))}
          type="date" className="input-field" />
      </div>

      <div className="card p-4">
        <p className="text-text-muted text-xs font-mono uppercase tracking-widest mb-3">Line items</p>
        <div className="space-y-3">
          {lineItems.map((item, i) => (
            <div key={i} className="space-y-2 pb-3 border-b border-surface-border last:border-0">
              <div className="flex gap-2">
                <input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)}
                  placeholder="Description" className="input-field flex-1" />
                <button onClick={() => removeItem(i)} className="text-text-muted hover:text-status-alert text-lg px-1">x</button>
              </div>
              <div className="flex gap-2">
                <input value={item.quantity} onChange={e => updateItem(i, 'quantity', Number(e.target.value))}
                  type="number" min="1" step="0.5" placeholder="Qty" className="input-field w-20 text-center" />
                <span className="text-text-muted self-center">x</span>
                <input value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', Number(e.target.value))}
                  type="number" min="0" step="5" placeholder="£ price" className="input-field flex-1" />
                <span className="text-text-secondary self-center font-semibold text-sm w-16 text-right">£{item.total.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
        <button onClick={addItem} className="btn-secondary w-full py-2 text-sm mt-3">+ Add line item</button>

        <div className="flex justify-between items-center mt-4 pt-3 border-t border-surface-border">
          <span className="text-text-secondary font-semibold">Total</span>
          <span className="font-display text-2xl font-bold" style={{ color: 'var(--brand-green)' }}>£{subtotal.toFixed(2)}</span>
        </div>
      </div>

      <div className="card p-4">
        <p className="text-text-muted text-xs font-mono uppercase tracking-widest mb-2">Notes (optional)</p>
        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="Any additional notes for the client..." className="input-field resize-none" rows={2} />
      </div>

      <button onClick={createInvoice} disabled={creating || !form.clientName}
        className="btn-primary w-full py-4 text-base">
        {creating ? 'Creating & generating PDF...' : `Create Invoice - £${subtotal.toFixed(2)}`}
      </button>

      <style jsx global>{`
        .input-field {
          width: 100%;
          background: var(--surface-muted);
          border: 1px solid var(--surface-border);
          border-radius: 8px;
          padding: 10px 12px;
          color: var(--text-primary);
          font-size: 14px;
          font-family: var(--font-body);
          transition: border-color 0.2s;
        }
        .input-field:focus {
          outline: none;
          border-color: var(--brand-green);
        }
        .input-field::placeholder { color: var(--text-muted); }
      `}</style>
    </div>
  )
}

export default function NewInvoicePage() {
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="app-shell mesh-bg">
      <header className="px-5 pt-12 pb-4">
        <Link href="/invoices" className="text-text-muted text-sm mb-3 flex items-center gap-1">{'<-'} Invoices</Link>
        <h1 className="font-display text-2xl font-bold">New Invoice</h1>
        <p className="text-text-secondary text-sm mt-1">{today}</p>
      </header>
      <div className="page-content">
        <Suspense fallback={<div className="flex justify-center py-8"><div className="spinner"/></div>}>
          <NewInvoiceForm />
        </Suspense>
      </div>
    </div>
  )
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
