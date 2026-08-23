/** @type {import('next').NextConfig} */

// Supabase project URL (storage + realtime)
const SUPABASE_URL = 'https://gdyksfarqpzfvymzifxr.supabase.co';

// CSP in Report-Only mode until violations are reviewed in production.
// Next.js App Router requires 'unsafe-inline' for hydration scripts unless
// nonces are wired through middleware — keeping Report-Only while we audit.
const CSP = [
  "default-src 'self'",
  // Next.js hydration + Clerk scripts (clerk.playerpass.gg = custom Clerk domain)
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.com https://*.clerk.accounts.dev https://clerk.playerpass.gg",
  // Next.js inline styles + Google Fonts CSS
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Google Fonts files
  "font-src 'self' data: https://fonts.gstatic.com",
  // Clerk avatars, One Piece card images, Supabase storage, local blobs
  `img-src 'self' data: blob: https://img.clerk.com https://images.clerk.dev https://en.onepiece-cardgame.com ${SUPABASE_URL}`,
  // API calls: Clerk auth + Supabase REST/realtime (ws)
  `connect-src 'self' https://*.clerk.com https://api.clerk.dev https://*.clerk.accounts.dev https://clerk.playerpass.gg ${SUPABASE_URL} wss://gdyksfarqpzfvymzifxr.supabase.co`,
  // Clerk-hosted sign-in UI iframe
  "frame-src https://*.clerk.com https://clerk.com https://clerk.playerpass.gg",
  // No embedding of this app in iframes
  "frame-ancestors 'none'",
  // Block plugins and object embeds
  "object-src 'none'",
  // Prevent base tag hijacking
  "base-uri 'self'",
  // Restrict form targets
  "form-action 'self' https://*.clerk.com https://clerk.playerpass.gg",
].join('; ');

const nextConfig = {
  serverExternalPackages: ['web-push'],
  images: {
    domains: ['img.clerk.com', 'images.clerk.dev', 'en.onepiece-cardgame.com'],
  },
  async headers() {
    return [
      {
        // Global security headers on all routes
        source: '/(.*)',
        headers: [
          // Prevent MIME-type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Belt-and-suspenders with CSP frame-ancestors
          { key: 'X-Frame-Options', value: 'DENY' },
          // Enforce HTTPS for 1 year; Vercel already does this but be explicit
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // Send origin only on cross-origin requests
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Disable browser APIs the app doesn't use (leave NFC unspecified — used at check-in)
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Report-Only CSP — violations visible in browser console, nothing blocked yet
          { key: 'Content-Security-Policy-Report-Only', value: CSP },
        ],
      },
      {
        // Prevent the invitation token in the URL from leaking via Referer
        source: '/staff/accept-invite',
        headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }],
      },
    ];
  },
};

module.exports = nextConfig;
