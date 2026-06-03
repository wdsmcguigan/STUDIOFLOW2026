import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ClerkProvider } from "@clerk/nextjs"
import CookieConsent from "@/components/cookie-consent"

const inter = Inter({ subsets: ["latin"] })

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
  const content = (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
        <CookieConsent />
      </body>
    </html>
  )

  // Only mount Clerk when a publishable key is configured. This keeps auth
  // fully intact in environments that set the key, while allowing the app
  // (e.g. the public landing page) to build and render in preview
  // environments where Clerk keys aren't available.
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return content
  }

  return <ClerkProvider>{content}</ClerkProvider>
}
