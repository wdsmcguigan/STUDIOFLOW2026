/**
 * Central configuration for site-wide and legal/compliance content.
 * Update these values to keep every legal page and the consent banner in sync.
 */
export const SITE = {
  name: "StudioFlow",
  // Legal entity referenced in the agreements. Replace with the registered
  // company name once incorporated (e.g. "StudioFlow, Inc.").
  legalEntity: "StudioFlow",
  contactEmail: "studioflowai1@gmail.com",
  // Governing law / venue for the Terms of Service.
  governingState: "the State of California, United States",
  venue: "the state and federal courts located in California",
  // Human-readable dates shown on the legal pages.
  effectiveDate: "June 3, 2026",
  lastUpdated: "June 3, 2026",
} as const

/** Third parties / sub-processors disclosed in the Privacy & Cookie policies. */
export const SUBPROCESSORS = [
  {
    name: "Clerk",
    purpose: "User authentication, session management and account security.",
    link: "https://clerk.com/legal/privacy",
  },
  {
    name: "Google (Gemini / Generative AI)",
    purpose: "AI generation and analysis of production content you submit.",
    link: "https://policies.google.com/privacy",
  },
  {
    name: "Google Firebase",
    purpose: "Backend data storage, synchronization and infrastructure.",
    link: "https://firebase.google.com/support/privacy",
  },
  {
    name: "Vercel",
    purpose: "Application hosting, content delivery and privacy-friendly analytics.",
    link: "https://vercel.com/legal/privacy-policy",
  },
] as const
