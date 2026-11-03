import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Lets Android open playerpass.gg/event/<id> links in the app. Needs ANDROID_CERT_SHA256 (from Play Console app signing) in Vercel.
export async function GET() {
  const sha = process.env.ANDROID_CERT_SHA256;
  const body = sha
    ? [{
        relation: ['delegate_permission/common.handle_all_urls'],
        target: { namespace: 'android_app', package_name: 'gg.playerpass.app', sha256_cert_fingerprints: [sha] },
      }]
    : [];
  return NextResponse.json(body);
}
