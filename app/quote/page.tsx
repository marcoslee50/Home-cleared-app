'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { WGP_PRICING, ServicePrice, formatServicePrice, buildQuoteLink, buildQuoteWhatsAppMessage } from '@/lib/pricing'
import { ClientProfile } from '@/lib/client-profiles'

export default function QuotePage() {
  const [profiles, setProfiles] = useState<ClientProfile[]>([])
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [serviceId, setServiceId] = useState<string>('fullMaintenance')
  const [scopeNotes, setScopeNotes] = useState('')
  const [proposedDate, setProposedDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 3)
    return d.toISOString().split('T')[0]
  })
  const [proposedStart, setProposedStart] = useState('10:00')
  const [overridePrice, setOverridePrice] = useState<number | null>(null)
  const [creatingEvent, setCreatingEvent] = useState(false)
  const [eventCreated, setEventCreated] = useState<{ eventId: string; htmlLink: string } | null>(null)

  useEffect(() => {
    fetch('/api/clients')
      .then(r => r.json())
      .then(d => setProfiles(d.profiles || []))
      .catch(() => {})
  }, [])

  const service: ServicePrice = WGP_PRICING[serviceId]
  const effectivePrice = overridePrice ?? service.price ?? service.priceFrom ?? 0

  const onSelectClient = (name: string) => {
    setClientName(name)
    const p = profiles.find(x => x.clientName === name)
    if (p) {
      setClientPhone(p.phone || '')
      setClientAddress(p.address || '')
    }
  }

  const message = buildQuoteWhatsAppMessage({
    clientName: clientName || 'there',
    serviceLabel: service.label,
    price: effectivePrice,
    unit: service.unit,
    scopeNotes,
    proposedDate: new Date(proposedDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
  })
  const waLink = buildQuoteLink({
    clientName: clientName || 'there',
    clientPhone,
    serviceLabel: service.label,
    price: effectivePrice,
    unit: service.unit,
    scopeNotes,
    proposedDate: new Date(proposedDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
  })

  const createCalendarJob = async () => {
    if (!clientName) return
    setCreatingEvent(true)
    try {
      const startISO = `${proposedDate}T${proposedStart}:00`
      const [hh, mm] = proposedStart.split(':').map(Number)
      const endHour = hh + 1
      const endISO = `${proposedDate}T${String(endHour).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`
      const res = await fetch('/api/calendar/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName,
          address: clientAddress,
          serviceLabel: service.label,
          emoji: '📄',
          price: effectivePrice,
          scopeNotes,
          startISO,
          endISO,
        }),
      })
      const data = await res.json()
      if (res.ok) setEventCreated(data)
      else alert(`Failed to create event: ${data.error || 'unknown'}`)
    } catch (err) {
      alert(`Error: ${String(err)}`)
    }
    setCreatingEvent(false)
  }

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="app-shell mesh-bg">
      <header className="px-5 pt-12 pb-4">
        <Link href="/dashboard" className="text-text-muted text-sm mb-3 flex items-center gap-1">{'<-'} Back</Link>
        <h1 className="font-display text-2xl font-bold">Quote Builder</h1>
        <p className="text-text-secondary text-sm mt-1">{today}</p>
      </header>

      <div className="page-content space-y-4">

        <div className="card p-4 space-y-3">
          <p className="text-text-muted text-xs font-mono uppercase tracking-widest">Client</p>

          {profiles.length > 0 && (
            <select
              onChange={e => onSelectClient(e.target.value)}
              value={clientName}
              className="w-full bg-surface-muted rounded-lg p-2 text-sm text-text-primary border border-surface-border focus:border-brand-green focus:outline-none"
            >
              <option value="">-- New client --</option>
              {profiles.map(p => (
                <option key={p.clientName} value={p.clientName}>{p.clientName}</option>
              ))}
            </select>
          )}

          <input
            value={clientName}
            onChange={e => setClientName(e.target.value)}
            placeholder="Client name *"
            className="w-full bg-surface-muted rounded-lg p-2 text-sm text-text-primary border border-surface-border focus:border-brand-green focus:outline-none"
          />
          <input
            value={clientPhone}
            onChange={e => setClientPhone(e.target.value)}
            placeholder="Phone (for WhatsApp)"
            type="tel"
            className="w-full bg-surface-muted rounded-lg p-2 text-sm text-text-primary border border-surface-border focus:border-brand-green focus:outline-none"
          />
          <input
            value={clientAddress}
            onChange={e => setClientAddress(e.target.value)}
            placeholder="Address"
            className="w-full bg-surface-muted rounded-lg p-2 text-sm text-text-primary border border-surface-border focus:border-brand-green focus:outline-none"
          />
        </div>

        <div className="card p-4 space-y-3">
          <p className="text-text-muted text-xs font-mono uppercase tracking-widest">Service</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(WGP_PRICING).map(s => (
              <button
                key={s.id}
                onClick={() => { setServiceId(s.id); setOverridePrice(null) }}
                className="rounded-lg p-3 text-left text-sm transition-all"
                style={{
                  background: serviceId === s.id ? 'var(--brand-green)' : 'var(--surface-muted)',
                  color: serviceId === s.id ? 'white' : 'var(--text-secondary)',
                  border: `1px solid ${serviceId === s.id ? 'var(--brand-green)' : 'var(--surface-border)'}`,
                }}
              >
                <p className="font-semibold text-xs">{s.label}</p>
                <p className="text-xs opacity-80 mt-0.5">{formatServicePrice(s)}</p>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-text-muted text-xs">Price £</span>
            <input
              value={effectivePrice}
              onChange={e => setOverridePrice(Number(e.target.value) || 0)}
              type="number"
              min="0"
              step="5"
              className="flex-1 bg-surface-muted rounded-lg p-2 text-sm text-text-primary border border-surface-border focus:border-brand-green focus:outline-none"
            />
            <span className="text-text-muted text-xs">per {service.unit}</span>
          </div>

          <textarea
            value={scopeNotes}
            onChange={e => setScopeNotes(e.target.value)}
            placeholder="Scope / what's included (e.g. 'lawn, borders, hedge front')"
            rows={2}
            className="w-full bg-surface-muted rounded-lg p-2 text-sm text-text-primary border border-surface-border focus:border-brand-green focus:outline-none resize-none"
          />
        </div>

        <div className="card p-4 space-y-3">
          <p className="text-text-muted text-xs font-mono uppercase tracking-widest">Proposed start</p>
          <div className="flex gap-2">
            <input
              type="date"
              value={proposedDate}
              onChange={e => setProposedDate(e.target.value)}
              className="flex-1 bg-surface-muted rounded-lg p-2 text-sm text-text-primary border border-surface-border focus:border-brand-green focus:outline-none"
            />
            <input
              type="time"
              value={proposedStart}
              onChange={e => setProposedStart(e.target.value)}
              className="w-28 bg-surface-muted rounded-lg p-2 text-sm text-text-primary border border-surface-border focus:border-brand-green focus:outline-none"
            />
          </div>
        </div>

        <div className="card p-4">
          <p className="text-text-muted text-xs font-mono uppercase tracking-widest mb-2">WhatsApp preview</p>
          <p className="text-text-secondary text-sm whitespace-pre-wrap rounded-lg px-3 py-2" style={{ background: 'var(--surface-muted)' }}>
            {message}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary py-3 text-sm text-center"
            style={!clientName ? { opacity: 0.4, pointerEvents: 'none' } : { background: '#25D366' }}
          >
            Send Quote
          </a>
          <button
            onClick={createCalendarJob}
            disabled={!clientName || creatingEvent || !!eventCreated}
            className="btn-secondary py-3 text-sm"
          >
            {eventCreated ? 'Calendar event created' : creatingEvent ? 'Creating...' : 'Convert to Calendar Job'}
          </button>
        </div>

        {eventCreated && (
          <div className="card p-3" style={{ borderColor: 'var(--brand-green)' }}>
            <p className="text-text-secondary text-xs">
              Tentative event added to WGP calendar.{' '}
              {eventCreated.htmlLink && (
                <a href={eventCreated.htmlLink} target="_blank" rel="noopener noreferrer" className="text-brand-green underline">Open in Google Calendar</a>
              )}
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
