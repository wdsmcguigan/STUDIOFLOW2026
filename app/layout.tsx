import type React from "react"
import type { Metadata } from "next"
import { Bricolage_Grotesque, Hanken_Grotesk, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { ClerkProvider } from "@clerk/nextjs"

// StudioFlow "Tungsten & Sage" type system
const fontDisplay = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
})
const fontUi = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
})
const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "StudioFlow | Next-Generation Production Platform",
  description:
    "Revolutionary cloud-native production platform with AI automation, real-time collaboration, and enterprise-grade version control for all media creation workflows",
  generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        suppressHydrationWarning
        className={`dark ${fontDisplay.variable} ${fontUi.variable} ${fontMono.variable}`}
      >
        <body className="font-sans">{children}</body>
      </html>
    </ClerkProvider>
  )
}
