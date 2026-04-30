'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ClientProfile } from '@/lib/client-profiles'

export default function ClientDetailPage() {
  const params = useParams<{ name: string }>()
  const name = decodeURIComponent(params.name)
  const [profile, setProfile] = useState<ClientProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<ClientProfile | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/clients?name=${encodeURIComponent(name)}`)
      .then(r => r.ok ? r.json() : null)
      .then(p => { setProfile(p); setDraft(p) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [name])

  const save = async () => {
    if (!draft) return
    setSaving(true)
    try {
      await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', profile: draft }),
      })
      setProfile(draft)
      setEditing(false)
    } catch {}
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="app-shell mesh-bg">
        <div className="page-content flex justify-center py-16"><div className="spinner"/></div>
      </div>
    )
  }

  if (!profile || !draft) {
    return (
      <div className="app-shell mesh-bg">
        <header className="px-5 pt-12 pb-4">
          <Link href="/clients" className="text-text-muted text-sm mb-3 flex items-center gap-1">{'<-'} Clients</Link>
          <h1 className="font-display text-2xl font-bold">{name}</h1>
        </header>
        <div className="page-content">
          <div className="card p-8 text-center">
            <p className="text-text-muted text-sm">No profile yet for this client.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell mesh-bg">
      <header className="px-5 pt-12 pb-4">
        <Link href="/clients" className="text-text-muted text-sm mb-3 flex items-center gap-1">{'<-'} Clients</Link>
        <h1 className="font-display text-2xl font-bold">{profile.clientName}</h1>
        <p className="text-text-secondary text-sm mt-1">{profile.address || 'No address'}</p>
      </header>

      <div className="page-content space-y-4">

        <div className="grid grid-cols-3 gap-2">
          <div className="card p-3 text-center">
            <p className="font-display text-lg font-bold" style={{ color: 'var(--brand-green)' }}>{profile.visitCount}</p>
            <p className="text-text-muted text-xs">Visits</p>
          </div>
          <div className="card p-3 text-center">
            <p className="font-display text-lg font-bold" style={{ color: 'var(--brand-blue-light)' }}>£{profile.totalSpend.toFixed(0)}</p>
            <p className="text-text-muted text-xs">Lifetime</p>
          </div>
          <div className="card p-3 text-center">
            <p className="font-display text-lg font-bold text-text-secondary">{profile.averageJobDuration || '-'}</p>
            <p className="text-text-muted text-xs">Avg min</p>
          </div>
        </div>

        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-text-muted text-xs font-mono uppercase tracking-widest">Property notes</p>
            {!editing && (
              <button onClick={() => setEditing(true)} className="text-xs text-text-secondary hover:text-text-primary">Edit</button>
            )}
          </div>

          {editing ? (
            <div className="space-y-3">
              <input
                value={draft.phone || ''}
                onChange={e => setDraft({ ...draft, phone: e.target.value })}
                placeholder="Phone (for WhatsApp)"
                className="w-full bg-surface-muted rounded-lg p-2 text-sm text-text-primary border border-surface-border focus:border-brand-green focus:outline-none"
                type="tel"
              />
              <textarea
                value={draft.accessNotes}
                onChange={e => setDraft({ ...draft, accessNotes: e.target.value })}
                placeholder="Access notes (gate code, key safe, side gate...)"
                rows={2}
                className="w-full bg-surface-muted rounded-lg p-2 text-sm text-text-primary border border-surface-border focus:border-brand-green focus:outline-none resize-none"
              />
              <textarea
                value={draft.parkingNotes}
                onChange={e => setDraft({ ...draft, parkingNotes: e.target.value })}
                placeholder="Parking notes"
                rows={2}
                className="w-full bg-surface-muted rounded-lg p-2 text-sm text-text-primary border border-surface-border focus:border-brand-green focus:outline-none resize-none"
              />
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={draft.dogOnSite}
                  onChange={e => setDraft({ ...draft, dogOnSite: e.target.checked })}
                />
                Dog on site
              </label>
              <textarea
                value={draft.notes}
                onChange={e => setDraft({ ...draft, notes: e.target.value })}
                placeholder="Freeform notes"
                rows={3}
                className="w-full bg-surface-muted rounded-lg p-2 text-sm text-text-primary border border-surface-border focus:border-brand-green focus:outline-none resize-none"
              />
              <div className="flex gap-2">
                <button onClick={save} disabled={saving} className="btn-primary flex-1 py-2 text-sm">
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => { setDraft(profile); setEditing(false) }} className="btn-secondary px-4 py-2 text-sm">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              {profile.phone && <p className="text-text-secondary">Phone: {profile.phone}</p>}
              {profile.accessNotes && <p className="text-text-secondary">Access: {profile.accessNotes}</p>}
              {profile.parkingNotes && <p className="text-text-secondary">Parking: {profile.parkingNotes}</p>}
              {profile.dogOnSite && <p className="text-text-secondary"><span className="badge badge-warn">Dog on site</span></p>}
              {profile.notes && <p className="text-text-muted whitespace-pre-wrap">{profile.notes}</p>}
              {!profile.phone && !profile.accessNotes && !profile.parkingNotes && !profile.notes && (
                <p className="text-text-muted text-xs italic">No notes yet - tap Edit to add.</p>
              )}
            </div>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-border">
            <p className="text-text-muted text-xs font-mono uppercase tracking-widest">Job history</p>
          </div>
          {profile.jobHistory.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-text-muted text-sm">No jobs logged yet.</p>
            </div>
          ) : (
            profile.jobHistory.slice().reverse().map((entry, i) => (
              <div key={i} className="px-4 py-3 border-b border-surface-border last:border-0">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-text-primary text-sm">{entry.jobType}</p>
                    <p className="text-text-muted text-xs">
                      {new Date(entry.date).toLocaleDateString('en-GB')} - {entry.duration}m - {entry.operative}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-semibold" style={{ color: 'var(--brand-green)' }}>£{entry.price.toFixed(0)}</span>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  )
}
