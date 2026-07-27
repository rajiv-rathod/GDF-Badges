import { AppNav } from '@/components/nav';
import { Card, PageTitle } from '@/components/ui';

export const metadata = { title: 'Privacy Policy — MUN CertView' };

export default function PrivacyPage() {
  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <PageTitle title="Privacy Policy" subtitle="MUN CertView, powered by the Global Diplomacy Forum (GDF). Last updated: 26 July 2026." />
        <Card className="prose-invert space-y-5 text-sm leading-relaxed text-muted">
          <section>
            <h2 className="font-display text-base font-semibold text-foreground">What we collect</h2>
            <p className="mt-2">
              Account data (name, email address, password hash), credential data (badges and certificates issued to you:
              recipient name, awarding conference, award details, issue date), and delegate roster data uploaded by
              conference organizers (name, email, committee, country/portfolio, award). We log credential events
              (issued, claimed, revoked, viewed) for audit integrity.
            </p>
          </section>
          <section>
            <h2 className="font-display text-base font-semibold text-foreground">How it is used</h2>
            <p className="mt-2">
              Solely to operate the service: issuing, claiming, verifying, and displaying credentials, and notifying
              you by email when a credential is issued to your address. MUN CertView is free; we do not sell or rent
              personal data, and we do not use it for advertising.
            </p>
          </section>
          <section>
            <h2 className="font-display text-base font-semibold text-foreground">What is public</h2>
            <p className="mt-2">
              A credential&apos;s verification page (recipient name, award, issuer, status) is accessible to anyone who has
              its unguessable verification link. Your public profile shows only credentials you explicitly mark as
              public — everything is private by default.
            </p>
          </section>
          <section>
            <h2 className="font-display text-base font-semibold text-foreground">Storage and processors</h2>
            <p className="mt-2">
              Data is stored in Supabase (Postgres, auth, file storage). Optional processors, when enabled by the
              deployment: Resend (email delivery) and Google Gemini (organizer-requested text drafting — delegate
              names in a sheet may be sent for cleanup when an organizer clicks the AI clean-up button). Conference
              video meetings run in the separate GDF meeting app (meet.apextech.llc), which has its own policies.
            </p>
          </section>
          <section>
            <h2 className="font-display text-base font-semibold text-foreground">Your rights</h2>
            <p className="mt-2">
              You may request access to, correction of, or deletion of your personal data at any time. Revoked or
              deleted credentials stop verifying immediately. Contact us at{' '}
              <a href="mailto:rajiv@gdf.social" className="text-primary-dark hover:underline">rajiv@gdf.social</a>{' '}
              to exercise these rights or ask questions about this policy.
            </p>
          </section>
        </Card>
      </main>
    </>
  );
}
