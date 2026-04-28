'use client'
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { TributeData } from '../WizardShell'

interface Props {
  data: TributeData
  update: (p: Partial<TributeData>) => void
  next: () => void
  back: () => void
}

interface Stage {
  id: string
  label: string
  detail: string
  estimatedMs: number
}

const STAGES: Stage[] = [
  { id: 'upload',    label: 'Uploading your media',           detail: 'Encrypting and transferring files securely…',                  estimatedMs: 8000 },
  { id: 'voice',     label: 'Analysing voice patterns',       detail: 'Extracting vocal characteristics from video recordings…',     estimatedMs: 12000 },
  { id: 'narrative', label: 'Writing the narrative',          detail: 'Claude is crafting a personalised biography from your answers…', estimatedMs: 10000 },
  { id: 'portrait',  label: 'Building the AI portrait',       detail: 'Creating a lifelike speaking portrait…',                      estimatedMs: 25000 },
  { id: 'video',     label: 'Composing the tribute video',    detail: 'Syncing voice, images and narrative into a single film…',     estimatedMs: 30000 },
  { id: 'finalise',  label: 'Final quality check',            detail: 'Reviewing the tribute before delivery…',                      estimatedMs: 5000 },
]

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

// Upload one file via XMLHttpRequest so we can report progress events.
function putWithProgress(url: string, file: File, onProgress: (loaded: number, total: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded, e.total)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Upload failed (${xhr.status})`))
    }
    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.onabort = () => reject(new Error('Upload aborted'))
    xhr.send(file)
  })
}

async function uploadFiles(
  files: File[],
  folder: string,
  jobId: string,
  reportProgress: (pct: number) => void,
): Promise<string[]> {
  const urls: string[] = []
  const totalBytes = files.reduce((acc, f) => acc + f.size, 0) || 1
  let bytesDoneFromFinishedFiles = 0

  for (const file of files) {
    const presignRes = await fetch(`${BACKEND}/api/v1/upload/presign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, content_type: file.type, folder: `${jobId}/${folder}` }),
    })
    if (!presignRes.ok) throw new Error('Presign failed')
    const { upload_url, public_url } = await presignRes.json()

    await putWithProgress(upload_url, file, (loaded) => {
      const pct = Math.min(100, Math.round(((bytesDoneFromFinishedFiles + loaded) / totalBytes) * 100))
      reportProgress(pct)
    })
    bytesDoneFromFinishedFiles += file.size
    urls.push(public_url)
  }

  reportProgress(100)
  return urls
}

