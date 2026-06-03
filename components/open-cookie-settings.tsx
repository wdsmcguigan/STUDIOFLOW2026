"use client"

import type { ReactNode } from "react"

export const OPEN_COOKIE_EVENT = "sf:open-cookie-settings"

/**
 * A button that re-opens the cookie preferences panel from anywhere
 * (e.g. footers). Works by dispatching a window event the CookieConsent
 * manager listens for.
 */
export default function OpenCookieSettings({
  children = "Cookie Settings",
  className = "",
}: {
  children?: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_EVENT))}
      className={className}
    >
      {children}
    </button>
  )
}
