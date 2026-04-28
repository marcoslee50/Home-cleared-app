'use client'
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import type { TributeData } from '../WizardShell'

interface Props {
  data: TributeData
  update: (p: Partial<TributeData>) => void
  next: () => void
  back: () => void
}

type UploadSlot = 'photos' | 'videos' | 'voiceClips'

interface SlotConfig {
  key: UploadSlot
  label: string
  hint: string
  accept: Record<string, string[]>
  minDuration?: number
  icon: string
  required: boolean
  maxFiles: number
  tip: string
}

const SLOTS: SlotConfig[] = [
  {
    key: 'photos',
    label: 'Photographs',
    hint: 'JPG, PNG, HEIC · Any quality accepted',
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.heic', '.webp'] },
    icon: '📷',
    required: true,
    maxFiles: 30,
    tip: 'The clearer and closer to their face, the more lifelike the tribute. Include a range — candid, formal, different ages.',
  },
  {
    key: 'videos',
    label: 'Video recordings · 5 minutes or longer',
    hint: 'MP4, MOV, AVI · 5 minutes minimum for voice modelling',
    accept: { 'video/*': ['.mp4', '.mov', '.avi', '.mkv', '.m4v'] },
    minDuration: 300,
    icon: '🎥',
    required: true,
    maxFiles: 10,
    tip: 'Home videos, interviews, birthday recordings — any footage where they speak naturally. Longer is better. The AI learns their voice patterns from these.',
  },
  {
    key: 'voiceClips',
    label: 'Voice recordings (optional boost)',
    hint: 'MP3, WAV, M4A · Phone recordings, voicemails welcome',
    accept: { 'audio/*': ['.mp3', '.wav', '.m4a', '.aac', '.ogg'] },
    icon: '🎙️',
    required: false,
    maxFiles: 20,
    tip: 'Voicemails, phone recordings, anything you have. Even 30 seconds of clear speech helps the voice model capture their cadence.',
  },
]

function FileChip({ file, onRemove }: { file: File; onRemove: () => void }) {
  const size = (file.size / (1024 * 1024)).toFixed(1)
  return (
    <div className="flex items-center gap-2 bg-[#1B3A2D]/8 border border-[#2D5A45]/25 rounded-lg px-3 py-2">
      <span className="text-[#4A8060] text-xs font-medium truncate max-w-[140px]">{file.name}</span>
      <span className="text-[#94A3B8] text-[10px] shrink-0">{size}MB</span>
      <button onClick={onRemove} className="text-[#94A3B8] hover:text-red-400 ml-1 transition-colors text-xs leading-none">×</button>
    </div>
  )
}

function DropZone({ slot, files, onChange }: { slot: SlotConfig; files: File[]; onChange: (f: File[]) => void }) {
  const [warn, setWarn] = useState('')

  const onDrop = useCallback((accepted: File[], rejected: unknown[]) => {
    if (rejected.length) {
      toast.error('Some files were rejected — check the format.')
    }
    const newFiles = accepted.filter(f => {
      if (slot.minDuration && f.type.startsWith('video/')) {
        if (f.size < 50 * 1024 * 1024) {
          setWarn('Some videos may be under 5 minutes. Longer recordings give better voice models.')
        }
      }
      return true
    })
    const combined = [...files, ...newFiles].slice(0, slot.maxFiles)
    onChange(combined)
    if (newFiles.length) toast.success(`${newFiles.length} file${newFiles.length > 1 ? 's' : ''} added`)
  }, [files, slot, onChange])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: slot.accept,
    maxFiles: slot.maxFiles,
    multiple: true,
  })

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-7 text-center cursor-pointer transition-all duration-200 ${
          isDragActive
            ? 'border-[#2D5A45] bg-[#1B3A2D]/8'
            : 'border-[#E8E0D0] hover:border-[#8FBF9F] hover:bg-[#1B3A2D]/4'
        }`}
      >
        <input {...getInputProps()} />
        <div className="text-4xl mb-3">{slot.icon}</div>
        <p className="text-[#0D0F14] font-medium text-sm mb-1">
          {isDragActive ? 'Drop here…' : `Drop ${slot.label.toLowerCase()} here`}
        </p>
        <p className="text-[#94A3B8] text-xs">{slot.hint}</p>
        <p className="mt-3 text-[#4A8060] text-xs underline underline-offset-2">or click to browse</p>
      </div>

      {warn && <p className="text-amber-600 text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">⚠ {warn}</p>}

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <FileChip key={i} file={f} onRemove={() => onChange(files.filter((_, j) => j !== i))} />
          ))}
        </div>
      )}

      <p className="text-[#94A3B8] text-[11px] leading-relaxed italic">{slot.tip}</p>
    </div>
  )
}

export default function StepUpload({ data, update, next }: Props) {
  const canContinue = data.photos.length > 0 && data.videos.length > 0

  return (
    <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-[#4A8060] text-xs tracking-[0.14em] uppercase mb-3">Step 1 of 5</p>
        <h2 className="font-serif text-[#0D0F14] leading-tight mb-2" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 400 }}>
          Upload their media
        </h2>
        <p className="text-[#5A6A7A] text-base mb-10 max-w-lg leading-relaxed">
          The more you give us, the more lifelike the tribute. A minimum of one clear photo and five minutes of video is required.
        </p>

        <div className="space-y-10">
          {SLOTS.map(slot => (
            <div key={slot.key}>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-[#0D0F14] font-medium text-sm">{slot.label}</h3>
                {slot.required && <span className="text-[10px] text-red-400 bg-red-50 border border-red-100 rounded-full px-2 py-0.5">Required</span>}
              </div>
              <DropZone
                slot={slot}
                files={data[slot.key] as File[]}
                onChange={files => update({ [slot.key]: files })}
              />
            </div>
          ))}
        </div>

        <div className="mt-12 flex items-center justify-between">
          <p className="text-[#94A3B8] text-xs max-w-sm leading-relaxed">
            Your media is encrypted in transit and never used for any other purpose. We store only what you choose to keep.
          </p>
          <button
            onClick={next}
            disabled={!canContinue}
            className="px-8 py-3.5 rounded-full text-sm font-medium tracking-wide transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
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
