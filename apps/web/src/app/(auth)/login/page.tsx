import { AuthForm } from '../auth-form';

export default function LoginPage() {
  return (
    <main className="relative min-h-screen">
      <div className="gdf-globe-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-6 py-20">
        <AuthForm mode="login" />
      </div>
    </main>
  );
}
