'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  FolderOpen,
  Settings,
  LogOut,
  LogIn,
  UserPlus,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/lib/language-context'

interface NavbarProps {
  user?: {
    id: string
    name?: string | null
    email: string
    image?: string | null
  } | null
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname()
  const { lang, setLang, t } = useLanguage()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [userMenuOpen, setUserMenuOpen] = React.useState(false)
  const userMenuRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const navLinks = user
    ? [
        { href: '/dashboard', label: t('nav_dashboard'), icon: LayoutDashboard },
        { href: '/dashboard/projects', label: t('nav_projects'), icon: FolderOpen },
      ]
    : []

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? 'U'

  return (
    <nav className="sticky top-0 z-50 border-b border-[hsl(240_5%_18%)] bg-[hsl(240_8%_8%)]/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/logo.webp"
              alt="Cheggie Studios"
              width={32}
              height={32}
              className="rounded-lg object-contain"
            />
            <span className="text-lg font-bold text-white">
              Cheggie <span className="text-[hsl(142_71%_45%)]">Studios</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          {navLinks.length > 0 && (
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive(href)
                      ? 'bg-[hsl(38_92%_50%)]/10 text-[hsl(38_92%_50%)]'
                      : 'text-[hsl(0_0%_70%)] hover:text-white hover:bg-[hsl(240_6%_12%)]'
                  )}
                >
                  {label}
                </Link>
              ))}
            </div>
          )}

          {/* Right section */}
          <div className="flex items-center gap-3">
            {/* Language toggle */}
            <button
              onClick={() => setLang(lang === 'sr' ? 'en' : 'sr')}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-[hsl(240_5%_22%)] text-[hsl(0_0%_65%)] hover:text-white hover:border-[hsl(240_5%_35%)] transition-colors tracking-wide"
              title={lang === 'sr' ? 'Switch to English' : 'Prebaci na srpski'}
            >
              {lang === 'sr' ? 'EN' : 'SR'}
            </button>
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[hsl(240_6%_12%)] transition-colors"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[hsl(38_92%_50%)] text-[hsl(240_10%_4%)] text-xs font-bold">
                    {initials}
                  </div>
                  <span className="hidden sm:block text-[hsl(0_0%_80%)] max-w-[120px] truncate">
                    {user.name ?? user.email}
                  </span>
                  <ChevronDown className="h-4 w-4 text-[hsl(240_5%_55%)]" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-52 rounded-xl border border-[hsl(240_5%_18%)] bg-[hsl(240_8%_10%)] shadow-xl py-1 z-50">
                    <div className="px-3 py-2 border-b border-[hsl(240_5%_18%)]">
                      <p className="text-xs text-[hsl(240_5%_55%)]">{t('nav_logged_in_as')}</p>
                      <p className="text-sm text-white truncate">{user.email}</p>
                    </div>
                    <Link
                      href="/dashboard/settings"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-[hsl(0_0%_80%)] hover:text-white hover:bg-[hsl(240_6%_15%)] transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4" />
                      {t('nav_settings')}
                    </Link>
                    <button
                      onClick={() => signOut({ callbackUrl: '/' })}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[hsl(0_72%_60%)] hover:text-[hsl(0_72%_70%)] hover:bg-[hsl(0_72%_51%)]/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      {t('nav_logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/auth/login">
                    <LogIn className="h-4 w-4" />
                    {t('nav_login')}
                  </Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/auth/register">
                    <UserPlus className="h-4 w-4" />
                    {t('nav_register')}
                  </Link>
                </Button>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-lg text-[hsl(0_0%_70%)] hover:text-white hover:bg-[hsl(240_6%_12%)] transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[hsl(240_5%_18%)] bg-[hsl(240_8%_8%)] px-4 py-3 space-y-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive(href)
                  ? 'bg-[hsl(38_92%_50%)]/10 text-[hsl(38_92%_50%)]'
                  : 'text-[hsl(0_0%_70%)] hover:text-white hover:bg-[hsl(240_6%_12%)]'
              )}
              onClick={() => setMobileOpen(false)}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
          {!user && (
            <div className="pt-2 flex flex-col gap-2">
              <Button variant="outline" size="sm" asChild className="w-full">
                <Link href="/auth/login" onClick={() => setMobileOpen(false)}>
                  {t('nav_login')}
                </Link>
              </Button>
              <Button size="sm" asChild className="w-full">
                <Link href="/auth/register" onClick={() => setMobileOpen(false)}>
                  {t('nav_register')}
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}
