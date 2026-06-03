"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import {
  ArrowRight,
  Play,
  Sparkles,
  Brain,
  Layers,
  Film,
  Cpu,
  Waves,
  Orbit,
  Boxes,
  Activity,
  ShieldCheck,
  ChevronDown,
  Clapperboard,
  Wand2,
  Radar,
} from "lucide-react"
import ParticleField from "@/components/landing/particle-field"
import HoloCard from "@/components/landing/holo-card"
import Reveal from "@/components/landing/reveal"

export default function ImmersiveLanding() {
  // Pointer-driven parallax for the hero's floating holographic layer
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2
      const ny = (e.clientY / window.innerHeight - 0.5) * 2
      setTilt({ x: nx, y: ny })
    }
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener("pointermove", onMove)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("scroll", onScroll)
    }
  }, [])

  const px = (depth: number) => ({
    transform: `translate3d(${tilt.x * depth}px, ${tilt.y * depth}px, 0)`,
  })

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#04060f] text-white antialiased selection:bg-fuchsia-500/30">
      {/* ============ FIXED COSMIC BACKDROP ============ */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        {/* deep space base */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#0a1130_0%,#04060f_55%,#02030a_100%)]" />
        {/* drifting aurora nebula blobs */}
        <div className="animate-aurora absolute -top-40 left-1/4 h-[55vw] w-[55vw] rounded-full bg-cyan-500/20 blur-[120px]" />
        <div className="animate-aurora-slow absolute top-1/3 right-0 h-[45vw] w-[45vw] rounded-full bg-fuchsia-600/20 blur-[130px]" />
        <div className="animate-float-slow absolute bottom-0 left-1/3 h-[40vw] w-[40vw] rounded-full bg-violet-600/20 blur-[140px]" />
        {/* particle simulation */}
        <ParticleField className="absolute inset-0 h-full w-full" />
        {/* subtle starfield + vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_55%,rgba(2,3,10,0.9)_100%)]" />
      </div>

      <Nav />

      {/* ===================== HERO ===================== */}
      <section className="relative flex min-h-screen items-center justify-center px-6 pt-24">
        {/* perspective grid floor */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[42vh] [mask-image:linear-gradient(to_top,black,transparent)]"
          style={{
            perspective: "420px",
            transform: `translateY(${scrollY * 0.15}px)`,
          }}
        >
          <div
            className="holo-grid absolute inset-0 opacity-60"
            style={{ transform: "rotateX(72deg)", transformOrigin: "bottom" }}
          />
        </div>

        {/* floating holographic panels (parallax) */}
        <FloatingPanel
          className="left-[6%] top-[24%] hidden w-60 lg:block"
          style={px(26)}
          tone="cyan"
          delay="animate-float"
        >
          <LiveBudgetPanel />
        </FloatingPanel>

        <FloatingPanel
          className="right-[5%] top-[20%] hidden w-64 lg:block"
          style={px(40)}
          tone="fuchsia"
          delay="animate-float-delay"
        >
          <AISuggestionPanel />
        </FloatingPanel>

        <FloatingPanel
          className="left-[10%] bottom-[14%] hidden w-56 xl:block"
          style={px(18)}
          tone="violet"
          delay="animate-float-slow"
        >
          <SignalPanel />
        </FloatingPanel>

        <FloatingPanel
          className="right-[9%] bottom-[16%] hidden w-60 xl:block"
          style={px(32)}
          tone="cyan"
          delay="animate-float"
        >
          <RenderPanel />
        </FloatingPanel>

        {/* central content */}
        <div
          className="relative z-10 mx-auto max-w-4xl text-center"
          style={{ transform: `translateY(${scrollY * -0.12}px)`, opacity: Math.max(0, 1 - scrollY / 600) }}
        >
          <Reveal>
            <div className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium tracking-wide text-cyan-200 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
              </span>
              StudioFlow OS · the production multiverse
            </div>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="text-5xl font-black leading-[0.95] tracking-tight sm:text-7xl md:text-8xl">
              <span className="block text-white/95">Direct your</span>
              <span className="neon-text block drop-shadow-[0_0_40px_rgba(168,85,247,0.45)]">
                entire universe
              </span>
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="mx-auto mt-7 max-w-xl text-balance text-base text-slate-300/90 sm:text-lg">
              An AI-native production engine where script, schedule, budget and
              VFX collapse into a single living interface. Step inside the
              next-gen studio.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/" className="group relative">
                <span className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-violet-500 opacity-70 blur-md transition-opacity duration-300 group-hover:opacity-100" />
                <span className="relative flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-slate-950 transition-transform duration-300 group-hover:scale-[1.03]">
                  Enter the Studio
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
              <button className="group flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/10">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 transition-colors group-hover:bg-fuchsia-500/30">
                  <Play className="h-3.5 w-3.5 fill-current" />
                </span>
                Watch the Showreel
              </button>
            </div>
          </Reveal>

          <Reveal delay={360}>
            <div className="mt-14 flex items-center justify-center gap-8 text-[11px] uppercase tracking-[0.2em] text-slate-500">
              <span>AI-Native</span>
              <span className="h-3 w-px bg-white/20" />
              <span>Real-Time</span>
              <span className="h-3 w-px bg-white/20" />
              <span>Cinematic</span>
            </div>
          </Reveal>
        </div>

        {/* scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-400">
          <ChevronDown className="animate-scroll-bob h-6 w-6" />
        </div>
      </section>

      {/* ===================== MARQUEE ===================== */}
      <section className="relative border-y border-white/5 bg-white/[0.02] py-6 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-6 text-sm font-medium text-slate-400">
          {[
            { icon: Film, label: "Script" },
            { icon: Layers, label: "Storyboard" },
            { icon: Clapperboard, label: "Dailies" },
            { icon: Wand2, label: "VFX" },
            { icon: Activity, label: "Schedule" },
            { icon: Boxes, label: "Assets" },
            { icon: Radar, label: "Scouting" },
          ].map(({ icon: Icon, label }) => (
            <span key={label} className="flex items-center gap-2 transition-colors hover:text-white">
              <Icon className="h-4 w-4 text-cyan-300/80" />
              {label}
            </span>
          ))}
        </div>
      </section>

      {/* ===================== FEATURES ===================== */}
      <section id="features" className="relative px-6 py-28 sm:py-36">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-fuchsia-300">
              A living interface
            </p>
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Modules that think,{" "}
              <span className="neon-text">render and react</span>
            </h2>
            <p className="mt-5 text-slate-400">
              Every surface is reactive holographic glass. Hover, tilt, and watch
              the data breathe in real time.
            </p>
          </Reveal>

          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 90}>
                <HoloCard glow={f.rgb} className="h-full p-7">
                  <div
                    className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10"
                    style={{ background: `rgba(${f.rgb},0.12)` }}
                  >
                    <f.icon className="h-6 w-6" style={{ color: f.color }} />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-white">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-400">{f.desc}</p>
                </HoloCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== ABSTRACT 3D SHOWCASE ===================== */}
      <section className="relative overflow-hidden px-6 py-28 sm:py-36">
        <div className="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-2">
          <Reveal>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">
              The AI core
            </p>
            <h2 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              One neural engine{" "}
              <span className="neon-text">orchestrating every department</span>
            </h2>
            <p className="mt-6 max-w-md text-slate-400">
              Feed it a script. It breaks down scenes, forecasts the budget,
              optimizes the stripboard and renders concept frames — continuously,
              while you create.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                "Context-aware breakdowns in seconds",
                "Predictive budget & risk simulation",
                "Generative storyboards, audio & previz",
              ].map((t) => (
                <li key={t} className="flex items-center gap-3 text-slate-200">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400/30 to-fuchsia-500/30 ring-1 ring-white/10">
                    <Sparkles className="h-3.5 w-3.5 text-cyan-200" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <Link
              href="/"
              className="group mt-10 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold backdrop-blur-md transition-colors hover:bg-white/10"
            >
              Explore the engine
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Reveal>

          {/* Abstract orbiting 3D environment */}
          <Reveal delay={120} className="relative flex items-center justify-center">
            <OrbitCore />
          </Reveal>
        </div>
      </section>

      {/* ===================== STATS ===================== */}
      <section className="relative border-y border-white/5 bg-white/[0.02] px-6 py-20 backdrop-blur-sm">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 text-center md:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 90}>
              <Counter value={s.value} suffix={s.suffix} />
              <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                {s.label}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===================== FINAL CTA ===================== */}
      <section className="relative px-6 py-32">
        <Reveal className="mx-auto max-w-4xl">
          <div className="scan-sweep relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] px-8 py-16 text-center backdrop-blur-xl">
            <div className="pointer-events-none absolute -top-1/2 left-1/2 h-[120%] w-[60%] -translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-[120px]" />
            <div className="relative">
              <h2 className="text-4xl font-bold tracking-tight sm:text-6xl">
                Your production,{" "}
                <span className="neon-text">in another dimension</span>
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-slate-300/90">
                Join the studios building tomorrow's stories inside a digital
                universe that anticipates every move.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/" className="group relative">
                  <span className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-violet-500 opacity-70 blur-md transition-opacity group-hover:opacity-100" />
                  <span className="relative flex items-center gap-2 rounded-full bg-white px-9 py-4 text-sm font-semibold text-slate-950 transition-transform group-hover:scale-[1.03]">
                    Launch StudioFlow
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
                <button className="rounded-full border border-white/15 bg-white/5 px-8 py-4 text-sm font-semibold backdrop-blur-md transition-colors hover:bg-white/10">
                  Book a Demo
                </button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <Footer />
    </div>
  )
}