export default function StepGenerate({ data, update, next, back }: Props) {
  const [stageIdx, setStageIdx] = useState(0)
  const [stageProgress, setStageProgress] = useState(0)
  const [error, setError] = useState('')
  const [started, setStarted] = useState(false)
  const jobRef = useRef<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const overallProgress = Math.round(
    ((stageIdx + stageProgress / 100) / STAGES.length) * 100
  )

  const run = async () => {
    setStarted(true)
    setError('')
    try {
      const jobRes = await fetch(`${BACKEND}/api/v1/tribute/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          birth_year: data.birthYear,
          passed_year: data.passedYear,
          relationship: data.relationship,
          interview: data.interview,
          style: data.style,
          tone: data.tone,
          music: data.music,
        }),
      })
      if (!jobRes.ok) throw new Error('Failed to create job')
      const { job_id } = await jobRes.json()
      jobRef.current = job_id
      update({ videoJobId: job_id })

      // Stage 0 — uploads, with real progress events
      setStageIdx(0); setStageProgress(0)

      // Combine all uploads so progress is one continuous bar
      const allFiles: { files: File[]; folder: string }[] = [
        { files: data.photos,     folder: 'photos' },
        { files: data.videos,     folder: 'videos' },
        { files: data.voiceClips, folder: 'voice'  },
      ]
      const totalBytes = allFiles.reduce((acc, g) => acc + g.files.reduce((a, f) => a + f.size, 0), 0) || 1

      const photoUrls: string[] = []
      const videoUrls: string[] = []
      const voiceUrls: string[] = []
      let bytesSoFar = 0

      for (const group of allFiles) {
        const sizeOfGroup = group.files.reduce((a, f) => a + f.size, 0)
        const groupBaseline = bytesSoFar
        const urls = await uploadFiles(
          group.files,
          group.folder,
          job_id,
          (groupPct) => {
            const groupBytes = (groupPct / 100) * sizeOfGroup
            setStageProgress(Math.min(100, Math.round(((groupBaseline + groupBytes) / totalBytes) * 100)))
          },
        )
        if (group.folder === 'photos') photoUrls.push(...urls)
        else if (group.folder === 'videos') videoUrls.push(...urls)
        else voiceUrls.push(...urls)
        bytesSoFar += sizeOfGroup
      }
      setStageProgress(100)

      const startRes = await fetch(`${BACKEND}/api/v1/tribute/${job_id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_urls: photoUrls, video_urls: videoUrls, voice_urls: voiceUrls }),
      })
      if (!startRes.ok) {
        const detail = await startRes.json().catch(() => ({}))
        throw new Error(detail?.detail || 'Processing failed to start')
      }

      setStageIdx(1); setStageProgress(0)
      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`${BACKEND}/api/v1/tribute/${job_id}/status`)
          if (!statusRes.ok) return
          const status = await statusRes.json()

          const stageMap: Record<string, number> = {
            uploading: 0, voice_analysis: 1, narrative: 2,
            portrait: 3, video: 4, finalising: 5, done: 5,
          }
          const sIdx = stageMap[status.stage] ?? stageIdx
          setStageIdx(sIdx)
          setStageProgress(status.stage_progress ?? 50)

          if (status.stage === 'done' && status.video_url) {
            if (pollRef.current) clearInterval(pollRef.current)
            update({ videoUrl: status.video_url })
            next()
          }
          if (status.stage === 'error') {
            if (pollRef.current) clearInterval(pollRef.current)
            setError(status.message || 'Something went wrong. Please try again.')
            setStarted(false)
          }
        } catch {
          /* swallow transient polling errors */
        }
      }, 3000)

    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unexpected error. Please try again.')
      setStarted(false)
    }
  }

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  const stage = STAGES[Math.min(stageIdx, STAGES.length - 1)]

  if (!started) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-lg">
          <p className="text-[#4A8060] text-xs tracking-[0.14em] uppercase mb-4">Step 5 of 5</p>
          <h2 className="font-serif text-[#0D0F14] leading-tight mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 400 }}>
            Ready to create<br /><em className="text-[#C9973A]">{data.name}&apos;s tribute</em>
          </h2>
          <p className="text-[#5A6A7A] text-base mb-8 leading-relaxed">
            This takes 5–8 minutes. You can leave this tab open and we&apos;ll notify you when it&apos;s ready. Please don&apos;t close the browser.
          </p>

          <div className="bg-[#1B3A2D]/6 border border-[#2D5A45]/20 rounded-2xl p-5 mb-8 text-left space-y-2">
            {[
              ['Media', `${data.photos.length} photos · ${data.videos.length} videos · ${data.voiceClips.length} voice clips`],
              ['Name', data.name],
              ['Years', `${data.birthYear || '?'} – ${data.passedYear || '?'}`],
              ['Style', `${data.style} · ${data.tone} · ${data.music}`],
              ['Questions answered', `${Object.keys(data.interview).length} / 12`],
            ].map(([k, v]) => (
              <div key={k} className="flex items-start gap-3 text-sm">
                <span className="text-[#94A3B8] w-40 shrink-0">{k}</span>
                <span className="text-[#0D0F14] font-medium">{v}</span>
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
          )}

          <div className="flex items-center justify-center gap-4">
            <button onClick={back} className="text-[#94A3B8] text-sm hover:text-[#5A6A7A] transition-colors">← Review style</button>
            <button
              onClick={run}
              className="px-10 py-4 rounded-full text-sm font-medium transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, #C9973A, #E8B84B)',
                color: '#0D0F14',
                boxShadow: '0 8px 32px rgba(201,151,58,0.4)',
              }}
            >
              Create the tribute ✦
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 bg-[#0D0F14]">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center max-w-md w-full">

        <div className="relative w-32 h-32 mx-auto mb-10">
          <div className="absolute inset-0 rounded-full animate-pulse-slow"
            style={{ background: 'radial-gradient(circle, rgba(45,90,69,0.4), transparent)' }} />
          <svg className="w-full h-full progress-ring" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
            <circle
              className="progress-ring__circle"
              cx="60" cy="60" r="54"
              fill="none"
              stroke="#C9973A"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={339.3}
              strokeDashoffset={339.3 * (1 - overallProgress / 100)}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-serif text-white text-2xl">{overallProgress}%</span>
          </div>
        </div>

        <h3 className="font-serif text-white text-2xl mb-2">{stage.label}</h3>
        <p className="text-[#94A3B8] text-sm mb-10 leading-relaxed">{stage.detail}</p>

        <div className="text-left space-y-3">
          {STAGES.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] transition-all ${
                i < stageIdx ? 'bg-[#2D5A45] text-[#8FBF9F]'
                : i === stageIdx ? 'bg-[#C9973A] text-[#0D0F14]'
                : 'bg-white/5 text-white/20'
              }`}>
                {i < stageIdx ? '✓' : i + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${i <= stageIdx ? 'text-white' : 'text-white/20'}`}>{s.label}</span>
                  {i === stageIdx && (
                    <span className="text-[#C9973A] text-[10px]">{stageProgress}%</span>
                  )}
                </div>
                {i === stageIdx && (
                  <div className="mt-1 h-0.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-[#C9973A] rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${stageProgress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-[#5A6A7A] text-xs mt-10 leading-relaxed">
          Creating {data.name}&apos;s tribute.<br />
          Please keep this tab open. Estimated 5–8 minutes total.
        </p>
      </motion.div>
    </div>
  )
}
