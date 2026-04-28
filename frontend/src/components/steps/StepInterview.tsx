'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TributeData } from '../WizardShell'

interface Props {
  data: TributeData
  update: (p: Partial<TributeData>) => void
  next: () => void
  back: () => void
}

interface Question {
  id: string
  text: string
  followUp?: (answer: string) => string
  placeholder: string
  category: string
  required: boolean
  minLength: number
}

const getQuestions = (name: string, _relationship: string): Question[] => {
  const first = name.split(' ')[0] || 'them'
  return [
    {
      id: 'opening_memory',
      category: 'First memory',
      text: `What's the earliest memory you have of ${first}? Take your time — even a small detail is perfect.`,
      placeholder: `I remember the first time I saw ${first}...`,
      required: true,
      minLength: 40,
    },
    {
      id: 'laugh',
      category: 'Their joy',
      text: `What made ${first} laugh? Describe a moment where you heard them really, genuinely laugh.`,
      placeholder: 'There was this one time...',
      required: true,
      minLength: 30,
    },
    {
      id: 'defining_trait',
      category: 'Who they were',
      text: `If you had to describe ${first} in three words to someone who never met them, what would they be — and why those three?`,
      placeholder: 'I would say they were...',
      required: true,
      minLength: 40,
    },
    {
      id: 'hands',
      category: 'Physical presence',
      text: `What do you remember about ${first}'s physical presence — the way they moved, their hands, a gesture they always made, the way they entered a room?`,
      placeholder: `${first} always...`,
      required: false,
      minLength: 20,
    },
    {
      id: 'wisdom',
      category: 'Their wisdom',
      text: `What's something ${first} said that has stayed with you? It doesn't have to be profound — sometimes the simplest things are the truest.`,
      placeholder: 'They used to say...',
      required: true,
      minLength: 20,
    },
    {
      id: 'routine',
      category: 'Their life',
      text: `Describe a typical day in ${first}'s life — the rituals, the routines, the small ordinary things they did that were completely theirs.`,
      placeholder: `Every morning ${first} would...`,
      required: false,
      minLength: 30,
    },
    {
      id: 'proudest',
      category: 'Their pride',
      text: `What do you think ${first} was most proud of — not what they said they were proud of, but what you could see it in their eyes when it came up?`,
      placeholder: 'You could tell they were proud of...',
      required: true,
      minLength: 30,
    },
    {
      id: 'difficult',
      category: 'Their strength',
      text: `What was the hardest thing ${first} ever faced? How did they face it? This gives the tribute its depth.`,
      placeholder: 'There was a time when...',
      required: false,
      minLength: 30,
    },
    {
      id: 'relationship_moment',
      category: `You and ${first}`,
      text: `Describe the moment you felt closest to ${first}. It can be something tiny — a shared silence, a look across a room.`,
      placeholder: 'I think the moment I felt closest to them was...',
      required: true,
      minLength: 30,
    },
    {
      id: 'what_they_loved',
      category: 'Their world',
      text: `What did ${first} love most in the world — a place, a food, a song, a season, an activity? What made them come alive?`,
      placeholder: `${first} was happiest when...`,
      required: false,
      minLength: 20,
    },
    {
      id: 'legacy',
      category: 'Their legacy',
      text: `What has ${first} left in you? What part of them do you carry forward — something you do, or think, or believe, because of them?`,
      placeholder: 'Because of them, I...',
      required: true,
      minLength: 40,
    },
    {
      id: 'final_message',
      category: 'The tribute',
      text: `If ${first} could watch this tribute from wherever they are now, what would you most want them to know? Write it to them directly.`,
      placeholder: `Dear ${first}...`,
      required: true,
      minLength: 30,
    },
  ]
}

