/**
 * workers/index.ts
 *
 * Runner that imports and starts all BullMQ workers, then listens for
 * OS signals to perform a graceful shutdown.
 */

import { logger } from '../src/lib/telemetry/logger'

// ---------------------------------------------------------------------------
// Import workers (each module starts its Worker on import)
// ---------------------------------------------------------------------------

import { transcriptWorker } from './transcript-worker'
import { subtitleWorker } from './subtitle-worker'
import { exportWorker } from './export-worker'
import { searchWorker } from './search-worker'
import { comfyuiWorker } from './comfyui-worker'

// ---------------------------------------------------------------------------
// Startup log
// ---------------------------------------------------------------------------

logger.info('[workers/index] All workers started', {
  workers: ['transcript', 'subtitle', 'export', 'search', 'comfyui'],
})

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

async function shutdown(signal: string): Promise<void> {
  logger.info(`[workers/index] ${signal} received — shutting down workers`)

  try {
    await Promise.all([
      transcriptWorker.close(),
      subtitleWorker.close(),
      exportWorker.close(),
      searchWorker.close(),
      comfyuiWorker.close(),
    ])
    logger.info('[workers/index] All workers closed cleanly')
    process.exit(0)
  } catch (err) {
    logger.error('[workers/index] Error during shutdown', err)
    process.exit(1)
  }
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))

// Keep the process alive — workers are event-driven via Redis
process.on('uncaughtException', (err) => {
  logger.error('[workers/index] Uncaught exception', err)
  // Do not exit; let BullMQ handle per-job retries
})

process.on('unhandledRejection', (reason) => {
  logger.error('[workers/index] Unhandled promise rejection', reason instanceof Error ? reason : new Error(String(reason)))
})
