'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import LandingHero from '@/components/LandingHero'
import WizardShell from '@/components/WizardShell'

export default function HomePage() {
  const [started, setStarted] = useState(false)

  return (
    <AnimatePresence mode="wait">
      {!started ? (
        <motion.div
          key="landing"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
        >
          <LandingHero onStart={() => setStarted(true)} />
        </motion.div>
      ) : (
        <motion.div
          key="wizard"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <WizardShell />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
