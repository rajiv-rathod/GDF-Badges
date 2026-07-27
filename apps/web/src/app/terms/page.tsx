import { AppNav } from '@/components/nav';
import { Card, PageTitle } from '@/components/ui';

export const metadata = { title: 'Terms of Service — MUN CertView' };

export default function TermsPage() {
  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <PageTitle title="Terms of Service" subtitle="MUN CertView, powered by the Global Diplomacy Forum (GDF). Last updated: 26 July 2026." />
        <Card className="space-y-5 text-sm leading-relaxed text-muted">
          <section>
            <h2 className="font-display text-base font-semibold text-foreground">The service</h2>
            <p className="mt-2">
              MUN CertView is a free credentialing and conference platform for the Model UN community, provided by the
              Global Diplomacy Forum as a community service, without charge and without warranty of any kind.
            </p>
          </section>
          <section>
            <h2 className="font-display text-base font-semibold text-foreground">Acceptable use</h2>
            <p className="mt-2">
              Organizers may issue credentials only for genuine participation and achievements in events they run.
              Issuing fraudulent credentials, impersonating other organizations, uploading unlawful content, or
              attempting to forge or tamper with credential signatures will result in revocation and account removal.
            </p>
          </section>
          <section>
            <h2 className="font-display text-base font-semibold text-foreground">Credentials</h2>
            <p className="mt-2">
              Credentials are statements by the issuing conference, not by GDF. Issuers may revoke credentials they
              issued; revoked credentials show as revoked on their verification page. Model UN credentials are
              recognitions of participation and achievement — not academic degrees or licenses.
            </p>
          </section>
          <section>
            <h2 className="font-display text-base font-semibold text-foreground">Liability</h2>
            <p className="mt-2">
              The service is provided &quot;as is&quot;. To the maximum extent permitted by law, GDF is not liable for damages
              arising from use of the service, including lost data or reliance on any credential. We may modify or
              discontinue the service; we will make reasonable efforts to give notice. Questions:{' '}
              <a href="mailto:rajiv@gdf.social" className="text-primary-dark hover:underline">rajiv@gdf.social</a>.
            </p>
          </section>
        </Card>
      </main>
    </>
  );
}
