"use client"

import { useRef, useState, type ReactNode } from "react"

/**
 * HoloCard
 * A floating glassmorphism panel that tilts in 3D toward the pointer and
 * renders a moving holographic sheen, giving the interface a "living",
 * layered-depth feel.
 */
export default function HoloCard({
  children,
  className = "",
  intensity = 12,
  glow = "168, 85, 247", // rgb violet
}: {
  children: ReactNode
  className?: string
  intensity?: number
  glow?: string
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [style, setStyle] = useState<React.CSSProperties>({})
  const [sheen, setSheen] = useState({ x: 50, y: 50, on: false })

  const handleMove = (e: React.PointerEvent) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    const rotateY = (px - 0.5) * intensity
    const rotateX = (0.5 - py) * intensity
    setStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(8px)`,
    })
    setSheen({ x: px * 100, y: py * 100, on: true })
  }

  const reset = () => {
    setStyle({
      transform: "perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)",
    })
    setSheen((s) => ({ ...s, on: false }))
  }

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      style={style}
      className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl transition-transform duration-300 ease-out will-change-transform ${className}`}
    >
      {/* holographic sheen following the pointer */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300"
        style={{
          opacity: sheen.on ? 1 : 0,
          background: `radial-gradient(420px circle at ${sheen.x}% ${sheen.y}%, rgba(${glow}, 0.18), transparent 60%)`,
        }}
      />
      {/* top edge light */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      {/* inner border glow on hover */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ boxShadow: `inset 0 0 40px rgba(${glow}, 0.15)` }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
