import { AppNav } from '@/components/nav';
import { Card, PageTitle } from '@/components/ui';

export const metadata = { title: 'Terms of Service — MUN CertView' };

export default function TermsPage() {
  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <PageTitle
          title="Terms of Service"
          subtitle="MUN CertView, powered by the Global Diplomacy Forum (GDF). Last updated: 28 July 2026."
        />
        <Card className="space-y-5 text-sm leading-relaxed text-muted">
          <section>
            <h2 className="font-display text-base font-semibold text-foreground">1. The service</h2>
            <p className="mt-2">
              MUN CertView (&quot;the service&quot;) is a free, verifiable credentialing and conference platform for the Model
              UN community, provided by the Global Diplomacy Forum (&quot;GDF&quot;, &quot;we&quot;, &quot;us&quot;) at{' '}
              <a href="https://certview.gdf.social" className="text-primary-dark hover:underline">certview.gdf.social</a>.
              It lets conference organizers issue badges and certificates to delegates, and lets members claim, collect,
              verify and selectively share those credentials. The service is offered without charge as GDF&apos;s gift to
              the MUN community. By creating an account or using the service, you agree to these Terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-foreground">2. Eligibility</h2>
            <p className="mt-2">
              You must be able to form a binding agreement to open an account. Many delegates are minors; where a
              delegate is under the age of majority, an account should be created and managed with the involvement of a
              parent, guardian or responsible organizer, who accepts these Terms on the delegate&apos;s behalf. Organizers
              are responsible for ensuring they are authorized to represent the conference they register.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-foreground">3. Accounts</h2>
            <p className="mt-2">
              You are responsible for the accuracy of your account details and for keeping your credentials secure. You
              must not share your login, impersonate another person or organization, or access another user&apos;s account.
              Notify us at{' '}
              <a href="mailto:rajiv@gdf.social" className="text-primary-dark hover:underline">rajiv@gdf.social</a> if you
              believe your account has been compromised.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-foreground">4. Organizer obligations and MyMUN verification</h2>
            <p className="mt-2">
              To create a conference, an organizer must provide a valid, public MyMUN (mymun.com) conference link as
              proof the conference is genuine; we retain that link for verification. Organizers may issue credentials
              only for genuine participation and achievements in events they actually run. When uploading delegate
              rosters, organizers act as data controllers for that data, must have a lawful basis to collect and share
              it, must obtain any parental or guardian consent required for minors, and must upload only the data needed
              to issue credentials. Organizers are responsible for the accuracy of the credentials they issue.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-foreground">5. Acceptable use</h2>
            <p className="mt-2">
              You must not: issue fraudulent or misleading credentials; impersonate any person or organization; upload
              unlawful, infringing or harmful content; attempt to forge, tamper with, or reverse-engineer credential
              signatures or verification; probe, disrupt or overload the service; scrape or bulk-collect other users&apos;
              data; or use the service in violation of any applicable law. Violations may result in revocation of
              affected credentials and removal of the account.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-foreground">6. Nature of credentials</h2>
            <p className="mt-2">
              Credentials issued through the service are statements by the issuing conference, not by GDF. Model UN
              badges and certificates are recognitions of participation and achievement — they are not academic
              degrees, professional licenses, or guarantees of any skill or qualification. Each credential is Ed25519-signed
              and aligned with Open Badges 3.0 so that its authenticity and status can be independently verified. A
              credential&apos;s verification page is reachable by anyone who holds its unguessable link.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-foreground">7. Revocation</h2>
            <p className="mt-2">
              An issuer may revoke a credential it issued — for example, if it was issued in error or obtained
              improperly. Revoked credentials display as revoked on their verification page and stop verifying
              immediately. GDF may also revoke or remove credentials that violate these Terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-foreground">8. Intellectual property</h2>
            <p className="mt-2">
              GDF and its licensors own the service, its software, branding and design. You retain ownership of the
              content you upload (such as rosters and credential details) and grant us the limited licence needed to
              host, process and display it in order to operate the service. GDF&apos;s name, logo and brand assets may not
              be used without permission. Issuers are responsible for holding the rights to any logos or artwork they
              add to credentials.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-foreground">9. Availability and &quot;as is&quot;</h2>
            <p className="mt-2">
              The service is provided free of charge, &quot;as is&quot; and &quot;as available&quot;, without warranties of any kind,
              whether express or implied, including fitness for a particular purpose and uninterrupted availability. We
              may modify, suspend or discontinue any part of the service at any time, and will make reasonable efforts
              to give notice of significant changes. Video meetings run in the separate GDF meeting app at{' '}
              <a href="https://meet.apextech.llc" className="text-primary-dark hover:underline">meet.apextech.llc</a>,
              which is governed by its own terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-foreground">10. Limitation of liability</h2>
            <p className="mt-2">
              To the maximum extent permitted by law, GDF will not be liable for any indirect, incidental, special or
              consequential damages, or for lost data, lost profits, or any reliance placed on a credential, arising
              from your use of or inability to use the service. Nothing in these Terms limits liability that cannot be
              limited under applicable law.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-foreground">11. Indemnity</h2>
            <p className="mt-2">
              You agree to indemnify and hold harmless GDF from claims, damages and expenses arising out of content you
              upload, credentials you issue, or your breach of these Terms or of applicable law — including claims by
              delegates relating to roster data you provided as an organizer.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-foreground">12. Termination</h2>
            <p className="mt-2">
              You may stop using the service and request deletion of your account at any time by contacting{' '}
              <a href="mailto:rajiv@gdf.social" className="text-primary-dark hover:underline">rajiv@gdf.social</a>. We may
              suspend or terminate accounts that violate these Terms or that are used to abuse or endanger the service or
              its users. Credentials already issued may remain verifiable unless revoked or deleted.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-foreground">13. Governing terms and changes</h2>
            <p className="mt-2">
              These Terms, together with our{' '}
              <a href="/privacy" className="text-primary-dark hover:underline">Privacy Policy</a> and{' '}
              <a href="/data-collection" className="text-primary-dark hover:underline">Data Collection Notice</a>, form
              the whole agreement between you and GDF regarding the service. We may update these Terms from time to time;
              when we do, we will update the &quot;last updated&quot; date above, and continued use of the service means you
              accept the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-foreground">14. Contact</h2>
            <p className="mt-2">
              Global Diplomacy Forum — MUN CertView. Questions about these Terms:{' '}
              <a href="mailto:rajiv@gdf.social" className="text-primary-dark hover:underline">rajiv@gdf.social</a>.
            </p>
          </section>
        </Card>
      </main>
    </>
  );
}
