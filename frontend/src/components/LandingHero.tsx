'use client'
import { motion } from 'framer-motion'

interface Props { onStart: () => void }

export default function LandingHero({ onStart }: Props) {
  return (
    <div className="min-h-screen bg-[#0D0F14] flex flex-col items-center justify-center relative overflow-hidden px-6">

      <div className="absolute top-[-20%] right-[-15%] w-[600px] h-[600px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(45,90,69,0.28) 0%, transparent 70%)' }} />
      <div className="absolute bottom-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(201,151,58,0.14) 0%, transparent 70%)' }} />

      <div className="relative text-center max-w-3xl mx-auto">

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-center gap-3 mb-8"
        >
          <div className="w-10 h-px bg-[#2D5A45]" />
          <span className="text-[#8FBF9F] text-xs tracking-[0.18em] uppercase">Lifetold · v2.0</span>
          <div className="w-10 h-px bg-[#2D5A45]" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="font-serif text-white leading-[1.08]"
          style={{ fontSize: 'clamp(3rem, 7vw, 6rem)', fontWeight: 300 }}
        >
          Their voice.<br />
          <em className="text-[#E8B84B]">Still here.</em>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-[#94A3B8] text-lg leading-relaxed max-w-xl mx-auto"
          style={{ fontWeight: 300 }}
        >
          Upload photos, videos and voice recordings. Answer a few gentle questions.
          We&apos;ll create a living tribute — a presence that honours who they were.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="mt-10 flex items-center justify-center gap-6 text-xs text-[#5A6A7A] tracking-wide uppercase"
        >
          {['Upload media', 'Tell their story', 'Choose style', 'Generate tribute'].map((s, i) => (
            <span key={s} className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full border border-[#2D5A45] text-[#8FBF9F] flex items-center justify-center text-[10px]">{i + 1}</span>
              {s}
            </span>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button
            onClick={onStart}
            className="group px-10 py-4 rounded-full font-sans font-medium text-sm tracking-wide transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, #C9973A, #E8B84B)',
              color: '#0D0F14',
              boxShadow: '0 8px 32px rgba(201,151,58,0.35)',
            }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 12px 40px rgba(201,151,58,0.5)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 8px 32px rgba(201,151,58,0.35)')}
          >
            Begin their story
            <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">→</span>
          </button>
          <span className="text-[#5A6A7A] text-xs">Free to start · No credit card needed</span>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="mt-10 text-[#5A6A7A] text-xs leading-relaxed max-w-md mx-auto"
        >
          Built with consent at every step. You control what is created, who can access it,
          and when it ends. Every tribute requires explicit family approval before it goes live.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[#5A6A7A]"
      >
        <span className="text-[10px] tracking-[0.14em] uppercase">Scroll to learn more</span>
        <div className="w-px h-8" style={{ background: 'linear-gradient(to bottom, #2D5A45, transparent)' }} />
      </motion.div>
    </div>
  )
}
