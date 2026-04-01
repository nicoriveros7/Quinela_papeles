import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';

import { AuthProvider } from '@/providers/auth-provider';

import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Quinela Pro | Fantasy Futbol',
  description: 'Quiniela moderna para competir con tus amigos',
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
