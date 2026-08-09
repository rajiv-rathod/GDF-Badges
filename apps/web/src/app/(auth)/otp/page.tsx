import { OtpForm } from './otp-form';

export const metadata = { title: 'Sign in with a one-time code — MUN CertView' };

export default function OtpPage() {
  return (
    <main className="relative min-h-screen">
      <div className="gdf-globe-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-6 py-20">
        <OtpForm />
      </div>
    </main>
  );
}
