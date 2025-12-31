import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hyperbolic XP - Hyperbolic Creative',
  description: 'Level up your TCG journey. Earn XP, unlock rewards, and compete with the community.',
  keywords: ['TCG', 'One Piece', 'Pokemon', 'MTG', 'loyalty', 'gaming'],
  authors: [{ name: 'Hyperbolic Games' }],
  openGraph: {
    title: 'Hyperbolic XP',
    description: 'Level up your TCG journey',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0a0a0f',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#00f0ff',
          colorBackground: '#12121a',
          colorInputBackground: '#1a1a24',
          colorText: '#ffffff',
          colorTextSecondary: '#8888aa',
        },
      }}
    >
      <html lang="en" className="dark">
        <body className="font-rajdhani antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
