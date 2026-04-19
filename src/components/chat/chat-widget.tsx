'use client'

import { useChat } from 'ai/react'
import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, X, Send, Mic, MicOff, Loader2, Bot, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type VoiceState = 'idle' | 'listening' | 'unsupported'

export function ChatWidget({ projectId }: { projectId?: string }) {
  const [open, setOpen] = useState(false)
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [unread, setUnread] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput, error } = useChat({
    api: '/api/chat',
    body: { projectId },
    onFinish: () => {
      if (!open) setUnread((n) => n + 1)
    },
  })

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Clear unread on open
  useEffect(() => {
    if (open) setUnread(0)
  }, [open])

  // Voice input via Web Speech API
  const toggleVoice = useCallback(() => {
    if (typeof window === 'undefined') return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const winAny = window as any
    const SR = winAny.SpeechRecognition || winAny.webkitSpeechRecognition

    if (!SR) {
      setVoiceState('unsupported')
      return
    }

    if (voiceState === 'listening') {
      recognitionRef.current?.stop()
      setVoiceState('idle')
      return
    }

    const recognition = new SR()
    recognition.lang = 'sr-RS'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript || ''
      setInput((prev: string) => (prev + ' ' + transcript).trim())
    }
    recognition.onerror = () => setVoiceState('idle')
    recognition.onend = () => setVoiceState('idle')

    recognition.start()
    recognitionRef.current = recognition
    setVoiceState('listening')
  }, [voiceState, setInput])

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    handleSubmit(e)
  }

  return (
    <>
      {/* Floating trigger button */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full',
          'shadow-lg transition-colors focus:outline-none',
          open
            ? 'bg-[hsl(240_8%_10%)] border border-[hsl(240_5%_22%)] text-[hsl(240_5%_60%)]'
            : 'bg-[hsl(142_71%_45%)] text-white hover:bg-[hsl(142_65%_40%)]'
        )}
        whileTap={{ scale: 0.93 }}
        aria-label={open ? 'Zatvori chat' : 'Otvori AI asistenta'}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="h-5 w-5" />
            </motion.span>
          ) : (
            <motion.span key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <MessageSquare className="h-5 w-5" />
            </motion.span>
          )}
        </AnimatePresence>
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-22 right-6 z-50 flex w-[360px] max-w-[calc(100vw-24px)] flex-col"
            style={{ height: 'min(520px, calc(100vh - 120px))' }}
          >
            <div className="flex flex-col h-full rounded-xl border border-[hsl(240_5%_18%)] bg-[hsl(240_10%_6%)] shadow-2xl shadow-black/50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[hsl(240_5%_14%)] bg-[hsl(240_10%_5%)]">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(142_71%_45%)]/15 border border-[hsl(142_71%_45%)]/25">
                  <Bot className="h-4 w-4 text-[hsl(142_71%_45%)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Cheggie AI</p>
                  <p className="text-xs text-[hsl(240_5%_45%)]">Trading asistent</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="ml-auto text-[hsl(240_5%_45%)] hover:text-white transition-colors p-1"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(142_71%_45%)]/10 border border-[hsl(142_71%_45%)]/20">
                      <Bot className="h-6 w-6 text-[hsl(142_71%_45%)]" />
                    </div>
                    <p className="text-sm text-[hsl(240_5%_55%)] leading-relaxed">
                      Pitaj me o transkriptima, pretraži momente u videu, ili pitaj o trading konceptima.
                    </p>
                    <div className="flex flex-col gap-2 w-full">
                      {[
                        'Pronađi sve momente gde se pominje support nivo',
                        'Objasni mi šta je RSI divergencija',
                        'Koje teme su najvažnije u ovom videu?',
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => {
                            setInput(suggestion)
                            inputRef.current?.focus()
                          }}
                          className="text-left text-xs px-3 py-2 rounded-lg border border-[hsl(240_5%_18%)] text-[hsl(240_5%_60%)] hover:border-[hsl(240_5%_28%)] hover:text-white transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((message: { id: string; role: string; content: string; parts?: { type: string; text?: string; toolInvocation?: { toolName: string } }[] }) => (
                  <div
                    key={message.id}
                    className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed',
                        message.role === 'user'
                          ? 'bg-[hsl(142_71%_45%)]/15 border border-[hsl(142_71%_45%)]/20 text-white'
                          : 'bg-[hsl(240_8%_10%)] border border-[hsl(240_5%_16%)] text-[hsl(0_0%_85%)]'
                      )}
                    >
                      {message.parts
                        ? message.parts.map((part: { type: string; text?: string; toolInvocation?: { toolName: string } }, i: number) => {
                            if (part.type === 'text') return <span key={i}>{part.text}</span>
                            if (part.type === 'tool-invocation') {
                              return (
                                <span key={i} className="text-xs text-[hsl(240_5%_45%)] italic block mt-1">
                                  ↳ {part.toolInvocation?.toolName === 'searchTranscript' ? 'Pretraga transkripta...' :
                                     part.toolInvocation?.toolName === 'browseWeb' ? 'Preuzimanje stranice...' :
                                     'Obrađujem...'}
                                </span>
                              )
                            }
                            return null
                          })
                        : message.content}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-[hsl(240_8%_10%)] border border-[hsl(240_5%_16%)] rounded-xl px-3 py-2">
                      <Loader2 className="h-4 w-4 text-[hsl(240_5%_45%)] animate-spin" />
                    </div>
                  </div>
                )}

                {error && (
                  <p className="text-xs text-red-400 text-center py-1">
                    Greška pri slanju. Proveri API ključ.
                  </p>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleFormSubmit} className="flex items-center gap-2 p-3 border-t border-[hsl(240_5%_14%)]">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Pitaj Cheggie AI..."
                  className="flex-1 bg-[hsl(240_8%_10%)] border border-[hsl(240_5%_18%)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[hsl(240_5%_40%)] focus:outline-none focus:border-[hsl(142_71%_45%)]/50 transition-colors"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={toggleVoice}
                  disabled={voiceState === 'unsupported'}
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors',
                    voiceState === 'listening'
                      ? 'bg-red-500/15 border-red-500/30 text-red-400'
                      : 'bg-[hsl(240_8%_10%)] border-[hsl(240_5%_18%)] text-[hsl(240_5%_45%)] hover:text-white hover:border-[hsl(240_5%_28%)]',
                    voiceState === 'unsupported' && 'opacity-40 cursor-not-allowed'
                  )}
                  title={voiceState === 'listening' ? 'Zaustavi snimanje' : 'Govori'}
                >
                  {voiceState === 'listening' ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(142_71%_45%)] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[hsl(142_65%_40%)] transition-colors"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
