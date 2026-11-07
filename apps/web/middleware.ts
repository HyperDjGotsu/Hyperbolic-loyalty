import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/onboarding(.*)',
]);

// Routes that are always public
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/kiosk(.*)',
  '/checkin(.*)',
  '/join(.*)',
  '/api/events/active(.*)',
  '/api/community/leaderboard(.*)',
  '/api/banners(.*)',
  '/api/store-config(.*)',
  '/api/stores(.*)',
  '/api/events/(.*)/public(.*)',
]);

// authorizedParties is intentionally omitted.
//
// Clerk's `authorizedParties` checks the `azp` JWT claim, which is set to
// Clerk's own frontend API URL — not the app's domain. In @clerk/clerk-expo
// (mobile), `azp` is the Clerk FAPI URL (e.g. clerk.accounts.dev), which
// differs from the web origin. Adding authorizedParties here would require
// whitelisting that internal URL, is brittle across environments, and adds
// no real security since JWT signatures already cryptographically prevent
// cross-instance token reuse. Single-tenant, single-Clerk-instance apps do
// not benefit from this setting.
export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  if (req.nextUrl.pathname === '/') {
    const { userId } = await auth();
    // Signed-in players skip the landing page and go straight home
    if (userId) return NextResponse.redirect(new URL('/dashboard', req.url));
    // Signed-out visitors remembered as players go straight to sign-in (a quiet footer link there reaches the store side)
    if (req.cookies.get('pp_lane')?.value === 'player') {
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }
  }
}, {
  // Send signed-out visitors to our own pages, not Clerk's hosted account portal (previews had no env var for this)
  signInUrl: '/sign-in',
  signUpUrl: '/sign-up',
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