/* ============================================================= */
/*  NAV                                                            */
/* ============================================================= */
function Nav() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])
  return (
    <nav
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        scrolled ? "border-b border-white/10 bg-[#04060f]/70 backdrop-blur-xl" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/landing" className="flex items-center gap-2.5 font-bold tracking-tight">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-fuchsia-600">
            <Orbit className="h-5 w-5 text-white" />
            <span className="absolute inset-0 animate-neon-pulse rounded-lg bg-fuchsia-500/40 blur-md" />
          </span>
          <span className="text-lg">StudioFlow</span>
        </Link>
        <div className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
          <Link href="#features" className="transition-colors hover:text-white">Universe</Link>
          <Link href="#features" className="transition-colors hover:text-white">Engine</Link>
          <Link href="#features" className="transition-colors hover:text-white">Pricing</Link>
        </div>
        <Link href="/" className="group relative">
          <span className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 opacity-0 blur transition-opacity group-hover:opacity-80" />
          <span className="relative rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-semibold backdrop-blur-md transition-colors group-hover:bg-white/10">
            Get Started
          </span>
        </Link>
      </div>
    </nav>
  )
}

/* ============================================================= */
/*  FLOATING HERO PANEL WRAPPER                                    */
/* ============================================================= */
function FloatingPanel({
  children,
  className = "",
  style,
  tone,
  delay,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  tone: "cyan" | "fuchsia" | "violet"
  delay: string
}) {
  const ring =
    tone === "cyan"
      ? "shadow-[0_0_60px_-15px_rgba(34,211,238,0.5)]"
      : tone === "fuchsia"
      ? "shadow-[0_0_60px_-15px_rgba(236,72,153,0.5)]"
      : "shadow-[0_0_60px_-15px_rgba(168,85,247,0.5)]"
  return (
    <div className={`absolute z-10 ${className}`} style={style}>
      <div className={`${delay}`}>
        <div
          className={`scan-sweep relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur-xl ${ring}`}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          {children}
        </div>
      </div>
    </div>
  )
}

