'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { ClientProfile } from '@/lib/client-profiles'

export default function ClientsPage() {
  const [profiles, setProfiles] = useState<ClientProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetch('/api/clients')
      .then(r => r.json())
      .then(d => setProfiles(d.profiles || []))
      .catch(() => setProfiles([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return profiles
    const q = query.toLowerCase()
    return profiles.filter(p =>
      p.clientName.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q)
    )
  }, [profiles, query])

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
          className="w-full bg-surface-muted rounded-lg p-3 text-sm text-text-primary border border-surface-border focus:border-brand-green focus:outline-none mb-4"
        />

        {loading ? (
          <div className="flex justify-center py-8"><div className="spinner"/></div>
        ) : filtered.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-text-muted text-sm">{query ? 'No matches' : 'No clients yet - they will appear here once jobs complete.'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(p => (
              <Link key={p.clientName} href={`/clients/${encodeURIComponent(p.clientName)}`} className="block card card-hover p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-text-primary truncate">{p.clientName}</h3>
                      {p.isMonthlyContract && <span className="badge badge-green">Contract</span>}
                      {p.dogOnSite && <span className="badge badge-warn">Dog</span>}
                    </div>
                    <p className="text-text-muted text-xs truncate mt-0.5">{p.address || 'No address'}</p>
                    <p className="text-text-muted text-xs mt-1">
                      {p.visitCount} visit{p.visitCount === 1 ? '' : 's'} - £{p.totalSpend.toFixed(0)} lifetime
                      {p.lastVisit && <> - last {new Date(p.lastVisit).toLocaleDateString('en-GB')}</>}
                    </p>
                  </div>
                  <span className="text-text-muted text-lg">{'>'}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
