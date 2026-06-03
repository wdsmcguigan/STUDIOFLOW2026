import Link from "next/link"
import { Orbit, ArrowLeft } from "lucide-react"
import { SITE } from "@/lib/site-config"
import OpenCookieSettings from "@/components/open-cookie-settings"

type TocItem = { id: string; label: string }

/**
 * Shared chrome for the legal / compliance pages (Privacy, Terms, Cookies).
 * Keeps the cinematic StudioFlow look while staying highly readable.
 */
export default function LegalShell({
  title,
  subtitle,
  toc,
  children,
}: {
  title: string
  subtitle?: string
  toc?: TocItem[]
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#04060f] text-white selection:bg-fuchsia-500/30">
      {/* subtle cosmic backdrop */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#0a1130_0%,#04060f_60%,#02030a_100%)]" />
        <div className="animate-aurora absolute -top-40 left-1/4 h-[45vw] w-[45vw] rounded-full bg-cyan-500/10 blur-[130px]" />
        <div className="animate-aurora-slow absolute right-0 top-1/3 h-[40vw] w-[40vw] rounded-full bg-fuchsia-600/10 blur-[140px]" />
      </div>

      {/* nav */}
      <nav className="sticky top-0 z-40 border-b border-white/10 bg-[#04060f]/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/landing" className="flex items-center gap-2.5 font-bold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-fuchsia-600">
              <Orbit className="h-5 w-5 text-white" />
            </span>
            <span className="text-lg">{SITE.name}</span>
          </Link>
          <Link
            href="/landing"
            className="flex items-center gap-2 text-sm text-slate-300 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to site
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
          {subtitle && <p className="mt-4 text-slate-400">{subtitle}</p>}
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-1 text-xs uppercase tracking-[0.15em] text-slate-500">
            <span>Effective: {SITE.effectiveDate}</span>
            <span>Last updated: {SITE.lastUpdated}</span>
          </div>
        </header>

        {toc && toc.length > 0 && (
          <nav className="mb-12 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Contents
            </h2>
            <ol className="grid gap-x-6 gap-y-2 text-sm text-slate-300 sm:grid-cols-2">
              {toc.map((item, i) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="text-slate-300 transition-colors hover:text-cyan-300"
                  >
                    <span className="mr-2 text-slate-500">{i + 1}.</span>
                    {item.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <article className="legal-prose">{children}</article>

        {/* cross-links */}
        <div className="mt-16 flex flex-wrap gap-4 border-t border-white/10 pt-8 text-sm">
          <Link href="/privacy" className="text-slate-300 transition-colors hover:text-cyan-300">Privacy Policy</Link>
          <span className="text-slate-600">·</span>
          <Link href="/terms" className="text-slate-300 transition-colors hover:text-cyan-300">Terms of Service</Link>
          <span className="text-slate-600">·</span>
          <Link href="/cookies" className="text-slate-300 transition-colors hover:text-cyan-300">Cookie Policy</Link>
          <span className="text-slate-600">·</span>
          <OpenCookieSettings className="text-slate-300 transition-colors hover:text-cyan-300">
            Cookie Settings
          </OpenCookieSettings>
        </div>
      </main>
    </div>
  )
}