export default function StepInterview({ data, update, next, back }: Props) {
  const questions = getQuestions(data.name, data.relationship)
  const [current, setCurrent] = useState(0)
  const [localAnswer, setLocalAnswer] = useState(data.interview[questions[0]?.id] || '')

  const q = questions[current]
  const totalRequired = questions.filter(q => q.required).length
  const answeredRequired = questions.filter(q => q.required && (data.interview[q.id] || '').length >= q.minLength).length
  const canFinish = answeredRequired >= totalRequired

  const saveAndAdvance = () => {
    const newInterview = { ...data.interview, [q.id]: localAnswer }
    update({ interview: newInterview })
    if (current < questions.length - 1) {
      setCurrent(c => c + 1)
      setLocalAnswer(data.interview[questions[current + 1]?.id] || '')
    }
  }

  const goBack = () => {
    update({ interview: { ...data.interview, [q.id]: localAnswer } })
    setCurrent(c => c - 1)
    setLocalAnswer(data.interview[questions[current - 1]?.id] || '')
  }

  const isAnswered = localAnswer.trim().length >= q.minLength

  return (
    <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-[#4A8060] text-xs tracking-[0.14em] uppercase mb-3">Step 3 of 5 · Their story</p>
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-serif text-[#0D0F14]" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 400 }}>
            {current + 1} / {questions.length}
          </h2>
          <div className="flex gap-1">
            {questions.map((_, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === current ? 24 : 8,
                  background: i < current ? '#2D5A45' : i === current ? '#C9973A' : '#E8E0D0',
                }}
              />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={q.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#1B3A2D]/8 border border-[#2D5A45]/20 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-[#4A8060]" />
              <span className="text-[#4A8060] text-xs font-medium">{q.category}</span>
              {!q.required && <span className="text-[#94A3B8] text-[10px]">optional</span>}
            </div>

            <p className="font-serif text-[#0D0F14] leading-relaxed" style={{ fontSize: 'clamp(1.2rem, 2.5vw, 1.6rem)', fontWeight: 400 }}>
              {q.text}
            </p>

            <div className="relative">
              <textarea
                value={localAnswer}
                onChange={e => setLocalAnswer(e.target.value)}
                placeholder={q.placeholder}
                rows={6}
                className="w-full border border-[#E8E0D0] rounded-2xl px-5 py-4 text-sm text-[#0D0F14] bg-white placeholder-[#C5BBB0] focus:outline-none focus:border-[#2D5A45] focus:ring-2 focus:ring-[#2D5A45]/10 transition-all resize-none leading-relaxed"
              />
              {localAnswer.trim().length > 0 && (
                <div className="absolute bottom-3 right-4 text-[10px] text-[#94A3B8]">
                  {localAnswer.trim().length} chars
                  {q.minLength > 0 && ` · ${Math.max(0, q.minLength - localAnswer.trim().length)} more for depth`}
                </div>
              )}
            </div>

            {localAnswer.trim().length > 0 && localAnswer.trim().length < q.minLength && (
              <p className="text-[#94A3B8] text-xs italic">
                A little more depth here will make the tribute richer. There&apos;s no wrong answer.
              </p>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between mt-10">
          <button
            onClick={current === 0 ? back : goBack}
            className="text-[#94A3B8] text-sm hover:text-[#5A6A7A] transition-colors"
          >
            ← {current === 0 ? 'Back to details' : 'Previous'}
          </button>

          <div className="flex items-center gap-3">
            {!q.required && current < questions.length - 1 && (
              <button
                onClick={saveAndAdvance}
                className="text-[#94A3B8] text-xs hover:text-[#5A6A7A] transition-colors underline underline-offset-2"
              >
                Skip
              </button>
            )}

            {current < questions.length - 1 ? (
              <button
                onClick={saveAndAdvance}
                className="px-7 py-3 rounded-full text-sm font-medium transition-all duration-200"
                style={{
                  background: isAnswered || !q.required ? 'linear-gradient(135deg, #C9973A, #E8B84B)' : '#E8E0D0',
                  color: isAnswered || !q.required ? '#0D0F14' : '#94A3B8',
                  boxShadow: isAnswered || !q.required ? '0 4px 20px rgba(201,151,58,0.3)' : 'none',
                }}
              >
                Next question →
              </button>
            ) : (
              <button
                onClick={() => {
                  update({ interview: { ...data.interview, [q.id]: localAnswer } })
                  next()
                }}
                disabled={!canFinish}
                className="px-8 py-3.5 rounded-full text-sm font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: canFinish ? 'linear-gradient(135deg, #C9973A, #E8B84B)' : '#E8E0D0',
                  color: canFinish ? '#0D0F14' : '#94A3B8',
                  boxShadow: canFinish ? '0 4px 20px rgba(201,151,58,0.3)' : 'none',
                }}
              >
                Build the tribute →
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-[#94A3B8] text-xs mt-6">
          {answeredRequired} of {totalRequired} required questions answered
          {answeredRequired < totalRequired && ' · Complete to continue'}
        </p>
      </motion.div>
    </div>
  )
}