/* ---- hero panel contents ---- */
function LiveBudgetPanel() {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-xs text-slate-400">
        <Cpu className="h-3.5 w-3.5 text-cyan-300" /> Budget Engine
      </div>
      <div className="text-2xl font-bold text-white">$127,400</div>
      <div className="text-xs text-emerald-400">▲ saved this week</div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400" />
      </div>
    </div>
  )
}
function AISuggestionPanel() {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs text-fuchsia-300">
        <Brain className="h-3.5 w-3.5" /> AI Suggestion
      </div>
      <p className="text-xs leading-relaxed text-slate-200">
        Scene 4 (EXT. STREET — NIGHT) needs a rain tower. Re-route crew to save
        <span className="font-semibold text-fuchsia-300"> 1.5 days</span>?
      </p>
      <div className="mt-3 flex gap-2">
        <span className="rounded-md bg-fuchsia-500/20 px-2 py-1 text-[10px] font-medium text-fuchsia-200">Apply</span>
        <span className="rounded-md bg-white/5 px-2 py-1 text-[10px] text-slate-400">Dismiss</span>
      </div>
    </div>
  )
}
function SignalPanel() {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-xs text-slate-400">
        <Waves className="h-3.5 w-3.5 text-violet-300" /> Live Mix
      </div>
      <div className="flex h-12 items-end gap-1">
        {[0.4, 0.7, 0.3, 0.9, 0.5, 0.8, 0.6, 0.95, 0.45, 0.7, 0.35].map((h, i) => (
          <span
            key={i}
            className="eq-bar w-1.5 flex-1 rounded-sm bg-gradient-to-t from-violet-500 to-cyan-300"
            style={{ height: `${h * 100}%`, animationDelay: `${i * 0.08}s` }}
          />
        ))}
      </div>
    </div>
  )
}
function RenderPanel() {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-2">
          <Wand2 className="h-3.5 w-3.5 text-cyan-300" /> Generating frames
        </span>
        <span className="text-cyan-300">92%</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-md bg-gradient-to-br from-cyan-500/30 to-fuchsia-500/30 ring-1 ring-white/10"
            style={{ opacity: i < 5 ? 1 : 0.4 }}
          />
        ))}
      </div>
    </div>
  )
}

