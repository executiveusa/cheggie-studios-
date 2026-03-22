import * as React from 'react'
import { Sidebar } from './sidebar'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface DashboardLayoutProps {
  children: React.ReactNode
  breadcrumbs?: BreadcrumbItem[]
  title?: string
  actions?: React.ReactNode
  className?: string
}

export function DashboardLayout({
  children,
  breadcrumbs,
  title,
  actions,
  className,
}: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0f]">
      {/* Sidebar - hidden on mobile */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        {(breadcrumbs || title || actions) && (
          <header className="flex items-center justify-between border-b border-[hsl(240_5%_18%)] bg-[hsl(240_8%_8%)]/80 backdrop-blur-sm px-6 py-4 shrink-0">
            <div className="space-y-1">
              {breadcrumbs && breadcrumbs.length > 0 && (
                <nav className="flex items-center gap-1.5 text-xs text-[hsl(240_5%_55%)]">
                  {breadcrumbs.map((item, index) => (
                    <React.Fragment key={index}>
                      {index > 0 && <span>/</span>}
                      {item.href ? (
                        <a
                          href={item.href}
                          className="hover:text-[hsl(0_0%_80%)] transition-colors"
                        >
                          {item.label}
                        </a>
                      ) : (
                        <span className="text-[hsl(0_0%_80%)]">{item.label}</span>
                      )}
                    </React.Fragment>
                  ))}
                </nav>
              )}
              {title && (
                <h1 className="text-xl font-semibold text-white">{title}</h1>
              )}
            </div>
            {actions && <div className="flex items-center gap-3">{actions}</div>}
          </header>
        )}

        {/* Scrollable content */}
        <main className={cn('flex-1 overflow-y-auto px-6 py-6', className)}>
          {children}
        </main>
      </div>
    </div>
  )
}
