import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-8xl font-bold gradient-text">404</div>
        <h1 className="text-3xl font-bold text-white">Stranica nije pronađena</h1>
        <p className="text-[hsl(240_5%_55%)] text-lg">
          Stranica koju tražite ne postoji ili je premještena.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-[hsl(38_92%_50%)] text-[hsl(240_10%_4%)] font-semibold hover:bg-[hsl(38_92%_45%)] transition-colors"
        >
          Nazad na početnu
        </Link>
      </div>
    </div>
  )
}
