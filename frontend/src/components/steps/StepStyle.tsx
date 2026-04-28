'use client'
import { motion } from 'framer-motion'
import type { TributeData } from '../WizardShell'

interface Props {
  data: TributeData
  update: (p: Partial<TributeData>) => void
  next: () => void
  back: () => void
}

const STYLES = [
  {
    id: 'cinematic' as const,
    label: 'Cinematic',
    emoji: '🎬',
    desc: 'Wide shots, slow pans, dramatic lighting. A film of a life well-lived. Best for someone with a broad life story and strong visual media.',
    mood: 'Epic · Majestic · Timeless',
  },
  {
    id: 'documentary' as const,
    label: 'Documentary',
    emoji: '📽️',
    desc: 'Authentic, honest, unflinching. Interview-style narration with archival photos. Best when the story is nuanced and complex.',
    mood: 'True · Thoughtful · Human',
  },
  {
    id: 'intimate' as const,
    label: 'Intimate',
    emoji: '🕯️',
    desc: 'Quiet, close, personal. Soft light, whispered narrative, a tribute that feels like sitting together one last time.',
    mood: 'Tender · Still · Sacred',
  },
  {
    id: 'celebratory' as const,
    label: 'Celebratory',
    emoji: '🌟',
    desc: 'Joyful, warm, full of laughter. A tribute that celebrates who they were — not what was lost but what was given.',
    mood: 'Joyful · Bright · Full of life',
  },
]

const TONES = [
  { id: 'warm' as const,      label: 'Warm & loving',     desc: 'Gentle, affectionate narration' },
  { id: 'reflective' as const, label: 'Reflective',        desc: 'Contemplative, philosophical tone' },
  { id: 'joyful' as const,    label: 'Joyful & uplifting', desc: 'Celebratory, light energy' },
  { id: 'reverent' as const,  label: 'Reverent & solemn',  desc: 'Dignified, respectful weight' },
]

const MUSIC = [
  { id: 'orchestral' as const, label: 'Orchestral',  desc: 'Full strings, emotional depth' },
  { id: 'acoustic' as const,   label: 'Acoustic',    desc: 'Guitar, piano, intimate warmth' },
  { id: 'ambient' as const,    label: 'Ambient',     desc: 'Subtle, spacious, meditative' },
  { id: 'silence' as const,    label: 'Voice only',  desc: 'No music — just their story' },
]

function SelectCard<T extends string>({
  item, selected, onSelect,
}: { item: { id: T; label: string; emoji?: string; desc: string; mood?: string }; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
        selected
          ? 'border-[#2D5A45] bg-[#1B3A2D]/8 shadow-sm'
          : 'border-[#E8E0D0] bg-white hover:border-[#8FBF9F]'
      }`}
    >
      {item.emoji && <span className="text-2xl mb-2 block">{item.emoji}</span>}
      <div className="flex items-center justify-between">
        <span className={`font-medium text-sm ${selected ? 'text-[#1B3A2D]' : 'text-[#0D0F14]'}`}>{item.label}</span>
        {selected && <span className="text-[#4A8060] text-xs">✓</span>}
      </div>
      <p className="text-[#94A3B8] text-xs mt-1 leading-relaxed">{item.desc}</p>
      {item.mood && <p className="text-[#4A8060] text-[10px] mt-2 tracking-wide">{item.mood}</p>}
    </button>
  )
}

export default function StepStyle({ data, update, next, back }: Props) {
  return (
    <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">

        <div>
          <p className="text-[#4A8060] text-xs tracking-[0.14em] uppercase mb-3">Step 4 of 5</p>
          <h2 className="font-serif text-[#0D0F14] leading-tight mb-2" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 400 }}>
            How should it feel?
          </h2>
          <p className="text-[#5A6A7A] text-base leading-relaxed max-w-lg">
            Choose the visual style, emotional tone, and soundtrack. You can change these any time before generating.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-medium text-[#0D0F14] mb-4">Visual style</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {STYLES.map(s => (
              <SelectCard key={s.id} item={s} selected={data.style === s.id} onSelect={() => update({ style: s.id })} />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-[#0D0F14] mb-4">Narrative tone</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TONES.map(t => (
              <SelectCard key={t.id} item={t} selected={data.tone === t.id} onSelect={() => update({ tone: t.id })} />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-[#0D0F14] mb-4">Soundtrack</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {MUSIC.map(m => (
              <SelectCard key={m.id} item={m} selected={data.music === m.id} onSelect={() => update({ music: m.id })} />
            ))}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#1B3A2D]/6 border border-[#2D5A45]/20">
          <p className="text-xs text-[#4A8060] font-medium mb-1 tracking-wide uppercase">Your tribute for {data.name}</p>
          <p className="text-sm text-[#0D0F14]">
            {STYLES.find(s => s.id === data.style)?.label} ·{' '}
            {TONES.find(t => t.id === data.tone)?.label} ·{' '}
            {MUSIC.find(m => m.id === data.music)?.label}
          </p>
        </div>

        <div className="flex justify-between pt-2">
          <button onClick={back} className="text-[#94A3B8] text-sm hover:text-[#5A6A7A] transition-colors">← Back</button>
          <button
            onClick={next}
            className="px-8 py-3.5 rounded-full text-sm font-medium transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #C9973A, #E8B84B)',
              color: '#0D0F14',
              boxShadow: '0 4px 20px rgba(201,151,58,0.3)',
            }}
          >
            Generate tribute →
          </button>
        </div>
      </motion.div>
    </div>
  )
}
