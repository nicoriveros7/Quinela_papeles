import { Suspense } from 'react';

import { ResetPasswordForm } from './reset-password-form';

export default function ResetPasswordPage() {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      {/* Layer 1 — FIFA artwork texture (lowest) */}
      <div
        aria-hidden="true"
        className="absolute -inset-2 -z-20 bg-cover bg-center opacity-[0.16] blur-[4px] pointer-events-none"
        style={{ backgroundImage: "url('/backgrounds/fifa-2026-dark-portrait.jpeg')" }}
      />
      {/* Layer 2 — stadium gradient overlay */}
      <div className="absolute inset-0 -z-10 bg-stadium opacity-[0.85]" />
      <div className="relative z-10">
        <Suspense>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
