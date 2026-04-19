'use client'

import * as React from 'react'

export type Lang = 'sr' | 'en'

// ---------------------------------------------------------------------------
// Translations
// ---------------------------------------------------------------------------

export const translations = {
  sr: {
    // Navbar
    nav_dashboard: 'Dashboard',
    nav_projects: 'Projekti',
    nav_settings: 'Podešavanja',
    nav_login: 'Prijavi se',
    nav_register: 'Registruj se',
    nav_logout: 'Odjavi se',
    nav_logged_in_as: 'Prijavljen kao',
    // Login page
    login_title: 'Prijavite se',
    login_subtitle: 'Unesite vaše podatke da biste pristupili nalogu',
    login_email: 'Email adresa',
    login_password: 'Lozinka',
    login_forgot: 'Zaboravili ste lozinku?',
    login_submit: 'Prijavite se',
    login_no_account: 'Nemate nalog?',
    login_register_link: 'Registrujte se',
    login_error_creds: 'Pogrešan email ili lozinka. Pokušajte ponovo.',
    login_error_generic: 'Došlo je do greške. Pokušajte ponovo.',
    // Register page
    register_title: 'Kreirajte nalog',
    register_submit: 'Registrujte se',
    register_have_account: 'Već imate nalog?',
    register_login_link: 'Prijavite se',
  },
  en: {
    // Navbar
    nav_dashboard: 'Dashboard',
    nav_projects: 'Projects',
    nav_settings: 'Settings',
    nav_login: 'Log in',
    nav_register: 'Sign up',
    nav_logout: 'Log out',
    nav_logged_in_as: 'Logged in as',
    // Login page
    login_title: 'Log in',
    login_subtitle: 'Enter your credentials to access your account',
    login_email: 'Email address',
    login_password: 'Password',
    login_forgot: 'Forgot password?',
    login_submit: 'Log in',
    login_no_account: "Don't have an account?",
    login_register_link: 'Sign up',
    login_error_creds: 'Incorrect email or password. Please try again.',
    login_error_generic: 'An error occurred. Please try again.',
    // Register page
    register_title: 'Create account',
    register_submit: 'Sign up',
    register_have_account: 'Already have an account?',
    register_login_link: 'Log in',
  },
} satisfies Record<Lang, Record<string, string>>

export type TranslationKey = keyof typeof translations.sr

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface LanguageContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: TranslationKey) => string
}

const LanguageContext = React.createContext<LanguageContextValue>({
  lang: 'sr',
  setLang: () => {},
  t: (key) => translations.sr[key],
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<Lang>('sr')

  // Hydrate from localStorage on mount
  React.useEffect(() => {
    const stored = localStorage.getItem('cheggie_lang') as Lang | null
    if (stored === 'en' || stored === 'sr') setLangState(stored)
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem('cheggie_lang', l)
  }

  const t = React.useCallback(
    (key: TranslationKey) => translations[lang][key] ?? translations.sr[key],
    [lang]
  )

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return React.useContext(LanguageContext)
}