/* ============================================================= */
/*  ABSTRACT ORBIT 3D CORE                                         */
/* ============================================================= */
function OrbitCore() {
  return (
    <div className="relative h-80 w-80 sm:h-96 sm:w-96" style={{ perspective: "1000px" }}>
      {/* glowing core */}
      <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2">
        <div className="absolute inset-0 animate-neon-pulse rounded-full bg-gradient-to-br from-cyan-400 to-fuchsia-500 blur-2xl" />
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-300 to-fuchsia-500 shadow-[0_0_60px_rgba(168,85,247,0.7)]" />
        <div className="absolute inset-3 rounded-full bg-[#04060f]/40 backdrop-blur-sm" />
        <Orbit className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 text-white" />
      </div>

      {/* orbit rings (tilted in 3D) */}
      <div
        className="animate-orbit absolute inset-0 rounded-full border border-cyan-400/30"
        style={{ transform: "rotateX(72deg)" }}
      >
        <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.9)]" />
      </div>
      <div
        className="animate-orbit-rev absolute inset-6 rounded-full border border-fuchsia-400/30"
        style={{ transform: "rotateX(72deg) rotateZ(60deg)" }}
      >
        <span className="absolute -top-1.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-fuchsia-300 shadow-[0_0_16px_rgba(236,72,153,0.9)]" />
      </div>
      <div
        className="animate-orbit absolute inset-12 rounded-full border border-violet-400/30"
        style={{ transform: "rotateX(60deg) rotateZ(-40deg)", animationDuration: "18s" }}
      >
        <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-violet-300 shadow-[0_0_16px_rgba(168,85,247,0.9)]" />
      </div>

      {/* floating wire frame box */}
      <div className="animate-float-slow absolute right-2 top-4 h-10 w-10 rotate-12 border border-cyan-400/40" />
      <div className="animate-float absolute bottom-6 left-2 h-8 w-8 -rotate-12 rounded-md border border-fuchsia-400/40" />
    </div>
  )
}

