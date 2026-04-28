'use client'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ErrorBoundary, FallbackProps } from 'react-error-boundary'
import StepUpload from './steps/StepUpload'
import StepPersonDetails from './steps/StepPersonDetails'
import StepInterview from './steps/StepInterview'
import StepStyle from './steps/StepStyle'
import StepGenerate from './steps/StepGenerate'
import StepResult from './steps/StepResult'
import ProgressBar from './ProgressBar'

export interface TributeData {
  name: string
  birthYear: string
  passedYear: string
  relationship: string

  photos: File[]
  videos: File[]
  voiceClips: File[]

  interview: Record<string, string>

  style: 'cinematic' | 'documentary' | 'intimate' | 'celebratory'
  tone:  'warm' | 'reflective' | 'joyful' | 'reverent'
  music: 'orchestral' | 'acoustic' | 'ambient' | 'silence'

  narrativePrompt: string
  videoJobId: string | null
  videoUrl: string | null
}

const STEPS = [
  { id: 'upload',  label: 'Upload Media' },
  { id: 'person',  label: 'About Them' },
  { id: 'interview', label: 'Their Story' },
  { id: 'style',   label: 'Tribute Style' },
  { id: 'generate', label: 'Creating' },
  { id: 'result',  label: 'Your Tribute' },
]

const defaultData: TributeData = {
  name: '', birthYear: '', passedYear: '', relationship: '',
  photos: [], videos: [], voiceClips: [],
  interview: {},
  style: 'cinematic', tone: 'warm', music: 'orchestral',
  narrativePrompt: '', videoJobId: null, videoUrl: null,
}

function StepFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-md text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="font-serif text-[#0D0F14] text-2xl mb-3" style={{ fontWeight: 400 }}>
          Something went wrong on this step
        </h2>
        <p className="text-[#5A6A7A] text-sm mb-6 leading-relaxed">
          Your progress so far is preserved. You can try this step again, or refresh the page if the problem persists.
        </p>
        <pre className="text-left text-[10px] text-[#94A3B8] bg-[#1B3A2D]/6 border border-[#2D5A45]/15 rounded-lg p-3 mb-6 overflow-auto max-h-32">
          {error.message}
        </pre>
        <button
          onClick={resetErrorBoundary}
          className="px-7 py-3 rounded-full text-sm font-medium transition-all"
          style={{
            background: 'linear-gradient(135deg, #C9973A, #E8B84B)',
            color: '#0D0F14',
            boxShadow: '0 4px 20px rgba(201,151,58,0.3)',
          }}
        >
          Try again
        </button>
      </div>
    </div>
  )
}

export default function WizardShell() {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<TributeData>(defaultData)

  const update = (patch: Partial<TributeData>) =>
    setData(prev => ({ ...prev, ...patch }))

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1))
  const back = () => setStep(s => Math.max(s - 1, 0))

  const stepProps = { data, update, next, back }

  const stepComponents = [
    <StepUpload   key="upload"   {...stepProps} />,
    <StepPersonDetails key="person"  {...stepProps} />,
    <StepInterview key="interview" {...stepProps} />,
    <StepStyle    key="style"    {...stepProps} />,
    <StepGenerate key="generate" {...stepProps} />,
    <StepResult   key="result"   {...stepProps} />,
  ]

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex flex-col">
      <header className="sticky top-0 z-50 bg-[#0D0F14]/95 backdrop-blur border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="font-serif text-white text-xl" style={{ fontWeight: 400 }}>
          Life<em className="text-[#E8B84B]">told</em>
        </div>
        <ProgressBar current={step} total={STEPS.length} steps={STEPS} />
        {data.name && (
          <div className="text-[#8FBF9F] text-sm hidden sm:block">
            {data.name}&apos;s tribute
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="flex-1 flex flex-col"
          >
            <ErrorBoundary
              FallbackComponent={StepFallback}
              resetKeys={[step]}
              onError={(err) => console.error('[Lifetold] Step error', step, err)}
            >
              {stepComponents[step]}
            </ErrorBoundary>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
