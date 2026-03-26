'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

const SESSION_KEY = 'cs_intro_seen'

export function LogoIntro() {
  const [visible, setVisible] = useState(false)
  const [phase, setPhase] = useState<'entering' | 'holding' | 'exit'>('entering')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const seen = sessionStorage.getItem(SESSION_KEY)
    if (!seen) {
      setVisible(true)
      sessionStorage.setItem(SESSION_KEY, '1')
    }
  }, [])

  useEffect(() => {
    if (!visible) return
    // Phase timeline: 0→2s entering, 2→4s holding with glow, 4→5s exit
    const t1 = setTimeout(() => setPhase('holding'), 2000)
    const t2 = setTimeout(() => setPhase('exit'), 4200)
    const t3 = setTimeout(() => setVisible(false), 5100)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [visible])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="intro"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black select-none overflow-hidden"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Radial ambient that blooms in holding phase */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === 'holding' ? 1 : phase === 'exit' ? 0 : 0 }}
            transition={{ duration: 1.2 }}
            style={{
              background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(34,197,94,0.13) 0%, transparent 70%)',
            }}
          />

          {/* Outer ring glow */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{
              opacity: phase === 'holding' ? [0, 0.35, 0.2] : phase === 'exit' ? 0 : 0,
              scale: phase === 'holding' ? [0.7, 1.3, 1.2] : phase === 'exit' ? 1.8 : 0.7,
            }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{
              width: 320,
              height: 320,
              border: '1px solid rgba(34,197,94,0.18)',
              boxShadow: '0 0 60px rgba(34,197,94,0.12), inset 0 0 60px rgba(34,197,94,0.05)',
            }}
          />

          {/* Logo + text container with 3D perspective */}
          <div style={{ perspective: 800 }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.72, rotateY: -12 }}
              animate={
                phase === 'entering'
                  ? { opacity: 1, scale: 1, rotateY: 0 }
                  : phase === 'holding'
                  ? { opacity: 1, scale: 1, rotateY: [0, 6, -4, 0] }
                  : { opacity: 0, scale: 0.9, rotateY: 8, y: -24 }
              }
              transition={
                phase === 'entering'
                  ? { duration: 1.1, ease: [0.22, 1, 0.36, 1] }
                  : phase === 'holding'
                  ? { duration: 2.4, ease: 'easeInOut', times: [0, 0.35, 0.7, 1] }
                  : { duration: 0.7, ease: [0.4, 0, 0.2, 1] }
              }
              style={{ transformStyle: 'preserve-3d' }}
              className="flex flex-col items-center gap-6"
            >
              {/* Logo image with drop shadow that animates */}
              <motion.div
                className="relative"
                animate={
                  phase === 'holding'
                    ? { filter: ['drop-shadow(0 0 0px rgba(34,197,94,0))', 'drop-shadow(0 0 32px rgba(34,197,94,0.7))', 'drop-shadow(0 0 20px rgba(34,197,94,0.5))'] }
                    : {}
                }
                transition={{ duration: 1.6, ease: 'easeOut' }}
              >
                <Image
                  src="/logo.webp"
                  alt="Cheggie Studios"
                  width={140}
                  height={140}
                  className="object-contain"
                  priority
                />
              </motion.div>

              {/* Brand name */}
              <motion.div
                className="flex flex-col items-center gap-1"
                initial={{ opacity: 0, y: 10 }}
                animate={
                  phase === 'entering'
                    ? { opacity: 0, y: 10 }
                    : phase === 'holding'
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: -8 }
                }
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                <span
                  className="text-2xl font-bold tracking-[0.25em] text-white uppercase"
                  style={{ letterSpacing: '0.25em', fontFamily: 'var(--font-inter, sans-serif)' }}
                >
                  CHEGGIE
                </span>
                <span
                  className="text-xs font-medium tracking-[0.5em] uppercase"
                  style={{ color: 'rgb(34 197 94)', letterSpacing: '0.5em' }}
                >
                  STUDIOS
                </span>
              </motion.div>
            </motion.div>
          </div>

          {/* Bottom progress bar */}
          <motion.div
            className="absolute bottom-0 left-0 h-[2px]"
            style={{ background: 'linear-gradient(90deg, transparent, rgb(34 197 94), transparent)' }}
            initial={{ width: '0%', opacity: 0 }}
            animate={
              phase === 'exit'
                ? { width: '100%', opacity: 0 }
                : { width: ['0%', '100%'], opacity: [0, 1, 0.6] }
            }
            transition={{ duration: 4.5, ease: 'linear' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
