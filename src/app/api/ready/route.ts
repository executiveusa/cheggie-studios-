import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

async function isDatabaseReady(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch {
    return false
  }
}

export async function GET(): Promise<NextResponse> {
  const dbReady = await isDatabaseReady()

  if (!dbReady) {
    return NextResponse.json(
      { ready: false, reason: 'database_unavailable' },
      { status: 503 }
    )
  }

  return NextResponse.json({ ready: true }, { status: 200 })
}
