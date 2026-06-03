"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

/**
 * Reveal
 * Animates children into view with a cinematic "fly-in" as they enter the
 * viewport, using IntersectionObserver (no animation library required).
 */
export default function Reveal({
  children,
  className = "",
  delay = 0,
  y = 40,
  once = true,
  as: Tag = "div",
}: {
  children: ReactNode
  className?: string
  delay?: number
  y?: number
  once?: boolean
  as?: any
}) {
  const ref = useRef<HTMLElement | null>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShown(true)
            if (once) io.unobserve(entry.target)
          } else if (!once) {
            setShown(false)
          }
        })
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [once])

  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translate3d(0,0,0)" : `translate3d(0,${y}px,0)`,
        filter: shown ? "blur(0px)" : "blur(8px)",
        transition: `opacity 0.9s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.9s cubic-bezier(0.22,1,0.36,1) ${delay}ms, filter 0.9s ease ${delay}ms`,
      }}
    >
      {children}
    </Tag>
  )
}
