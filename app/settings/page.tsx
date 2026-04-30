'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  AppSettings,
  FacebookTemplates,
  BarrySettings,
  InvoiceSettings,
  BarryDebtNote,
  DEFAULT_FB_TEMPLATES,
  DEFAULT_BARRY,
  DEFAULT_INVOICE,
  DEFAULT_BARRY_DEBT_NOTE,
} from '@/lib/settings'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [fbTemplates, setFbTemplates] = useState<FacebookTemplates>(DEFAULT_FB_TEMPLATES)
  const [barry, setBarry] = useState<BarrySettings>(DEFAULT_BARRY)
  const [invoice, setInvoice] = useState<InvoiceSettings>(DEFAULT_INVOICE)
  const [reviewLink, setReviewLink] = useState('')
  const [barryDebtNote, setBarryDebtNote] = useState<BarryDebtNote>(DEFAULT_BARRY_DEBT_NOTE)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>('default')

  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({})

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((s: Required<AppSettings>) => {
        setFbTemplates(s.fbTemplates)
        setBarry(s.barry)
        setInvoice(s.invoice)
        setReviewLink(s.reviewLink || '')
        setBarryDebtNote(s.barryDebtNote)
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    if (typeof Notification === 'undefined') setNotifPermission('unsupported')
    else setNotifPermission(Notification.permission)
  }, [])

  const saveSection = async (section: string, value: unknown) => {
    setSaveStates(prev => ({ ...prev, [section]: 'saving' }))
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, value }),
      })
      setSaveStates(prev => ({ ...prev, [section]: res.ok ? 'saved' : 'error' }))
      setTimeout(() => setSaveStates(prev => ({ ...prev, [section]: 'idle' })), 2000)
    } catch {
      setSaveStates(prev => ({ ...prev, [section]: 'error' }))
    }
  }

  const requestNotif = async () => {
    if (typeof Notification === 'undefined') return
    const result = await Notification.requestPermission()
    setNotifPermission(result)
  }

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="app-shell mesh-bg">
      <header className="px-5 pt-12 pb-4">
        <Link href="/dashboard" className="text-text-muted text-sm mb-3 flex items-center gap-1">{'<-'} Back</Link>
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        <p className="text-text-secondary text-sm mt-1">{today}</p>
      </header>

      {loading ? (
        <div className="page-content flex justify-center py-16"><div className="spinner"/></div>
      ) : (
        <div className="page-content space-y-4">

          {/* A. Facebook templates */}
          <section className="card p-4 space-y-3">
            <p className="text-text-muted text-xs font-mono uppercase tracking-widest">Facebook templates</p>
            <p className="text-text-muted text-xs">
              Variables: {'{{area}} {{jobType}} {{emoji}} {{outcome}} {{phone}} {{website}}'}
            </p>
            {(['after-short','before-after','seasonal'] as const).map(key => (
              <div key={key}>
                <label className="text-text-secondary text-xs block mb-1">{key}</label>
                <textarea
                  value={fbTemplates[key]}
                  onChange={e => setFbTemplates({ ...fbTemplates, [key]: e.target.value })}
                  rows={6}
                  className="w-full bg-surface-muted rounded-lg p-2 text-xs text-text-primary border border-surface-border focus:border-brand-green focus:outline-none resize-none font-mono"
                />
              </div>
            ))}
            <SaveButton state={saveStates.fbTemplates} onClick={() => saveSection('fbTemplates', fbTemplates)} />
          </section>

          {/* B. Business details (read-only) */}
          <section className="card p-4 space-y-2">
            <p className="text-text-muted text-xs font-mono uppercase tracking-widest">Business details</p>
            <p className="text-text-muted text-xs">Update in Vercel environment variables - phone, email, website, address.</p>
            <div className="text-xs text-text-secondary space-y-0.5">
              <p>Phone: {process.env.NEXT_PUBLIC_INVOICE_PHONE || '(server-side env)'}</p>
              <p>Website: {process.env.NEXT_PUBLIC_INVOICE_WEBSITE || '(server-side env)'}</p>
            </div>
          </section>

          {/* C. Barry defaults */}
          <section className="card p-4 space-y-3">
            <p className="text-text-muted text-xs font-mono uppercase tracking-widest">Barry defaults</p>
            <div>
              <label className="text-text-secondary text-xs block mb-1">Pickup time</label>
              <input
                type="time"
                value={barry.defaultPickupTime}
                onChange={e => setBarry({ ...barry, defaultPickupTime: e.target.value })}
                className="w-full bg-surface-muted rounded-lg p-2 text-sm text-text-primary border border-surface-border focus:border-brand-green focus:outline-none"
              />
            </div>
            <div>
              <label className="text-text-secondary text-xs block mb-1">Drop-off time</label>
              <input
                type="time"
                value={barry.defaultDropoffTime}
                onChange={e => setBarry({ ...barry, defaultDropoffTime: e.target.value })}
                className="w-full bg-surface-muted rounded-lg p-2 text-sm text-text-primary border border-surface-border focus:border-brand-green focus:outline-none"
              />
            </div>
            <div>
              <label className="text-text-secondary text-xs block mb-1">Barry's phone (for briefing share)</label>
              <input
                type="tel"
                value={barry.phone}
                onChange={e => setBarry({ ...barry, phone: e.target.value })}
                className="w-full bg-surface-muted rounded-lg p-2 text-sm text-text-primary border border-surface-border focus:border-brand-green focus:outline-none"
              />
            </div>
            <SaveButton state={saveStates.barry} onClick={() => saveSection('barry', barry)} />
          </section>

          {/* D. Invoice */}
          <section className="card p-4 space-y-3">
            <p className="text-text-muted text-xs font-mono uppercase tracking-widest">Invoice settings</p>
            <p className="text-text-muted text-xs">
              These override the env-var defaults at runtime. Leave blank to use the env values.
            </p>
            <input value={invoice.bankName} onChange={e => setInvoice({ ...invoice, bankName: e.target.value })}
              placeholder="Bank name" className="w-full bg-surface-muted rounded-lg p-2 text-sm text-text-primary border border-surface-border focus:border-brand-green focus:outline-none" />
            <input value={invoice.sortCode} onChange={e => setInvoice({ ...invoice, sortCode: e.target.value })}
              placeholder="Sort code" className="w-full bg-surface-muted rounded-lg p-2 text-sm text-text-primary border border-surface-border focus:border-brand-green focus:outline-none" />
            <input value={invoice.accountNumber} onChange={e => setInvoice({ ...invoice, accountNumber: e.target.value })}
              placeholder="Account number" className="w-full bg-surface-muted rounded-lg p-2 text-sm text-text-primary border border-surface-border focus:border-brand-green focus:outline-none" />
            <input value={invoice.prefix} onChange={e => setInvoice({ ...invoice, prefix: e.target.value })}
              placeholder="Invoice prefix" className="w-full bg-surface-muted rounded-lg p-2 text-sm text-text-primary border border-surface-border focus:border-brand-green focus:outline-none" />
            <div>
              <label className="text-text-secondary text-xs block mb-1">Payment terms (days)</label>
              <input type="number" min="1" value={invoice.paymentTerms} onChange={e => setInvoice({ ...invoice, paymentTerms: Number(e.target.value) })}
                className="w-full bg-surface-muted rounded-lg p-2 text-sm text-text-primary border border-surface-border focus:border-brand-green focus:outline-none" />
            </div>
            <SaveButton state={saveStates.invoice} onClick={() => saveSection('invoice', invoice)} />
          </section>

          {/* E. Google review link */}
          <section className="card p-4 space-y-3">
            <p className="text-text-muted text-xs font-mono uppercase tracking-widest">Google review link</p>
            <p className="text-text-muted text-xs">
              Direct link from GBP {'>'}  Get more reviews. Overrides NEXT_PUBLIC_GOOGLE_REVIEW_LINK.
            </p>
            <input value={reviewLink} onChange={e => setReviewLink(e.target.value)}
              placeholder="https://g.page/r/..."
              className="w-full bg-surface-muted rounded-lg p-2 text-sm text-text-primary border border-surface-border focus:border-brand-green focus:outline-none" />
            <SaveButton state={saveStates.reviewLink} onClick={() => saveSection('reviewLink', reviewLink)} />
          </section>

          {/* F. PIN change (note only - no Vercel API integration yet) */}
          <section className="card p-4 space-y-2">
            <p className="text-text-muted text-xs font-mono uppercase tracking-widest">PIN</p>
            <p className="text-text-muted text-xs">
              The app PIN is set via the APP_PIN environment variable. Change it in
              Vercel dashboard {'>'} Settings {'>'} Environment Variables, then redeploy.
            </p>
          </section>

          {/* G. Notifications */}
          <section className="card p-4 space-y-2">
            <p className="text-text-muted text-xs font-mono uppercase tracking-widest">Notifications</p>
            {notifPermission === 'unsupported' ? (
              <p className="text-text-muted text-xs">This browser does not support notifications.</p>
            ) : notifPermission === 'granted' ? (
              <p className="text-text-secondary text-xs">Notifications enabled. GPS arrival alerts will fire.</p>
            ) : notifPermission === 'denied' ? (
              <p className="text-text-muted text-xs">
                Notifications denied. Re-enable in your browser settings (lock icon next to the URL) to get GPS arrival alerts.
              </p>
            ) : (
              <button onClick={requestNotif} className="btn-primary py-2 text-sm w-full">
                Enable notifications
              </button>
            )}
          </section>

          {/* H. Barry private note */}
          <section className="card p-4 space-y-2" style={{ borderColor: 'var(--surface-border)' }}>
            <p className="text-text-muted text-xs font-mono uppercase tracking-widest">Barry - private note</p>
            <p className="text-text-muted text-xs">
              Visible only on this page. Never shared with Barry, never shown elsewhere.
            </p>
            <textarea
              value={barryDebtNote.text}
              onChange={e => setBarryDebtNote({ ...barryDebtNote, text: e.target.value })}
              rows={4}
              className="w-full bg-surface-muted rounded-lg p-2 text-xs text-text-primary border border-surface-border focus:border-brand-green focus:outline-none resize-none font-mono"
            />
            <SaveButton
              state={saveStates.barryDebtNote}
              onClick={() => saveSection('barryDebtNote', { ...barryDebtNote, updatedAt: new Date().toISOString() })}
            />
          </section>

        </div>
      )}
    </div>
  )
}

function SaveButton({ state, onClick }: { state?: SaveState; onClick: () => void }) {
  const label =
    state === 'saving' ? 'Saving...' :
    state === 'saved'  ? 'Saved' :
    state === 'error'  ? 'Save failed - retry' :
    'Save'
  return (
    <button onClick={onClick} className="btn-primary py-2 text-sm w-full"
      style={state === 'saved' ? { background: 'var(--brand-teal)' } : state === 'error' ? { background: 'var(--status-alert)' } : {}}>
      {label}
    </button>
  )
}
