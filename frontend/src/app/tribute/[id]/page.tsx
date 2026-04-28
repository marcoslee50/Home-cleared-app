import type { Metadata } from 'next'
import ShareButtonClient from './ShareButtonClient'

interface Props {
  params: { id: string }
}

const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000'

async function getTribute(id: string) {
  try {
    const res = await fetch(`${BACKEND}/api/v1/tribute/${id}/status`, {
      next: { revalidate: 30 },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tribute = await getTribute(params.id)
  const name = tribute?.meta?.name || 'A tribute'
  return {
    title: `${name} — Lifetold`,
    description: `A living tribute to ${name}, created with Lifetold.`,
    openGraph: {
      title: `${name} — Lifetold`,
      description: `A living tribute to ${name}.`,
    },
  }
}

export default async function TributePage({ params }: Props) {
  const tribute = await getTribute(params.id)

  if (!tribute || tribute.stage !== 'done') {
    return (
      <div className="min-h-screen bg-[#0D0F14] flex flex-col items-center justify-center text-center px-6">
        <div className="text-5xl mb-6">🕯️</div>
        <h1 className="font-serif text-white text-3xl mb-3" style={{ fontWeight: 300 }}>
          {tribute ? 'Still being created…' : 'Tribute not found'}
        </h1>
        <p className="text-[#5A6A7A] text-base max-w-sm leading-relaxed">
          {tribute
            ? 'This tribute is still being generated. Please check back in a few minutes.'
            : 'This link may have expired or the tribute may have been removed.'}
        </p>
      </div>
    )
  }

  const { meta, video_url, narrative } = tribute
  const name: string = meta?.name || 'Their tribute'
  const years = meta?.birth_year && meta?.passed_year
    ? `${meta.birth_year} – ${meta.passed_year}`
    : null

  return (
    <div className="min-h-screen bg-[#0D0F14]">
      <header className="px-6 py-5 flex items-center justify-between border-b border-white/5">
        <a href="/" className="font-serif text-white text-lg" style={{ fontWeight: 400 }}>
          Life<em className="text-[#E8B84B]">told</em>
        </a>
        <span className="text-[#5A6A7A] text-xs tracking-widest uppercase">Shared tribute</span>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-14">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1 border border-[#2D5A45] rounded-full mb-6 text-[#8FBF9F] text-xs tracking-widest uppercase">
            <div className="w-1.5 h-1.5 rounded-full bg-[#4A8060]" />
            A Lifetold tribute
          </div>
          <h1 className="font-serif text-white leading-tight" style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)', fontWeight: 300 }}>
            {name}
          </h1>
          {years && <p className="text-[#5A6A7A] mt-2 tracking-widest text-sm">{years}</p>}
        </div>

        {video_url && (
          <div className="rounded-2xl overflow-hidden mb-10 aspect-video bg-black shadow-2xl">
            <video
              src={video_url}
              controls
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {narrative && (
          <div className="bg-[#1B3A2D]/15 border border-[#2D5A45]/20 rounded-2xl p-8 mb-10">
            <p className="font-serif text-[#8FBF9F] text-xs tracking-widest uppercase mb-4">Their story</p>
            <p className="text-[#E8E0D0] leading-[1.85] text-[1.05rem]" style={{ fontFamily: 'var(--font-serif)', fontWeight: 400 }}>
              {narrative}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <ShareButtonClient name={name} />
          <a
            href="/"
            className="px-7 py-3 rounded-full text-sm font-medium transition-all"
            style={{ background: 'linear-gradient(135deg, #C9973A, #E8B84B)', color: '#0D0F14' }}
          >
            Create your own →
          </a>
        </div>

        <p className="text-center text-[#5A6A7A] text-xs mt-10 leading-relaxed max-w-md mx-auto">
          This tribute was created with Lifetold and shared by the family with full consent.
          The family controls access and can remove it at any time.
        </p>
      </main>
    </div>
  )
}
