'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import type { TributeData } from '../WizardShell'

interface Props {
  data: TributeData
  update: (p: Partial<TributeData>) => void
  next: () => void
  back: () => void
}

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export default function StepResult({ data }: Props) {
  const [sharing, setSharing] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [downloading, setDownloading] = useState(false)

  const handleShare = async () => {
    setSharing(true)
    try {
      const res = await fetch(`${BACKEND}/api/v1/tribute/${data.videoJobId}/share`, { method: 'POST' })
      const { share_url } = await res.json()
      setShareLink(share_url)
      await navigator.clipboard.writeText(share_url)
      toast.success('Share link copied to clipboard')
    } catch {
      toast.error('Could not generate share link')
    } finally {
      setSharing(false)
    }
  }

  const handleDownload = async () => {
    if (!data.videoUrl) return
    setDownloading(true)
    try {
      const res = await fetch(data.videoUrl)
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `${data.name.replace(/\s+/g, '_')}_tribute.mp4`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Downloading…')
    } catch {
      toast.error('Download failed — try again')
    } finally {
      setDownloading(false)
    }
  }

  const videoSrc = data.videoUrl || null

  return (
    <div className="flex-1 bg-[#0D0F14] flex flex-col items-center justify-start px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 border border-[#2D5A45] rounded-full mb-5"
          >
            <div className="w-2 h-2 rounded-full bg-[#4A8060] animate-pulse" />
            <span className="text-[#8FBF9F] text-xs tracking-widest uppercase">Tribute complete</span>
          </motion.div>
          <h2 className="font-serif text-white leading-tight" style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 300 }}>
            {data.name}&apos;s<br /><em className="text-[#E8B84B]">living tribute</em>
          </h2>
          {data.birthYear && data.passedYear && (
            <p className="text-[#5A6A7A] mt-2 text-sm tracking-widest">{data.birthYear} – {data.passedYear}</p>
          )}
        </div>

        <div className="relative rounded-2xl overflow-hidden bg-black shadow-2xl mb-8 aspect-video w-full">
          {videoSrc ? (
            <video
              src={videoSrc}
              controls
              autoPlay={false}
              playsInline
              className="w-full h-full object-cover"
              poster=""
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1B3A2D 0%, #0D0F14 100%)' }}>
              <div className="text-6xl mb-4">🎬</div>
              <p className="text-[#8FBF9F] font-serif text-xl mb-2">{data.name}&apos;s Tribute</p>
              <p className="text-[#5A6A7A] text-sm">Video will appear here once generated</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
          <button
            onClick={handleDownload}
            disabled={downloading || !data.videoUrl}
            className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium border border-[#2D5A45] text-[#8FBF9F] hover:bg-[#1B3A2D]/30 transition-all disabled:opacity-40"
          >
            {downloading ? '⏳ Downloading…' : '⬇ Download MP4'}
          </button>
          <button
            onClick={handleShare}
            disabled={sharing}
            className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-all"
            style={{
              background: sharing ? '#E8E0D0' : 'linear-gradient(135deg, #C9973A, #E8B84B)',
              color: '#0D0F14',
              boxShadow: sharing ? 'none' : '0 4px 20px rgba(201,151,58,0.35)',
            }}
          >
            {sharing ? '⏳ Generating link…' : '🔗 Share tribute'}
          </button>
        </div>

        {shareLink && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 bg-[#1B3A2D]/20 border border-[#2D5A45]/30 rounded-xl flex items-center gap-3"
          >
            <input
              readOnly
              value={shareLink}
              className="flex-1 bg-transparent text-[#8FBF9F] text-sm outline-none truncate font-mono"
            />
            <button
              onClick={() => { navigator.clipboard.writeText(shareLink); toast.success('Copied!') }}
              className="text-[#4A8060] text-xs hover:text-[#8FBF9F] transition-colors shrink-0"
            >
              Copy
            </button>
          </motion.div>
        )}

        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: '🪦', title: 'Add a QR plaque', desc: 'We\'ll mail a weatherproof QR plaque to accompany the headstone. Engraved — not printed.' },
            { icon: '🎙️', title: 'Upgrade to AI Bio', desc: 'Let visitors hear their voice tell their own story — an AI-narrated biography built from their recordings.' },
            { icon: '👥', title: 'Share with family', desc: 'Give family members access to the archive. They can add their own memories and photos over time.' },
          ].map(item => (
            <div key={item.title} className="p-4 rounded-xl border border-white/8 bg-white/3 hover:bg-white/5 transition-colors cursor-pointer">
              <div className="text-2xl mb-2">{item.icon}</div>
              <h4 className="font-serif text-white text-base mb-1">{item.title}</h4>
              <p className="text-[#5A6A7A] text-xs leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-[#5A6A7A] text-xs mt-8 leading-relaxed max-w-md mx-auto">
          This tribute is private until you choose to share it. You are the sole custodian. You can delete it permanently at any time from your account settings.
        </p>
      </motion.div>
    </div>
  )
}