/* ============================================================= */
/*  ANIMATED COUNTER                                               */
/* ============================================================= */
function Counter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [n, setN] = useState(0)
  const ref = useRef<HTMLDivElement | null>(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !started.current) {
          started.current = true
          const dur = 1400
          const t0 = performance.now()
          const tick = (t: number) => {
            const p = Math.min(1, (t - t0) / dur)
            const eased = 1 - Math.pow(1 - p, 3)
            setN(Math.round(value * eased))
            if (p < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }
      })
    }, { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [value])

  return (
    <div ref={ref} className="neon-text text-4xl font-black sm:text-5xl">
      {n.toLocaleString()}
      {suffix}
    </div>
  )
}

/* ============================================================= */
/*  FOOTER                                                         */
/* ============================================================= */
function Footer() {
  return (
    <footer className="relative border-t border-white/10 bg-[#02030a]/80 px-6 py-14 backdrop-blur-sm">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-4">
        <div className="md:col-span-1">
          <div className="flex items-center gap-2.5 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-fuchsia-600">
              <Orbit className="h-5 w-5 text-white" />
            </span>
            StudioFlow
          </div>
          <p className="mt-4 max-w-xs text-sm text-slate-500">
            The immersive production multiverse for the next generation of
            storytellers.
          </p>
        </div>
        {FOOTER_COLS.map((col) => (
          <div key={col.title}>
            <h4 className="mb-4 text-sm font-semibold text-white">{col.title}</h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              {col.links.map((l) => (
                <li key={l}>
                  <Link href="#" className="transition-colors hover:text-cyan-300">{l}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-12 flex max-w-6xl flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 text-sm text-slate-500 md:flex-row">
        <p>© {new Date().getFullYear()} StudioFlow. Engineered in the future.</p>
        <div className="flex gap-6">
          <Link href="#" className="hover:text-white">Privacy</Link>
          <Link href="#" className="hover:text-white">Terms</Link>
        </div>
      </div>
    </footer>
  )
}

/* ============================================================= */
/*  DATA                                                          */
/* ============================================================= */
const FEATURES = [
  {
    icon: Brain,
    title: "Context-Aware AI",
    desc: "It reads your script, budget and schedule, then proposes the next move before you ask.",
    color: "#22d3ee",
    rgb: "34, 211, 238",
  },
  {
    icon: Layers,
    title: "Layered Depth UI",
    desc: "Holographic glass panels float in 3D space and react to every gesture you make.",
    color: "#a855f7",
    rgb: "168, 85, 247",
  },
  {
    icon: Activity,
    title: "Real-Time Sync",
    desc: "Change the script and breakdowns, stripboards and budgets ripple instantly across the universe.",
    color: "#ec4899",
    rgb: "236, 72, 153",
  },
  {
    icon: Wand2,
    title: "Generative Frames",
    desc: "Spin up storyboards, previz, concept art and audio beds straight from a single prompt.",
    color: "#38bdf8",
    rgb: "56, 189, 248",
  },
  {
    icon: Orbit,
    title: "Cinematic Transitions",
    desc: "Navigate modules with camera-like motion that makes the whole studio feel alive.",
    color: "#c084fc",
    rgb: "192, 132, 252",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise Secure",
    desc: "Bank-grade encryption and role-based access keep your intellectual property locked tight.",
    color: "#2dd4bf",
    rgb: "45, 212, 191",
  },
]

const STATS = [
  { value: 14000, suffix: "+", label: "Productions" },
  { value: 92, suffix: "%", label: "Faster Prep" },
  { value: 127, suffix: "K", label: "Avg. Saved" },
  { value: 60, suffix: "+", label: "AI Modules" },
]

const FOOTER_COLS = [
  { title: "Product", links: ["Universe", "Engine", "Pricing", "Changelog"] },
  { title: "Resources", links: ["Docs", "API", "Community", "Blog"] },
  { title: "Company", links: ["About", "Careers", "Legal", "Contact"] },
]
