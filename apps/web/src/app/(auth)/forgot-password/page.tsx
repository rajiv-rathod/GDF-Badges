import { ForgotPasswordForm } from './forgot-form';

export const metadata = { title: 'Reset your password — MUN CertView' };

export default function ForgotPasswordPage() {
  return (
    <main className="relative min-h-screen">
      <div className="gdf-globe-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-6 py-20">
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
