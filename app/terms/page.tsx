import type { Metadata } from "next"
import LegalShell from "@/components/legal/legal-shell"
import { SITE } from "@/lib/site-config"

export const metadata: Metadata = {
  title: `Terms of Service | ${SITE.name}`,
  description: `The terms and conditions governing your use of ${SITE.name}.`,
}

const toc = [
  { id: "acceptance", label: "Acceptance of Terms" },
  { id: "eligibility", label: "Eligibility" },
  { id: "accounts", label: "Accounts" },
  { id: "license", label: "License to Use" },
  { id: "your-content", label: "Your Content" },
  { id: "ai", label: "AI Features" },
  { id: "acceptable-use", label: "Acceptable Use" },
  { id: "ip", label: "Intellectual Property" },
  { id: "third-party", label: "Third-Party Services" },
  { id: "payment", label: "Fees & Payment" },
  { id: "termination", label: "Termination" },
  { id: "disclaimers", label: "Disclaimers" },
  { id: "liability", label: "Limitation of Liability" },
  { id: "indemnification", label: "Indemnification" },
  { id: "governing-law", label: "Governing Law" },
  { id: "changes", label: "Changes" },
  { id: "contact", label: "Contact" },
]

export default function TermsOfService() {
  return (
    <LegalShell
      title="Terms of Service"
      subtitle={`These Terms of Service ("Terms") form a binding agreement between you and ${SITE.legalEntity} ("StudioFlow", "we", "us", or "our") governing your access to and use of the Service.`}
      toc={toc}
    >
      <h2 id="acceptance">1. Acceptance of Terms</h2>
      <p>
        By accessing or using StudioFlow, you agree to be bound by these Terms
        and our <a href="/privacy">Privacy Policy</a>. If you are using the
        Service on behalf of an organization, you represent that you have
        authority to bind that organization. If you do not agree, do not use the
        Service.
      </p>

      <h2 id="eligibility">2. Eligibility</h2>
      <p>
        You must be at least 16 years old (or the age of majority in your
        jurisdiction) and capable of forming a binding contract to use the
        Service.
      </p>

      <h2 id="accounts">3. Accounts</h2>
      <p>
        You are responsible for maintaining the confidentiality of your account
        credentials and for all activity under your account. You agree to
        provide accurate information and to notify us promptly of any
        unauthorized use. We may suspend or terminate accounts that violate
        these Terms.
      </p>

      <h2 id="license">4. License to Use the Service</h2>
      <p>
        Subject to these Terms, we grant you a limited, non-exclusive,
        non-transferable, revocable license to access and use the Service for
        your internal production and business purposes.
      </p>

      <h2 id="your-content">5. Your Content</h2>
      <p>
        You retain all ownership rights in the scripts, media, schedules, and
        other materials you submit ("Your Content"). You grant us a worldwide,
        non-exclusive license to host, store, process, and display Your Content
        solely to operate and provide the Service to you. You are responsible
        for Your Content and represent that you have the rights necessary to
        submit it.
      </p>

      <h2 id="ai">6. AI Features</h2>
      <p>
        The Service includes AI-assisted features that generate content based on
        inputs you provide. AI output may be inaccurate, incomplete, or
        unsuitable for your purposes, and you are solely responsible for
        reviewing and verifying it before use. We make no warranty regarding the
        accuracy or fitness of AI-generated output. You must not rely on AI
        features for legal, financial, or safety-critical decisions without
        independent verification.
      </p>

      <h2 id="acceptable-use">7. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Violate any law or infringe the rights of others.</li>
        <li>Upload malicious code or attempt to disrupt or compromise the Service.</li>
        <li>Reverse engineer, scrape, or gain unauthorized access to the Service.</li>
        <li>Use the Service to store or transmit unlawful, infringing, or harmful content.</li>
        <li>Resell or commercially exploit the Service without our authorization.</li>
      </ul>

      <h2 id="ip">8. Intellectual Property</h2>
      <p>
        The Service, including its software, design, and trademarks, is owned by
        StudioFlow and its licensors and is protected by intellectual property
        laws. Except for the limited license granted to you, no rights are
        transferred to you.
      </p>

      <h2 id="third-party">9. Third-Party Services</h2>
      <p>
        The Service integrates third-party services (for example,
        authentication, AI, storage, and analytics providers). Your use of those
        services may be subject to their own terms, and we are not responsible
        for third-party services.
      </p>

      <h2 id="payment">10. Fees &amp; Payment</h2>
      <p>
        Certain features may require payment. Where fees apply, they will be
        disclosed before purchase. Unless otherwise stated, fees are
        non-refundable except as required by law. We may change pricing on a
        prospective basis with notice.
      </p>

      <h2 id="termination">11. Termination</h2>
      <p>
        You may stop using the Service at any time. We may suspend or terminate
        your access if you breach these Terms or if necessary to protect the
        Service or other users. Upon termination, your right to use the Service
        ends, and we may delete Your Content after a reasonable period, subject
        to the Privacy Policy.
      </p>

      <h2 id="disclaimers">12. Disclaimers</h2>
      <p>
        THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF
        ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING IMPLIED
        WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
        NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE
        UNINTERRUPTED, ERROR-FREE, OR SECURE.
      </p>

      <h2 id="liability">13. Limitation of Liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, STUDIOFLOW AND ITS AFFILIATES
        WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
        OR PUNITIVE DAMAGES, OR FOR LOSS OF PROFITS, DATA, OR GOODWILL. OUR TOTAL
        LIABILITY FOR ANY CLAIM RELATING TO THE SERVICE WILL NOT EXCEED THE
        GREATER OF THE AMOUNTS YOU PAID US IN THE TWELVE MONTHS PRECEDING THE
        CLAIM OR USD $100.
      </p>

      <h2 id="indemnification">14. Indemnification</h2>
      <p>
        You agree to indemnify and hold harmless StudioFlow and its affiliates
        from any claims, damages, and expenses arising out of Your Content, your
        use of the Service, or your violation of these Terms.
      </p>

      <h2 id="governing-law">15. Governing Law &amp; Dispute Resolution</h2>
      <p>
        These Terms are governed by the laws of {SITE.governingState}, without
        regard to its conflict-of-laws rules. You agree that any dispute will be
        resolved exclusively in {SITE.venue}, and you consent to personal
        jurisdiction there. Nothing in this section prevents either party from
        seeking injunctive relief.
      </p>

      <h2 id="changes">16. Changes to These Terms</h2>
      <p>
        We may update these Terms from time to time. We will post the revised
        version and update the "Last updated" date. Your continued use of the
        Service after changes take effect constitutes acceptance of the revised
        Terms.
      </p>

      <h2 id="contact">17. Contact</h2>
      <p>
        Questions about these Terms? Contact us at{" "}
        <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
      </p>
    </LegalShell>
  )
}
