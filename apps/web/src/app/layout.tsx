import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';

import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Quinela Pro',
  description: 'MVP base para quiniela de futbol',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={spaceGrotesk.variable}>{children}</body>
    </html>
  );
}
