'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Invoice, InvoiceStatus } from '@/lib/invoices'

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; badge: string }> = {
  draft: { label: 'Draft', badge: 'badge-muted' },
  sent: { label: 'Sent', badge: 'badge-blue' },
  viewed: { label: 'Viewed', badge: 'badge-blue' },
  paid: { label: 'Paid ✓', badge: 'badge-green' },
  overdue: { label: 'Overdue', badge: 'badge-alert' },
  cancelled: { label: 'Cancelled', badge: 'badge-muted' },
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filter, setFilter] = useState<InvoiceStatus | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [markingPaid, setMarkingPaid] = useState<string | null>(null)

  useEffect(() => {
    loadInvoices()
  }, [])

  const loadInvoices = async () => {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const [todayRes, outstandingRes] = await Promise.all([
        fetch(`/api/invoices?date=${today}`).then(r => r.json()),
        fetch('/api/invoices?outstanding=true').then(r => r.json()),
      ])
      const all = [...(todayRes.invoices || []), ...(outstandingRes.invoices || [])]
      const seen = new Set<string>()
      const unique = all.filter((inv: Invoice) => {
        if (seen.has(inv.id)) return false
        seen.add(inv.id)
        return true
      })
      setInvoices(
        unique.sort(
          (a: Invoice, b: Invoice) =>
            new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
        )
      )
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const markPaid = async (invoiceId: string) => {
    setMarkingPaid(invoiceId)
    try {
      await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark-paid', invoiceId }),
      })
      setInvoices(prev =>
        prev.map(inv =>
          inv.id === invoiceId
            ? { ...inv, status: 'paid' as InvoiceStatus, paidAt: new Date().toISOString() }
            : inv
        )
      )
    } catch {}
    setMarkingPaid(null)
  }

  const sendReminder = async (inv: Invoice) => {
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reminder', invoiceId: inv.id, pdfUrl: inv.blobUrl || '' }),
      })
      const data = await res.json()
      if (data.requiresCall) {
        alert(
          `📞 CALL REQUIRED: ${inv.clientName} — ${inv.id} — £${inv.total.toFixed(2)} — overdue`
        )
      } else if (data.whatsappLink) {
        window.open(data.whatsappLink, '_blank')
      }
    } catch {}
  }

  const filtered = filter === 'all' ? invoices : invoices.filter(i => i.status === filter)

  const totals = {
    outstanding: invoices
      .filter(i => ['sent', 'viewed', 'overdue'].includes(i.status))
      .reduce((s, i) => s + i.total, 0),
    overdue: invoices.filter(i => i.status === 'overdue').length,
    paid: invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0),
  }

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="app-shell mesh-bg">
      <header className="px-5 pt-12 pb-4">
        <Link href="/dashboard" className="text-text-muted text-sm mb-3 flex items-center gap-1">
          ← Back
        </Link>
        <h1 className="font-display text-2xl font-bold">Invoices</h1>
        <p className="text-text-secondary text-sm mt-1">{today}</p>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="card p-3 text-center">
            <p className="font-display text-lg font-bold" style={{ color: 'var(--status-warn)' }}>
              £{totals.outstanding.toFixed(0)}
            </p>
            <p className="text-text-muted text-xs">Outstanding</p>
          </div>
          <div className="card p-3 text-center">
            <p
              className="font-display text-lg font-bold"
              style={{
                color: totals.overdue > 0 ? 'var(--status-alert)' : 'var(--brand-green)',
              }}
            >
              {totals.overdue}
            </p>
            <p className="text-text-muted text-xs">Overdue</p>
          </div>
          <div className="card p-3 text-center">
            <p className="font-display text-lg font-bold" style={{ color: 'var(--brand-green)' }}>
              £{totals.paid.toFixed(0)}
            </p>
            <p className="text-text-muted text-xs">Paid</p>
          </div>
        </div>
      </header>

      <div className="page-content">
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {(['all', 'sent', 'overdue', 'paid', 'draft'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0"
              style={{
                background: filter === f ? 'var(--brand-green)' : 'var(--surface-card)',
                color: filter === f ? 'white' : 'var(--text-muted)',
                border: `1px solid ${filter === f ? 'var(--brand-green)' : 'var(--surface-border)'}`,
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <Link
          href="/invoices/new"
          className="btn-primary w-full py-3 block text-center text-sm mb-4"
        >
          + Create New Invoice
        </Link>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-text-muted text-sm">
              No invoices {filter !== 'all' ? `with status "${filter}"` : 'yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(inv => (
              <InvoiceCard
                key={inv.id}
                invoice={inv}
                onMarkPaid={() => markPaid(inv.id)}
                isMarkingPaid={markingPaid === inv.id}
                onReminder={() => sendReminder(inv)}
              />
            ))}
          </div>
        )}
      </div>

      <nav className="bottom-nav">
        {[
          { href: '/dashboard', icon: '🏠', label: 'Home' },
          { href: '/plan', icon: '🗺️', label: 'Plan' },
          { href: '/live', icon: '⚡', label: 'Live' },
          { href: '/barry', icon: '💬', label: 'Barry' },
          { href: '/invoices', icon: '🧾', label: 'Invoices' },
        ].map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${item.href === '/invoices' ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}

function InvoiceCard({
  invoice,
  onMarkPaid,
  isMarkingPaid,
  onReminder,
}: {
  invoice: Invoice
  onMarkPaid: () => void
  isMarkingPaid: boolean
  onReminder: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const cfg = STATUS_CONFIG[invoice.status]
  const isOverdue = invoice.status === 'overdue'
  const daysSinceDueValue = isOverdue
    ? Math.floor((Date.now() - new Date(invoice.dueDate).getTime()) / 86400000)
    : 0

  return (
    <div
      className="card overflow-hidden"
      style={isOverdue ? { borderColor: 'var(--status-alert)' } : {}}
    >
      <div className="px-4 py-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-text-primary">{invoice.clientName}</h3>
              <span className={`badge ${cfg.badge}`}>{cfg.label}</span>
            </div>
            <p className="text-text-muted text-xs mt-0.5">
              {invoice.id} · {new Date(invoice.jobDate).toLocaleDateString('en-GB')}
            </p>
            {isOverdue && (
              <p className="text-xs mt-1" style={{ color: 'var(--status-alert)' }}>
                {daysSinceDueValue} days overdue
              </p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-display text-lg font-bold" style={{ color: 'var(--brand-green)' }}>
              £{invoice.total.toFixed(2)}
            </p>
            <p className="text-text-muted text-xs">{expanded ? '▲' : '▼'}</p>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-surface-border pt-3 space-y-3">
          <div className="space-y-1">
            {invoice.lineItems.map((item, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-text-secondary">{item.description}</span>
                <span className="text-text-muted">£{item.total.toFixed(2)}</span>
              </div>
            ))}
            {invoice.vatAmount > 0 && (
              <div className="flex justify-between text-xs border-t border-surface-border pt-1 mt-1">
                <span className="text-text-muted">VAT ({Math.round(invoice.vatRate * 100)}%)</span>
                <span className="text-text-muted">£{invoice.vatAmount.toFixed(2)}</span>
              </div>
            )}
          </div>

          <p className="text-text-muted text-xs">
            Due:{' '}
            {new Date(invoice.dueDate).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>

          <div className="flex gap-2 flex-wrap">
            {invoice.whatsappLink && (
              <a
                href={invoice.whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary flex-1 py-2 text-xs text-center"
                style={{ background: '#25D366' }}
              >
                💬 WhatsApp
              </a>
            )}
            {['sent', 'viewed', 'overdue'].includes(invoice.status) && (
              <button onClick={onReminder} className="btn-secondary flex-1 py-2 text-xs">
                Send reminder
              </button>
            )}
            {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
              <button
                onClick={onMarkPaid}
                disabled={isMarkingPaid}
                className="btn-primary flex-1 py-2 text-xs"
              >
                {isMarkingPaid ? '...' : '✓ Mark paid'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
