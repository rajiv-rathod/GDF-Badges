import { AppNav } from '@/components/nav';
import { Card, PageTitle } from '@/components/ui';

export const metadata = { title: 'Privacy Policy — MUN CertView' };

export default function PrivacyPage() {
  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <PageTitle
          title="Privacy Policy"
          subtitle="MUN CertView, powered by the Global Diplomacy Forum (GDF). Last updated: 28 July 2026."
        />
        <Card className="space-y-5 text-sm leading-relaxed text-muted">
          <section>
            <h2 className="font-display text-base font-semibold text-foreground">Who we are</h2>
            <p className="mt-2">
              MUN CertView (&quot;the service&quot;, &quot;we&quot;, &quot;us&quot;) is a free, verifiable credentialing and conference
              platform for the Model UN community, operated by the Global Diplomacy Forum (&quot;GDF&quot;) at{' '}
              <a href="https://certview.gdf.social" className="text-primary-dark hover:underline">certview.gdf.social</a>.
              GDF is the data controller for the personal information described in this policy. The service is offered
              without charge as GDF&apos;s gift to the MUN community. We do not sell or rent personal data, and we do not
              run advertising. If you have any question about this policy or how we handle your data, contact us at{' '}
              <a href="mailto:rajiv@gdf.social" className="text-primary-dark hover:underline">rajiv@gdf.social</a>.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-foreground">Scope of this policy</h2>
            <p className="mt-2">
              This policy explains what personal data we collect, why, on what legal basis, how long we keep it, and
              with whom it is shared. For a line-by-line breakdown of every category of data, see our companion{' '}
              <a href="/data-collection" className="text-primary-dark hover:underline">Data Collection Notice</a>. Your
              use of the service is also governed by our{' '}
              <a href="/terms" className="text-primary-dark hover:underline">Terms of Service</a>.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-foreground">What we collect</h2>
            <p className="mt-2">
              <span className="font-semibold text-foreground">Account data:</span> your name, email address and a
              password hash (we never store passwords in plain text), plus your role (organizer or member).
            </p>
            <p className="mt-2">
              <span className="font-semibold text-foreground">Credential data:</span> the badges and certificates
              issued to you or by you — recipient name, awarding conference, award or role details, committee,
              country/portfolio, and issue date.
            </p>
            <p className="mt-2">
              <span className="font-semibold text-foreground">Delegate roster data:</span> spreadsheets uploaded by
              conference organizers, typically containing delegate name, email, committee, country/portfolio and award.
              Organizers are responsible for having a lawful basis to upload this data (see &quot;Organizers as controllers&quot;
              below).
            </p>
            <p className="mt-2">
              <span className="font-semibold text-foreground">Conference data:</span> the conference name, description
              and the public MyMUN (mymun.com) conference link an organizer must supply to create a conference. We
              retain that link as proof the conference is genuine.
            </p>
            <p className="mt-2">
              <span className="font-semibold text-foreground">Event and audit logs:</span> credential lifecycle events
              (issued, claimed, revoked, viewed) recorded for integrity and to protect against fraud, plus basic
              technical logs needed to run and secure the service.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-foreground">How and why we use it</h2>
            <p className="mt-2">
              We use personal data solely to operate the service: to create and authenticate accounts; to issue, claim,
              verify, display and revoke credentials; to notify you by email when a credential is issued to your
              address; to let organizers import and manage delegate rosters; to maintain the integrity and security of
              credentials; and to respond to your requests. We do not use your data for advertising, profiling or
              automated decisions that produce legal effects.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-foreground">Legal bases</h2>
            <p className="mt-2">
              Where the GDPR or similar laws apply, we rely on: <span className="font-semibold text-foreground">contract</span>{' '}
              (to provide the account and credentialing service you or your organizer signed up for);{' '}
              <span className="font-semibold text-foreground">legitimate interests</span> (to keep credentials verifiable
              and tamper-resistant, prevent fraud, and secure the platform); and{' '}
              <span className="font-semibold text-foreground">consent</span> (for optional AI clean-up and for choosing
              to make specific credentials public on your profile). The per-category legal bases are itemized in the{' '}
              <a href="/data-collection" className="text-primary-dark hover:underline">Data Collection Notice</a>.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-foreground">What is public and what is private</h2>
            <p className="mt-2">
              Everything is private by default. A credential&apos;s verification page (recipient name, award, issuer,
              status) is reachable by anyone who holds its unguessable verification link — the link is not indexed or
              published by us, but you should treat it as shareable. Your public profile shows only the credentials you
              explicitly mark as public; all others remain private.
            </p>
            <p className="mt-2">
              Recipient email addresses are never published. The public credential JSON (aligned with Open Badges 3.0)
              contains only a salted SHA-256 hash of the recipient email, which allows a holder to prove the credential
              is theirs without exposing the address itself.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-foreground">Storage, processors and sub-processors</h2>
            <p className="mt-2">
              Personal data is stored in <span className="font-semibold text-foreground">Supabase</span> (Postgres
              database, authentication, and file Storage), which hosts our database and uploaded files on our behalf.
            </p>
            <p className="mt-2">
              Transactional email (for example, credential-issued notifications) is sent through our{' '}
              <span className="font-semibold text-foreground">self-hosted SMTP (mailcow)</span> mail server at
              mail.radixai.tech. We do not use a third-party email marketing provider.
            </p>
            <p className="mt-2">
              <span className="font-semibold text-foreground">Optional AI processing (Google Gemini API):</span> this is
              feature-flagged and off by default. It runs only when an organizer explicitly clicks an AI clean-up or
              drafting button — for example, to tidy delegate names in an uploaded sheet. In that case the relevant text
              (which may include delegate names) is sent to the Google Gemini API for processing and returned. No data
              is sent to Gemini unless an organizer triggers this action.
            </p>
            <p className="mt-2">
              <span className="font-semibold text-foreground">Video meetings</span> take place in the separate GDF
              meeting app hosted at{' '}
              <a href="https://meet.apextech.llc" className="text-primary-dark hover:underline">meet.apextech.llc</a>.
              When you launch a meeting you leave MUN CertView and enter that application, which is governed by its own
              privacy and terms. This policy does not cover the meeting app.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-foreground">International transfers</h2>
            <p className="mt-2">
              Our processors may store or process data on servers located outside your country, including outside the
              European Economic Area. Where personal data is transferred internationally, we rely on appropriate
              safeguards such as the processor&apos;s standard contractual clauses and equivalent protections. If you would
              like more detail about the safeguards in place, contact us at{' '}
              <a href="mailto:rajiv@gdf.social" className="text-primary-dark hover:underline">rajiv@gdf.social</a>.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-foreground">Retention</h2>
            <p className="mt-2">
              We keep account data for as long as your account is active and delete it on request or a reasonable time
              after account closure. Credential data is retained for as long as the credential is meant to remain
              verifiable, so that recipients and third parties can continue to verify it; when a credential is revoked
              or deleted it stops verifying immediately. MyMUN conference links are retained as proof of a conference&apos;s
              authenticity for as long as the conference exists on the platform. Audit and event logs are kept only as
              long as needed for integrity and security. When you exercise your right to erasure we delete or anonymize
              personal data unless we are required to retain it for legal or credential-integrity reasons.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-foreground">Security</h2>
            <p className="mt-2">
              Each credential is signed with an Ed25519 cryptographic signature so that any tampering can be detected at
              verification time. Data isolation between conferences is enforced at the database level using Postgres
              Row-Level Security (RLS), so one organization cannot read another&apos;s data. Passwords are stored only as
              hashes, and recipient emails appear in public credential data only as salted SHA-256 hashes. All
              credential-affecting writes go through server-side functions that check signatures and access rules — we
              never trust the client for issuance or verification.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-foreground">Cookies and sessions</h2>
            <p className="mt-2">
              We use a single authentication/session cookie that is strictly necessary to keep you signed in. We do not
              use advertising cookies, cross-site tracking pixels or third-party analytics trackers. Because our only
              cookie is essential to the service, it does not require separate consent.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-foreground">Children and delegates under 18</h2>
            <p className="mt-2">
              Many Model UN delegates are under 18. MUN CertView is designed to be used through a conference organizer,
              who is responsible for obtaining any parental or guardian consent required by local law before uploading a
              minor&apos;s data or issuing them a credential, and for ensuring that data is limited to what is necessary. We
              do not knowingly collect data directly from children without appropriate authorization. If you believe a
              minor&apos;s data has been provided without proper consent, contact us at{' '}
              <a href="mailto:rajiv@gdf.social" className="text-primary-dark hover:underline">rajiv@gdf.social</a> and we
              will act promptly to correct or delete it.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-foreground">Organizers as controllers</h2>
            <p className="mt-2">
              When an organizer uploads a delegate roster, the organizer acts as a data controller for that data and is
              responsible for having a lawful basis to collect and share it, and for handling delegates&apos; requests. GDF
              acts as processor for roster data on the organizer&apos;s behalf, and as controller for account and platform
              data. If you are a delegate and cannot reach your organizer, we can still help you exercise your rights.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-foreground">Your rights</h2>
            <p className="mt-2">
              Subject to applicable law, you have the right to access your personal data, to rectify inaccurate data, to
              request erasure, to obtain a portable copy of data you provided, to restrict or object to certain
              processing, and to withdraw consent where processing is based on consent. Revoked or deleted credentials
              stop verifying immediately. To exercise any of these rights, email{' '}
              <a href="mailto:rajiv@gdf.social" className="text-primary-dark hover:underline">rajiv@gdf.social</a>. You
              also have the right to lodge a complaint with your local data protection authority.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-foreground">Changes to this policy</h2>
            <p className="mt-2">
              We may update this policy from time to time. When we make material changes we will update the &quot;last
              updated&quot; date above and, where appropriate, notify you. Continued use of the service after an update means
              you accept the revised policy.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-foreground">Contact</h2>
            <p className="mt-2">
              Global Diplomacy Forum — MUN CertView. For any privacy question or request, contact{' '}
              <a href="mailto:rajiv@gdf.social" className="text-primary-dark hover:underline">rajiv@gdf.social</a>.
            </p>
          </section>
        </Card>
      </main>
    </>
  );
}
