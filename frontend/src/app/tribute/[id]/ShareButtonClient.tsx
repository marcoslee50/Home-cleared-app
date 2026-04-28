'use client'

export default function ShareButtonClient({ name }: { name: string }) {
  const onClick = () => {
    if (typeof window === 'undefined') return
    const url = window.location.href
    const data = { title: `${name} — Lifetold`, url }
    if (navigator.share) {
      navigator.share(data).catch(() => navigator.clipboard.writeText(url))
    } else {
      navigator.clipboard.writeText(url)
    }
  }

  return (
    <button
      onClick={onClick}
      className="px-7 py-3 rounded-full text-sm font-medium border border-[#2D5A45] text-[#8FBF9F] hover:bg-[#1B3A2D]/30 transition-all"
    >
      🔗 Share this tribute
    </button>
  )
}
