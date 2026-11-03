import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Lets iOS open playerpass.gg/event/<id> links in the app. Needs APPLE_TEAM_ID (Apple Developer account) in Vercel.
export async function GET() {
  const team = process.env.APPLE_TEAM_ID;
  const details = team
    ? [{ appID: `${team}.gg.playerpass.app`, paths: ['/event/*', '/checkin', '/checkin/*', '/onboarding'] }]
    : [];
  return NextResponse.json({ applinks: { apps: [], details } });
}
