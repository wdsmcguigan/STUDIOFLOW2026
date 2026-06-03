import type { Metadata } from "next"
import LegalShell from "@/components/legal/legal-shell"
import { SITE, SUBPROCESSORS } from "@/lib/site-config"

export const metadata: Metadata = {
  title: `Privacy Policy | ${SITE.name}`,
  description: `How ${SITE.name} collects, uses, and protects your personal information.`,
}

const toc = [
  { id: "overview", label: "Overview" },
  { id: "data-we-collect", label: "Data We Collect" },
  { id: "how-we-use", label: "How We Use Data" },
  { id: "ai", label: "AI Processing" },
  { id: "legal-bases", label: "Legal Bases (GDPR)" },
  { id: "sharing", label: "How We Share Data" },
  { id: "subprocessors", label: "Service Providers" },
  { id: "retention", label: "Data Retention" },
  { id: "security", label: "Security" },
  { id: "your-rights", label: "Your Rights" },
  { id: "ccpa", label: "California Rights" },
  { id: "children", label: "Children's Privacy" },
  { id: "international", label: "International Transfers" },
  { id: "changes", label: "Changes" },
  { id: "contact", label: "Contact Us" },
]

export default function PrivacyPolicy() {
  return (
    <LegalShell
      title="Privacy Policy"
      subtitle={`This Privacy Policy explains how ${SITE.legalEntity} ("StudioFlow", "we", "us", or "our") collects, uses, discloses, and safeguards your information when you use our production-management platform and website (the "Service").`}
      toc={toc}
    >
      <h2 id="overview">1. Overview</h2>
      <p>
        We are committed to protecting your privacy. This policy applies to all
        users of the Service. By using StudioFlow, you agree to the collection
        and use of information in accordance with this policy. If you do not
        agree, please do not use the Service.
      </p>

      <h2 id="data-we-collect">2. Data We Collect</h2>
      <h3>Information you provide</h3>
      <ul>
        <li><strong>Account information</strong> — name, email address, and credentials, managed through our authentication provider.</li>
        <li><strong>Production content</strong> — scripts, schedules, budgets, storyboards, cast and crew details, media, and other materials you upload or create.</li>
        <li><strong>Communications</strong> — information you provide when you contact support or send us feedback.</li>
      </ul>
      <h3>Information collected automatically</h3>
      <ul>
        <li><strong>Usage data</strong> — pages visited, features used, and interactions, collected only where you have consented to analytics.</li>
        <li><strong>Device &amp; log data</strong> — IP address, browser type, operating system, and timestamps, used for security and reliability.</li>
        <li><strong>Local storage</strong> — some data is stored in your browser (for example via IndexedDB) so the app can work quickly and offline.</li>
      </ul>

      <h2 id="how-we-use">3. How We Use Data</h2>
      <ul>
        <li>To provide, operate, maintain, and improve the Service.</li>
        <li>To authenticate users and secure accounts.</li>
        <li>To generate AI-assisted production insights you request.</li>
        <li>To respond to your requests and provide customer support.</li>
        <li>To monitor usage, prevent fraud, and ensure security.</li>
        <li>To comply with legal obligations.</li>
      </ul>

      <h2 id="ai">4. AI Processing</h2>
      <p>
        StudioFlow uses third-party generative AI services to analyze and
        generate production content at your direction (for example, script
        breakdowns, schedules, storyboards, and budget forecasts). When you use
        these features, the relevant content is transmitted to our AI provider
        to produce a result. We do not use your private production content to
        train third-party foundation models, and we instruct our providers to
        process it only to deliver the requested output. AI output may be
        inaccurate and should be reviewed before reliance.
      </p>

      <h2 id="legal-bases">5. Legal Bases for Processing (EEA/UK)</h2>
      <p>If you are in the European Economic Area or the United Kingdom, we process your personal data on the following legal bases:</p>
      <ul>
        <li><strong>Contract</strong> — to provide the Service you have requested.</li>
        <li><strong>Consent</strong> — for analytics cookies and optional communications (you may withdraw consent at any time).</li>
        <li><strong>Legitimate interests</strong> — to secure, maintain, and improve the Service.</li>
        <li><strong>Legal obligation</strong> — where processing is required by law.</li>
      </ul>

      <h2 id="sharing">6. How We Share Data</h2>
      <p>
        We do not sell your personal information. We share data only with the
        service providers listed below, with collaborators you invite to your
        projects, when required by law or to protect rights and safety, and in
        connection with a merger, acquisition, or asset sale (with notice to
        you where required).
      </p>

      <h2 id="subprocessors">7. Service Providers</h2>
      <p>We rely on the following sub-processors to operate the Service:</p>
      <table>
        <thead>
          <tr>
            <th>Provider</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody>
          {SUBPROCESSORS.map((s) => (
            <tr key={s.name}>
              <td>
                <a href={s.link} target="_blank" rel="noopener noreferrer">{s.name}</a>
              </td>
              <td>{s.purpose}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 id="retention">8. Data Retention</h2>
      <p>
        We retain personal data for as long as your account is active or as
        needed to provide the Service. We will delete or anonymize data when it
        is no longer required, subject to legal retention obligations. You may
        request deletion of your account and associated data at any time.
      </p>

      <h2 id="security">9. Security</h2>
      <p>
        We implement industry-standard technical and organizational measures —
        including encryption in transit, access controls, and authentication —
        to protect your data. No method of transmission or storage is, however,
        completely secure, and we cannot guarantee absolute security.
      </p>

      <h2 id="your-rights">10. Your Rights</h2>
      <p>Depending on your location, you may have the right to:</p>
      <ul>
        <li>Access the personal data we hold about you.</li>
        <li>Request correction of inaccurate data.</li>
        <li>Request deletion of your data ("right to be forgotten").</li>
        <li>Object to or restrict certain processing.</li>
        <li>Request a portable copy of your data.</li>
        <li>Withdraw consent at any time where processing is based on consent.</li>
      </ul>
      <p>
        To exercise these rights, contact us at{" "}
        <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>. We will
        respond within the timeframe required by applicable law.
      </p>

      <h2 id="ccpa">11. California Privacy Rights (CCPA/CPRA)</h2>
      <p>
        If you are a California resident, you have the right to know what
        personal information we collect, to request deletion, to correct
        inaccurate information, and to opt out of the "sale" or "sharing" of
        personal information. <strong>We do not sell or share your personal
        information</strong> as those terms are defined under the CCPA/CPRA. You
        will not be discriminated against for exercising your rights. To make a
        request, email <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
      </p>

      <h2 id="children">12. Children's Privacy</h2>
      <p>
        The Service is not directed to children under 16, and we do not
        knowingly collect personal data from them. If you believe a child has
        provided us personal data, please contact us and we will delete it.
      </p>

      <h2 id="international">13. International Data Transfers</h2>
      <p>
        We are based in the United States, and your data may be processed in the
        United States and other countries where our service providers operate.
        Where required, we use appropriate safeguards (such as Standard
        Contractual Clauses) for international transfers.
      </p>

      <h2 id="changes">14. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will post the
        revised version on this page and update the "Last updated" date.
        Material changes will be communicated where required.
      </p>

      <h2 id="contact">15. Contact Us</h2>
      <p>
        If you have questions about this Privacy Policy or our data practices,
        contact us at <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
      </p>
    </LegalShell>
  )
}
