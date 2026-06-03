"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Analytics } from "@vercel/analytics/react"
import { Cookie, X, ShieldCheck, BarChart3 } from "lucide-react"
import { OPEN_COOKIE_EVENT } from "@/components/open-cookie-settings"

const STORAGE_KEY = "sf-cookie-consent-v1"

type Consent = {
  necessary: true
  analytics: boolean
  ts: number
}

function readConsent(): Consent | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (typeof parsed?.analytics === "boolean") return parsed as Consent
    return null
  } catch {
    return null
  }
}

/**
 * Granular, GDPR/CCPA-style cookie consent manager.
 *  - Necessary cookies are always on (required for the app to work).
 *  - Analytics is opt-in; analytics scripts only load once granted.
 *  - The choice is stored locally and can be reopened from any footer.
 */
export default function CookieConsent() {
  const [consent, setConsent] = useState<Consent | null>(null)
  const [open, setOpen] = useState(false)
  const [showPrefs, setShowPrefs] = useState(false)
  const [analyticsOn, setAnalyticsOn] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const existing = readConsent()
    if (existing) {
      setConsent(existing)
      setAnalyticsOn(existing.analytics)
    } else {
      setOpen(true)
    }

    const reopen = () => {
      const current = readConsent()
      setAnalyticsOn(current?.analytics ?? false)
      setShowPrefs(true)
      setOpen(true)
    }
    window.addEventListener(OPEN_COOKIE_EVENT, reopen)
    return () => window.removeEventListener(OPEN_COOKIE_EVENT, reopen)
  }, [])

  const persist = (analytics: boolean) => {
    const next: Consent = { necessary: true, analytics, ts: Date.now() }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* storage may be unavailable; consent simply won't persist */
    }
    setConsent(next)
    setOpen(false)
    setShowPrefs(false)
  }

  if (!mounted) return null

  return (
    <>
      {/* Analytics loads only with consent */}
      {consent?.analytics && <Analytics />}

      {open && (
        <div className="fixed inset-x-0 bottom-0 z-[100] flex justify-center p-4 sm:p-6">
          <div
            role="dialog"
            aria-label="Cookie consent"
            aria-modal="false"
            className="scan-sweep relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#080b1a]/90 p-5 shadow-[0_20px_80px_-20px_rgba(168,85,247,0.5)] backdrop-blur-xl sm:p-6"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400/20 to-fuchsia-500/20 ring-1 ring-white/10">
                <Cookie className="h-5 w-5 text-cyan-300" />
              </span>
              <div className="flex-1">
                <h2 className="text-base font-semibold text-white">We value your privacy</h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-300">
                  We use necessary cookies to run StudioFlow and, with your
                  consent, analytics cookies to understand how the product is
                  used. Read more in our{" "}
                  <Link href="/cookies" className="text-cyan-300 underline underline-offset-2 hover:text-fuchsia-300">
                    Cookie Policy
                  </Link>
                  .
                </p>
              </div>
              <button
                onClick={() => persist(consent?.analytics ?? false)}
                aria-label="Close and keep current settings"
                className="rounded-md p-1 text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {showPrefs && (
              <div className="mt-5 space-y-3">
                <PrefRow
                  icon={<ShieldCheck className="h-4 w-4 text-emerald-300" />}
                  title="Strictly necessary"
                  desc="Required for authentication, security and core functionality. Always active."
                  checked
                  disabled
                />
                <PrefRow
                  icon={<BarChart3 className="h-4 w-4 text-cyan-300" />}
                  title="Analytics"
                  desc="Privacy-friendly usage measurement to help us improve StudioFlow."
                  checked={analyticsOn}
                  onChange={setAnalyticsOn}
                />
              </div>
            )}

            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-end">
              {!showPrefs && (
                <button
                  onClick={() => setShowPrefs(true)}
                  className="order-3 rounded-full px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:text-white sm:order-1 sm:mr-auto"
                >
                  Customize
                </button>
              )}
              {showPrefs ? (
                <button
                  onClick={() => persist(analyticsOn)}
                  className="order-1 rounded-full border border-white/15 bg-white/5 px-6 py-2.5 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/10"
                >
                  Save preferences
                </button>
              ) : (
                <button
                  onClick={() => persist(false)}
                  className="order-2 rounded-full border border-white/15 bg-white/5 px-6 py-2.5 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/10"
                >
                  Reject non-essential
                </button>
              )}
              <button onClick={() => persist(true)} className="group relative order-1 sm:order-3">
                <span className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-violet-500 opacity-70 blur transition-opacity group-hover:opacity-100" />
                <span className="relative block rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-slate-950 transition-transform group-hover:scale-[1.02]">
                  Accept all
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function PrefRow({
  icon,
  title,
  desc,
  checked,
  disabled = false,
  onChange,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  checked: boolean
  disabled?: boolean
  onChange?: (v: boolean) => void
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
      <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-white/5">
        {icon}
      </span>
      <div className="flex-1">
        <div className="text-sm font-medium text-white">{title}</div>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={`relative mt-0.5 h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
          checked ? "bg-gradient-to-r from-cyan-400 to-fuchsia-500" : "bg-white/15"
        } ${disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  )
}
