'use client'

import * as React from 'react'
import { Upload, X, FileVideo, FileAudio, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

const ACCEPTED_TYPES = [
  'video/mp4', 'video/webm', 'video/mov', 'video/avi', 'video/mkv',
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a',
  'audio/flac',
]
const MAX_SIZE_MB = 500
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

interface UploadDropzoneProps {
  projectId: string
  onUploadComplete?: (fileId?: string) => void
  className?: string
}

interface UploadState {
  status: 'idle' | 'validating' | 'uploading' | 'success' | 'error'
  file: File | null
  progress: number
  error: string | null
}

export function UploadDropzone({ projectId, onUploadComplete, className }: UploadDropzoneProps) {
  const [state, setState] = React.useState<UploadState>({
    status: 'idle',
    file: null,
    progress: 0,
    error: null,
  })
  const [isDragging, setIsDragging] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const abortControllerRef = React.useRef<AbortController | null>(null)

  function validateFile(file: File): string | null {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `Nepodržan format fajla. Prihvatamo: MP4, WebM, MOV, AVI, MKV, MP3, WAV, OGG, M4A, FLAC.`
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `Fajl je prevelik. Maksimalna veličina je ${MAX_SIZE_MB}MB.`
    }
    return null
  }

  function handleFileSelect(file: File) {
    const error = validateFile(file)
    if (error) {
      setState({ status: 'error', file: null, progress: 0, error })
      return
    }
    setState({ status: 'validating', file, progress: 0, error: null })
    void uploadFile(file)
  }

  async function uploadFile(file: File) {
    abortControllerRef.current = new AbortController()

    setState((prev) => ({ ...prev, status: 'uploading', progress: 0 }))

    try {
      const formData = new FormData()
      formData.append('file', file)

      // We use XMLHttpRequest for progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 100)
            setState((prev) => ({ ...prev, progress: pct }))
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            try {
              const body = JSON.parse(xhr.responseText) as { error?: string }
              reject(new Error(body.error ?? `HTTP ${xhr.status}`))
            } catch {
              reject(new Error(`HTTP ${xhr.status}`))
            }
          }
        })

        xhr.addEventListener('error', () => reject(new Error('Mrežna greška. Pokušajte ponovo.')))
        xhr.addEventListener('abort', () => reject(new Error('Otpremanje otkazano.')))

        xhr.open('POST', `/api/projects/${projectId}/upload`)
        xhr.send(formData)

        abortControllerRef.current = {
          abort: () => xhr.abort(),
          signal: new AbortController().signal,
        } as unknown as AbortController
      })

      setState((prev) => ({ ...prev, status: 'success', progress: 100 }))
      setTimeout(() => onUploadComplete?.(), 800)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Otpremanje nije uspelo.'
      setState((prev) => ({ ...prev, status: 'error', progress: 0, error: message }))
    }
  }

  function handleCancel() {
    abortControllerRef.current?.abort()
    setState({ status: 'idle', file: null, progress: 0, error: null })
  }

  function handleReset() {
    setState({ status: 'idle', file: null, progress: 0, error: null })
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function onDragLeave() {
    setIsDragging(false)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
    e.target.value = ''
  }

  const isUploading = state.status === 'uploading' || state.status === 'validating'

  return (
    <div className={cn('w-full', className)}>
      {state.status === 'idle' || state.status === 'error' ? (
        <div>
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 cursor-pointer transition-all',
              isDragging
                ? 'border-[hsl(38_92%_50%)] bg-[hsl(38_92%_50%)]/5'
                : 'border-[hsl(240_5%_25%)] bg-[hsl(240_6%_10%)] hover:border-[hsl(38_92%_50%)]/50 hover:bg-[hsl(240_6%_12%)]'
            )}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[hsl(38_92%_50%)]/10 border border-[hsl(38_92%_50%)]/20 mb-4">
              <Upload className="h-7 w-7 text-[hsl(38_92%_50%)]" />
            </div>
            <p className="text-base font-medium text-white mb-1">
              Prevuci fajl ovde ili klikni da pretraži
            </p>
            <p className="text-sm text-[hsl(240_5%_55%)] text-center">
              MP4, WebM, MOV, AVI, MKV, MP3, WAV, OGG, M4A, FLAC
            </p>
            <p className="text-xs text-[hsl(240_5%_45%)] mt-1">
              Maksimalno {MAX_SIZE_MB}MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(',')}
              className="hidden"
              onChange={onInputChange}
            />
          </div>

          {state.error && (
            <div className="flex items-start gap-2 mt-3 rounded-lg border border-[hsl(0_72%_51%)]/30 bg-[hsl(0_72%_51%)]/10 px-4 py-3 text-sm text-[hsl(0_72%_65%)]">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p>{state.error}</p>
                <button
                  onClick={handleReset}
                  className="text-xs underline mt-1 hover:no-underline"
                >
                  Pokušaj ponovo
                </button>
              </div>
            </div>
          )}
        </div>
      ) : isUploading ? (
        <div className="rounded-xl border border-[hsl(240_5%_18%)] bg-[hsl(240_8%_8%)] p-6 space-y-4">
          <div className="flex items-center gap-3">
            {state.file?.type.startsWith('video/') ? (
              <FileVideo className="h-8 w-8 text-[hsl(38_92%_50%)] shrink-0" />
            ) : (
              <FileAudio className="h-8 w-8 text-[hsl(217_91%_60%)] shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white text-sm truncate">{state.file?.name}</p>
              <p className="text-xs text-[hsl(240_5%_55%)]">
                {state.file ? `${(state.file.size / 1024 / 1024).toFixed(1)}MB` : ''}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Progress value={state.progress} showPercentage label="Otpremanje..." />
        </div>
      ) : state.status === 'success' ? (
        <div className="rounded-xl border border-[hsl(142_71%_45%)]/30 bg-[hsl(142_71%_45%)]/10 p-6 text-center">
          <p className="font-medium text-[hsl(142_71%_65%)]">
            Fajl uspešno otpremljen!
          </p>
          <p className="text-sm text-[hsl(240_5%_55%)] mt-1">
            Obrada će početi uskoro...
          </p>
        </div>
      ) : null}
    </div>
  )
}
