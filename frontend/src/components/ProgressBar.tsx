'use client'
interface Props {
  current: number
  total: number
  steps: { id: string; label: string }[]
}

export default function ProgressBar({ current, total, steps }: Props) {
  return (
    <div className="hidden sm:flex items-center gap-3">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center gap-1.5">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium transition-all duration-300 ${
              i < current
                ? 'bg-[#2D5A45] text-[#8FBF9F]'
                : i === current
                ? 'bg-[#C9973A] text-[#0D0F14]'
                : 'bg-white/10 text-white/30'
            }`}
          >
            {i < current ? '✓' : i + 1}
          </div>
          <span
            className={`text-[10px] tracking-wide uppercase hidden lg:block transition-colors ${
              i === current ? 'text-[#C9973A]' : i < current ? 'text-[#8FBF9F]' : 'text-white/20'
            }`}
          >
            {s.label}
          </span>
          {i < total - 1 && (
            <div className={`w-4 h-px mx-1 transition-colors ${i < current ? 'bg-[#2D5A45]' : 'bg-white/10'}`} />
          )}
        </div>
      ))}
    </div>
  )
}
