// Feature flags driven by NEXT_PUBLIC_* env vars (inlined at build time by Next.js).
// Default to false / restrictive when the var is absent.

export const SHOW_KNOCKOUT = process.env.NEXT_PUBLIC_SHOW_KNOCKOUT === 'true';
