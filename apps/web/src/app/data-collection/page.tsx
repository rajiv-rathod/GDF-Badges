import { AppNav } from '@/components/nav';
import { Card, PageTitle } from '@/components/ui';

export const metadata = { title: 'Data Collection Notice — MUN CertView' };

export default function DataCollectionPage() {
  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <PageTitle
          title="Data Collection Notice"
          subtitle="MUN CertView, powered by the Global Diplomacy Forum (GDF). Last updated: 28 July 2026."
        />
        <Card className="space-y-5 text-sm leading-relaxed text-muted">
          <section>
            <h2 className="font-display text-base font-semibold text-foreground">Purpose of this notice</h2>
            <p className="mt-2">
              This notice itemizes every category of personal data MUN CertView collects, why we collect it, the legal
              basis for processing (GDPR-style: consent, contract, or legitimate interest), how long we keep it, and who
              it is shared with. It supplements our{' '}
              <a href="/privacy" className="text-primary-dark hover:underline">Privacy Policy</a>. The service is free —
              GDF&apos;s gift to the MUN community — and we never sell or rent data or use it for advertising.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-foreground">Data we collect</h2>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th className="py-2 pr-4 font-semibold text-foreground">Data category</th>
                    <th className="py-2 pr-4 font-semibold text-foreground">Why we collect it</th>
                    <th className="py-2 pr-4 font-semibold text-foreground">Legal basis</th>
                    <th className="py-2 pr-4 font-semibold text-foreground">Retention</th>
                    <th className="py-2 pr-4 font-semibold text-foreground">Shared with</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2 pr-4 align-top">Name</td>
                    <td className="py-2 pr-4 align-top">Identify the account holder and name credential recipients.</td>
                    <td className="py-2 pr-4 align-top">Contract</td>
                    <td className="py-2 pr-4 align-top">While the account or credential is active; deleted on request.</td>
                    <td className="py-2 pr-4 align-top">Supabase (storage). Recipient name appears on the credential&apos;s verification page.</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 align-top">Email address</td>
                    <td className="py-2 pr-4 align-top">Authenticate accounts and send credential notifications.</td>
                    <td className="py-2 pr-4 align-top">Contract</td>
                    <td className="py-2 pr-4 align-top">While the account is active; deleted on request.</td>
                    <td className="py-2 pr-4 align-top">Supabase; self-hosted SMTP (mailcow) for delivery. Never shown publicly.</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 align-top">Password (hash only)</td>
                    <td className="py-2 pr-4 align-top">Secure sign-in; never stored in plain text.</td>
                    <td className="py-2 pr-4 align-top">Contract</td>
                    <td className="py-2 pr-4 align-top">While the account is active.</td>
                    <td className="py-2 pr-4 align-top">Supabase Auth only.</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 align-top">Credential data (award, conference, committee, country/portfolio, issue date)</td>
                    <td className="py-2 pr-4 align-top">Issue, display and verify badges and certificates.</td>
                    <td className="py-2 pr-4 align-top">Contract</td>
                    <td className="py-2 pr-4 align-top">As long as the credential is meant to remain verifiable; stops on revocation/deletion.</td>
                    <td className="py-2 pr-4 align-top">Supabase; visible on the verification page to anyone with the link.</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 align-top">Salted SHA-256 hash of recipient email</td>
                    <td className="py-2 pr-4 align-top">Let a holder prove a credential is theirs without exposing the email.</td>
                    <td className="py-2 pr-4 align-top">Legitimate interest (credential integrity)</td>
                    <td className="py-2 pr-4 align-top">Lifetime of the credential.</td>
                    <td className="py-2 pr-4 align-top">Included in the public Open Badges 3.0 credential JSON (hash only, not the email).</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 align-top">Delegate roster data (uploaded by organizers)</td>
                    <td className="py-2 pr-4 align-top">Bulk-issue credentials to delegates of a conference.</td>
                    <td className="py-2 pr-4 align-top">Contract / legitimate interest (organizer is controller)</td>
                    <td className="py-2 pr-4 align-top">Until the conference is closed or the organizer deletes it; on request.</td>
                    <td className="py-2 pr-4 align-top">Supabase; visible to the issuing conference&apos;s organizers only (isolated by RLS).</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 align-top">MyMUN conference link</td>
                    <td className="py-2 pr-4 align-top">Proof the conference is genuine before it can issue credentials.</td>
                    <td className="py-2 pr-4 align-top">Legitimate interest (fraud prevention)</td>
                    <td className="py-2 pr-4 align-top">Retained as proof for as long as the conference exists.</td>
                    <td className="py-2 pr-4 align-top">Supabase; reviewed by GDF only.</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 align-top">Public visibility choices (profile / per-credential)</td>
                    <td className="py-2 pr-4 align-top">Let members choose which credentials appear on their public profile.</td>
                    <td className="py-2 pr-4 align-top">Consent</td>
                    <td className="py-2 pr-4 align-top">Until changed; private by default.</td>
                    <td className="py-2 pr-4 align-top">Public profile shows only credentials the member marks public.</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 align-top">Event &amp; audit logs (issued, claimed, revoked, viewed)</td>
                    <td className="py-2 pr-4 align-top">Maintain credential integrity and detect fraud or abuse.</td>
                    <td className="py-2 pr-4 align-top">Legitimate interest (security)</td>
                    <td className="py-2 pr-4 align-top">Only as long as needed for integrity and security.</td>
                    <td className="py-2 pr-4 align-top">Supabase; internal to GDF.</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 align-top">Authentication / session cookie</td>
                    <td className="py-2 pr-4 align-top">Keep you signed in. No advertising or tracking cookies are used.</td>
                    <td className="py-2 pr-4 align-top">Legitimate interest (strictly necessary)</td>
                    <td className="py-2 pr-4 align-top">Duration of the session.</td>
                    <td className="py-2 pr-4 align-top">Stored in your browser; not shared.</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 align-top">Text sent for optional AI clean-up (may include delegate names)</td>
                    <td className="py-2 pr-4 align-top">Tidy or draft text only when an organizer clicks the AI button.</td>
                    <td className="py-2 pr-4 align-top">Consent (organizer-initiated, feature-flagged)</td>
                    <td className="py-2 pr-4 align-top">Processed on request; not retained by us beyond the result.</td>
                    <td className="py-2 pr-4 align-top">Google Gemini API (processor), only when triggered.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-foreground">Processors and sub-processors</h2>
            <p className="mt-2">
              <span className="font-semibold text-foreground">Supabase</span> — Postgres database, authentication and
              file Storage (primary data store). <span className="font-semibold text-foreground">Self-hosted SMTP
              (mailcow)</span> at mail.radixai.tech — transactional email delivery.{' '}
              <span className="font-semibold text-foreground">Google Gemini API</span> — optional, feature-flagged AI
              clean-up/drafting, invoked only when an organizer clicks the AI button. Video meetings run in the separate
              GDF meeting app at{' '}
              <a href="https://meet.apextech.llc" className="text-primary-dark hover:underline">meet.apextech.llc</a>,
              which has its own privacy and terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-foreground">International transfers</h2>
            <p className="mt-2">
              Some processors may store or process data on servers outside your country, including outside the European
              Economic Area. Where that happens we rely on appropriate safeguards such as standard contractual clauses.
              Contact us for details.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-foreground">Children and delegates under 18</h2>
            <p className="mt-2">
              Many delegates are under 18. Data about minors is normally provided by a conference organizer, who is
              responsible for obtaining any parental or guardian consent required by law and for limiting the data to
              what is necessary. We do not knowingly collect data directly from children without appropriate
              authorization.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-foreground">Your rights and contact</h2>
            <p className="mt-2">
              You may request access to, rectification of, erasure of, or a portable copy of your data, and may object
              to or restrict certain processing or withdraw consent. Revoked or deleted credentials stop verifying
              immediately. To exercise any right, or to ask a question about this notice, email{' '}
              <a href="mailto:rajiv@gdf.social" className="text-primary-dark hover:underline">rajiv@gdf.social</a>.
            </p>
          </section>
        </Card>
      </main>
    </>
  );
}
