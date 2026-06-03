import type { Metadata } from "next"
import LegalShell from "@/components/legal/legal-shell"
import OpenCookieSettings from "@/components/open-cookie-settings"
import { SITE } from "@/lib/site-config"

export const metadata: Metadata = {
  title: `Cookie Policy | ${SITE.name}`,
  description: `How ${SITE.name} uses cookies and similar technologies, and how to manage your preferences.`,
}

const toc = [
  { id: "what", label: "What Are Cookies" },
  { id: "how", label: "How We Use Cookies" },
  { id: "types", label: "Types of Cookies" },
  { id: "manage", label: "Managing Preferences" },
  { id: "browser", label: "Browser Controls" },
  { id: "changes", label: "Changes" },
  { id: "contact", label: "Contact" },
]

export default function CookiePolicy() {
  return (
    <LegalShell
      title="Cookie Policy"
      subtitle="This Cookie Policy explains how StudioFlow uses cookies and similar technologies (such as local storage) to recognize you and improve your experience."
      toc={toc}
    >
      <h2 id="what">1. What Are Cookies?</h2>
      <p>
        Cookies are small text files placed on your device when you visit a
        website. Similar technologies — including browser local storage and
        IndexedDB — store data directly in your browser. Together we refer to
        these as "cookies" in this policy.
      </p>

      <h2 id="how">2. How We Use Cookies</h2>
      <p>
        We use cookies to keep you signed in, remember your preferences, keep
        the Service secure, and — only with your consent — to measure how the
        Service is used so we can improve it.
      </p>

      <h2 id="types">3. Types of Cookies We Use</h2>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Purpose</th>
            <th>Consent</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Strictly necessary</strong></td>
            <td>Authentication, session management, security, and core functionality. The Service cannot function without these.</td>
            <td>Always active</td>
          </tr>
          <tr>
            <td><strong>Functional / local storage</strong></td>
            <td>Remembering your settings and storing app data locally for speed and offline access.</td>
            <td>Always active</td>
          </tr>
          <tr>
            <td><strong>Analytics</strong></td>
            <td>Privacy-friendly, aggregated usage measurement to help us understand and improve the product.</td>
            <td>Opt-in</td>
          </tr>
        </tbody>
      </table>
      <p>
        We do not use advertising or cross-site tracking cookies, and we do not
        sell your information.
      </p>

      <h2 id="manage">4. Managing Your Preferences</h2>
      <p>
        When you first visit StudioFlow, we ask for your consent to non-essential
        (analytics) cookies. You can change your choice at any time:
      </p>
      <p>
        <OpenCookieSettings className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white no-underline backdrop-blur-md transition-colors hover:bg-white/10">
          Open Cookie Settings
        </OpenCookieSettings>
      </p>

      <h2 id="browser">5. Browser Controls</h2>
      <p>
        Most browsers let you block or delete cookies through their settings.
        Note that blocking strictly necessary cookies may break parts of the
        Service. You can also clear local storage and IndexedDB data from your
        browser's site settings.
      </p>

      <h2 id="changes">6. Changes to This Policy</h2>
      <p>
        We may update this Cookie Policy from time to time. We will post the
        revised version on this page and update the "Last updated" date.
      </p>

      <h2 id="contact">7. Contact</h2>
      <p>
        Questions about our use of cookies? Contact us at{" "}
        <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
      </p>
    </LegalShell>
  )
}
