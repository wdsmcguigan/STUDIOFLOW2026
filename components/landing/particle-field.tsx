"use client"

import { useEffect, useRef } from "react"

/**
 * ParticleField
 * A lightweight, WebGL-inspired particle simulation rendered on a 2D canvas
 * using additive ("lighter") compositing for a glowing, holographic feel.
 *
 * Features:
 *  - Flow-field drift so particles move like fluid / smoke
 *  - Pointer attraction so the field reacts to the cursor (camera-like depth)
 *  - Neon constellation links between nearby particles
 *  - Depth layering (parallax z) for a sense of 3D space
 *  - DPR aware, resize aware, and respects prefers-reduced-motion
 */

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  z: number // 0 (far) -> 1 (near) for parallax + size
  hue: number
  baseSpeed: number
}

const NEON_HUES = [188, 264, 320, 210, 168] // cyan, violet, magenta, blue, teal

export default function ParticleField({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d", { alpha: true })
    if (!ctx) return

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

    let width = 0
    let height = 0
    let dpr = Math.min(window.devicePixelRatio || 1, 2)

    let particles: Particle[] = []
    const pointer = { x: -9999, y: -9999, active: false }
    let time = 0
    let raf = 0

    const resize = () => {
      width = canvas.clientWidth
      height = canvas.clientHeight
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      seed()
    }

    const seed = () => {
      // density scales with screen area but stays capped for performance
      const target = Math.min(150, Math.floor((width * height) / 11000))
      particles = new Array(Math.max(40, target)).fill(0).map(() => {
        const z = Math.random()
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          vx: 0,
          vy: 0,
          z,
          hue: NEON_HUES[(Math.random() * NEON_HUES.length) | 0],
          baseSpeed: 0.15 + z * 0.55,
        }
      })
    }

    // Cheap pseudo flow-field (no noise lib needed)
    const flow = (x: number, y: number, t: number) => {
      const a =
        Math.sin(x * 0.0016 + t * 0.0003) +
        Math.cos(y * 0.0019 - t * 0.00025) +
        Math.sin((x + y) * 0.0011 + t * 0.0004)
      return a * Math.PI
    }

    const step = () => {
      time += reduceMotion ? 4 : 16
      ctx.clearRect(0, 0, width, height)
      ctx.globalCompositeOperation = "lighter"

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        const angle = flow(p.x, p.y, time)
        p.vx += Math.cos(angle) * 0.04 * p.baseSpeed
        p.vy += Math.sin(angle) * 0.04 * p.baseSpeed

        // Pointer attraction — gives a "lensing" camera feel
        if (pointer.active) {
          const dx = pointer.x - p.x
          const dy = pointer.y - p.y
          const dist2 = dx * dx + dy * dy
          if (dist2 < 240 * 240) {
            const f = (1 - Math.sqrt(dist2) / 240) * 0.6 * p.z
            p.vx += (dx / (Math.sqrt(dist2) + 0.001)) * f
            p.vy += (dy / (Math.sqrt(dist2) + 0.001)) * f
          }
        }

        // damping + clamp
        p.vx *= 0.94
        p.vy *= 0.94
        const max = 1.6 * p.baseSpeed
        p.vx = Math.max(-max, Math.min(max, p.vx))
        p.vy = Math.max(-max, Math.min(max, p.vy))

        p.x += p.vx
        p.y += p.vy

        // wrap around edges for an endless field
        if (p.x < -20) p.x = width + 20
        if (p.x > width + 20) p.x = -20
        if (p.y < -20) p.y = height + 20
        if (p.y > height + 20) p.y = -20

        const size = 0.6 + p.z * 2.4
        const alpha = 0.18 + p.z * 0.5
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 6)
        glow.addColorStop(0, `hsla(${p.hue}, 100%, 70%, ${alpha})`)
        glow.addColorStop(1, `hsla(${p.hue}, 100%, 60%, 0)`)
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(p.x, p.y, size * 6, 0, Math.PI * 2)
        ctx.fill()

        // bright core
        ctx.fillStyle = `hsla(${p.hue}, 100%, 88%, ${alpha + 0.2})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2)
        ctx.fill()
      }

      // constellation links (only for nearer particles to save work)
      ctx.lineWidth = 0.6
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i]
        if (a.z < 0.45) continue
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j]
          if (b.z < 0.45) continue
          const dx = a.x - b.x
          const dy = a.y - b.y
          const d2 = dx * dx + dy * dy
          if (d2 < 140 * 140) {
            const o = (1 - Math.sqrt(d2) / 140) * 0.22
            ctx.strokeStyle = `hsla(${a.hue}, 100%, 70%, ${o})`
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      ctx.globalCompositeOperation = "source-over"
      raf = requestAnimationFrame(step)
    }

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      pointer.x = e.clientX - rect.left
      pointer.y = e.clientY - rect.top
      pointer.active = true
    }
    const onPointerLeave = () => {
      pointer.active = false
      pointer.x = -9999
      pointer.y = -9999
    }

    resize()
    window.addEventListener("resize", resize)
    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerleave", onPointerLeave)
    raf = requestAnimationFrame(step)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerleave", onPointerLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
    />
  )
}
