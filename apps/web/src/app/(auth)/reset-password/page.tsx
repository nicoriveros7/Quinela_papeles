import { Suspense } from 'react';

import { ResetPasswordForm } from './reset-password-form';

export default function ResetPasswordPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="absolute inset-0 -z-10 bg-stadium" />
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
