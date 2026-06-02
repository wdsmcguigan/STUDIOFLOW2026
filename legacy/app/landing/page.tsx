"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Check, Play, Star, Zap, Users, Shield, Globe, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[#0f172a] text-white selection:bg-blue-500/30">
            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-[#0f172a]/80 backdrop-blur-md">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-white fill-white" />
                        </div>
                        StudioFlow
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
                        <Link href="#features" className="hover:text-white transition-colors">Features</Link>
                        <Link href="#solutions" className="hover:text-white transition-colors">Solutions</Link>
                        <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/" className="text-sm font-medium text-slate-300 hover:text-white transition-colors hidden sm:block">
                            Log in
                        </Link>
                        <Link href="/">
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white rounded-full px-6">
                                Get Started
                            </Button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
                {/* Background Gradients */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-500/20 rounded-full blur-[100px] -z-10" />
                <div className="absolute bottom-0 right-0 w-[800px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] -z-10" />

                <div className="container mx-auto px-6 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-blue-300 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                        <Sparkles className="w-4 h-4" />
                        <span>Now with Context-Aware AI Generation</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-tight animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
                        Production Management <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                            Reimagined for Creators
                        </span>
                    </h1>

                    <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                        The first AI-native ecosystem that orchestrates your entire production lifecycle.
                        From script to screen, StudioFlow anticipates your needs and automates the chaos.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                        <Link href="/">
                            <Button size="lg" className="h-12 px-8 rounded-full bg-blue-600 hover:bg-blue-500 text-base">
                                Start Production Free
                                <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                        </Link>
                        <Button size="lg" variant="outline" className="h-12 px-8 rounded-full border-white/10 hover:bg-white/5 text-base text-white hover:text-white">
                            <Play className="mr-2 w-4 h-4" />
                            Watch Showreel
                        </Button>
                    </div>

                    {/* Hero Image / UI Mockup */}
                    <div className="mt-20 relative mx-auto max-w-5xl rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-2 shadow-2xl animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent z-10" />
                        <img
                            src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1974&auto=format&fit=crop"
                            alt="StudioFlow Dashboard"
                            className="rounded-lg w-full shadow-2xl opacity-80"
                        />

                        {/* Floating Cards */}
                        <div className="absolute -left-12 top-1/4 bg-[#1e293b] p-4 rounded-lg border border-white/10 shadow-xl hidden md:block z-20">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded bg-green-500/20 flex items-center justify-center">
                                    <DollarSignIcon className="w-5 h-5 text-green-400" />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-400">Budget Savings</div>
                                    <div className="font-bold text-green-400">+$12,450</div>
                                </div>
                            </div>
                        </div>

                        <div className="absolute -right-8 bottom-1/3 bg-[#1e293b] p-4 rounded-lg border border-white/10 shadow-xl hidden md:block z-20">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                                    <Users className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-400">Crew Available</div>
                                    <div className="font-bold text-white">14 / 15 Confirmed</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Heading */}
            <section id="features" className="py-20 bg-[#0b1120]">
                <div className="container mx-auto px-6">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-6">
                            The <span className="text-blue-400">Central Nervous System</span> <br />
                            of Modern Filmmaking
                        </h2>
                        <p className="text-slate-400 text-lg">
                            Stop stitching together disparate tools. StudioFlow unifies every aspect of production into a single, intelligent workflow.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={<Zap className="w-6 h-6 text-yellow-400" />}
                            title="Context-Aware AI"
                            description="Our AI doesn't just generate text; it understands your script, budget, and schedule to make proactive suggestions."
                        />
                        <FeatureCard
                            icon={<Globe className="w-6 h-6 text-blue-400" />}
                            title="Real-Time Collaboration"
                            description="Changes in the script automatically update breakdowns, schedules, and budgets. Everyone stays in sync."
                        />
                        <FeatureCard
                            icon={<Shield className="w-6 h-6 text-purple-400" />}
                            title="Enterprise Security"
                            description="Bank-grade encryption and role-based access control keep your intellectual property safe."
                        />
                    </div>
                </div>
            </section>

            {/* AI Section */}
            <section className="py-24 relative overflow-hidden">
                <div className="absolute inset-0 bg-blue-600/5" />
                <div className="container mx-auto px-6 flex flex-col md:flex-row items-center gap-12">
                    <div className="flex-1 space-y-8">
                        <div className="inline-flex items-center gap-2 text-blue-400 font-semibold tracking-wide uppercase text-sm">
                            <Star className="w-4 h-4 fill-blue-400" />
                            AI Genius Layer
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                            From Script to <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                                Actionable Production Data
                            </span>
                        </h2>
                        <p className="text-slate-400 text-lg">
                            Upload your screenplay and watch as StudioFlow breaks it down into scenes, characters, locations, and props. Then, let it generate your stripboard and preliminary budget—in seconds.
                        </p>
                        <ul className="space-y-4">
                            {['Auto-Breakdown Scripts', 'Smart Scheduling Optimization', 'Dynamic Budget Forecasting'].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                                        <Check className="w-4 h-4 text-blue-400" />
                                    </div>
                                    <span className="text-slate-200">{item}</span>
                                </li>
                            ))}
                        </ul>
                        <Link href="/">
                            <Button className="bg-white text-slate-900 hover:bg-slate-200 rounded-full px-8 mt-4">
                                Try AI Breakdown
                            </Button>
                        </Link>
                    </div>
                    <div className="flex-1">
                        <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#0f172a]">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10" />
                            <div className="p-8 space-y-6">
                                {/* Mock UI Elements */}
                                <div className="flex gap-4 items-start">
                                    <div className="w-10 h-10 rounded-full bg-slate-700 flex-shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-slate-700 rounded w-3/4" />
                                        <div className="h-4 bg-slate-800 rounded w-1/2" />
                                    </div>
                                </div>
                                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                    <div className="flex items-center gap-2 text-blue-300 text-sm font-medium mb-2">
                                        <Sparkles className="w-4 h-4" />
                                        AI Suggestion
                                    </div>
                                    <p className="text-slate-300 text-sm">
                                        Scene 4 (EXT. STREET - NIGHT) requires a rain tower. This is not currently in your budget. Approximate cost: $1,200.
                                    </p>
                                </div>
                                <div className="h-24 bg-slate-800/50 rounded-lg p-4 flex gap-4">
                                    <div className="w-1/3 h-full bg-slate-700 rounded" />
                                    <div className="w-1/3 h-full bg-slate-700 rounded" />
                                    <div className="w-1/3 h-full bg-slate-700 rounded" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20">
                <div className="container mx-auto px-6 text-center">
                    <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-3xl p-12 border border-white/10 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-blue-500/20 rounded-full blur-[100px] -z-10" />

                        <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to Streamline Your Production?</h2>
                        <p className="text-slate-300 text-lg max-w-2xl mx-auto mb-10">
                            Join thousands of filmmakers who are reclaiming their creative time with StudioFlow.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link href="/">
                                <Button size="lg" className="h-14 px-10 rounded-full bg-white text-slate-900 hover:bg-slate-200 text-lg font-semibold">
                                    Get Started for Free
                                </Button>
                            </Link>
                            <Button size="lg" variant="outline" className="h-14 px-10 rounded-full border-white/20 hover:bg-white/10 text-white text-lg">
                                Contact Sales
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-white/10 bg-[#0b1120] text-slate-400 font-light text-sm">
                <div className="container mx-auto px-6 grid md:grid-cols-4 gap-8 mb-8">
                    <div>
                        <div className="flex items-center gap-2 font-bold text-lg text-white mb-4">
                            <Zap className="w-5 h-5 fill-white" />
                            StudioFlow
                        </div>
                        <p className="mb-4">Empowering the next generation of storytellers.</p>
                    </div>
                    <div>
                        <h4 className="text-white font-medium mb-4">Product</h4>
                        <ul className="space-y-2">
                            <li><Link href="#" className="hover:text-blue-400">Features</Link></li>
                            <li><Link href="#" className="hover:text-blue-400">Pricing</Link></li>
                            <li><Link href="#" className="hover:text-blue-400">Roadmap</Link></li>
                            <li><Link href="#" className="hover:text-blue-400">Changelog</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-medium mb-4">Resources</h4>
                        <ul className="space-y-2">
                            <li><Link href="#" className="hover:text-blue-400">Documentation</Link></li>
                            <li><Link href="#" className="hover:text-blue-400">API</Link></li>
                            <li><Link href="#" className="hover:text-blue-400">Community</Link></li>
                            <li><Link href="#" className="hover:text-blue-400">Blog</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-medium mb-4">Company</h4>
                        <ul className="space-y-2">
                            <li><Link href="#" className="hover:text-blue-400">About</Link></li>
                            <li><Link href="#" className="hover:text-blue-400">Careers</Link></li>
                            <li><Link href="#" className="hover:text-blue-400">Legal</Link></li>
                            <li><Link href="#" className="hover:text-blue-400">Contact</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="container mx-auto px-6 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p>© 2025 StudioFlow Inc. All rights reserved.</p>
                    <div className="flex gap-6">
                        <Link href="#" className="hover:text-white">Privacy Policy</Link>
                        <Link href="#" className="hover:text-white">Terms of Service</Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/30 transition-colors group">
            <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                {icon}
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
            <p className="text-slate-400 leading-relaxed">
                {description}
            </p>
        </div>
    )
}

function DollarSignIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <line x1="12" x2="12" y1="2" y2="22" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
    )
}
