import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';

import { AuthProvider } from '@/providers/auth-provider';

import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'La Polla Mundialista 2026',
  description: 'La polla del Mundial FIFA 2026. Predice, compite y sube en el ranking.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={spaceGrotesk.variable}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
