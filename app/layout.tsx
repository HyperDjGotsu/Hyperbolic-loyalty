import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hyperbolic XP',
  description: 'Level up your TCG journey. Earn XP, unlock rewards, and compete with the community.',
  keywords: ['TCG', 'loyalty', 'gaming', 'One Piece', 'Pokemon', 'MTG'],
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
  themeColor: '#111009',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary:          '#c4b5fd',
          colorBackground:       '#1a1810',
          colorInputBackground:  '#1e1c14',
          colorInputText:        '#f2efe8',
          colorText:             '#f2efe8',
          colorTextSecondary:    '#8a8070',
          borderRadius:          '10px',
          fontFamily:            'Plus Jakarta Sans, sans-serif',
        },
      }}
    >
      <html lang="en" data-theme="dark" data-tone="warm">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,900;1,9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
            rel="stylesheet"
          />
        </head>
        <body>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
