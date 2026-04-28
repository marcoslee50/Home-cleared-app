'use client'
import { motion } from 'framer-motion'
import type { TributeData } from '../WizardShell'

interface Props {
  data: TributeData
  update: (p: Partial<TributeData>) => void
  next: () => void
  back: () => void
}

const RELATIONSHIPS = [
  'Parent', 'Grandparent', 'Spouse / Partner', 'Sibling',
  'Child', 'Friend', 'Aunt / Uncle', 'Other',
]

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[#0D0F14]">{label}</label>
      {hint && <p className="text-xs text-[#94A3B8] leading-relaxed">{hint}</p>}
      {children}
    </div>
  )
}

const inputCls = "w-full border border-[#E8E0D0] rounded-xl px-4 py-3.5 text-sm text-[#0D0F14] bg-white placeholder-[#C5BBB0] focus:outline-none focus:border-[#2D5A45] focus:ring-2 focus:ring-[#2D5A45]/10 transition-all"

export default function StepPersonDetails({ data, update, next, back }: Props) {
  const canContinue = data.name.trim() && data.relationship

  return (
    <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">

        <div>
          <p className="text-[#4A8060] text-xs tracking-[0.14em] uppercase mb-3">Step 2 of 5</p>
          <h2 className="font-serif text-[#0D0F14] leading-tight mb-2" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 400 }}>
            Tell us about them
          </h2>
          <p className="text-[#5A6A7A] text-base leading-relaxed">
            These details shape the voice, tone and framing of the tribute.
          </p>
        </div>

        <div className="space-y-6">
          <Field label="Their full name" hint="This is how they&apos;ll be referred to throughout the tribute.">
            <input
              className={inputCls}
              placeholder="e.g. Margaret Eleanor Davies"
              value={data.name}
              onChange={e => update({ name: e.target.value })}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Year of birth">
              <input
                className={inputCls}
                placeholder="e.g. 1942"
                maxLength={4}
                value={data.birthYear}
                onChange={e => update({ birthYear: e.target.value })}
              />
            </Field>
            <Field label="Year they passed">
              <input
                className={inputCls}
                placeholder="e.g. 2024"
                maxLength={4}
                value={data.passedYear}
                onChange={e => update({ passedYear: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Your relationship to them" hint="Helps us calibrate the tone — a tribute for a parent feels different to one for a friend.">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {RELATIONSHIPS.map(r => (
                <button
                  key={r}
                  onClick={() => update({ relationship: r })}
                  className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-all duration-150 ${
                    data.relationship === r
                      ? 'bg-[#1B3A2D] border-[#2D5A45] text-[#8FBF9F]'
                      : 'bg-white border-[#E8E0D0] text-[#5A6A7A] hover:border-[#8FBF9F]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <div className="flex justify-between pt-4">
          <button onClick={back} className="text-[#94A3B8] text-sm hover:text-[#5A6A7A] transition-colors">← Back</button>
          <button
            onClick={next}
            disabled={!canContinue}
            className="px-8 py-3.5 rounded-full text-sm font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: canContinue ? 'linear-gradient(135deg, #C9973A, #E8B84B)' : '#E8E0D0',
              color: canContinue ? '#0D0F14' : '#94A3B8',
              boxShadow: canContinue ? '0 4px 20px rgba(201,151,58,0.3)' : 'none',
            }}
          >
            Continue →
          </button>
        </div>
      </motion.div>
    </div>
  )
}
