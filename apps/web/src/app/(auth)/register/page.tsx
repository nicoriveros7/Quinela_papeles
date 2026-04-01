import { AuthForm } from '@/components/features/auth/auth-form';

export default function RegisterPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="absolute inset-0 -z-10 bg-stadium" />
      <AuthForm mode="register" />
    </main>
  );
}
