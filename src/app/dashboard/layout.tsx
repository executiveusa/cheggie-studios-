export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Navbar } from '@/components/layout/navbar'

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/auth/login')
  }

  const user = {
    id: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email ?? '',
    image: session.user.image ?? null,
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0f]">
      <Navbar user={user} />
      <div className="flex flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
