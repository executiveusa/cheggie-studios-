'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  FolderOpen,
  Search,
  Settings,
  Clapperboard,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  className?: string
}

const navItems = [
  { href: '/dashboard/projects', label: 'Projekti', icon: FolderOpen },
  { href: '/dashboard/search', label: 'Pretraži', icon: Search },
  { href: '/dashboard/settings', label: 'Podešavanja', icon: Settings },
]

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = React.useState(false)

  const isActive = (href: string) => pathname.startsWith(href)

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-[hsl(240_5%_18%)] bg-[hsl(240_8%_8%)] transition-all duration-300',
        collapsed ? 'w-16' : 'w-60',
        className
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex h-16 items-center border-b border-[hsl(240_5%_18%)] px-4',
        collapsed ? 'justify-center' : 'gap-2.5'
      )}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(38_92%_50%)]/10 border border-[hsl(38_92%_50%)]/20">
          <Clapperboard className="h-4 w-4 text-[hsl(38_92%_50%)]" />
        </div>
        {!collapsed && (
          <span className="text-base font-bold text-white truncate">
            Cheggie <span className="text-[hsl(38_92%_50%)]">Studios</span>
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors group',
              isActive(href)
                ? 'bg-[hsl(38_92%_50%)]/10 text-[hsl(38_92%_50%)]'
                : 'text-[hsl(0_0%_60%)] hover:text-white hover:bg-[hsl(240_6%_12%)]',
              collapsed && 'justify-center px-2'
            )}
            title={collapsed ? label : undefined}
          >
            <Icon className={cn('shrink-0', collapsed ? 'h-5 w-5' : 'h-4 w-4')} />
            {!collapsed && <span>{label}</span>}
          </Link>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-[hsl(240_5%_18%)]">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'flex items-center gap-2 w-full rounded-lg px-3 py-2 text-xs text-[hsl(240_5%_55%)] hover:text-[hsl(0_0%_70%)] hover:bg-[hsl(240_6%_12%)] transition-colors',
            collapsed && 'justify-center px-2'
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 shrink-0" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span>Skupi</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
