'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ClientProfile } from '@/lib/client-profiles'
import { HealthAssessment, HealthStatus } from '@/lib/client-health'

interface AssessedClient {
  clientName: string
  address: string
  phone?: string
  visitCount: number
  lastVisit: string
  health: HealthAssessment
}

function ClientsList() {
  const params = useSearchParams()
  const initialFilter = (params.get('health') as HealthStatus | null) ?? null

  const [profiles, setProfiles] = useState<ClientProfile[]>([])
  const [healthByName, setHealthByName] = useState<Record<string, HealthAssessment>>({})
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [healthFilter, setHealthFilter] = useState<HealthStatus | null>(initialFilter)

  useEffect(() => {
    Promise.all([
      fetch('/api/clients').then(r => r.json()).catch(() => ({ profiles: [] })),
      fetch('/api/client-health').then(r => r.json()).catch(() => ({ clients: [] })),
    ]).then(([c, h]) => {
      setProfiles(c.profiles || [])
      const map: Record<string, HealthAssessment> = {}
      for (const a of (h.clients || []) as AssessedClient[]) {
        map[a.clientName] = a.health
      }
      setHealthByName(map)
    }).finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let list = profiles
    if (healthFilter) {
      list = list.filter(p => healthByName[p.clientName]?.status === healthFilter)
    }
    if (!query.trim()) return list
    const q = query.toLowerCase()
    return list.filter(p =>
      p.clientName.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q)
    )
  }, [profiles, healthByName, query, healthFilter])

  const buildSuggestedAction = (p: ClientProfile, h?: HealthAssessment) => {
    if (!h) return null
    if (h.status === 'amber') {
      const phone = p.phone?.replace(/[^0-9+]/g, '')
      const fp = phone?.startsWith('0') ? '44' + phone.slice(1) : phone
      const text = `Hi ${p.clientName.split(' ')[0]}, just checking in - hope all's well. Anything you need looking at in the garden? - Marcos`
      return { label: 'Check-in WhatsApp', href: fp ? `https://wa.me/${fp}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}` }
    }
    if (h.status === 'red' && p.phone) {
      return { label: `Call ${p.clientName.split(' ')[0]}`, href: `tel:${p.phone.replace(/[^0-9+]/g, '')}` }
    }
    return null
  }

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="app-shell mesh-bg">
      <header className="px-5 pt-12 pb-4">
        <Link href="/dashboard" className="text-text-muted text-sm mb-3 flex items-center gap-1">{'<-'} Back</Link>
        <h1 className="font-display text-2xl font-bold">Clients</h1>
        <p className="text-text-secondary text-sm mt-1">{today}</p>
      </header>

      <div className="page-content">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by name or address"
          className="w-full bg-surface-muted rounded-lg p-3 text-sm text-text-primary border border-surface-border focus:border-brand-green focus:outline-none mb-3"
        />

        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {([null, 'green', 'amber', 'red', 'new'] as const).map(f => (
            <button
              key={String(f)}
              onClick={() => setHealthFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0"
              style={{
                background: healthFilter === f ? 'var(--brand-green)' : 'var(--surface-card)',
                color: healthFilter === f ? 'white' : 'var(--text-muted)',
                border: `1px solid ${healthFilter === f ? 'var(--brand-green)' : 'var(--surface-border)'}`,
              }}
            >
              {f === null ? 'All' : f === 'green' ? 'All good' : f === 'amber' ? 'Check in' : f === 'red' ? 'At risk' : 'New'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><div className="spinner"/></div>
        ) : filtered.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-text-muted text-sm">{query ? 'No matches' : 'No clients yet - they will appear here once jobs complete.'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(p => {
              const h = healthByName[p.clientName]
              const action = buildSuggestedAction(p, h)
              const dot = h?.status === 'green' ? 'var(--brand-green)' :
                          h?.status === 'amber' ? 'var(--status-warn)' :
                          h?.status === 'red'   ? 'var(--status-alert)' :
                                                  'var(--text-muted)'
              return (
                <div key={p.clientName} className="card card-hover p-4">
                  <Link href={`/clients/${encodeURIComponent(p.clientName)}`} className="block">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dot }}/>
                          <h3 className="font-semibold text-sm text-text-primary truncate">{p.clientName}</h3>
                          {p.isMonthlyContract && <span className="badge badge-green">Contract</span>}
                          {p.dogOnSite && <span className="badge badge-warn">Dog</span>}
                        </div>
                        <p className="text-text-muted text-xs truncate mt-0.5">{p.address || 'No address'}</p>
                        <p className="text-text-muted text-xs mt-1">
                          {p.visitCount} visit{p.visitCount === 1 ? '' : 's'} - £{p.totalSpend.toFixed(0)} lifetime
                          {p.lastVisit && <> - last {new Date(p.lastVisit).toLocaleDateString('en-GB')}</>}
                        </p>
                        {h && h.reasons.length > 0 && h.status !== 'green' && (
                          <p className="text-xs mt-1" style={{ color: dot }}>{h.reasons[0]}</p>
                        )}
                      </div>
                      <span className="text-text-muted text-lg">{'>'}</span>
                    </div>
                  </Link>
                  {action && (
                    <a href={action.href} target="_blank" rel="noopener noreferrer"
                      className="btn-primary block w-full mt-3 py-2 text-xs text-center"
                      style={h?.status === 'red' ? { background: 'var(--status-alert)' } : { background: 'var(--status-warn)' }}>
                      {action.label}
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ClientsPage() {
  return (
    <Suspense fallback={<div className="page-content flex justify-center py-16"><div className="spinner"/></div>}>
      <ClientsList />
    </Suspense>
  )
}
